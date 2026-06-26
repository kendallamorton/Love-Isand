/* ===========================
   LOVE ISLAND USA 2026
   Admin Panel Logic
   =========================== */

// Admin password — change this to whatever you like!
// This is stored in the page source; for a public site you'd want server-side auth.
const ADMIN_PASSWORD = 'loveisland2026';

let adminData = null;

// ---- BOOT ----

document.addEventListener('DOMContentLoaded', () => {
  setupLogin();
  setupAdminTabs();
  setupExportImport();
});

// ---- LOGIN ----

function setupLogin() {
  const form = document.getElementById('login-form');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const pwd = document.getElementById('admin-password').value;
    if (pwd === ADMIN_PASSWORD) {
      enterAdmin();
    } else {
      const err = document.getElementById('login-error');
      if (err) err.classList.remove('hidden');
    }
  });

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) logoutBtn.addEventListener('click', () => {
    document.getElementById('admin-panel').classList.add('hidden');
    document.getElementById('admin-login').classList.remove('hidden');
  });
}

async function enterAdmin() {
  document.getElementById('admin-login').classList.add('hidden');
  document.getElementById('admin-panel').classList.remove('hidden');
  await loadAdminData();
  renderAdminAll();
}

// ---- DATA ----

async function loadAdminData() {
  try {
    // Prefer localStorage (latest edits)
    const stored = localStorage.getItem('loveIslandData');
    if (stored) {
      adminData = JSON.parse(stored);
    } else {
      const resp = await fetch('./data.json?_=' + Date.now(), { cache: 'no-store' });
      adminData = await resp.json();
      localStorage.setItem('loveIslandData', JSON.stringify(adminData));
    }
  } catch (e) {
    adminData = defaultData();
  }
}

function saveAdminData() {
  adminData.lastUpdated = new Date().toISOString();
  localStorage.setItem('loveIslandData', JSON.stringify(adminData));
  localStorage.setItem('loveIslandDataMeta', JSON.stringify({ savedAt: Date.now() }));
  showSaveBanner('✅ Changes saved locally. Export &amp; commit <code>data.json</code> to publish to everyone.');
  renderDataView();
}

function showSaveBanner(msg) {
  const banner = document.getElementById('save-banner');
  const msgEl = document.getElementById('save-banner-msg');
  if (msgEl) msgEl.innerHTML = msg;
  if (banner) {
    banner.classList.remove('hidden');
    clearTimeout(banner._timeout);
    banner._timeout = setTimeout(() => banner.classList.add('hidden'), 6000);
  }
  const closeBtn = document.getElementById('save-banner-close');
  if (closeBtn) closeBtn.onclick = () => banner.classList.add('hidden');
}

function defaultData() {
  return {
    season: {
      year: 2026,
      title: 'Love Island USA 2026',
      subtitle: 'Who will find love… and win the pot? 💰',
      firstEpisode: '2026-06-01T20:00:00',
      bettingDeadline: '2026-06-04T20:00:00',
      entryFee: 20,
      buyBackFee: 15,
      switchFee: 25,
      venmo: '@kendall_morton',
      venmoLink: 'https://venmo.com/kendall_morton',
      casaAmorLocked: false,
      islanderAnnouncementPending: true,
    },
    islanders: [],
    participants: [],
    schedule: { sunday:true, monday:true, tuesday:true, wednesday:false, thursday:true, friday:true, saturday:false },
    lastUpdated: new Date().toISOString(),
  };
}

// ---- RENDER ALL ----

function renderAdminAll() {
  renderSettingsForm();
  renderIslandersMgmt();
  renderParticipantsMgmt();
  renderPendingBets();
  renderDataView();
}

// ---- SETTINGS ----

