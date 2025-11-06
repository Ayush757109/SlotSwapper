// frontend/js/calendar.js
let events = [];
let currentEditingEvent = null;

document.addEventListener('DOMContentLoaded', function() {
    if (!redirectIfNotAuthenticated()) return;

    loadEvents();
    setupEventHandlers();
});

function setupEventHandlers() {
    // Add event button
    document.getElementById('addEventBtn').addEventListener('click', () => {
        currentEditingEvent = null;
        document.getElementById('eventForm').reset();
        document.getElementById('eventForm').dataset.mode = 'create';
        openModal('eventModal');
    });

    // Cancel event button
    document.getElementById('cancelEventBtn').addEventListener('click', () => {
        closeModal('eventModal');
    });

    // Event form submission
    document.getElementById('eventForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveEvent();
    });
}

async function loadEvents() {
    try {
        events = await api.getEvents();
        renderEvents();
    } catch (error) {
        showMessage('Error loading events: ' + error.message, 'error');
    }
}

function renderEvents() {
    const container = document.getElementById('eventsContainer');
    
    if (events.length === 0) {
        container.innerHTML = '<p>No events found. Add your first event!</p>';
        return;
    }

    container.innerHTML = events.map(event => `
        <div class="event-card ${event.status.toLowerCase()}">
            <div class="event-header">
                <div>
                    <div class="event-title">${event.title}</div>
                    <div class="event-time">
                        ${formatDateTime(event.start_time)} - ${formatTime(event.end_time)}
                    </div>
                </div>
                ${getStatusBadge(event.status)}
            </div>
            <div class="event-actions">
                ${event.status === 'BUSY' ? 
                    `<button class="btn btn-success btn-small" onclick="makeSwappable('${event.id}')">
                        Make Swappable
                    </button>` : 
                    ''}
                ${event.status === 'SWAPPABLE' ? 
                    `<button class="btn btn-secondary btn-small" onclick="makeBusy('${event.id}')">
                        Make Busy
                    </button>` : 
                    ''}
                <button class="btn btn-danger btn-small" onclick="deleteEvent('${event.id}')">
                    Delete
                </button>
            </div>
        </div>
    `).join('');
}

async function saveEvent() {
    const form = document.getElementById('eventForm');
    const formData = new FormData(form);
    
    const eventData = {
        title: document.getElementById('eventTitle').value,
        startTime: document.getElementById('eventStart').value,
        endTime: document.getElementById('eventEnd').value,
        status: document.getElementById('eventStatus').value
    };

    try {
        if (form.dataset.mode === 'create') {
            await api.createEvent(eventData);
            showMessage('Event created successfully!', 'success');
        } else {
            // For edit mode (we'll implement this if needed)
        }
        
        closeModal('eventModal');
        await loadEvents(); // Reload events
    } catch (error) {
        showMessage('Error saving event: ' + error.message, 'error');
    }
}

async function makeSwappable(eventId) {
    try {
        await api.updateEventStatus(eventId, 'SWAPPABLE');
        showMessage('Event marked as swappable!', 'success');
        await loadEvents();
    } catch (error) {
        showMessage('Error updating event: ' + error.message, 'error');
    }
}

async function makeBusy(eventId) {
    try {
        await api.updateEventStatus(eventId, 'BUSY');
        showMessage('Event marked as busy!', 'success');
        await loadEvents();
    } catch (error) {
        showMessage('Error updating event: ' + error.message, 'error');
    }
}

async function deleteEvent(eventId) {
    if (!confirm('Are you sure you want to delete this event?')) {
        return;
    }

    try {
        await api.deleteEvent(eventId);
        showMessage('Event deleted successfully!', 'success');
        await loadEvents();
    } catch (error) {
        showMessage('Error deleting event: ' + error.message, 'error');
    }
}