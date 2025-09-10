async function renderCalendar(containerId, year, month, onDateClick, apiEndpoint) {
    const calendarEl = document.getElementById(containerId);
    if (!calendarEl) return;

    calendarEl.innerHTML = '<div class="calendar-header">일</div><div class="calendar-header">월</div><div class="calendar-header">화</div><div class="calendar-header">수</div><div class="calendar-header">목</div><div class="calendar-header">금</div><div class="calendar-header">토</div>';

    const token = localStorage.getItem('accessToken');
    let reservations = [];
    let settings = {};

    try {
        const settingsResponse = await fetch('/api/admin/settings', { headers: { 'Authorization': `Bearer ${token}` } });
        if (settingsResponse.ok) {
            const settingsData = await settingsResponse.json();
            settingsData.forEach(s => settings[s.key] = s.value);
        }

        const resResponse = await fetch(`${apiEndpoint}?year=${year}&month=${month}`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (resResponse.ok) {
            reservations = await resResponse.json();
        }
    } catch (e) {
        console.error("Failed to fetch calendar data", e);
    }

    const maxTeams = parseInt(settings.max_concurrent_teams) || 6;
    const firstDayOfMonth = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();

    for (let i = 0; i < firstDayOfMonth; i++) {
        calendarEl.appendChild(document.createElement('div'));
    }

    for (let i = 1; i <= daysInMonth; i++) {
        const dayCell = document.createElement('div');
        dayCell.className = 'day-cell';
        const currentDateStr = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        dayCell.dataset.date = currentDateStr;

        const dayReservations = reservations.filter(r => r.reservation_date === currentDateStr);
        const slots = { MORNING: 0, LUNCH: 0, DINNER: 0 };
        dayReservations.forEach(r => slots[r.time_slot]++);

        let slotsHtml = '<div class="slot-container">';
        for (const [slot, count] of Object.entries(slots)) {
            const status = count >= maxTeams ? 'full' : 'available';
            slotsHtml += `<div class="slot-bar ${status}">${slot.charAt(0)} (${count}/${maxTeams})</div>`;
        }
        slotsHtml += '</div>';

        dayCell.innerHTML = `<div class="day-number">${i}</div>${slotsHtml}`;
        dayCell.addEventListener('click', () => onDateClick(currentDateStr, reservations));
        calendarEl.appendChild(dayCell);
    }
}
