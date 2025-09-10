const TIME_SLOTS = ["MORNING", "LUNCH", "DINNER"];

// Common calendar rendering logic
async function renderCalendarGrid(calendarEl, year, month, reservations, clickHandler, maxConcurrentTeams) {
    calendarEl.innerHTML = ''; // Clear previous calendar

    const daysInMonth = new Date(year, month, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
        let dayEl = document.createElement('div');
        dayEl.className = 'day';
        const currentDateStr = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        dayEl.dataset.date = currentDateStr;
        
        let dayContent = `<div class="day-number">${i}</div>`;
        
        const dayReservations = reservations.filter(r => r.reservation_date === currentDateStr);

        for (const slot of TIME_SLOTS) {
            const slotReservations = dayReservations.filter(r => r.time_slot === slot);
            const isFull = slotReservations.length >= maxConcurrentTeams;
            const isBooked = slotReservations.length > 0; // Check if any reservation exists for this slot

            let barClass = '';
            if (isBooked) {
                barClass = 'booked'; // Green if booked
            } else if (isFull) {
                barClass = 'full'; // Red if full
            } else {
                barClass = 'available'; // Blue if available
            }
            
            const barText = `${slot.charAt(0)}`; // M, L, D
            dayContent += `<div class="time-slot-bar ${barClass}">${barText}</div>`;
        }

        dayEl.innerHTML = dayContent;
        dayEl.addEventListener('click', () => clickHandler(currentDateStr));
        calendarEl.appendChild(dayEl);
    }
}

// This function is made global for admin.js to use
async function fetchMaxConcurrentTeams() {
    const token = localStorage.getItem('accessToken');
    try {
        const response = await fetch('/api/admin/settings', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const settings = await response.json();
            const maxTeamsSetting = settings.find(s => s.key === 'max_concurrent_teams');
            return maxTeamsSetting ? parseInt(maxTeamsSetting.value) : 6; // Default to 6
        }
    } catch (error) {
        console.error("Failed to fetch max concurrent teams setting:", error);
    }
    return 6; // Default if fetch fails
}


document.addEventListener('DOMContentLoaded', function () {
    if (document.getElementById('calendar')) {
        initializeReservationPage();
    }
});

let currentUser = null;

async function initializeReservationPage() {
    const token = localStorage.getItem('accessToken');
    if (!token) {
        window.location.href = '/login';
        return;
    }
    document.getElementById('logout-button').style.display = 'block';

    await fetchUserData(token);
    const today = new Date();
    await renderCalendar(today.getFullYear(), today.getMonth() + 1);
}

async function fetchUserData(token) {
    try {
        const response = await fetch('/api/auth/users/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch user data');
        currentUser = await response.json();
    } catch (error) {
        console.error(error);
        logout();
    }
}

async function renderCalendar(year, month) {
    const calendarEl = document.getElementById('calendar');
    const token = localStorage.getItem('accessToken');
    let reservations = [];
    let maxConcurrentTeams = await fetchMaxConcurrentTeams();

    try {
        const response = await fetch(`/api/student/reservations?year=${year}&month=${month}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if(response.ok) {
            reservations = await response.json();
        }
    } catch (error) {
        console.error("Could not fetch reservations");
    }

    renderCalendarGrid(calendarEl, year, month, reservations, (date) => openModal(date), maxConcurrentTeams);
}

// --- Modal & Form Logic ---
const modal = document.getElementById('reservation-modal');
const closeButton = document.querySelector('.close-button');
const reservationForm = document.getElementById('reservation-form');
const teamSelect = document.getElementById('team-select');
const participantsContainer = document.getElementById('participants-container');
const participantsChecklist = document.getElementById('participants-checklist');
const modalDateDisplay = document.getElementById('modal-date-display');
const reservationDateInput = document.getElementById('reservation-date');
const modalErrorMessage = document.getElementById('modal-error-message');

function openModal(date) {
    modalDateDisplay.textContent = date;
    reservationDateInput.value = date;
    modalErrorMessage.style.display = 'none';
    participantsContainer.style.display = 'none';
    participantsChecklist.innerHTML = '';
    reservationForm.reset();

    teamSelect.innerHTML = '<option value="" disabled selected>팀을 선택하세요</option>';
    if (currentUser && currentUser.assigned_teams && currentUser.assigned_teams.length > 0) {
        currentUser.assigned_teams.forEach(team => {
            const option = document.createElement('option');
            option.value = team.id;
            option.textContent = team.name;
            teamSelect.appendChild(option);
        });
    } else {
        const option = document.createElement('option');
        option.textContent = '소속된 팀이 없습니다.';
        option.disabled = true;
        teamSelect.appendChild(option);
    }

    modal.style.display = 'block';
}

teamSelect.addEventListener('change', function() {
    const teamId = parseInt(this.value);
    const selectedTeam = currentUser.assigned_teams.find(t => t.id === teamId);

    participantsChecklist.innerHTML = '';
    if (selectedTeam && selectedTeam.member_details) {
        selectedTeam.member_details.forEach(member => {
            const item = document.createElement('div');
            item.className = 'participant-item';
            item.innerHTML = `
                <input type="checkbox" id="participant-${member.id}" name="participants" value="${member.id}" checked>
                <label for="participant-${member.id}">${member.full_name}</label>
            `;
            participantsChecklist.appendChild(item);
        });
        participantsContainer.style.display = 'block';
    } else {
        participantsContainer.style.display = 'none';
    }
});

function closeModal() {
    modal.style.display = 'none';
}

closeButton.onclick = closeModal;
window.onclick = function(event) {
    if (event.target == modal) {
        closeModal();
    }
}

reservationForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    modalErrorMessage.style.display = 'none';

    const selectedTimeSlot = document.querySelector('input[name="time_slot"]:checked');
    if (!selectedTimeSlot) {
        modalErrorMessage.textContent = '시간을 선택해주세요.';
        modalErrorMessage.style.display = 'block';
        return;
    }

    const reservationData = {
        reservation_date: reservationDateInput.value,
        time_slot: selectedTimeSlot.value,
        team_id: parseInt(teamSelect.value),
        participant_ids: Array.from(document.querySelectorAll('input[name="participants"]:checked')).map(cb => parseInt(cb.value))
    };

    const token = localStorage.getItem('accessToken');

    try {
        const response = await fetch('/api/student/reservations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(reservationData)
        });

        if (response.ok) {
            alert('예약이 완료되었습니다.');
            closeModal();
            const date = new Date(reservationDateInput.value);
            await renderCalendar(date.getFullYear(), date.getMonth() + 1);
        } else {
            const errorData = await response.json();
            modalErrorMessage.textContent = errorData.detail || '예약에 실패했습니다.';
            modalErrorMessage.style.display = 'block';
        }
    } catch (error) {
        modalErrorMessage.textContent = '오류가 발생했습니다. 다시 시도해주세요.';
        modalErrorMessage.style.display = 'block';
    }
});
