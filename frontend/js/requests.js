// frontend/js/requests.js
let swapRequests = [];

document.addEventListener('DOMContentLoaded', function() {
    if (!redirectIfNotAuthenticated()) return;
    
    loadSwapRequests();
});

async function loadSwapRequests() {
    try {
        swapRequests = await api.getMyRequests();
        renderSwapRequests();
    } catch (error) {
        showMessage('Error loading swap requests: ' + error.message, 'error');
    }
}

function renderSwapRequests() {
    const user = JSON.parse(localStorage.getItem('user'));
    const incomingRequests = swapRequests.filter(req => req.receiver_id == user.id && req.status === 'PENDING');
    const outgoingRequests = swapRequests.filter(req => req.requester_id == user.id);

    renderIncomingRequests(incomingRequests);
    renderOutgoingRequests(outgoingRequests);
}

function renderIncomingRequests(requests) {
    const container = document.getElementById('incomingRequests');
    
    if (requests.length === 0) {
        container.innerHTML = '<p>No incoming swap requests.</p>';
        return;
    }

    container.innerHTML = requests.map(req => `
        <div class="request-card">
            <div class="request-info">
                <p><strong>${req.requester_name}</strong> wants to swap:</p>
                <p>🗓️ They offer: <strong>${req.offered_title}</strong><br>
                   ${formatDateTime(req.offered_start)} - ${formatTime(req.offered_end)}</p>
                <p>🔄 For your: <strong>${req.requested_title}</strong><br>
                   ${formatDateTime(req.requested_start)} - ${formatTime(req.requested_end)}</p>
            </div>
            <div class="request-actions">
                <button class="btn btn-success btn-small" onclick="respondToSwap('${req.id}', true)">
                    Accept
                </button>
                <button class="btn btn-danger btn-small" onclick="respondToSwap('${req.id}', false)">
                    Reject
                </button>
            </div>
        </div>
    `).join('');
}

function renderOutgoingRequests(requests) {
    const container = document.getElementById('outgoingRequests');
    
    if (requests.length === 0) {
        container.innerHTML = '<p>No outgoing swap requests.</p>';
        return;
    }

    container.innerHTML = requests.map(req => {
        let statusBadge = '';
        let statusText = '';
        
        switch(req.status) {
            case 'PENDING':
                statusBadge = 'status-pending';
                statusText = 'Pending';
                break;
            case 'ACCEPTED':
                statusBadge = 'status-swappable';
                statusText = 'Accepted';
                break;
            case 'REJECTED':
                statusBadge = 'status-busy';
                statusText = 'Rejected';
                break;
        }
        
        return `
            <div class="request-card ${req.status.toLowerCase()}">
                <div class="request-info">
                    <p>You requested <strong>${req.receiver_name}</strong> to swap:</p>
                    <p>🗓️ You offered: <strong>${req.offered_title}</strong><br>
                       ${formatDateTime(req.offered_start)} - ${formatTime(req.offered_end)}</p>
                    <p>🔄 For their: <strong>${req.requested_title}</strong><br>
                       ${formatDateTime(req.requested_start)} - ${formatTime(req.requested_end)}</p>
                    <div style="margin-top: 0.5rem;">
                        <span class="status-badge ${statusBadge}">${statusText}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

async function respondToSwap(requestId, accepted) {
    const action = accepted ? 'accept' : 'reject';
    
    if (!confirm(`Are you sure you want to ${action} this swap?`)) {
        return;
    }

    try {
        await api.respondToSwap(requestId, accepted);
        showMessage(`Swap ${accepted ? 'accepted' : 'rejected'} successfully!`, 'success');
        await loadSwapRequests(); // Reload requests
    } catch (error) {
        showMessage('Error responding to swap: ' + error.message, 'error');
    }
}