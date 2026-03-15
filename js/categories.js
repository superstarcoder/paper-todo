  // ── Category palette (cycles for custom ones) ─────────
  const CAT_PALETTE = [
    { bg: '#e8f0eb', color: '#2d5a3d' },
    { bg: '#e8f0fb', color: '#2563a8' },
    { bg: '#fdf0e6', color: '#b5661f' },
    { bg: '#f0ecf8', color: '#6b4fa0' },
    { bg: '#faeae8', color: '#c44536' },
    { bg: '#eaf2ec', color: '#3a7a4e' },
    { bg: '#fff8e6', color: '#9a6f00' },
    { bg: '#f0f4ff', color: '#3355aa' },
  ];

  // Preset color options for the picker (bg + text pairs)
  const COLOR_PRESETS = [
    { bg: '#e8f0eb', color: '#2d5a3d' },
    { bg: '#eaf2ec', color: '#3a7a4e' },
    { bg: '#e8f0fb', color: '#1a5080' },
    { bg: '#ddeef8', color: '#1a5f8a' },
    { bg: '#f0ecf8', color: '#6b3fa0' },
    { bg: '#ede8f8', color: '#5a30a0' },
    { bg: '#fdf0e6', color: '#b5661f' },
    { bg: '#f8ebe8', color: '#a04030' },
    { bg: '#faeae8', color: '#c44536' },
    { bg: '#fff8e6', color: '#9a6f00' },
    { bg: '#fef3cd', color: '#7a5800' },
    { bg: '#f0f4ff', color: '#3355aa' },
    { bg: '#e0e8ff', color: '#2244cc' },
    { bg: '#f5f0e8', color: '#6b5030' },
    { bg: '#f0f0f0', color: '#444444' },
    { bg: '#1e2a1e', color: '#7fc07f' },
    { bg: '#1a1e2a', color: '#7090d0' },
    { bg: '#2a1a2a', color: '#c080c0' },
    { bg: '#2a1a18', color: '#e08070' },
    { bg: '#2a2010', color: '#d0a040' },
  ];

  function openCatModal() {
    renderCatList();
    document.getElementById('cat-modal-bg').classList.add('open');
    setTimeout(() => document.getElementById('new-cat-input').focus(), 50);
  }

  function closeCatModal() {
    document.getElementById('cat-modal-bg').classList.remove('open');
    document.getElementById('new-cat-input').value = '';
  }

  function closeCatModalBg(e) {
    if (e.target === document.getElementById('cat-modal-bg')) closeCatModal();
  }

  function renderCatList() {
    const usedCats = new Set(tasks.map(t => t.category).filter(Boolean));
    const container = document.getElementById('cat-list');
    container.innerHTML = '';
    categories.forEach(cat => {
      const inUse = usedCats.has(cat);
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:8px 10px;background:var(--surface2);border-radius:8px;border:1px solid var(--border);animation:fadeIn 0.15s ease both;';
      row.innerHTML = `
        <span class="cat-pill cat-pill-btn" style="${catStyle(cat)};flex:1;" onclick="openCatColorPicker('${escHtml(cat)}', this)" title="Click to change color">${escHtml(cat)}</span>
        ${inUse ? `<span style="font-size:11px;color:var(--text-faint);">${tasks.filter(t=>t.category===cat).length} task${tasks.filter(t=>t.category===cat).length!==1?'s':''}</span>` : ''}
        <button onclick="deleteCategory('${escHtml(cat)}')"
          style="padding:3px 8px;border-radius:5px;border:1px solid var(--border);background:var(--surface);color:${inUse ? 'var(--text-faint)' : 'var(--danger)'};cursor:${inUse ? 'not-allowed' : 'pointer'};font-size:11px;font-family:'DM Sans',sans-serif;opacity:${inUse ? '0.5' : '1'};"
          ${inUse ? 'disabled title="Remove tasks from this category first"' : ''}>✕ Remove</button>
      `;
      container.appendChild(row);
    });
    if (categories.length === 0) {
      container.innerHTML = '<p style="font-size:13px;color:var(--text-faint);text-align:center;padding:12px 0;">No categories yet.</p>';
    }
  }

  let _activeCatPicker = null;

  function openCatColorPicker(cat, pillEl) {
    closeActivePicker();

    const current = catColors[cat] || null;

    const popover = document.createElement('div');
    popover.className = 'color-picker-popover';
    popover.id = 'cat-color-popover';

    const presetsHtml = COLOR_PRESETS.map((p) => {
      const isSelected = current && current.bg === p.bg && current.color === p.color;
      return `<div class="color-preset${isSelected ? ' selected' : ''}"
        style="background:${p.bg};color:${p.color};"
        onclick="applyCatColor('${cat}', '${p.bg}', '${p.color}')"
        title="${p.bg}">Aa</div>`;
    }).join('');

    popover.innerHTML = `
      <div class="color-picker-title">Color for "${escHtml(cat)}"</div>
      <div class="color-preset-grid">${presetsHtml}</div>
      <button class="color-picker-reset" onclick="resetCatColor('${escHtml(cat)}')">↺ Reset to default</button>
    `;

    // Attach to body so it escapes any overflow:hidden/scroll containers
    document.body.appendChild(popover);

    // Position it below the pill, flipping up if not enough space below
    const rect = pillEl.getBoundingClientRect();
    const popW = 232;
    const popH = 240; // approximate
    let top = rect.bottom + 6;
    let left = rect.left;

    // Flip up if it would go off the bottom of the viewport
    if (top + popH > window.innerHeight - 12) {
      top = rect.top - popH - 6;
    }
    // Keep within right edge
    if (left + popW > window.innerWidth - 12) {
      left = window.innerWidth - popW - 12;
    }

    popover.style.top  = top  + 'px';
    popover.style.left = left + 'px';

    _activeCatPicker = { cat, popover };

    setTimeout(() => {
      document.addEventListener('mousedown', onPickerOutsideClick);
    }, 0);
  }

  function onPickerOutsideClick(e) {
    const popover = document.getElementById('cat-color-popover');
    if (popover && !popover.contains(e.target) && !e.target.classList.contains('cat-pill-btn')) {
      closeActivePicker();
      document.removeEventListener('mousedown', onPickerOutsideClick);
    }
  }

  function closeActivePicker() {
    const existing = document.getElementById('cat-color-popover');
    if (existing) existing.remove();
    _activeCatPicker = null;
  }

  function applyCatColor(cat, bg, color) {
    catColors[cat] = { bg, color };
    closeActivePicker();
    renderCatList();
    renderTable();
    saveState();
    if (currentView === 'grid') renderGrid();
  }

  function resetCatColor(cat) {
    delete catColors[cat];
    closeActivePicker();
    renderCatList();
    renderTable();
    saveState();
    if (currentView === 'grid') renderGrid();
  }

  function addCategory() {
    const input = document.getElementById('new-cat-input');
    const name = input.value.trim();
    if (!name) return;
    if (categories.includes(name)) {
      input.style.borderColor = 'var(--danger)';
      setTimeout(() => input.style.borderColor = '', 1200);
      return;
    }
    categories.push(name);
    input.value = '';
    rebuildCategorySelects();
    renderCatList();
    if (currentView === 'grid') renderGrid();
  }

  function deleteCategory(cat) {
    const inUse = tasks.some(t => t.category === cat);
    if (inUse) return;
    categories = categories.filter(c => c !== cat);
    rebuildCategorySelects();
    renderCatList();
    renderTable();
    if (currentView === 'grid') renderGrid();
  }