function renderSettingsForm() {
  if (!adminData) return;
  const s = adminData.season;
  const sc = adminData.schedule || {};

  setValue('s-year', s.year);
  setValue('s-entry', s.entryFee);
  setValue('s-buyback', s.buyBackFee);
  setValue('s-switch', s.switchFee);
  setValue('s-venmo', s.venmo);
  setValue('s-venmolink', s.venmoLink);
  setValue('s-deadline', toDatetimeLocal(s.bettingDeadline));
  setValue('s-firstepisode', toDatetimeLocal(s.firstEpisode));
  setChecked('s-islander-pending', s.islanderAnnouncementPending);
  setChecked('s-casa-locked', s.casaAmorLocked);

  setChecked('sched-sunday', sc.sunday);
  setChecked('sched-monday', sc.monday);
  setChecked('sched-tuesday', sc.tuesday);
  setChecked('sched-wednesday', sc.wednesday);
  setChecked('sched-thursday', sc.thursday);
  setChecked('sched-friday', sc.friday);
  setChecked('sched-saturday', sc.saturday);

  const form = document.getElementById('settings-form');
  if (form) {
    form.onsubmit = (e) => {
      e.preventDefault();
      adminData.season.year                      = +getVal('s-year');
      adminData.season.entryFee                  = +getVal('s-entry');
      adminData.season.buyBackFee                = +getVal('s-buyback');
      adminData.season.switchFee                 = +getVal('s-switch');
      adminData.season.venmo                     = getVal('s-venmo');
      adminData.season.venmoLink                 = getVal('s-venmolink');
      adminData.season.bettingDeadline           = fromDatetimeLocal(getVal('s-deadline'));
      adminData.season.firstEpisode              = fromDatetimeLocal(getVal('s-firstepisode'));
      adminData.season.islanderAnnouncementPending = isChecked('s-islander-pending');
      adminData.season.casaAmorLocked            = isChecked('s-casa-locked');

      adminData.schedule = {
        sunday:    isChecked('sched-sunday'),
        monday:    isChecked('sched-monday'),
        tuesday:   isChecked('sched-tuesday'),
        wednesday: isChecked('sched-wednesday'),
        thursday:  isChecked('sched-thursday'),
        friday:    isChecked('sched-friday'),
        saturday:  isChecked('sched-saturday'),
      };

      saveAdminData();
    };
  }
}

// ---- ISLANDERS MANAGEMENT ----

function renderIslandersMgmt() {
  const list = document.getElementById('islanders-mgmt-list');
  if (!list) return;
  const islanders = adminData.islanders || [];

  if (!islanders.length) {
    list.innerHTML = '<p class="muted">No islanders added yet.</p>';
  } else {
    list.innerHTML = islanders.map((isl, idx) => {
      const isElim = isl.status === 'eliminated';
      const isBomb = isl.isBombshell;
      const badge = isElim
        ? '<span class="islander-mgmt-badge badge-sm-elim">Eliminated</span>'
        : isBomb
          ? '<span class="islander-mgmt-badge badge-sm-bomb">Bombshell</span>'
          : '<span class="islander-mgmt-badge badge-sm-active">Active</span>';

      const thumb = isl.photo
        ? `<img src="${escAttr(isl.photo)}" alt="${escAttr(isl.name)}" class="islander-mgmt-thumb" onerror="this.style.display='none'" />`
        : `<span class="islander-mgmt-emoji">🌴</span>`;

      return `<div class="islander-mgmt-item">
        ${thumb}
        <div class="islander-mgmt-info">
          <div class="islander-mgmt-name ${isElim ? 'elim' : ''}">${escHtml(isl.name)} ${badge}</div>
          <div class="islander-photo-row">
            <input type="text" class="islander-photo-input" value="${escAttr(isl.photo || '')}" placeholder="Paste photo URL…" onchange="setIslanderPhoto(${idx}, this.value)" />
          </div>
        </div>
        <div class="islander-mgmt-actions">
          ${isElim
            ? `<button class="btn btn-sm" style="background:#d4edda;color:#155724;border-color:#c3e6cb" onclick="setIslanderStatus(${idx}, 'active')">↩ Restore</button>`
            : `<button class="btn btn-sm btn-danger" onclick="setIslanderStatus(${idx}, 'eliminated')">💔 Eliminate</button>`
          }
          <button class="btn btn-sm btn-danger" onclick="removeIslander(${idx})">🗑 Remove</button>
        </div>
      </div>`;
    }).join('');
  }

  // Setup add form
  const addForm = document.getElementById('add-islander-form');
  if (addForm) {
    addForm.onsubmit = (e) => {
      e.preventDefault();
      const name  = getVal('new-islander-name').trim();
      const photo = getVal('new-islander-photo').trim();
      const bomb  = isChecked('new-islander-bombshell');
      const casa  = isChecked('new-islander-casa');
      if (!name) return;
      addIslander(name, photo, bomb, casa);
      e.target.reset();
    };
  }

  // Refresh islander selector in participants tab
  refreshIslanderSelects();
}

