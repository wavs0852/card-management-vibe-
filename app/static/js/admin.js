document.addEventListener('DOMContentLoaded', async function () {
    const token = localStorage.getItem('accessToken');
    if (!token) {
        window.location.href = '/login';
        return;
    }

    try {
        const response = await fetch('/api/auth/users/me', { headers: { 'Authorization': `Bearer ${token}` } });
        if (!response.ok) throw new Error('Auth token is invalid');
        const user = await response.json();
        if (!user.is_admin) {
            alert('관리자만 접근할 수 있는 페이지입니다.');
            logout();
            return;
        }
    } catch (e) {
        console.error("Authentication check failed:", e);
        logout();
        return;
    }

    if (document.getElementById('admin-calendar')) {
        initializeAdminDashboard();
    }
    if (document.getElementById('settings-form')) {
        initializeSettingsPage();
    }
});

async function initializeAdminDashboard() {
    const today = new Date();
    const apiEndpoint = '/api/admin/reservations-by-month';
    await renderCalendar('admin-calendar', today.getFullYear(), today.getMonth() + 1, openAdminDayModal, apiEndpoint);
}

function openAdminDayModal(date, reservations) {
    const modal = document.getElementById('admin-day-modal');
    const dateDisplay = document.getElementById('admin-modal-date-display');
    const detailsContainer = document.getElementById('admin-day-details');
    dateDisplay.textContent = date;
    detailsContainer.innerHTML = '';
    modal.style.display = 'block';

    const dayReservations = reservations.filter(r => r.reservation_date === date);

    let content = '';
    if (dayReservations.length === 0) {
        content = '<p>해당 날짜에 예약이 없습니다.</p>';
    } else {
        const grouped = { MORNING: [], LUNCH: [], DINNER: [] };
        dayReservations.forEach(r => grouped[r.time_slot].push(r));

        for (const [slot, resList] of Object.entries(grouped)) {
            content += `<h4>${slot}</h4>`;
            if (resList.length > 0) {
                content += '<ul>';
                resList.forEach(res => {
                    const participants = res.participants.map(p => p.user.full_name).join(', ');
                    content += `<li><b>${res.team.name}:</b> ${participants}</li>`;
                });
                content += '</ul>';
            } else {
                content += '<p>예약 없음</p>';
            }
        }
    }
    detailsContainer.innerHTML = content;

    modal.querySelector('.close-button').onclick = () => modal.style.display = 'none';
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    }
}

async function initializeSettingsPage() {
    const form = document.getElementById('settings-form');
    const token = localStorage.getItem('accessToken');

    try {
        const response = await fetch('/api/admin/settings', { headers: { 'Authorization': `Bearer ${token}` } });
        if (!response.ok) throw new Error('Failed to fetch settings');
        const settings = await response.json();

        settings.forEach(setting => {
            const group = document.createElement('div');
            group.className = 'form-group';
            group.innerHTML = `<label for="setting-${setting.key}">${setting.key}</label><input type="text" id="setting-${setting.key}" value="${setting.value}">`;
            form.insertBefore(group, form.querySelector('button'));
        });
    } catch (e) {
        form.innerHTML = '<p>설정을 불러오는 데 실패했습니다.</p>';
    }

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        const successMessage = document.getElementById('settings-success-message');
        successMessage.style.display = 'none';

        const settingInputs = form.querySelectorAll('input[id^="setting-"]');
        for (const input of settingInputs) {
            const key = input.id.replace('setting-', '');
            const value = input.value;
            try {
                const response = await fetch('/api/admin/settings', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ key, value })
                });
                if (!response.ok) throw new Error(`Failed to save setting: ${key}`);
            } catch (e) {
                alert(`저장에 실패했습니다: ${e.message}`);
                return;
            }
        }
        successMessage.style.display = 'block';
    });
}