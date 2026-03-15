  // ── Quick-add row ──────────────────────────────────────
  function qaFocus() {
    // Pre-fill dates with today
    const startEl = document.getElementById('qa-start');
    const dueEl   = document.getElementById('qa-due');
    if (startEl && !startEl.value) startEl.value = TODAY;
    if (dueEl   && !dueEl.value)   dueEl.value   = TODAY;
  }

  function qaCommit() {
    const name = document.getElementById('qa-name').value.trim();
    if (!name) {
      document.getElementById('qa-name').focus();
      return;
    }
    const category = document.getElementById('qa-category').value;
    const priority = document.getElementById('qa-priority').value || 'Medium';
    const startDate = document.getElementById('qa-start').value || TODAY;
    const dueDate   = document.getElementById('qa-due').value   || TODAY;

    tasks.push({
      id: nextId++,
      name,
      details: '',
      category,
      priority,
      startDate,
      dueDate,
      completed: false,
      isHabit: false,
      habitDays: [],
      completedDates: []
    });

    // Reset row
    document.getElementById('qa-name').value = '';
    document.getElementById('qa-category').value = '';
    document.getElementById('qa-priority').value = 'Medium';
    document.getElementById('qa-start').value = '';
    document.getElementById('qa-due').value = '';

    renderTable();
    setTimeout(() => document.getElementById('qa-name').focus(), 80);
  }

  function qaKeydown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      qaCommit();
    }
    if (e.key === 'Escape') {
      document.getElementById('qa-name').value = '';
      document.getElementById('qa-name').blur();
    }
  }

  // Hide quick-add row when tracker tab is active
  function qaSetVisible(visible) {
    const el = document.getElementById('quick-add-tbody');
    if (el) el.style.display = visible ? '' : 'none';
  }

  // ── Render ────────────────────────────────────────────
  function renderTable() {
    const search = document.getElementById('search').value.toLowerCase();
    const filterCat = document.getElementById('filter-cat').value;
    const filterPri = document.getElementById('filter-priority').value;
    const filterStatus = document.getElementById('filter-status').value;

    let filtered = tasks.filter(t => {
      if (search && !t.name.toLowerCase().includes(search) && !(t.details||'').toLowerCase().includes(search)) return false;
      if (filterCat && t.category !== filterCat) return false;
      if (filterPri && t.priority !== filterPri) return false;
      if (filterStatus === 'active' && t.completed) return false;
      if (filterStatus === 'completed' && !t.completed) return false;
      if (todayFilterActive && t.dueDate !== TODAY) return false;
      if (filterType === 'tasks' && t.isHabit) return false;
      if (filterType === 'habits' && !t.isHabit) return false;
      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      let av = a[sortKey] || '', bv = b[sortKey] || '';
      if (sortKey === 'priority') {
        const order = { High: 0, Medium: 1, Low: 2, '': 3 };
        av = order[av] ?? 3; bv = order[bv] ?? 3;
      }
      if (av < bv) return -sortDir;
      if (av > bv) return sortDir;
      return 0;
    });

    const tbody = document.getElementById('tbody');
    tbody.innerHTML = '';

    if (filtered.length === 0) {
      const emptyMsg = todayFilterActive
        ? '<div class="icon">🎉</div><p>No tasks due today — enjoy your day!</p>'
        : '<div class="icon">📭</div><p>No tasks found. Try adjusting your filters.</p>';
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state">${emptyMsg}</div></td></tr>`;
    } else {
      filtered.forEach((t, idx) => {
        const tr = document.createElement('tr');
        if (t.completed) tr.classList.add('completed-row');
        tr.style.animation = `fadeIn 0.18s ease ${idx * 0.03}s both`;

        const isHabitDoneToday = t.isHabit && (t.completedDates || []).includes(TODAY);
        const dueCls = t.completed ? '' : (t.dueDate < TODAY ? 'overdue' : t.dueDate === TODAY ? 'today' : 'upcoming');
        const habitStreak = t.isHabit ? getHabitStreak(t) : 0;
        const dueLabel = t.isHabit
          ? `<div style="display:flex;flex-direction:column;gap:3px;">
               <span class="habit-badge">↻ ${habitDaysLabel(t.habitDays)}</span>
               <span style="font-size:11px;color:var(--text-faint);">${isHabitDoneToday ? '✓ Done today' : 'Not done today'} · ${habitStreak > 0 ? `🔥 ${habitStreak}-day streak` : 'No streak'}</span>
             </div>`
          : (t.dueDate ? formatDate(t.dueDate) : '—');
        const startLabel = t.startDate ? formatDate(t.startDate) : '—';

        tr.innerHTML = `
          <td style="padding-left:16px;">
            <button class="status-btn ${isHabitDoneToday || (!t.isHabit && t.completed) ? 'checked' : ''}" onclick="toggleDone(${t.id}, event)" title="${isHabitDoneToday || (!t.isHabit && t.completed) ? 'Mark incomplete' : 'Mark complete'}">
              <svg class="check-svg" viewBox="0 0 13 13">
                <polyline class="check-path" points="2,7 5,10 11,3"/>
              </svg>
            </button>
          </td>
          <td>
            <div class="task-name${t.isHabit && isHabitDoneToday ? ' habit-done-today' : ''}" contenteditable="true" spellcheck="false" data-id="${t.id}" onblur="saveTaskName(this)" oninput="enforceNameLimit(this)" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();} event.stopPropagation();" onclick="event.stopPropagation();">${escHtml(t.name)}</div>
            ${t.details ? `<div class="task-details">${escHtml(t.details)}</div>` : ''}
          </td>
          <td>${catPill(t.category)}</td>
          <td>${priorityBadge(t.priority)}</td>
          <td><span class="date-cell">${t.isHabit ? '' : startLabel}</span></td>
          <td><span class="date-cell ${t.isHabit ? '' : dueCls}">${dueLabel}${!t.isHabit && t.dueDate === TODAY && !t.completed ? ' ·&nbsp;Today' : ''}</span></td>
          <td>
            <div class="row-actions">
              <button class="action-btn" onclick="editTask(${t.id})">Edit</button>
              <button class="action-btn del" onclick="deleteTask(${t.id}, this)">✕ Delete</button>
            </div>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }

    updateStats();
    saveState();
  }

  let _wasAllDone = false;

  function updateStats() {
    const nonHabits = tasks.filter(t => !t.isHabit);
    const total = nonHabits.length;
    const done = nonHabits.filter(t => t.completed).length;
    const urgent = nonHabits.filter(t => t.priority === 'High' && !t.completed).length;
    const todayCount = nonHabits.filter(t => t.dueDate === TODAY && !t.completed).length;
    const pct = total > 0 ? Math.round(done / total * 100) : 0;

    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-done').textContent = done;
    document.getElementById('stat-urgent').textContent = urgent;
    document.getElementById('stat-today').textContent = todayCount;
    document.getElementById('pct-label').textContent = pct + '%';
    document.getElementById('progress-fill').style.width = pct + '%';

    const isEmpty = total === 0;
    document.getElementById('stats-row').style.display = isEmpty ? 'none' : '';
    document.getElementById('progress-wrap').style.display = isEmpty ? 'none' : '';

    // Dynamic start / end dates from tasks
    const dates = tasks.map(t => t.dueDate || t.startDate).filter(Boolean).sort();
    const startDates = tasks.map(t => t.startDate).filter(Boolean).sort();
    const earliest = startDates[0] || dates[0];
    const latest = dates[dates.length - 1];

    // 🎉 Celebrate when all tasks become complete
    const allDone = total > 0 && done === total; // habits excluded
    if (allDone && !_wasAllDone) {
      setTimeout(() => launchCelebration(), 200);
    }
    _wasAllDone = allDone;
  }

  // ── View Mode ─────────────────────────────────────────
  let currentView = 'list';

  function setView(v) {
    currentView = v;
    document.getElementById('view-list').style.display  = v === 'list'  ? '' : 'none';
    document.getElementById('view-grid').style.display  = v === 'grid'  ? '' : 'none';
    document.getElementById('view-stats').style.display = v === 'stats' ? '' : 'none';
    document.getElementById('btn-list').classList.toggle('active',  v === 'list');
    document.getElementById('btn-grid').classList.toggle('active',  v === 'grid');
    document.getElementById('btn-stats').classList.toggle('active', v === 'stats');
    if (v === 'grid')  renderGrid();
    if (v === 'stats') renderStats();
  }

  // ── Stats ─────────────────────────────────────────────
  let statsPeriod = 'day'; // 'day' | 'week' | 'month'

  function setStatsPeriod(p) {
    statsPeriod = p;
    renderStats();
  }

  function renderStats() {
    const container = document.getElementById('stats-page');

    // All tasks with completedAt — also seed pre-existing completed tasks with today if no timestamp
    const completedTasks = tasks.filter(t => t.completed);
    completedTasks.forEach(t => {
      if (!t.completedAt) t.completedAt = TODAY + 'T12:00:00.000Z';
    });

    const total = tasks.length;
    const done = completedTasks.length;
    const pending = total - done;
    const rate = total > 0 ? Math.round(done / total * 100) : 0;

    // ── Compute streak (consecutive days with at least 1 completion) ──
    const daySet = new Set(completedTasks.map(t => t.completedAt.slice(0,10)));
    let streak = 0;
    const d = new Date(TODAY);
    while (true) {
      const ymd = toYMD(d);
      if (daySet.has(ymd)) { streak++; d.setDate(d.getDate()-1); }
      else break;
    }

    // ── Build bar chart data ──────────────────────────────
    let buckets = []; // [{label, key, count, sublabel}]

    if (statsPeriod === 'day') {
      // Last 14 days
      for (let i = 13; i >= 0; i--) {
        const dd = new Date(TODAY);
        dd.setDate(dd.getDate() - i);
        const ymd = toYMD(dd);
        const count = completedTasks.filter(t => t.completedAt?.slice(0,10) === ymd).length;
        const isToday = ymd === TODAY;
        buckets.push({
          label: isToday ? 'Today' : dd.toLocaleDateString('en-US', {month:'short',day:'numeric'}),
          key: ymd,
          count,
          highlight: isToday
        });
      }
    } else if (statsPeriod === 'week') {
      // Last 10 weeks
      for (let i = 9; i >= 0; i--) {
        const wStart = new Date(TODAY);
        wStart.setDate(wStart.getDate() - wStart.getDay() - i * 7);
        wStart.setHours(0,0,0,0);
        const wEnd = new Date(wStart); wEnd.setDate(wEnd.getDate() + 6);
        const wStartYMD = toYMD(wStart), wEndYMD = toYMD(wEnd);
        const count = completedTasks.filter(t => {
          const dt = t.completedAt?.slice(0,10);
          return dt >= wStartYMD && dt <= wEndYMD;
        }).length;
        const isCurrent = wStartYMD <= TODAY && TODAY <= wEndYMD;
        buckets.push({
          label: wStart.toLocaleDateString('en-US', {month:'short',day:'numeric'}),
          key: wStartYMD,
          count,
          highlight: isCurrent
        });
      }
    } else {
      // Last 12 months
      for (let i = 11; i >= 0; i--) {
        const mm = new Date(TODAY);
        mm.setDate(1);
        mm.setMonth(mm.getMonth() - i);
        const y = mm.getFullYear(), m = mm.getMonth();
        const mStr = `${y}-${String(m+1).padStart(2,'0')}`;
        const count = completedTasks.filter(t => t.completedAt?.slice(0,7) === mStr).length;
        const isCurrent = mStr === TODAY.slice(0,7);
        buckets.push({
          label: mm.toLocaleDateString('en-US', {month:'short', year:'2-digit'}),
          key: mStr,
          count,
          highlight: isCurrent
        });
      }
    }

    const maxCount = Math.max(...buckets.map(b => b.count), 1);

    // ── Category breakdown ────────────────────────────────
    const catCounts = {};
    completedTasks.forEach(t => {
      const c = t.category || 'Uncategorized';
      catCounts[c] = (catCounts[c] || 0) + 1;
    });
    const sortedCats = Object.entries(catCounts).sort((a,b) => b[1]-a[1]);

    // ── Recent completions ────────────────────────────────
    const recentDone = [...completedTasks]
      .sort((a,b) => (b.completedAt||'').localeCompare(a.completedAt||''))
      .slice(0, 8);

    // ── SVG bar chart ─────────────────────────────────────
    const svgW = 700, svgH = 180;
    const padL = 28, padR = 8, padT = 24, padB = 36;
    const chartW = svgW - padL - padR;
    const chartH = svgH - padT - padB;
    const barCount = buckets.length;
    const barGap = 4;
    const barW = (chartW - barGap * (barCount - 1)) / barCount;

    // Grid lines
    const gridSteps = [0, 0.25, 0.5, 0.75, 1];
    let gridHtml = '';
    gridSteps.forEach(step => {
      const y = padT + chartH * (1 - step);
      const val = Math.round(maxCount * step);
      gridHtml += `<line class="grid-line" x1="${padL}" y1="${y}" x2="${svgW - padR}" y2="${y}"/>`;
      if (step > 0) gridHtml += `<text class="grid-label" x="${padL - 4}" y="${y + 3}">${val}</text>`;
    });

    // Bars
    let barsHtml = '';
    buckets.forEach((b, i) => {
      const x = padL + i * (barW + barGap);
      const barH = b.count > 0 ? Math.max(6, (b.count / maxCount) * chartH) : 0;
      const y = padT + chartH - barH;
      const fill = b.highlight ? 'var(--accent)' : (b.count > 0 ? 'var(--accent-mid)' : 'var(--border)');
      const opacity = b.count > 0 ? (b.highlight ? '1' : '0.65') : '0.3';
      barsHtml += `
        <rect class="bar-rect" x="${x}" y="${y}" width="${barW}" height="${barH}"
          fill="${fill}" opacity="${opacity}" rx="3"
          title="${b.label}: ${b.count} completed"/>
        <text class="bar-label" x="${x + barW/2}" y="${svgH - padB + 14}">${b.label}</text>
        ${b.count > 0 ? `<text class="bar-value" x="${x + barW/2}" y="${y - 5}">${b.count}</text>` : ''}
      `;
    });

    const svg = `
      <svg class="chart-svg" viewBox="0 0 ${svgW} ${svgH}" xmlns="http://www.w3.org/2000/svg" style="height:${svgH}px;">
        ${gridHtml}
        ${barsHtml}
      </svg>
    `;

    // ── Category bars HTML ────────────────────────────────
    const palette = ['#4a8a5e','#2563a8','#b5661f','#6b4fa0','#c44536','#3a7a4e','#9a6f00','#3355aa'];
    let catHtml = '';
    if (sortedCats.length === 0) {
      catHtml = '<p style="font-size:13px;color:var(--text-faint);padding:20px 0;text-align:center;">Complete some tasks to see category breakdown.</p>';
    } else {
      sortedCats.forEach(([cat, count], i) => {
        const pct = Math.round(count / done * 100);
        const cs = catColors[cat];
        const barColor = cs ? cs.bg : palette[i % palette.length];
        const labelStyle = cs ? `background:${cs.bg};color:${cs.color};border-radius:5px;padding:1px 7px;` : '';
        catHtml += `
          <div class="cat-bar-row">
            <div class="cat-bar-label" title="${escHtml(cat)}" style="${labelStyle}">${escHtml(cat)}</div>
            <div class="cat-bar-track">
              <div class="cat-bar-fill" style="width:${pct}%;background:${barColor};" data-pct="${pct}"></div>
            </div>
            <div class="cat-bar-count">${count}</div>
          </div>
        `;
      });
    }

    // ── Recent completions HTML ───────────────────────────
    function timeAgo(iso) {
      if (!iso) return '';
      const diff = Date.now() - new Date(iso).getTime();
      const mins = Math.floor(diff / 60000);
      const hrs = Math.floor(mins / 60);
      const days = Math.floor(hrs / 24);
      if (mins < 1) return 'just now';
      if (mins < 60) return `${mins}m ago`;
      if (hrs < 24) return `${hrs}h ago`;
      if (days < 7) return `${days}d ago`;
      return new Date(iso).toLocaleDateString('en-US', {month:'short',day:'numeric'});
    }

    let recentHtml = '';
    if (recentDone.length === 0) {
      recentHtml = '<p style="font-size:13px;color:var(--text-faint);padding:20px 0;text-align:center;">No completed tasks yet.</p>';
    } else {
      recentDone.forEach(t => {
        recentHtml += `
          <div class="recent-item">
            <div class="recent-check">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <polyline points="1.5,5.5 4,8 8.5,2" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div style="flex:1;min-width:0;">
              <div class="recent-name">${escHtml(t.name)}</div>
              <div class="recent-meta">${t.category ? `<span class="cat-pill" style="${catStyle(t.category)};padding:1px 7px;font-size:10px;">${escHtml(t.category)}</span>` : ''}</div>
            </div>
            <div class="recent-time">${timeAgo(t.completedAt)}</div>
          </div>
        `;
      });
    }

    const periodLabel = { day: 'Last 14 Days', week: 'Last 10 Weeks', month: 'Last 12 Months' }[statsPeriod];

    // ── Build habit sections ────────────────────────────
    const habits = tasks.filter(t => t.isHabit);
    const habitSectionsHtml = habits.map(h => {
      const doneSet = new Set(h.completedDates || []);
      const days = h.habitDays && h.habitDays.length > 0 ? h.habitDays : [0,1,2,3,4,5,6];
      const streak = getHabitStreak(h);

      // Count scheduled occurrences and completions in last 30 days
      let scheduled = 0, completed30 = 0;
      for (let i = 0; i < 30; i++) {
        const d = new Date(TODAY + 'T12:00:00');
        d.setDate(d.getDate() - i);
        if (days.includes(d.getDay())) {
          scheduled++;
          if (doneSet.has(toYMD(d))) completed30++;
        }
      }
      const rate30 = scheduled > 0 ? Math.round(completed30 / scheduled * 100) : 0;
      const totalDone = doneSet.size;

      // Build 8-week calendar heatmap (Sun-Sat columns, 8 weeks back)
      // Find the Sunday 8 weeks ago
      const today = new Date(TODAY + 'T12:00:00');
      const todayDow = today.getDay();
      const startSun = new Date(today);
      startSun.setDate(today.getDate() - todayDow - 7 * 7); // 8 weeks back, start of week

      let calHtml = '<div class="habit-cal">';
      // Day labels column
      calHtml += '<div class="habit-cal-week" style="margin-right:4px;">';
      ['S','M','T','W','T','F','S'].forEach(d => {
        calHtml += `<div style="width:14px;height:14px;font-size:9px;color:var(--text-faint);display:flex;align-items:center;justify-content:center;">${d}</div>`;
      });
      calHtml += '</div>';

      for (let w = 0; w < 8; w++) {
        calHtml += '<div class="habit-cal-week">';
        for (let dow = 0; dow < 7; dow++) {
          const d = new Date(startSun);
          d.setDate(startSun.getDate() + w * 7 + dow);
          const ymd = toYMD(d);
          const isFuture = ymd > TODAY;
          const isScheduled = days.includes(d.getDay());
          let cls = 'habit-cal-day';
          if (isFuture) cls += ' future';
          else if (!isScheduled) cls += ' skipped';
          else if (doneSet.has(ymd)) cls += ' done';
          const label = `${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()]} ${d.toLocaleDateString('en-US',{month:'short',day:'numeric'})}${doneSet.has(ymd) ? ' ✓' : ''}`;
          calHtml += `<div class="${cls}" title="${label}"></div>`;
        }
        calHtml += '</div>';
      }
      calHtml += '</div>';

      return `<div class="chart-card" style="margin-top:0;">
        <div class="chart-card-title">${escHtml(h.name)}</div>
        <div class="chart-card-sub">${habitDaysLabel(h.habitDays)} · ${h.category ? escHtml(h.category) : 'No category'}</div>
        <div style="display:flex;gap:12px;margin:10px 0 14px;flex-wrap:wrap;">
          <div class="stats-sum-card" style="flex:1;min-width:80px;padding:10px 14px;">
            <div class="sum-num" style="font-size:20px;">${streak}</div>
            <div class="sum-label">🔥 Streak</div>
            <div class="sum-sub">days in a row</div>
          </div>
          <div class="stats-sum-card" style="flex:1;min-width:80px;padding:10px 14px;">
            <div class="sum-num" style="font-size:20px;">${rate30}%</div>
            <div class="sum-label">30-day rate</div>
            <div class="sum-sub">${completed30} of ${scheduled} days</div>
          </div>
          <div class="stats-sum-card" style="flex:1;min-width:80px;padding:10px 14px;">
            <div class="sum-num" style="font-size:20px;">${totalDone}</div>
            <div class="sum-label">Total done</div>
            <div class="sum-sub">all time</div>
          </div>
        </div>
        <div style="font-size:11px;color:var(--text-faint);margin-bottom:6px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Last 8 weeks</div>
        ${calHtml}
        <div style="display:flex;gap:10px;margin-top:8px;font-size:11px;color:var(--text-faint);align-items:center;">
          <div style="display:flex;align-items:center;gap:4px;"><div style="width:10px;height:10px;border-radius:2px;background:var(--accent);"></div> Done</div>
          <div style="display:flex;align-items:center;gap:4px;"><div style="width:10px;height:10px;border-radius:2px;background:var(--surface2);border:1px solid var(--border);"></div> Missed</div>
          <div style="display:flex;align-items:center;gap:4px;"><div style="width:10px;height:10px;border-radius:2px;background:var(--surface2);opacity:0.4;border:1px solid var(--border);"></div> Not scheduled</div>
        </div>
      </div>`;
    }).join('');

    // ── Build tracker sections ──────────────────────────
    const trackerSectionsHtml = trackers.map(tr => {
      const sorted = [...tr.entries].sort((a,b) => a.date.localeCompare(b.date));
      if (sorted.length === 0) {
        return `<div class="chart-card" style="margin-top:0;">
          <div class="chart-card-title">${escHtml(tr.label)}${tr.unit ? ` <span style="font-size:12px;font-weight:400;color:var(--text-faint)">${escHtml(tr.unit)}</span>` : ''}</div>
          <div class="chart-card-sub">No entries yet</div>
          <div style="color:var(--text-faint);font-size:13px;padding:16px 0;font-style:italic;">Start logging data in the Tracker tab to see a chart here.</div>
        </div>`;
      }

      // Summary stats
      const vals = sorted.map(e => parseFloat(e.value)).filter(v => !isNaN(v));
      const latest = vals[vals.length - 1];
      const earliest = vals[0];
      const avg = vals.length ? Math.round((vals.reduce((a,b) => a+b,0) / vals.length) * 100) / 100 : 0;
      const min = Math.min(...vals);
      const max = Math.max(...vals);
      const totalChange = Math.round((latest - earliest) * 100) / 100;
      const changeSign = totalChange > 0 ? '+' : '';
      const u = escHtml(tr.unit || '');

      // R² of linear regression (time as x-index, value as y)
      let r2 = null;
      if (vals.length >= 3) {
        const n = vals.length;
        const xs = vals.map((_, i) => i);
        const xMean = (n - 1) / 2;
        const yMean = vals.reduce((a, b) => a + b, 0) / n;
        const ssxx = xs.reduce((s, x) => s + (x - xMean) ** 2, 0);
        const ssyy = vals.reduce((s, y) => s + (y - yMean) ** 2, 0);
        const ssxy = xs.reduce((s, x, i) => s + (x - xMean) * (vals[i] - yMean), 0);
        r2 = ssyy === 0 ? 1 : Math.round((ssxy * ssxy / (ssxx * ssyy)) * 1000) / 1000;
      }

      // SVG line chart
      const svgW = 600, svgH = 120, pad = { t: 12, b: 28, l: 40, r: 16 };
      const chartW = svgW - pad.l - pad.r;
      const chartH = svgH - pad.t - pad.b;
      const minVal = Math.min(...vals);
      const maxVal = Math.max(...vals);
      const valRange = maxVal - minVal || 1;

      const pts = sorted.map((e, i) => {
        const x = pad.l + (i / Math.max(sorted.length - 1, 1)) * chartW;
        const y = pad.t + chartH - ((parseFloat(e.value) - minVal) / valRange) * chartH;
        return { x, y, e };
      });

      const polyline = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

      // Gradient fill path
      const fillPath = `M${pts[0].x.toFixed(1)},${(pad.t + chartH).toFixed(1)} ` +
        pts.map(p => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') +
        ` L${pts[pts.length-1].x.toFixed(1)},${(pad.t + chartH).toFixed(1)} Z`;

      // Y axis labels
      const yLabels = [minVal, (minVal + maxVal) / 2, maxVal].map((v, i) => {
        const y = pad.t + chartH - (i / 2) * chartH;
        return `<text x="${pad.l - 6}" y="${y + 4}" font-size="9" fill="var(--text-faint)" text-anchor="end">${Math.round(v * 10) / 10}</text>`;
      }).join('');

      // X axis date labels (first, middle, last)
      const xLabels = [0, Math.floor((sorted.length-1)/2), sorted.length-1]
        .filter((v,i,a) => a.indexOf(v) === i && sorted[v])
        .map(i => {
          const x = pad.l + (i / Math.max(sorted.length - 1, 1)) * chartW;
          const d = new Date(sorted[i].date + 'T12:00:00');
          const lbl = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          return `<text x="${x.toFixed(1)}" y="${svgH - 6}" font-size="9" fill="var(--text-faint)" text-anchor="middle">${lbl}</text>`;
        }).join('');

      // Dots for each point
      const dots = pts.map(p =>
        `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3" fill="var(--accent)" opacity="0.85"/>`
      ).join('');

      // Linear regression line for chart
      let trendLine = '';
      if (vals.length >= 3) {
        const n = vals.length;
        const xMean = (n - 1) / 2;
        const yMean = vals.reduce((a, b) => a + b, 0) / n;
        const ssxx = vals.reduce((s, _, i) => s + (i - xMean) ** 2, 0);
        const ssxy = vals.reduce((s, y, i) => s + (i - xMean) * (y - yMean), 0);
        const slope = ssxy / ssxx;
        const intercept = yMean - slope * xMean;
        const yAtStart = intercept;
        const yAtEnd = slope * (n - 1) + intercept;
        const toChartY = v => pad.t + chartH - ((v - minVal) / valRange) * chartH;
        const x1 = pad.l, x2 = pad.l + chartW;
        const y1 = toChartY(yAtStart), y2 = toChartY(yAtEnd);
        trendLine = `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"
          stroke="var(--text-faint)" stroke-width="1.5" stroke-dasharray="4 3" opacity="0.6"/>`;
      }

      const trackerSvg = `<svg viewBox="0 0 ${svgW} ${svgH}" width="100%" style="display:block;overflow:visible;">
        <defs>
          <linearGradient id="tgrad-${tr.id}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.18"/>
            <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <path d="${fillPath}" fill="url(#tgrad-${tr.id})"/>
        ${trendLine}
        <polyline points="${polyline}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
        ${dots}
        ${yLabels}
        ${xLabels}
      </svg>`;

      return `<div class="chart-card" style="margin-top:0;">
        <div class="chart-card-title">${escHtml(tr.label)}${tr.unit ? ` <span style="font-size:12px;font-weight:400;color:var(--text-faint)">${u}</span>` : ''}</div>
        <div class="chart-card-sub">${sorted.length} entries · Latest: <strong>${latest} ${u}</strong></div>
        <div style="display:flex;gap:12px;margin:10px 0 14px;flex-wrap:wrap;">
          <div class="stats-sum-card" style="flex:1;min-width:80px;padding:10px 14px;">
            <div class="sum-num" style="font-size:20px;">${latest}</div>
            <div class="sum-label">Latest</div>
          </div>
          <div class="stats-sum-card" style="flex:1;min-width:80px;padding:10px 14px;">
            <div class="sum-num" style="font-size:20px;">${avg}</div>
            <div class="sum-label">Average</div>
          </div>
          <div class="stats-sum-card" style="flex:1;min-width:80px;padding:10px 14px;">
            <div class="sum-num" style="font-size:20px;">${min}</div>
            <div class="sum-label">Min</div>
          </div>
          <div class="stats-sum-card" style="flex:1;min-width:80px;padding:10px 14px;">
            <div class="sum-num" style="font-size:20px;">${max}</div>
            <div class="sum-label">Max</div>
          </div>
          <div class="stats-sum-card" style="flex:1;min-width:80px;padding:10px 14px;">
            <div class="sum-num" style="font-size:20px;color:${totalChange > 0 ? 'var(--danger)' : totalChange < 0 ? 'var(--accent)' : 'var(--text)'};">${changeSign}${totalChange}</div>
            <div class="sum-label">Total Change</div>
          </div>
          ${r2 !== null ? `<div class="stats-sum-card" style="flex:1;min-width:80px;padding:10px 14px;" title="R² measures how well a straight line fits your data. 1.0 = perfect linear trend, 0.0 = no trend.">
            <div class="sum-num" style="font-size:20px;">${r2.toFixed(3)}</div>
            <div class="sum-label">R² (trend fit)</div>
          </div>` : ''}
        </div>
        <div class="chart-area" style="padding:0;">${trackerSvg}</div>
      </div>`;
    }).join('');

    container.innerHTML = `
      <div class="stats-header-row">
        <div>
          <div class="stats-title">Your Tasks Progress</div>
          <div class="stats-subtitle">Completion history & insights</div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          ${streak > 0 ? `<span class="streak-badge">🔥 ${streak}-day streak</span>` : ''}
          <div class="period-toggle">
            <button class="period-btn ${statsPeriod==='day'?'active':''}" onclick="setStatsPeriod('day')">Daily</button>
            <button class="period-btn ${statsPeriod==='week'?'active':''}" onclick="setStatsPeriod('week')">Weekly</button>
            <button class="period-btn ${statsPeriod==='month'?'active':''}" onclick="setStatsPeriod('month')">Monthly</button>
          </div>
        </div>
      </div>

      <div class="stats-summary-row">
        <div class="stats-sum-card">
          <div class="sum-num">${done}</div>
          <div class="sum-label">Tasks Completed</div>
          <div class="sum-sub">${rate}% of all tasks</div>
        </div>
        <div class="stats-sum-card">
          <div class="sum-num">${pending}</div>
          <div class="sum-label">Still Pending</div>
          <div class="sum-sub">${total} total tasks</div>
        </div>
        <div class="stats-sum-card">
          <div class="sum-num">${completedTasks.filter(t => t.completedAt?.slice(0,10) === TODAY).length}</div>
          <div class="sum-label">Completed Today</div>
          <div class="sum-sub">${new Date().toLocaleDateString('en-US',{weekday:'long'})}</div>
        </div>
        <div class="stats-sum-card">
          <div class="sum-num">${streak}</div>
          <div class="sum-label">Day Streak</div>
          <div class="sum-sub">${streak > 0 ? 'Keep it up! 🔥' : 'Complete a task to start!'}</div>
        </div>
      </div>

      <div class="chart-card">
        <div class="chart-card-title">Completions Over Time</div>
        <div class="chart-card-sub">${periodLabel} · ${done} total completed</div>
        <div class="chart-area">${svg}</div>
      </div>

      <div class="stats-bottom-row">
        <div class="chart-card" style="margin-bottom:0;">
          <div class="chart-card-title">By Category</div>
          <div class="chart-card-sub">Completed tasks per category</div>
          ${catHtml}
        </div>
        <div class="chart-card" style="margin-bottom:0;">
          <div class="chart-card-title">Recently Completed</div>
          <div class="chart-card-sub">Your latest finished tasks</div>
          ${recentHtml}
        </div>
      </div>

      ${habits.length > 0 ? `
        <div style="margin-top:24px;border-top:1px solid var(--border);padding-top:24px;display:flex;flex-direction:column;gap:20px;">
          <div>
            <div class="stats-title" style="font-size:22px;">Your Habits</div>
            <div class="stats-subtitle">Daily completion history</div>
          </div>
          ${habitSectionsHtml}
        </div>` : ''}

      ${trackers.length > 0 ? `
        <div style="margin-top:24px;border-top:1px solid var(--border);padding-top:24px;display:flex;flex-direction:column;gap:20px;">
          <div>
            <div class="stats-title" style="font-size:22px;">Your Trackers</div>
            <div class="stats-subtitle">Quantitative data over time</div>
          </div>
          ${trackerSectionsHtml}
        </div>` : ''}
    `;

    // Animate bars in
    setTimeout(() => {
      container.querySelectorAll('.cat-bar-fill').forEach((el, i) => {
        const target = el.dataset.pct + '%';
        el.style.width = '0%';
        setTimeout(() => { el.style.transition = 'width 0.6s cubic-bezier(0.4,0,0.2,1)'; el.style.width = target; }, 50 + i * 60);
      });
    }, 0);
  }
