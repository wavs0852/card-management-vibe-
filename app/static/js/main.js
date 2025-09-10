document.addEventListener('DOMContentLoaded', function () {
    if (document.getElementById('calendar')) {
        initializeReservationPage();
    }
});

let currentUser = null;

document.addEventListener('DOMContentLoaded', function () {
    if (document.getElementById('student-calendar')) {
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
    const apiEndpoint = '/api/student/reservations';
    await renderCalendar('student-calendar', today.getFullYear(), today.getMonth() + 1, openModal, apiEndpoint);
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

if (teamSelect) {
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
}

function closeModal() {
    if(modal) modal.style.display = 'none';
}

if(closeButton) closeButton.onclick = closeModal;

window.onclick = function(event) {
    if (event.target == modal) {
        closeModal();
    }
}

if(reservationForm) {
    reservationForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        modalErrorMessage.style.display = 'none';

        const selectedTimeSlot = document.querySelector('input[name="time_slot"]:checked');
        if (!selectedTimeSlot) {
            modalErrorMessage.textContent = '시간을 선택해주세요.';
            modalErrorMessage.style.display = 'block';
            return;
        }

        const selectedParticipants = Array.from(document.querySelectorAll('input[name="participants"]:checked')).map(cb => parseInt(cb.value));
        if (selectedParticipants.length === 0) {
            modalErrorMessage.textContent = '최소 한 명의 참여자가 필요합니다.';
            modalErrorMessage.style.display = 'block';
            return;
        }

        const reservationData = {
            reservation_date: reservationDateInput.value,
            time_slot: selectedTimeSlot.value,
            team_id: parseInt(teamSelect.value),
            participant_ids: selectedParticipants
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
                await renderCalendar('calendar', date.getFullYear(), date.getMonth() + 1, openModal);
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
}