  function getWeekStart(offset = 0) {
    const d = new Date();
    const day = d.getDay(); // 0=Sun
    const diff = d.getDate() - day; // Sunday start
    const sun = new Date(d.setDate(diff + offset * 7));
    sun.setHours(0,0,0,0);
    return sun;
  }

  function addDays(date, n) {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
  }

  let gridWeekOffset = 0; // 0 = current week

  const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const DAY_CLASS = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];

  // Grid columns are exactly the shared `categories` array — no separate list needed.
  // Map a task to its grid column: direct 1-to-1 match on category name.
  function taskToGridCol(t) {
    return t.category || '';
  }

  function renderGrid() {
    const container = document.getElementById('grid-container');
    const weekStart = getWeekStart(gridWeekOffset);
    const weekEnd = addDays(weekStart, 6);

    // Nav bar
    const navHtml = `
      <div class="grid-nav">
        <div>
          <div class="grid-nav-title">Weekly Planner</div>
          <div class="grid-nav-subtitle">${weekStart.toLocaleDateString('en-US',{month:'short',day:'numeric'})} – ${weekEnd.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</div>
          ${tasks.some(t => t.isHabit) ? `<div style="font-size:11px;color:var(--text-faint);display:flex;align-items:center;gap:4px;"><span style="background:var(--accent-light);color:var(--accent);border-radius:4px;padding:1px 7px;font-weight:600;">↻ Habits hidden</span> — view in List tab</div>` : ''}
        </div>
        <button class="today-pill" onclick="gridWeekOffset=0;renderGrid()">Today</button>
        <button class="nav-arrow" onclick="gridWeekOffset--;renderGrid()">‹</button>
        <button class="nav-arrow" onclick="gridWeekOffset++;renderGrid()">›</button>
      </div>
    `;

    // Build table
    let html = `<table class="grid-table" id="grid-table">`;

    // Colgroup — use stored widths if available
    const DEFAULT_CAT_WIDTH = 150;
    const DAY_COL_WIDTH = 110;
    html += `<colgroup><col class="col-day" style="width:${DAY_COL_WIDTH}px;">`;
    categories.forEach(c => {
      const w = colWidths[c] || DEFAULT_CAT_WIDTH;
      html += `<col class="col-cat" data-cat="${escHtml(c)}" style="width:${w}px;">`;
    });
    html += `</colgroup>`;

    // Header row — add resize handle to each category header
    html += `<thead><tr>`;
    html += `<th class="grid-col-header" style="width:${DAY_COL_WIDTH}px;">Day</th>`;
    categories.forEach((c, i) => {
      const isLast = i === categories.length - 1;
      html += `<th class="grid-col-header" data-cat="${escHtml(c)}" style="width:${colWidths[c] || DEFAULT_CAT_WIDTH}px;">${escHtml(c)}${!isLast ? `<div class="col-resize-handle" data-cat="${escHtml(c)}"></div>` : ''}</th>`;
    });
    html += `</tr></thead><tbody>`;

    // One row per day of the week
    for (let d = 0; d < 7; d++) {
      const date = addDays(weekStart, d);
      const ymd = toYMD(date);
      const isToday = ymd === TODAY;
      const dayName = DAY_NAMES[date.getDay()];
      const dayCls = DAY_CLASS[date.getDay()];
      const dateNum = date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });

      html += `<tr class="day-${dayCls}${isToday ? ' day-today' : ''}">`;

      // Day label cell
      html += `<td class="grid-day-cell">
        <div class="grid-day-label${isToday ? ' is-today' : ''}">${isToday ? '★ ' : ''}${dayName}</div>
        <div class="grid-day-num">${dateNum}</div>
      </td>`;

      // Category columns
      categories.forEach((cat, ci) => {
        // Find tasks due on this date assigned to this column
        const cellTasks = tasks.filter(t => {
          const col = taskToGridCol(t);
          return !t.isHabit && t.dueDate === ymd && col === cat;
        });

        const rangeTasks = tasks.filter(t => {
          const col = taskToGridCol(t);
          return !t.isHabit && col === cat && t.startDate && t.startDate < ymd && t.dueDate > ymd;
        });

        html += `<td class="grid-cell"
          onclick="gridCellClick('${ymd}','${cat.replace(/'/g,"\\'")}', event)"
          ondragover="gridDragOver(event)"
          ondragleave="gridDragLeave(event)"
          ondrop="gridDrop(event, '${ymd}', '${cat.replace(/'/g,"\\'")}')">`;

        cellTasks.forEach(t => {
          const priorityCls = t.priority === 'High' ? 'chip-high' : t.priority === 'Medium' ? 'chip-medium' : t.priority === 'Low' ? 'chip-low' : 'chip-none';
          html += `<div class="grid-chip ${priorityCls}${t.completed ? ' chip-done' : ''}"
            draggable="true"
            ondragstart="gridDragStart(event, ${t.id})"
            ondragend="gridDragEnd(event)">
            <div class="chip-checkbox ${t.completed ? 'checked' : ''}" onclick="gridChipCheck(${t.id}, event)" title="Mark ${t.completed ? 'incomplete' : 'complete'}">
              <svg viewBox="0 0 8 8" fill="none">
                <polyline points="1,4.5 3,6.5 7,1.5" stroke="var(--accent)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div class="chip-body" onclick="gridChipEdit(${t.id}, event)" title="Edit task">
              <span class="chip-text">${escHtml(t.name)}</span>
            </div>
          </div>`;
        });

        rangeTasks.forEach(t => {
          if (cellTasks.find(ct => ct.id === t.id)) return;
          html += `<div class="grid-chip chip-none" style="opacity:0.5;border-style:dashed;">
            <div class="chip-checkbox ${t.completed ? 'checked' : ''}" onclick="gridChipCheck(${t.id}, event)" title="Mark ${t.completed ? 'incomplete' : 'complete'}">
              <svg viewBox="0 0 8 8" fill="none">
                <polyline points="1,4.5 3,6.5 7,1.5" stroke="var(--text-muted)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div class="chip-body" onclick="gridChipEdit(${t.id}, event)" title="Edit task">
              <span class="chip-text" style="font-style:italic;opacity:0.8;">${escHtml(t.name)}</span>
            </div>
          </div>`;
        });

        html += `<button class="grid-add-btn" onclick="gridAddTask('${ymd}','${cat.replace(/'/g,"\\'")}', event)">＋ add task</button>`;
        html += `</td>`;
      });

      html += `</tr>`;
    }

    html += `</tbody></table>`;
    container.innerHTML = navHtml + html;
    initColResize();
  }

  // ── Grid drag & drop ─────────────────────────────────
  let _dragTaskId = null;

  function gridDragStart(event, id) {
    _dragTaskId = id;
    event.dataTransfer.effectAllowed = 'move';
    event.currentTarget.classList.add('chip-dragging');
  }

  function gridDragEnd(event) {
    event.currentTarget.classList.remove('chip-dragging');
    document.querySelectorAll('.grid-cell.drag-over').forEach(el => el.classList.remove('drag-over'));
    _dragTaskId = null;
  }

  function gridDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    event.currentTarget.classList.add('drag-over');
  }

  function gridDragLeave(event) {
    // Only remove if leaving the cell itself, not a child
    if (!event.currentTarget.contains(event.relatedTarget)) {
      event.currentTarget.classList.remove('drag-over');
    }
  }

  function gridDrop(event, ymd, cat) {
    event.preventDefault();
    event.currentTarget.classList.remove('drag-over');
    if (_dragTaskId === null) return;
    const t = tasks.find(t => t.id === _dragTaskId);
    if (!t) return;
    t.dueDate = ymd;
    if (cat) t.category = cat;
    saveState();
    renderGrid();
  }

  function gridChipCheck(id, event) {
    event.stopPropagation();
    const t = tasks.find(t => t.id === id);
    if (!t) return;
    const checkbox = event.currentTarget;
    t.completed = !t.completed;
    if (t.completed) {
      t.completedAt = new Date().toISOString();
      checkbox.classList.add('checked');
      checkbox.closest('.grid-chip').classList.add('chip-done');
    } else {
      delete t.completedAt;
      checkbox.classList.remove('checked');
      checkbox.closest('.grid-chip').classList.remove('chip-done');
    }

    // Animate checkbox bounce
    checkbox.animate([
      { transform: 'scale(1)' },
      { transform: 'scale(0.7) rotate(-10deg)' },
      { transform: 'scale(1.3) rotate(5deg)' },
      { transform: 'scale(1)' }
    ], { duration: 350, easing: 'cubic-bezier(0.36, 0.07, 0.19, 0.97)' });

    // Confetti if completing
    if (t.completed) {
      const rect = checkbox.getBoundingClientRect();
      spawnConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      spawnRipple(rect.left + rect.width / 2, rect.top + rect.height / 2);
    }

    setTimeout(() => { updateStats(); saveState(); }, 50);
  }

  function gridChipEdit(id, event) {
    event.stopPropagation();
    openModal(id);
  }

  function gridCellClick(ymd, cat, event) {
    // Only trigger if clicking on empty space (not a chip)
    if (event.target.classList.contains('grid-cell')) {
      gridAddTask(ymd, cat, event);
    }
  }

  function gridAddTask(ymd, cat, event) {
    event.stopPropagation();
    editingId = null;
    document.getElementById('modal-title').textContent = 'New Task';
    document.getElementById('f-name').value = '';
    document.getElementById('f-details').value = '';
    document.getElementById('f-cat').value = categories.includes(cat) ? cat : '';
    document.getElementById('f-priority').value = '';
    document.getElementById('f-start').value = ymd;
    document.getElementById('f-due').value = ymd;
    document.getElementById('modal-bg').classList.add('open');
    _gridPendingSave = true;
    setTimeout(() => document.getElementById('f-name').focus(), 50);
  }

  // ── Column resize state ───────────────────────────────
  const COL_DEFAULT_WIDTH = 150;
  const COL_MIN_WIDTH = 80;

  function initColResize() {
    const container = document.getElementById('grid-container');
    if (!container) return;

    container.querySelectorAll('.col-resize-handle').forEach(handle => {
      handle.addEventListener('mousedown', onResizeMouseDown);
      handle.addEventListener('dblclick', onResizeDblClick);
    });
  }

  function onResizeDblClick(e) {
    e.preventDefault();
    e.stopPropagation();
    const cat = e.currentTarget.dataset.cat;
    delete colWidths[cat];
    applyColWidth(cat, COL_DEFAULT_WIDTH);
    saveState();
  }

  function onResizeMouseDown(e) {
    e.preventDefault();
    e.stopPropagation();

    const handle = e.currentTarget;
    const cat = handle.dataset.cat;
    const table = document.getElementById('grid-table');
    if (!table) return;

    // Find the <col> element for this category
    const col = table.querySelector(`col[data-cat="${CSS.escape(cat)}"]`);
    const th  = table.querySelector(`th[data-cat="${CSS.escape(cat)}"]`);
    if (!col || !th) return;

    const startX = e.clientX;
    const startW = th.getBoundingClientRect().width;

    handle.classList.add('dragging');
    document.body.classList.add('col-resizing');

    function onMouseMove(e) {
      const delta = e.clientX - startX;
      const newW = Math.max(COL_MIN_WIDTH, Math.round(startW + delta));
      colWidths[cat] = newW;
      applyColWidth(cat, newW);
    }

    function onMouseUp() {
      handle.classList.remove('dragging');
      document.body.classList.remove('col-resizing');
      saveState();
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  function applyColWidth(cat, w) {
    const table = document.getElementById('grid-table');
    if (!table) return;
    const escaped = CSS.escape(cat);
    const col = table.querySelector(`col[data-cat="${escaped}"]`);
    const th  = table.querySelector(`th[data-cat="${escaped}"]`);
    if (col) col.style.width = w + 'px';
    if (th)  th.style.width  = w + 'px';
  }
