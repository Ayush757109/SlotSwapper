// frontend/js/marketplace.js
let availableSlots = [];
let userSwappableSlots = [];
let selectedTheirSlotId = null;

document.addEventListener('DOMContentLoaded', function() {
    if (!redirectIfNotAuthenticated()) return;

    loadAvailableSlots();
    setupMarketplaceHandlers();
});

function setupMarketplaceHandlers() {
    // Swap modal handlers
    document.getElementById('cancelSwapBtn').addEventListener('click', () => {
        closeModal('swapModal');
    });
}

async function loadAvailableSlots() {
    try {
        availableSlots = await api.getSwappableSlots();
        renderAvailableSlots();
    } catch (error) {
        showMessage('Error loading available slots: ' + error.message, 'error');
    }
}

function renderAvailableSlots() {
    const container = document.getElementById('marketplaceContainer');
    
    if (availableSlots.length === 0) {
        container.innerHTML = '<p>No available slots from other users at the moment.</p>';
        return;
    }

    container.innerHTML = availableSlots.map(slot => `
        <div class="slot-card">
            <div class="slot-user">From: ${slot.user_name}</div>
            <div class="slot-title">${slot.title}</div>
            <div class="event-time">
                ${formatDateTime(slot.start_time)} - ${formatTime(slot.end_time)}
            </div>
            <div class="event-actions" style="margin-top: 1rem;">
                <button class="btn btn-primary btn-small" onclick="openSwapModal('${slot.id}')">
                    Request Swap
                </button>
            </div>
        </div>
    `).join('');
}

async function openSwapModal(theirSlotId) {
    selectedTheirSlotId = theirSlotId;
    
    try {
        // Load user's swappable slots
        const userEvents = await api.getEvents();
        userSwappableSlots = userEvents.filter(event => event.status === 'SWAPPABLE');
        
        const container = document.getElementById('mySwappableSlots');
        
        if (userSwappableSlots.length === 0) {
            container.innerHTML = '<p>You need to mark some of your events as "Swappable" first!</p>';
        } else {
            container.innerHTML = userSwappableSlots.map(slot => `
                <div class="slot-item" onclick="selectMySlot('${slot.id}')" id="slot-${slot.id}">
                    <strong>${slot.title}</strong><br>
                    <small>${formatDateTime(slot.start_time)} - ${formatTime(slot.end_time)}</small>
                </div>
            `).join('');
        }
        
        openModal('swapModal');
    } catch (error) {
        showMessage('Error loading your swappable slots: ' + error.message, 'error');
    }
}

function selectMySlot(mySlotId) {
    // Remove previous selection
    document.querySelectorAll('.slot-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    // Add selection to clicked item
    const selectedItem = document.getElementById(`slot-${mySlotId}`);
    if (selectedItem) {
        selectedItem.classList.add('selected');
    }
    
    // Create swap request
    createSwapRequest(mySlotId, selectedTheirSlotId);
}

async function createSwapRequest(mySlotId, theirSlotId) {
    try {
        await api.createSwapRequest(mySlotId, theirSlotId);
        showMessage('Swap request sent successfully!', 'success');
        closeModal('swapModal');
        await loadAvailableSlots(); // Reload to reflect changes
    } catch (error) {
        showMessage('Error sending swap request: ' + error.message, 'error');
    }
}