function addIslander(name, photo, isBombshell, isCasa) {
  const id = slugify(name) + '_' + Date.now();
  adminData.islanders = adminData.islanders || [];
  adminData.islanders.push({ id, name, photo: photo || '', status: 'active', isBombshell, isCasa: isCasa || false });
  saveAdminData();
  renderIslandersMgmt();
  renderParticipantsMgmt();
}

function setIslanderPhoto(idx, url) {
  if (!adminData.islanders[idx]) return;
  adminData.islanders[idx].photo = url.trim();
  saveAdminData();
  renderIslandersMgmt();
}

function setIslanderStatus(idx, status) {
  if (!adminData.islanders[idx]) return;
  adminData.islanders[idx].status = status;
  saveAdminData();
  renderIslandersMgmt();
  renderParticipantsMgmt();
}

function removeIslander(idx) {
  if (!confirm(`Remove ${adminData.islanders[idx]?.name}? This won't affect existing participant picks.`)) return;
  adminData.islanders.splice(idx, 1);
  saveAdminData();
  renderIslandersMgmt();
}

// ---- PARTICIPANTS MANAGEMENT ----

function renderParticipantsMgmt() {
  const list = document.getElementById('participants-mgmt-list');
  if (!list) return;
  const participants = adminData.participants || [];
  const islanders = adminData.islanders || [];

  if (!participants.length) {
    list.innerHTML = '<p class="muted">No participants yet.</p>';
  } else {
    list.innerHTML = participants.map((p, pidx) => {
      const picks = p.picks || [];
      const pickPills = picks.map((pk, pkidx) => {
        const isl = islanders.find(i => i.id === pk.islanderId);
        const name = isl ? isl.name : pk.islanderId;
        const isActive = isl && isl.status === 'active';
        const cost = pk.cost ? ` ($${pk.cost})` : '';
        return `<span class="pick-pill ${isActive ? 'active-pick' : 'elim-pick'}">${escHtml(name)}${cost}
          <button onclick="removePick(${pidx}, ${pkidx})" title="Remove pick" style="background:none;border:none;cursor:pointer;font-size:.75rem;padding:0 0 0 .2rem;color:inherit">✕</button>
        </span>`;
      }).join('');

      const paidBadge = p.paid
        ? '<span style="background:#d4edda;color:#155724;font-size:.75rem;padding:.1rem .4rem;border-radius:999px;font-weight:600">Paid ✓</span>'
        : '<span style="background:#fff3cd;color:#856404;font-size:.75rem;padding:.1rem .4rem;border-radius:999px;font-weight:600">Unpaid</span>';

      // Build add-pick form for this participant
      const islanderOptions = islanders.map(i =>
        `<option value="${escAttr(i.id)}">${escHtml(i.name)}${i.status==='eliminated'?' (out)':''}</option>`
      ).join('');

      const canAddPick = !adminData.season.casaAmorLocked && picks.length < 2;

      return `<div class="participant-mgmt-item">
        <div class="participant-mgmt-header">
          <span class="participant-mgmt-name">${escHtml(p.name)}</span>
          ${paidBadge}
          <button class="btn btn-sm" onclick="togglePaid(${pidx})" style="font-size:.75rem">${p.paid ? 'Mark Unpaid' : 'Mark Paid'}</button>
          <button class="btn btn-sm btn-danger" onclick="removeParticipant(${pidx})">🗑</button>
        </div>
        <div class="participant-mgmt-picks">
          Picks: ${pickPills || '<em>None</em>'}
        </div>
        ${canAddPick ? `
        <div class="add-pick-row">
          <select id="pick-isl-${pidx}">${islanderOptions}</select>
          <input type="number" id="pick-cost-${pidx}" placeholder="Cost $0" min="0" value="0" style="width:90px" />
          <button class="btn btn-primary btn-sm" onclick="addPickToParticipant(${pidx})">+ Add Pick</button>
        </div>` : ''}
      </div>`;
    }).join('');
  }

  // Add participant form
  const addForm = document.getElementById('add-participant-form');
  if (addForm) {
    addForm.onsubmit = (e) => {
      e.preventDefault();
      const name = getVal('new-p-name').trim();
      const islanderId = getVal('new-p-islander');
      const paid = isChecked('new-p-paid');
      if (!name) return;
      addParticipant(name, islanderId, paid);
      e.target.reset();
      setChecked('new-p-paid', true);
    };
  }

  refreshIslanderSelects();
}

