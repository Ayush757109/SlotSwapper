// backend/routes/swaps.js
import express from 'express';
import db from '../database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all swappable slots from other users
router.get('/swappable-slots', authenticateToken, (req, res) => {
  db.all(
    `SELECT e.*, u.name as user_name, u.email as user_email 
     FROM events e 
     JOIN users u ON e.user_id = u.id 
     WHERE e.status = 'SWAPPABLE' AND e.user_id != ? 
     ORDER BY e.start_time ASC`,
    [req.user.id],
    (err, slots) => {
      if (err) {
        return res.status(500).json({ message: 'Error fetching swappable slots' });
      }
      res.json(slots);
    }
  );
});

// Create swap request
router.post('/swap-request', authenticateToken, (req, res) => {
  const { mySlotId, theirSlotId } = req.body;

  if (!mySlotId || !theirSlotId) {
    return res.status(400).json({ message: 'Both slot IDs are required' });
  }

  // Verify both slots exist and are swappable
  db.serialize(() => {
    db.get(
      'SELECT * FROM events WHERE id = ? AND user_id = ? AND status = "SWAPPABLE"',
      [mySlotId, req.user.id],
      (err, mySlot) => {
        if (err) {
          return res.status(500).json({ message: 'Database error' });
        }
        if (!mySlot) {
          return res.status(400).json({ message: 'Your slot is not available for swapping' });
        }

        db.get(
          'SELECT * FROM events WHERE id = ? AND status = "SWAPPABLE" AND user_id != ?',
          [theirSlotId, req.user.id],
          (err, theirSlot) => {
            if (err) {
              return res.status(500).json({ message: 'Database error' });
            }
            if (!theirSlot) {
              return res.status(400).json({ message: 'Requested slot is not available' });
            }

            // Create swap request and update slots in transaction
            db.run(
              'INSERT INTO swap_requests (requester_id, receiver_id, offered_event_id, requested_event_id) VALUES (?, ?, ?, ?)',
              [req.user.id, theirSlot.user_id, mySlotId, theirSlotId],
              function(err) {
                if (err) {
                  return res.status(500).json({ message: 'Error creating swap request' });
                }

                // Update both slots to SWAP_PENDING
                db.run(
                  'UPDATE events SET status = "SWAP_PENDING" WHERE id IN (?, ?)',
                  [mySlotId, theirSlotId],
                  (err) => {
                    if (err) {
                      return res.status(500).json({ message: 'Error updating slot status' });
                    }

                    res.status(201).json({ 
                      message: 'Swap request created successfully',
                      requestId: this.lastID 
                    });
                  }
                );
              }
            );
          }
        );
      }
    );
  });
});

// Respond to swap request
router.post('/swap-response/:requestId', authenticateToken, (req, res) => {
  const { requestId } = req.params;
  const { accepted } = req.body;

  if (typeof accepted !== 'boolean') {
    return res.status(400).json({ message: 'Accepted field must be boolean' });
  }

  db.get(
    `SELECT sr.*, oe.user_id as offered_user_id, re.user_id as requested_user_id 
     FROM swap_requests sr
     JOIN events oe ON sr.offered_event_id = oe.id
     JOIN events re ON sr.requested_event_id = re.id
     WHERE sr.id = ? AND sr.receiver_id = ? AND sr.status = 'PENDING'`,
    [requestId, req.user.id],
    (err, swapRequest) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }
      if (!swapRequest) {
        return res.status(404).json({ message: 'Swap request not found' });
      }

      if (accepted) {
        // ACCEPT SWAP - swap the event owners
        db.serialize(() => {
          db.run('BEGIN TRANSACTION');
          
          // Update swap request status
          db.run(
            'UPDATE swap_requests SET status = "ACCEPTED" WHERE id = ?',
            [requestId]
          );
          
          // Swap event owners and set status to BUSY
          db.run(
            'UPDATE events SET user_id = ?, status = "BUSY" WHERE id = ?',
            [swapRequest.receiver_id, swapRequest.offered_event_id]
          );
          
          db.run(
            'UPDATE events SET user_id = ?, status = "BUSY" WHERE id = ?',
            [swapRequest.requester_id, swapRequest.requested_event_id]
          );
          
          db.run('COMMIT', (err) => {
            if (err) {
              db.run('ROLLBACK');
              return res.status(500).json({ message: 'Error accepting swap' });
            }
            res.json({ message: 'Swap accepted successfully' });
          });
        });
      } else {
        // REJECT SWAP - revert slots to SWAPPABLE
        db.serialize(() => {
          db.run('BEGIN TRANSACTION');
          
          // Update swap request status
          db.run(
            'UPDATE swap_requests SET status = "REJECTED" WHERE id = ?',
            [requestId]
          );
          
          // Revert both slots to SWAPPABLE
          db.run(
            'UPDATE events SET status = "SWAPPABLE" WHERE id IN (?, ?)',
            [swapRequest.offered_event_id, swapRequest.requested_event_id]
          );
          
          db.run('COMMIT', (err) => {
            if (err) {
              db.run('ROLLBACK');
              return res.status(500).json({ message: 'Error rejecting swap' });
            }
            res.json({ message: 'Swap rejected' });
          });
        });
      }
    }
  );
});

// Get user's swap requests
router.get('/my-requests', authenticateToken, (req, res) => {
  db.all(
    `SELECT sr.*, 
            u1.name as requester_name,
            u2.name as receiver_name,
            oe.title as offered_title, oe.start_time as offered_start, oe.end_time as offered_end,
            re.title as requested_title, re.start_time as requested_start, re.end_time as requested_end
     FROM swap_requests sr
     JOIN users u1 ON sr.requester_id = u1.id
     JOIN users u2 ON sr.receiver_id = u2.id
     JOIN events oe ON sr.offered_event_id = oe.id
     JOIN events re ON sr.requested_event_id = re.id
     WHERE sr.requester_id = ? OR sr.receiver_id = ?
     ORDER BY sr.created_at DESC`,
    [req.user.id, req.user.id],
    (err, requests) => {
      if (err) {
        return res.status(500).json({ message: 'Error fetching swap requests' });
      }
      res.json(requests);
    }
  );
});

export default router;