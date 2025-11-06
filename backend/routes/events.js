// backend/routes/events.js
import express from 'express';
import db from '../database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get user's events
router.get('/', authenticateToken, (req, res) => {
  db.all(
    'SELECT * FROM events WHERE user_id = ? ORDER BY start_time ASC',
    [req.user.id],
    (err, events) => {
      if (err) {
        return res.status(500).json({ message: 'Error fetching events' });
      }
      res.json(events);
    }
  );
});

// Create new event
router.post('/', authenticateToken, (req, res) => {
  const { title, startTime, endTime, status = 'BUSY' } = req.body;
  
  if (!title || !startTime || !endTime) {
    return res.status(400).json({ message: 'Title, start time, and end time are required' });
  }

  db.run(
    'INSERT INTO events (title, start_time, end_time, status, user_id) VALUES (?, ?, ?, ?, ?)',
    [title, startTime, endTime, status, req.user.id],
    function(err) {
      if (err) {
        return res.status(500).json({ message: 'Error creating event' });
      }
      
      db.get(
        'SELECT * FROM events WHERE id = ?',
        [this.lastID],
        (err, event) => {
          if (err) {
            return res.status(500).json({ message: 'Error fetching created event' });
          }
          res.status(201).json(event);
        }
      );
    }
  );
});

// Update event status
router.patch('/:id/status', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ message: 'Status is required' });
  }

  // Check if event belongs to user
  db.get(
    'SELECT * FROM events WHERE id = ? AND user_id = ?',
    [id, req.user.id],
    (err, event) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }
      
      if (!event) {
        return res.status(404).json({ message: 'Event not found' });
      }

      db.run(
        'UPDATE events SET status = ? WHERE id = ?',
        [status, id],
        function(err) {
          if (err) {
            return res.status(500).json({ message: 'Error updating event' });
          }
          
          db.get(
            'SELECT * FROM events WHERE id = ?',
            [id],
            (err, updatedEvent) => {
              if (err) {
                return res.status(500).json({ message: 'Error fetching updated event' });
              }
              res.json(updatedEvent);
            }
          );
        }
      );
    }
  );
});

// Delete event
router.delete('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  db.run(
    'DELETE FROM events WHERE id = ? AND user_id = ?',
    [id, req.user.id],
    function(err) {
      if (err) {
        return res.status(500).json({ message: 'Error deleting event' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ message: 'Event not found' });
      }
      
      res.json({ message: 'Event deleted successfully' });
    }
  );
});

export default router;