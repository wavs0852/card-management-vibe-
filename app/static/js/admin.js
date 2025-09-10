document.addEventListener('DOMContentLoaded', async function () {
    const token = localStorage.getItem('accessToken');
    if (!token) {
        window.location.href = '/login';
        return;
    }

    // Fetch user data to verify admin status
    try {
        const response = await fetch('/api/auth/users/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Auth token is invalid');
        
        const user = await response.json();

        if (!user.is_admin) {
            alert('관리자만 접근할 수 있는 페이지입니다.');
            logout();
            return;
        }
        // If we are here, user is a verified admin.

    } catch (e) {
        console.error("Authentication check failed:", e);
        logout(); // If any part of auth fails, logout.
        return;
    }

    // Page-specific initializers for admin
    if (document.getElementById('admin-calendar')) {
        initializeAdminDashboard();
    }
    if (document.getElementById('settings-form')) {
        initializeSettingsPage();
    }
});

// --- Admin Dashboard Logic ---
async function initializeAdminDashboard() {
    const today = new Date();
    const calendarEl = document.getElementById('admin-calendar');
    const token = localStorage.getItem('accessToken');
    let reservations = [];
    let maxConcurrentTeams = await fetchMaxConcurrentTeams(); // Use global function

    try {
        const response = await fetch(`/api/admin/reservations-by-date?reservation_date=${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if(response.ok) {
            reservations = await response.json();
        }
    } catch (error) {
        console.error("Could not fetch reservations for admin dashboard");
    }

    // Use the common rendering function
    renderCalendarGrid(calendarEl, today.getFullYear(), today.getMonth() + 1, reservations, (date) => openAdminDayModal(date), maxConcurrentTeams);
}

async function openAdminDayModal(date) {
    const modal = document.getElementById('admin-day-modal');
    const dateDisplay = document.getElementById('admin-modal-date-display');
    const detailsContainer = document.getElementById('admin-day-details');
    dateDisplay.textContent = date;
    detailsContainer.innerHTML = 'Loading...';
    modal.style.display = 'block';

    const token = localStorage.getItem('accessToken');
    try {
        const response = await fetch(`/api/admin/reservations-by-date?reservation_date=${date}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch details');
        const reservations = await response.json();
        
        let content = '';
        if (reservations.length === 0) {
            content = '<p>해당 날짜에 예약이 없습니다.</p>';
        } else {
            const grouped = { MORNING: [], LUNCH: [], DINNER: [] };
            reservations.forEach(r => grouped[r.time_slot].push(r));

            for (const [slot, resList] of Object.entries(grouped)) {
                content += `<h4>${slot}</h4>`;
                if (resList.length > 0) {
                    content += '<ul>';
                    resList.forEach(res => {
                        const participants = res.participants_names.join(', '); // Use participants_names
                        content += `<li><b>${res.team_name}:</b> ${participants}</li>`; // Use team_name
                    });
                    content += '</ul>';
                } else {
                    content += '<p>예약 없음</p>';
                }
            }
        }
        detailsContainer.innerHTML = content;
    } catch (e) {
        detailsContainer.innerHTML = '<p>정보를 불러오는 데 실패했습니다.</p>';
    }

    // Add close functionality
    modal.querySelector('.close-button').onclick = () => modal.style.display = 'none';
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    }
}

// --- Settings Page Logic ---
async function initializeSettingsPage() {
    const form = document.getElementById('settings-form');
    const token = localStorage.getItem('accessToken');

    try {
        const response = await fetch('/api/admin/settings', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch settings');
        const settings = await response.json();

        settings.forEach(setting => {
            const group = document.createElement('div');
            group.className = 'form-group';
            group.innerHTML = `
                <label for="setting-${setting.key}">${setting.key}</label>
                <input type="text" id="setting-${setting.key}" value="${setting.value}">
            `;
            form.insertBefore(group, form.querySelector('button'));
        });
    } catch (e) {
        form.innerHTML = '<p>설정을 불러오는 데 실패했습니다.</p>';
    }

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        const successMessage = document.getElementById('settings-success-message');
        successMessage.style.display = 'none';

        const settingInput = form.querySelector('input[id^="setting-"]');
        const key = settingInput.id.replace('setting-', '');
        const value = settingInput.value;

        try {
            const response = await fetch('/api/admin/settings', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ key, value })
            });
            if (!response.ok) throw new Error('Failed to save setting');
            successMessage.style.display = 'block';
        } catch (e) {
            alert('저장에 실패했습니다.');
        }
    });
}