  // ── Tracker ───────────────────────────────────────────
  let editingTrackerId = null;
  let editingEntryDate = null;

  function renderTrackers() {
    const list = document.getElementById('tracker-list');
    const empty = document.getElementById('tracker-empty');
    if (trackers.length === 0) {
      list.innerHTML = '';
      empty.style.display = '';
      return;
    }
    empty.style.display = 'none';
    list.innerHTML = trackers.map(tr => renderTrackerCard(tr)).join('');
  }

  function renderTrackerCard(tr) {
    const sorted = [...tr.entries].sort((a,b) => b.date.localeCompare(a.date));
    const recent = sorted.slice(0, 10);
    let entriesHtml = '';
    if (recent.length === 0) {
      entriesHtml = `<div class="tracker-no-entries">No entries yet — log one below.</div>`;
    } else {
      entriesHtml = recent.map((e, i) => {
        const isToday = e.date === TODAY;
        const dateLabel = isToday ? 'Today' : formatDateShort(e.date);
        let deltaHtml = '';
        if (i < recent.length - 1) {
          const diff = parseFloat(e.value) - parseFloat(recent[i+1].value);
          if (!isNaN(diff) && diff !== 0) {
            const cls = diff > 0 ? 'up' : 'down';
            const sign = diff > 0 ? '+' : '';
            deltaHtml = `<span class="entry-delta ${cls}">${sign}${Math.round(diff * 100) / 100}</span>`;
          }
        }
        return `<div class="tracker-entry-row">
          <span class="entry-date${isToday ? ' is-today' : ''}">${dateLabel}</span>
          <span class="entry-value">${escHtml(String(e.value))}</span>
          <span class="entry-unit-inline">${escHtml(tr.unit || '')}</span>
          ${deltaHtml}
          <div class="entry-row-actions">
            <button class="entry-action-btn" onclick="openEntryModal(${tr.id}, '${e.date}')">Edit</button>
            <button class="entry-action-btn del" onclick="deleteEntry(${tr.id}, '${e.date}')">✕</button>
          </div>
        </div>`;
      }).join('');
      if (sorted.length > 10) {
        entriesHtml += `<div style="font-size:11px;color:var(--text-faint);padding:4px 8px;">${sorted.length - 10} older entries hidden</div>`;
      }
    }
    return `<div class="tracker-card">
      <div class="tracker-card-header">
        <span class="tracker-label">${escHtml(tr.label)}</span>
        <span class="tracker-unit">${escHtml(tr.unit || '')}</span>
        <div class="tracker-card-actions">
          <button class="action-btn" onclick="openTrackerModal(${tr.id})">Edit</button>
          <button class="action-btn del" onclick="deleteTrackerConfirm(${tr.id}, this)">✕ Delete</button>
        </div>
      </div>
      <div class="tracker-entries">${entriesHtml}</div>
      <div class="tracker-add-entry">
        <input type="date" id="qadate-${tr.id}" value="${TODAY}">
        <input type="number" id="qaval-${tr.id}" placeholder="Value" step="any" onkeydown="if(event.key==='Enter') quickAddEntry(${tr.id})">
        <button class="tracker-add-btn" onclick="quickAddEntry(${tr.id})">＋ Log</button>
      </div>
    </div>`;
  }

  function quickAddEntry(tid) {
    const tr = trackers.find(t => t.id === tid);
    if (!tr) return;
    const date  = document.getElementById('qadate-' + tid)?.value;
    const value = document.getElementById('qaval-' + tid)?.value?.trim();
    if (!date || value === '' || value === undefined) { document.getElementById('qaval-' + tid)?.focus(); return; }
    const existing = tr.entries.find(e => e.date === date);
    if (existing) existing.value = value;
    else tr.entries.push({ date, value });
    saveState();
    renderTrackers();
  }

  function deleteEntry(tid, date) {
    const tr = trackers.find(t => t.id === tid);
    if (!tr) return;
    tr.entries = tr.entries.filter(e => e.date !== date);
    saveState();
    renderTrackers();
  }

  function deleteTrackerConfirm(tid, btn) {
    if (btn.dataset.confirming) {
      trackers = trackers.filter(t => t.id !== tid);
      saveState();
      renderTrackers();
    } else {
      btn.dataset.confirming = '1';
      btn.textContent = 'Sure?';
      btn.style.color = 'var(--danger)';
      btn.style.borderColor = 'var(--danger)';
      setTimeout(() => {
        if (btn.dataset.confirming) {
          btn.textContent = '✕ Delete';
          btn.style.color = '';
          btn.style.borderColor = '';
          delete btn.dataset.confirming;
        }
      }, 2500);
    }
  }

  function openTrackerModal(id = null) {
    editingTrackerId = id;
    const tr = id ? trackers.find(t => t.id === id) : null;
    document.getElementById('tracker-modal-title').textContent = id ? 'Edit Tracker' : 'New Tracker';
    document.getElementById('tf-label').value = tr?.label || '';
    document.getElementById('tf-unit').value  = tr?.unit  || '';
    const delBtn = document.getElementById('tracker-delete-btn');
    delBtn.style.display = id ? '' : 'none';
    delBtn.textContent = '🗑 Delete';
    delBtn.style.color = '';
    delete delBtn.dataset.confirming;
    document.getElementById('tracker-modal-bg').classList.add('open');
    setTimeout(() => document.getElementById('tf-label').focus(), 50);
  }

  function closeTrackerModal() {
    document.getElementById('tracker-modal-bg').classList.remove('open');
    editingTrackerId = null;
  }

  function closeTrackerModalBg(e) {
    if (e.target === document.getElementById('tracker-modal-bg')) closeTrackerModal();
  }

  function saveTracker() {
    const label = document.getElementById('tf-label').value.trim();
    if (!label) { document.getElementById('tf-label').focus(); return; }
    const unit = document.getElementById('tf-unit').value.trim();
    if (editingTrackerId) {
      const tr = trackers.find(t => t.id === editingTrackerId);
      if (tr) { tr.label = label; tr.unit = unit; }
    } else {
      trackers.push({ id: nextTrackerId++, label, unit, entries: [] });
    }
    saveState();
    closeTrackerModal();
    renderTrackers();
  }

  function deleteTrackerFromModal() {
    const delBtn = document.getElementById('tracker-delete-btn');
    if (delBtn.dataset.confirming) {
      trackers = trackers.filter(t => t.id !== editingTrackerId);
      saveState();
      closeTrackerModal();
      renderTrackers();
    } else {
      delBtn.dataset.confirming = '1';
      delBtn.textContent = '🗑 Sure?';
      delBtn.style.color = 'var(--danger)';
    }
  }

  function openEntryModal(tid, date) {
    const tr = trackers.find(t => t.id === tid);
    if (!tr) return;
    const entry = tr.entries.find(e => e.date === date);
    editingTrackerId = tid;
    editingEntryDate = date;
    document.getElementById('entry-modal-title').textContent = `Edit — ${escHtml(tr.label)}`;
    document.getElementById('ef-value-label').textContent = `Value${tr.unit ? ' (' + tr.unit + ')' : ''}`;
    document.getElementById('ef-date').value  = date;
    document.getElementById('ef-value').value = entry?.value || '';
    const delBtn = document.getElementById('entry-delete-btn');
    delBtn.style.display = '';
    delBtn.textContent = '🗑 Delete';
    delBtn.style.color = '';
    delete delBtn.dataset.confirming;
    document.getElementById('entry-modal-bg').classList.add('open');
    setTimeout(() => document.getElementById('ef-value').focus(), 50);
  }

  function closeEntryModal() {
    document.getElementById('entry-modal-bg').classList.remove('open');
    editingTrackerId = null;
    editingEntryDate = null;
  }

  function closeEntryModalBg(e) {
    if (e.target === document.getElementById('entry-modal-bg')) closeEntryModal();
  }

  function saveEntry() {
    const tr = trackers.find(t => t.id === editingTrackerId);
    if (!tr) return;
    const date  = document.getElementById('ef-date').value;
    const value = document.getElementById('ef-value').value.trim();
    if (!date || value === '') { document.getElementById('ef-value').focus(); return; }
    tr.entries = tr.entries.filter(e => e.date !== editingEntryDate && e.date !== date);
    tr.entries.push({ date, value });
    saveState();
    closeEntryModal();
    renderTrackers();
  }

  function deleteEntryFromModal() {
    const delBtn = document.getElementById('entry-delete-btn');
    if (delBtn.dataset.confirming) {
      const tr = trackers.find(t => t.id === editingTrackerId);
      if (tr) tr.entries = tr.entries.filter(e => e.date !== editingEntryDate);
      saveState();
      closeEntryModal();
      renderTrackers();
    } else {
      delBtn.dataset.confirming = '1';
      delBtn.textContent = '🗑 Sure?';
      delBtn.style.color = 'var(--danger)';
    }
  }
