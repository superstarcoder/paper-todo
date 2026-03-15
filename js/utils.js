  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function formatDate(str) {
    if (!str) return '—';
    const d = new Date(str + 'T12:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric', year: 'numeric' });
  }

  function formatDateShort(str) {
    if (!str) return '—';
    const d = new Date(str + 'T12:00:00');
    return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
  }

  function toYMD(date) {
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  }

  function catStyle(cat) {
    if (!cat) return `background:#e5e7eb;color:#6b7280`; // fallback for empty/undefined
    if (catColors[cat]) {
      return `background:${catColors[cat].bg};color:${catColors[cat].color}`;
    }
    const builtIn = { School: 0, Work: 1, Job: 2, Personal: 3 };
    const idx = builtIn[cat] !== undefined
      ? builtIn[cat]
      : Math.abs(categories.indexOf(cat)) % CAT_PALETTE.length;
    const p = CAT_PALETTE[idx % CAT_PALETTE.length] || CAT_PALETTE[0];
    return `background:${p.bg};color:${p.color}`;
  }

  function catPill(cat) {
    const style = catStyle(cat);
    return `<span class="cat-pill" style="${style}">${escHtml(cat || '—')}</span>`;
  }

  function priorityBadge(p) {
    const map = { High: 'p-high', Medium: 'p-medium', Low: 'p-low', '': 'p-none' };
    const cls = map[p] || 'p-none';
    return `<span class="priority-dot ${cls}">${p || '—'}</span>`;
  }

  // ── Rebuild all category dropdowns ────────────────────
  function rebuildCategorySelects() {
    // Filter dropdown
    const filterSel = document.getElementById('filter-cat');
    const prevFilter = filterSel.value;
    filterSel.innerHTML = '<option value="">All Categories</option>';
    categories.forEach(c => {
      const o = document.createElement('option');
      o.value = c; o.textContent = c;
      filterSel.appendChild(o);
    });
    if (categories.includes(prevFilter)) filterSel.value = prevFilter;

    // Modal dropdown
    const modalSel = document.getElementById('f-cat');
    const prevModal = modalSel.value;
    modalSel.innerHTML = '<option value="">—</option>';
    categories.forEach(c => {
      const o = document.createElement('option');
      o.value = c; o.textContent = c;
      modalSel.appendChild(o);
    });
    if (categories.includes(prevModal)) modalSel.value = prevModal;

    // Quick-add row dropdown
    const qaSel = document.getElementById('qa-category');
    if (qaSel) {
      const prevQa = qaSel.value;
      qaSel.innerHTML = '<option value="">— Category</option>';
      categories.forEach(c => {
        const o = document.createElement('option');
        o.value = c; o.textContent = c;
        qaSel.appendChild(o);
      });
      if (categories.includes(prevQa)) qaSel.value = prevQa;
    }
  }

  // ── Today filter toggle ────────────────────────────────
  function toggleTodayFilter() {
    todayFilterActive = !todayFilterActive;
    const btn = document.getElementById('btn-today');
    btn.classList.toggle('active-today', todayFilterActive);
    renderTable();
  }

  // ── Sort ──────────────────────────────────────────────
  function sortBy(key) {
    if (sortKey === key) sortDir *= -1;
    else { sortKey = key; sortDir = 1; }
    // Reset icons
    ['name','category','priority','startDate','dueDate'].forEach(k => {
      const el = document.getElementById('sort-' + k);
      if (el) el.textContent = '↕';
      el?.parentElement?.classList.remove('sorted');
    });
    const el = document.getElementById('sort-' + key);
    if (el) { el.textContent = sortDir === 1 ? '↑' : '↓'; el.parentElement.classList.add('sorted'); }
    renderTable();
  }