function addParticipant(name, islanderId, paid) {
  adminData.participants = adminData.participants || [];
  const picks = islanderId ? [{ islanderId, cost: 0 }] : [];
  adminData.participants.push({ id: slugify(name) + '_' + Date.now(), name, paid, picks });
  saveAdminData();
  renderParticipantsMgmt();
}

function removeParticipant(idx) {
  if (!confirm(`Remove ${adminData.participants[idx]?.name}?`)) return;
  adminData.participants.splice(idx, 1);
  saveAdminData();
  renderParticipantsMgmt();
}

function togglePaid(idx) {
  adminData.participants[idx].paid = !adminData.participants[idx].paid;
  saveAdminData();
  renderParticipantsMgmt();
}

function addPickToParticipant(pidx) {
  const islanderId = document.getElementById(`pick-isl-${pidx}`)?.value;
  const cost = parseInt(document.getElementById(`pick-cost-${pidx}`)?.value || '0', 10);
  if (!islanderId) return;
  adminData.participants[pidx].picks = adminData.participants[pidx].picks || [];
  adminData.participants[pidx].picks.push({ islanderId, cost: cost || 0 });
  saveAdminData();
  renderParticipantsMgmt();
}

function removePick(pidx, pkidx) {
  adminData.participants[pidx].picks.splice(pkidx, 1);
  saveAdminData();
  renderParticipantsMgmt();
}

function refreshIslanderSelects() {
  const islanders = adminData.islanders || [];
  const opts = '<option value="">-- Pick an Islander (optional) --</option>'
    + islanders.map(i => `<option value="${escAttr(i.id)}">${escHtml(i.name)}${i.status==='eliminated'?' (out)':''}</option>`).join('');

  const sel = document.getElementById('new-p-islander');
  if (sel) sel.innerHTML = opts;
}

// ---- PENDING BETS ----

// Firebase-backed pending bets — keyed by Firebase push ID
let _pendingBetsCache = {}; // { firebaseKey: betObject }

function renderPendingBets() {
  const list = document.getElementById('pending-bets-list');
  if (!list) return;
  list.innerHTML = '<p class="muted">Loading…</p>';

  const cfg = typeof FIREBASE_CONFIG !== 'undefined' ? FIREBASE_CONFIG : null;
  if (!cfg || !cfg.apiKey || !cfg.databaseURL) {
    list.innerHTML = '<p class="muted">Firebase not configured — cannot load submissions.</p>';
    return;
  }

  try {
    if (!firebase.apps.length) firebase.initializeApp(cfg);
    firebase.database().ref('pendingBets').once('value', (snapshot) => {
      _pendingBetsCache = {};
      if (!snapshot.exists()) {
        list.innerHTML = '<p class="muted">No pending bet requests.</p>';
        return;
      }
      snapshot.forEach(child => { _pendingBetsCache[child.key] = child.val(); });
      _renderPendingBetsList();
    }, (err) => {
      list.innerHTML = `<p class="muted">Error loading submissions: ${escHtml(err.message)}<br/><small>Check Firebase database rules — they may need to allow reads.</small></p>`;
    });
  } catch (e) {
    list.innerHTML = '<p class="muted">Could not load submissions.</p>';
  }
}

function _renderPendingBetsList() {
  const list = document.getElementById('pending-bets-list');
  if (!list) return;
  const entries = Object.entries(_pendingBetsCache);
  const islanders = adminData.islanders || [];

  if (!entries.length) {
    list.innerHTML = '<p class="muted">No pending bet requests.</p>';
    return;
  }

  list.innerHTML = entries.map(([key, bet]) => {
    const isl = islanders.find(i => i.id === bet.islanderId);
    const islName = isl ? isl.name : (bet.islanderId || 'None selected');
    const submittedDate = bet.submittedAt ? new Date(bet.submittedAt).toLocaleString() : 'Unknown';
    return `<div class="pending-bet-item">
      <div class="pending-bet-header">
        <span class="pending-bet-name">${escHtml(bet.name)}</span>
        <span class="pending-bet-meta">Submitted: ${submittedDate}</span>
      </div>
      <div class="pending-bet-islander">Islander pick: <strong>${escHtml(islName)}</strong></div>
      ${bet.notes ? `<div class="pending-bet-notes">Notes: ${escHtml(bet.notes)}</div>` : ''}
      <div class="pending-bet-actions">
        <button class="btn btn-primary btn-sm" onclick="approvePendingBet('${escAttr(key)}')">✅ Add to Participants</button>
        <button class="btn btn-danger btn-sm" onclick="dismissPendingBet('${escAttr(key)}')">🗑 Dismiss</button>
      </div>
    </div>`;
  }).join('');
}

