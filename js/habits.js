  // ── Habit modal helpers ───────────────────────────────
  let _habitMode = false;
  let _selectedDays = [];

  function toggleHabitMode() {
    _habitMode = !_habitMode;
    const wrap = document.querySelector('.habit-toggle-wrap');
    wrap.classList.toggle('on', _habitMode);
    document.getElementById('habit-days-wrap').style.display = _habitMode ? '' : 'none';
    document.getElementById('f-due-group').style.display = _habitMode ? 'none' : '';
  }

  function toggleDay(day) {
    const idx = _selectedDays.indexOf(day);
    if (idx === -1) _selectedDays.push(day);
    else _selectedDays.splice(idx, 1);
    document.querySelectorAll('.day-btn').forEach(btn => {
      btn.classList.toggle('selected', _selectedDays.includes(parseInt(btn.dataset.day)));
    });
  }

  const DAY_ABBR = ['Su','M','T','W','Th','F','Sa'];
  function habitDaysLabel(days) {
    if (!days || days.length === 0) return 'No days set';
    if (days.length === 7) return 'Every day';
    if (days.length === 5 && [1,2,3,4,5].every(d => days.includes(d))) return 'Weekdays';
    if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Weekends';
    return days.slice().sort((a,b)=>a-b).map(d => DAY_ABBR[d]).join(' · ');
  }

  function getHabitStreak(t) {
    if (!t.completedDates || t.completedDates.length === 0) return 0;
    const doneSet = new Set(t.completedDates);
    const days = t.habitDays && t.habitDays.length > 0 ? t.habitDays : [0,1,2,3,4,5,6];
    let streak = 0;
    // Walk backwards from today
    const d = new Date(TODAY + 'T12:00:00');
    for (let i = 0; i < 365; i++) {
      const ymd = toYMD(d);
      const dow = d.getDay();
      if (days.includes(dow)) {
        if (doneSet.has(ymd)) streak++;
        else if (ymd !== TODAY) break; // allow today to be not yet done without breaking
      }
      d.setDate(d.getDate() - 1);
    }
    return streak;
  }
