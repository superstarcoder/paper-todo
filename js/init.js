  tasks.forEach(t => {
    if (t.completed && !t.completedAt) t.completedAt = TODAY + 'T10:00:00.000Z';
  });

  let _gridPendingSave = false;

  // Patch saveTask to also re-render grid/stats
  const _origSaveTask = saveTask;
  saveTask = function() {
    _origSaveTask();
    if (currentView === 'grid')  setTimeout(() => renderGrid(), 50);
    if (currentView === 'stats') setTimeout(() => renderStats(), 50);
  };

  // ── Settings Modal ────────────────────────────────────
  function openSettingsModal() {
    document.getElementById('settings-modal-bg').style.display = 'flex';
  }
  function closeSettingsModal() {
    document.getElementById('settings-modal-bg').style.display = 'none';
  }
  function closeSettingsModalBg(e) {
    if (e.target === document.getElementById('settings-modal-bg')) closeSettingsModal();
  }

  // ── CSV Export ────────────────────────────────────────
  function exportCSV() {
    const rows = [];
    const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;

    // ── Tasks & Habits ────────────────────────────────
    rows.push(['=== TASKS & HABITS ===']);
    rows.push(['ID','Name','Type','Category','Priority','Start Date','Due Date','Completed','Completed At','Details','Habit Days','Completed Dates']);
    tasks.forEach(t => {
      rows.push([
        t.id,
        esc(t.name),
        t.isHabit ? 'Habit' : 'Task',
        esc(t.category || ''),
        esc(t.priority || ''),
        t.startDate || '',
        t.dueDate || '',
        t.isHabit ? '' : (t.completed ? 'Yes' : 'No'),
        t.isHabit ? '' : (t.completedAt || ''),
        esc(t.details || ''),
        t.isHabit ? (t.habitDays || []).map(d => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d]).join(';') : '',
        t.isHabit ? (t.completedDates || []).join(';') : '',
      ]);
    });

    rows.push([]);

    // ── Trackers ──────────────────────────────────────
    rows.push(['=== TRACKERS ===']);
    trackers.forEach(tr => {
      rows.push([`Tracker: ${tr.label}`, `Unit: ${tr.unit || '—'}`]);
      rows.push(['Date', 'Value']);
      const sorted = [...tr.entries].sort((a,b) => a.date.localeCompare(b.date));
      sorted.forEach(e => rows.push([e.date, e.value]));
      rows.push([]);
    });

    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const title = document.getElementById('site-title')?.textContent?.trim() || 'workspace';
    const dateStr = toYMD(new Date());
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g,'-')}-${dateStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Quote ─────────────────────────────────────────────
  const FALLBACK_QUOTES = [
    { q: "The secret of getting ahead is getting started.", a: "Mark Twain" },
    { q: "It always seems impossible until it's done.", a: "Nelson Mandela" },
    { q: "Don't watch the clock; do what it does. Keep going.", a: "Sam Levenson" },
    { q: "Success is the sum of small efforts, repeated day in and day out.", a: "Robert Collier" },
    { q: "You don't have to be great to start, but you have to start to be great.", a: "Zig Ziglar" },
    { q: "Believe you can and you're halfway there.", a: "Theodore Roosevelt" },
    { q: "The only way to do great work is to love what you do.", a: "Steve Jobs" },
    { q: "Act as if what you do makes a difference. It does.", a: "William James" },
    { q: "Start where you are. Use what you have. Do what you can.", a: "Arthur Ashe" },
    { q: "Energy and persistence conquer all things.", a: "Benjamin Franklin" },
    { q: "What you do today can improve all your tomorrows.", a: "Ralph Marston" },
    { q: "Little by little, one travels far.", a: "J.R.R. Tolkien" },
    { q: "Do what you can, with what you have, where you are.", a: "Theodore Roosevelt" },
    { q: "Success usually comes to those who are too busy to be looking for it.", a: "Henry David Thoreau" },
    { q: "Opportunities don't happen. You create them.", a: "Chris Grosser" },
  ];

  async function loadQuote() {
    const textEl = document.getElementById('quote-text');
    const authorEl = document.getElementById('quote-author');
    const btn = document.querySelector('.quote-refresh');

    // Shimmer loading state
    textEl.className = 'quote-text loading';
    textEl.innerHTML = `<span class="quote-shimmer"></span><span class="quote-shimmer" style="width:60%;margin-top:8px;display:block;"></span>`;
    authorEl.className = 'quote-author';
    authorEl.textContent = '';
    btn.classList.add('spinning');
    setTimeout(() => btn.classList.remove('spinning'), 650);

    let quote = null;

    try {
      // ZenQuotes via allorigins CORS proxy
      const res = await fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent('https://zenquotes.io/api/random'), { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data[0]?.q) {
          quote = { q: data[0].q, a: data[0].a };
        }
      }
    } catch (_) {}

    // Fallback to local pool
    if (!quote) {
      quote = FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)];
    }

    // Render with animation
    textEl.className = 'quote-text revealed';
    textEl.textContent = quote.q;
    authorEl.className = 'quote-author revealed';
    authorEl.textContent = '— ' + quote.a;
  }

  // ── Init ──────────────────────────────────────────────
  // Apply persisted theme immediately (before render to avoid flash)
  if (currentTheme === 'dark')  document.documentElement.setAttribute('data-theme', 'dark');
  if (currentTheme === 'earth') { document.documentElement.setAttribute('data-theme', 'earth'); startEarthMode(); }

  rebuildCategorySelects();
  renderTable();
  loadQuote();

  // Restore persisted title
  if (_saved?.title) document.getElementById('site-title').textContent = _saved.title;

  // Sync theme switcher UI to restored state
  document.getElementById('btn-light').classList.toggle('active', currentTheme === 'light');
  document.getElementById('btn-dark').classList.toggle('active',  currentTheme === 'dark');
  document.getElementById('btn-earth').classList.toggle('active', currentTheme === 'earth');
