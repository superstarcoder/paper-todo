  // ── Data ──────────────────────────────────────────────
  // ── Persistence ───────────────────────────────────────
  const STORAGE_KEY = 'tracker_v1';

  const DEFAULT_TASKS = [];

  const TITLE_MAX = 40;
  const NAME_MAX = 120;

  function enforceNameLimit(el) {
    if (el.textContent.length > NAME_MAX) {
      const sel = window.getSelection();
      el.textContent = el.textContent.slice(0, NAME_MAX);
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }

  function saveTaskName(el) {
    const id = parseInt(el.dataset.id);
    const t = tasks.find(t => t.id === id);
    if (!t) return;
    const val = el.textContent.trim();
    if (!val) { el.textContent = t.name; return; } // revert if cleared
    t.name = val;
    saveState();
  }

  function enforceTitleLimit(el) {
    if (el.textContent.length > TITLE_MAX) {
      // Trim and restore cursor at end
      const sel = window.getSelection();
      el.textContent = el.textContent.slice(0, TITLE_MAX);
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }

  function saveTitle() {
    const el = document.getElementById('site-title');
    const val = el.textContent.trim();
    if (!val) el.textContent = 'My Workspace'; // restore default if cleared
    saveState();
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        tasks, categories, catColors, colWidths, nextId,
        trackers, nextTrackerId,
        theme: currentTheme,
        title: document.getElementById('site-title')?.textContent.trim() || 'My Workspace'
      }));
    } catch(e) { /* storage full or unavailable */ }
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch(e) { return null; }
  }

  // Load persisted state or fall back to defaults
  const _saved = loadState();
  let tasks      = _saved?.tasks      ?? DEFAULT_TASKS;
  let categories = _saved?.categories ?? ['School', 'Work', 'Job', 'Personal'];
  let catColors  = _saved?.catColors  ?? {};
  let colWidths  = _saved?.colWidths  ?? {};
  let nextId     = _saved?.nextId     ?? 10;
  let trackers   = _saved?.trackers   ?? [];
  let nextTrackerId = _saved?.nextTrackerId ?? 1;

  let sortKey = 'dueDate';
  let sortDir = 1;
  let editingId = null;
  let todayFilterActive = false;

  const _td = new Date();
  const TODAY = `${_td.getFullYear()}-${String(_td.getMonth()+1).padStart(2,'0')}-${String(_td.getDate()).padStart(2,'0')}`;

  let filterType = 'all'; // 'all' | 'tasks' | 'habits'

  function setTypeFilter(type) {
    filterType = type;
    ['all','tasks','habits','tracker'].forEach(t => {
      const el = document.getElementById('tab-' + t);
      if (el) el.classList.toggle('active', t === type);
    });
    const isTracker = type === 'tracker';
    document.getElementById('task-table').style.display = isTracker ? 'none' : '';
    document.getElementById('tracker-panel').style.display = isTracker ? '' : 'none';
    qaSetVisible(!isTracker);
    if (isTracker) renderTrackers();
    else renderTable();
  }

  let currentTheme  = _saved?.theme  ?? 'light';