function approvePendingBet(key) {
  const bet = _pendingBetsCache[key];
  if (!bet) return;
  addParticipant(bet.name, bet.islanderId, false);
  firebase.database().ref('pendingBets/' + key).remove();
  delete _pendingBetsCache[key];
  _renderPendingBetsList();
  showSaveBanner(`✅ Added ${bet.name} to participants. Mark as paid once Venmo comes through!`);
}

function dismissPendingBet(key) {
  firebase.database().ref('pendingBets/' + key).remove();
  delete _pendingBetsCache[key];
  _renderPendingBetsList();
}

// ---- DATA VIEW ----

function renderDataView() {
  const pre = document.getElementById('data-json-view');
  if (pre && adminData) {
    pre.textContent = JSON.stringify(adminData, null, 2);
  }

  const copyBtn = document.getElementById('copy-json-btn');
  if (copyBtn) {
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(JSON.stringify(adminData, null, 2))
        .then(() => showSaveBanner('📋 JSON copied to clipboard! Paste it into data.json and commit.'))
        .catch(() => showSaveBanner('Could not auto-copy. Select all text in the box and copy manually.'));
    };
  }

  const dlBtn = document.getElementById('download-json-btn');
  if (dlBtn) {
    dlBtn.onclick = downloadDataJson;
  }
}

// ---- EXPORT / IMPORT ----

function setupExportImport() {
  const exportBtn = document.getElementById('export-btn');
  if (exportBtn) exportBtn.addEventListener('click', downloadDataJson);

  const importTrigger = document.getElementById('import-btn-trigger');
  const importInput   = document.getElementById('import-file-input');
  if (importTrigger && importInput) {
    importTrigger.addEventListener('click', () => importInput.click());
    importInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          if (!data.season || !Array.isArray(data.islanders)) throw new Error('Invalid format');
          adminData = data;
          localStorage.setItem('loveIslandData', JSON.stringify(adminData));
          localStorage.setItem('loveIslandDataMeta', JSON.stringify({ savedAt: Date.now() }));
          renderAdminAll();
          showSaveBanner('📤 Data imported successfully!');
        } catch (err) {
          alert('Invalid data.json file: ' + err.message);
        }
        e.target.value = '';
      };
      reader.readAsText(file);
    });
  }
}

function downloadDataJson() {
  if (!adminData) return;
  const blob = new Blob([JSON.stringify(adminData, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'data.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---- ADMIN TABS ----

function setupAdminTabs() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.admin-tab-btn');
    if (!btn) return;
    const tabId = btn.dataset.atab;
    document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.atab === tabId));
    document.querySelectorAll('.admin-tab-content').forEach(s => s.classList.toggle('active', s.id === `atab-${tabId}`));
  });
}

// ---- HELPERS ----

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function escAttr(str) { return escHtml(str); }
function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}
function getVal(id) { return document.getElementById(id)?.value ?? ''; }
function getValue(id) { return getVal(id); }
function setValue(id, val) { const el = document.getElementById(id); if (el) el.value = val ?? ''; }
function setChecked(id, val) { const el = document.getElementById(id); if (el) el.checked = !!val; }
function isChecked(id) { return !!document.getElementById(id)?.checked; }

function toDatetimeLocal(iso) {
  if (!iso) return '';
  // e.g. "2026-06-01T20:00:00" → "2026-06-01T20:00"
  return String(iso).slice(0, 16);
}
function fromDatetimeLocal(val) {
  if (!val) return '';
  return val + ':00'; // add seconds
}

// Expose for inline onclick handlers
window.setIslanderStatus  = setIslanderStatus;
window.setIslanderPhoto   = setIslanderPhoto;
window.removeIslander     = removeIslander;
window.addPickToParticipant = addPickToParticipant;
window.removePick         = removePick;
window.togglePaid         = togglePaid;
window.removeParticipant  = removeParticipant;
window.approvePendingBet  = approvePendingBet;
window.dismissPendingBet  = dismissPendingBet;
