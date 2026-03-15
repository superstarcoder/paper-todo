  // ── Celebration ───────────────────────────────────────
  function launchCelebration() {
    // Remove any existing celebration
    document.getElementById('celebration-overlay')?.remove();

    // ── Confetti cannon ──────────────────────────────────
    const COLORS = [
      '#4a8a5e','#7bc47a','#a8d8a8', // greens
      '#f0c060','#e8a855','#f5d080', // golds
      '#6baed6','#9ecae1',           // blues
      '#c9a0dc','#e8c8f0',           // purples
      '#ff8fa3','#ffb3c1',           // pinks
      '#ffffff',                      // white
    ];

    const TOTAL = 160;
    const W = window.innerWidth;

    for (let i = 0; i < TOTAL; i++) {
      setTimeout(() => {
        const el = document.createElement('div');
        const color = COLORS[Math.floor(Math.random() * COLORS.length)];
        const isRect = Math.random() > 0.4;
        const size = 5 + Math.random() * 8;
        // Fire from two cannons — bottom-left and bottom-right
        const fromLeft = Math.random() > 0.5;
        const startX = fromLeft ? W * 0.15 + Math.random() * W * 0.1 : W * 0.75 + Math.random() * W * 0.1;
        const startY = window.innerHeight + 10;
        const angle = fromLeft
          ? -(50 + Math.random() * 60) * Math.PI / 180   // shoot upper-right
          : -(120 + Math.random() * 60) * Math.PI / 180; // shoot upper-left
        const speed = 400 + Math.random() * 600;
        const tx = Math.cos(angle) * speed;
        const ty = Math.sin(angle) * speed - 200;
        const rot = (Math.random() - 0.5) * 1440;
        const dur = 1.2 + Math.random() * 1.2;

        el.style.cssText = `
          position:fixed;
          left:${startX}px; top:${startY}px;
          width:${size}px; height:${isRect ? size * 0.5 : size}px;
          background:${color};
          border-radius:${isRect ? '1px' : '50%'};
          pointer-events:none;
          z-index:99998;
          animation: celebConfetti ${dur}s cubic-bezier(0.1,0.8,0.3,1) forwards;
          --tx:${tx}px; --ty:${ty}px; --rot:${rot}deg;
        `;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), dur * 1000 + 100);
      }, i * 12);
    }

    // ── Celebration banner ───────────────────────────────
    const overlay = document.createElement('div');
    overlay.id = 'celebration-overlay';
    overlay.innerHTML = `
      <div class="celeb-card">
        <div class="celeb-emoji">🎉</div>
        <div class="celeb-title">All done!</div>
        <div class="celeb-sub">You crushed every single task. Take a moment to celebrate.</div>
        <button class="celeb-btn" onclick="document.getElementById('celebration-overlay').remove()">✓ Thanks!</button>
      </div>
    `;
    document.body.appendChild(overlay);

    // Auto-dismiss after 6 seconds
    setTimeout(() => overlay.remove(), 6000);
  }

  // ── Confetti burst ────────────────────────────────────
  function spawnConfetti(x, y) {
    const colors = ['#4a8a5e','#2d5a3d','#7bc47a','#a8d8a8','#f0c060','#e8a855','#6baed6','#c9a0dc'];
    const count = 14;
    for (let i = 0; i < count; i++) {
      const el = document.createElement('div');
      el.className = 'confetti-particle';
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.8;
      const dist = 28 + Math.random() * 32;
      const tx = Math.cos(angle) * dist;
      const ty = Math.sin(angle) * dist - 10;
      const rot = (Math.random() - 0.5) * 540;
      const dur = 0.5 + Math.random() * 0.35;
      const size = 4 + Math.random() * 5;
      el.style.cssText = `
        left:${x}px; top:${y}px;
        --tx:${tx}px; --ty:${ty}px; --rot:${rot}deg; --dur:${dur}s;
        background:${colors[i % colors.length]};
        width:${size}px; height:${size}px;
        border-radius:${Math.random() > 0.4 ? '50%' : '2px'};
      `;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), dur * 1000 + 50);
    }
  }

  function spawnRipple(x, y) {
    const el = document.createElement('div');
    el.className = 'check-ripple';
    el.style.cssText = `left:${x}px; top:${y}px;`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 550);
  }

  // ── Actions ───────────────────────────────────────────
  function toggleDone(id, event) {
    const t = tasks.find(t => t.id === id);
    if (!t) return;

    const btn = event?.currentTarget;
    const tr = btn?.closest('tr');
    const rect = btn?.getBoundingClientRect();
    const cx = rect ? rect.left + rect.width / 2 : 0;
    const cy = rect ? rect.top + rect.height / 2 : 0;

    if (t.isHabit) {
      // Habits: toggle today in completedDates
      if (!t.completedDates) t.completedDates = [];
      const idx = t.completedDates.indexOf(TODAY);
      if (idx === -1) {
        t.completedDates.push(TODAY);
        t.completed = true;
      } else {
        t.completedDates.splice(idx, 1);
        t.completed = false;
      }
    } else {
      t.completed = !t.completed;
      // Track completion timestamp
      if (t.completed) {
        t.completedAt = new Date().toISOString();
      } else {
        delete t.completedAt;
      }
    }

    if (t.completed) {
      // Animate checkbox
      if (btn) {
        btn.classList.add('checking');
        btn.classList.add('checked');
        setTimeout(() => btn.classList.remove('checking'), 500);
      }
      // Row flash
      if (tr) {
        tr.classList.add('completed-row', 'completing');
        setTimeout(() => tr.classList.remove('completing'), 700);
      }
      // Confetti + ripple
      spawnConfetti(cx, cy);
      spawnRipple(cx, cy);
    } else {
      if (btn) {
        btn.classList.add('unchecking');
        btn.classList.remove('checked');
        setTimeout(() => btn.classList.remove('unchecking'), 350);
      }
      if (tr) {
        tr.classList.remove('completed-row');
        tr.classList.add('uncompleting');
        setTimeout(() => tr.classList.remove('uncompleting'), 400);
      }
    }

    // Defer stats update, don't re-render (keeps DOM smooth)
    setTimeout(() => {
      updateStats();
      saveState();
      if (t.isHabit) {
        // Habits need a full re-render — streak/status text is baked into row HTML
        renderTable();
      } else {
        // If status filter is active, re-render so the task disappears/appears correctly
        const filterStatus = document.getElementById('filter-status').value;
        if (filterStatus === 'active' || filterStatus === 'completed') {
          renderTable();
        }
      }
    }, 500);
  }

  function deleteTask(id, btnEl) {
    const t = tasks.find(t => t.id === id);
    if (!t) return;

    // Habits get a confirmation step; regular tasks delete immediately
    if (!t.isHabit) {
      tasks = tasks.filter(t => t.id !== id);
      renderTable();
      if (currentView === 'grid') renderGrid();
      return;
    }

    // Habit: inline confirm — swap button for Yes/No
    const wrap = btnEl ? btnEl.closest('.row-actions') : null;
    if (!wrap) {
      tasks = tasks.filter(t => t.id !== id);
      renderTable();
      return;
    }
    if (wrap.querySelector('.delete-confirm-wrap')) return;
    btnEl.style.display = 'none';
    const confirmEl = document.createElement('div');
    confirmEl.className = 'delete-confirm-wrap';
    confirmEl.innerHTML = `
      <span style="font-size:11px;color:var(--danger);font-weight:500;">Sure?</span>
      <button class="delete-confirm-yes" onclick="confirmDeleteTask(${id})">Yes</button>
      <button class="delete-confirm-no" onclick="cancelDeleteTask(this)">No</button>
    `;
    wrap.appendChild(confirmEl);
    wrap.style.opacity = '1';
  }

  function confirmDeleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    renderTable();
    if (currentView === 'grid') renderGrid();
  }

  function cancelDeleteTask(noBtn) {
    const wrap = noBtn.closest('.row-actions');
    if (!wrap) return;
    wrap.querySelector('.delete-confirm-wrap')?.remove();
    const delBtn = wrap.querySelector('.action-btn.del');
    if (delBtn) delBtn.style.display = '';
    wrap.style.opacity = '';
  }

  function deleteFromModal() {
    if (!editingId) return;
    const btn = document.getElementById('modal-delete-btn');
    // First click → ask to confirm
    if (btn.textContent.includes('Delete') && !btn.dataset.confirming) {
      btn.dataset.confirming = '1';
      btn.textContent = '⚠ Confirm delete?';
      btn.style.background = 'var(--danger)';
      btn.style.color = 'white';
      btn.style.border = '1px solid var(--danger)';
      btn.style.borderRadius = '8px';
      btn.style.padding = '9px 16px';
      // Auto-reset after 3s
      setTimeout(() => {
        if (btn.dataset.confirming) {
          delete btn.dataset.confirming;
          btn.textContent = '🗑 Delete';
          btn.style.background = '';
          btn.style.color = '';
          btn.style.border = '';
        }
      }, 3000);
      return;
    }
    // Second click → actually delete
    tasks = tasks.filter(t => t.id !== editingId);
    closeModal();
    renderTable();
    if (currentView === 'grid') renderGrid();
    if (currentView === 'stats') renderStats();
  }

  // ── Modal ─────────────────────────────────────────────
  function openModal(id = null) {
    editingId = id;
    const t = id ? tasks.find(t => t.id === id) : null;
    document.getElementById('modal-title').textContent = id ? 'Edit Task' : 'New Task';
    document.getElementById('f-name').value = t?.name || '';
    document.getElementById('f-details').value = t?.details || '';
    document.getElementById('f-cat').value = t?.category || '';
    document.getElementById('f-priority').value = t?.priority || 'Medium';
    document.getElementById('f-start').value = t?.startDate || TODAY;
    document.getElementById('f-due').value = t?.dueDate || TODAY;

    // Habit state
    _habitMode = t?.isHabit || false;
    _selectedDays = t?.habitDays ? [...t.habitDays] : [];
    const toggleWrap = document.querySelector('.habit-toggle-wrap');
    toggleWrap.classList.toggle('on', _habitMode);
    document.getElementById('habit-days-wrap').style.display = _habitMode ? '' : 'none';
    document.getElementById('f-due-group').style.display = _habitMode ? 'none' : '';
    document.querySelectorAll('.day-btn').forEach(btn => {
      btn.classList.toggle('selected', _selectedDays.includes(parseInt(btn.dataset.day)));
    });

    const delBtn = document.getElementById('modal-delete-btn');
    delBtn.style.display = id ? '' : 'none';
    delBtn.textContent = '🗑 Delete';
    delBtn.style.background = '';
    delBtn.style.color = '';
    delBtn.style.border = '';
    delete delBtn.dataset.confirming;
    delBtn.onclick = deleteFromModal;
    document.getElementById('modal-bg').classList.add('open');
    setTimeout(() => document.getElementById('f-name').focus(), 50);
  }

  function editTask(id) { openModal(id); }

  function closeModal() {
    document.getElementById('modal-bg').classList.remove('open');
    editingId = null;
  }

  function closeModalBg(e) {
    if (e.target === document.getElementById('modal-bg')) closeModal();
  }

  function saveTask() {
    const name = document.getElementById('f-name').value.trim();
    if (!name) { document.getElementById('f-name').focus(); return; }

    const data = {
      name,
      details: document.getElementById('f-details').value.trim(),
      category: document.getElementById('f-cat').value,
      priority: document.getElementById('f-priority').value,
      startDate: document.getElementById('f-start').value,
      dueDate: _habitMode ? '' : document.getElementById('f-due').value,
      isHabit: _habitMode,
      habitDays: _habitMode ? [..._selectedDays] : [],
    };

    if (editingId) {
      const t = tasks.find(t => t.id === editingId);
      if (t) Object.assign(t, data);
    } else {
      tasks.push({ id: nextId++, completed: false, ...data });
    }

    closeModal();
    renderTable();
  }

  // Keyboard shortcut
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeModal();
      closeTrackerModal();
      closeEntryModal();
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && document.getElementById('modal-bg').classList.contains('open')) {
      saveTask();
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && document.getElementById('tracker-modal-bg').classList.contains('open')) {
      saveTracker();
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && document.getElementById('entry-modal-bg').classList.contains('open')) {
      saveEntry();
    }
  });

  function setThemeMode(mode) {
    currentTheme = mode;
    const html = document.documentElement;
    html.removeAttribute('data-theme');
    if (mode === 'dark')  html.setAttribute('data-theme', 'dark');
    if (mode === 'earth') { html.setAttribute('data-theme', 'earth'); startEarthMode(); }
    else stopEarthMode();
    document.getElementById('btn-light').classList.toggle('active', mode === 'light');
    document.getElementById('btn-dark').classList.toggle('active',  mode === 'dark');
    document.getElementById('btn-earth').classList.toggle('active', mode === 'earth');
    saveState();
  }
