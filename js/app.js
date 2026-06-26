/* ===========================
   LOVE ISLAND USA 2026
   Main App Logic
   =========================== */

let gameData = null;
let refreshInterval = null;

const REFRESH_MS = 2 * 60 * 1000; // 2 minutes

// ---- BOOT ----

document.addEventListener('DOMContentLoaded', async () => {
  setupTabs();
  setupModal();
  setupSwitchModal();
  await loadData();
  startAutoRefresh();
});

// ---- DATA LOADING ----

async function loadData() {
  try {
    // Try localStorage first (admin may have saved changes)
    const stored = localStorage.getItem('loveIslandData');
    const storeMeta = localStorage.getItem('loveIslandDataMeta');
    let useLocal = false;

    if (stored && storeMeta) {
      const meta = JSON.parse(storeMeta);
      const fileResp = await fetch('./data.json?_=' + Date.now(), { cache: 'no-store' }).catch(() => null);
      if (fileResp && fileResp.ok) {
        const fileData = await fileResp.json();
        const fileTs = new Date(fileData.lastUpdated).getTime();
        const localTs = meta.savedAt || 0;
        if (localTs > fileTs) {
          useLocal = true;
          gameData = JSON.parse(stored);
        } else {
          gameData = fileData;
          // Update localStorage with fresh file data
          localStorage.setItem('loveIslandData', JSON.stringify(gameData));
          localStorage.setItem('loveIslandDataMeta', JSON.stringify({ savedAt: fileTs }));
        }
      } else {
        useLocal = true;
        gameData = JSON.parse(stored);
      }
    } else {
      const resp = await fetch('./data.json?_=' + Date.now(), { cache: 'no-store' });
      if (!resp.ok) throw new Error('Could not load data.json');
      gameData = await resp.json();
      localStorage.setItem('loveIslandData', JSON.stringify(gameData));
      localStorage.setItem('loveIslandDataMeta', JSON.stringify({ savedAt: Date.now() }));
    }

    renderAll();
    hideLoading();
    updateRefreshStatus('Just now');
  } catch (e) {
    console.error('Failed to load game data:', e);
    showError();
    hideLoading();
  }
}

function startAutoRefresh() {
  if (refreshInterval) clearInterval(refreshInterval);
  let count = 1;
  refreshInterval = setInterval(async () => {
    try {
      const resp = await fetch('./data.json?_=' + Date.now(), { cache: 'no-store' });
      if (resp.ok) {
        const freshData = await resp.json();
        const storedMeta = localStorage.getItem('loveIslandDataMeta');
        const meta = storedMeta ? JSON.parse(storedMeta) : { savedAt: 0 };
        const fileTs = new Date(freshData.lastUpdated).getTime();
        if (fileTs > (meta.savedAt || 0)) {
          gameData = freshData;
          localStorage.setItem('loveIslandData', JSON.stringify(gameData));
          localStorage.setItem('loveIslandDataMeta', JSON.stringify({ savedAt: fileTs }));
          renderAll();
        }
        updateRefreshStatus(formatRelative(new Date()));
      }
    } catch (_) {}
  }, REFRESH_MS);
}

function hideLoading() {
  const el = document.getElementById('loading-screen');
  if (el) el.classList.add('hidden');
}

function showError() {
  const el = document.getElementById('loading-screen');
  if (el) {
    el.innerHTML = `<div class="loader-content">
      <div class="loader-emoji">⚠️</div>
      <p>Couldn't load game data.<br/>Please refresh the page.</p>
    </div>`;
    setTimeout(() => el.classList.add('hidden'), 3000);
  }
}

function updateRefreshStatus(when) {
  const el = document.getElementById('refresh-status');
  if (el) el.textContent = `Last refreshed: ${when} · Auto-refreshes every 2 min`;
}

// ---- RENDER ALL ----

function renderAll() {
  if (!gameData) return;
  renderLinks();
  renderCountdowns();
  renderStats();
  renderLeaders();
  renderGameStatus();
  renderIslanders();
  renderPicks();
  renderSchedule();
  renderLastUpdated();
  populateJoinIslanderSelect();
  renderCasaAmorBanner();
  populateSwitchSelects();
}

function renderLinks() {
  const s = gameData.season;
  const venmoHref = s.venmoLink || `https://venmo.com/${s.venmo.replace('@','')}`;

  setAttr('venmo-link', 'href', venmoHref);
  setAttr('qr-venmo', 'href', venmoHref);
  setAttr('qr-venmo', 'textContent', s.venmo);
  setAttr('rules-venmo', 'href', venmoHref);
  setAttr('modal-venmo', 'href', venmoHref);
  setAttr('success-venmo', 'href', venmoHref);
  setAttr('switch-venmo', 'href', venmoHref);
  setAttr('switch-success-venmo', 'href', venmoHref);
  setAttr('sched-peacock', 'href', s.peacockLink || '#');
}

// ---- COUNTDOWNS ----

function renderCountdowns() {
  updateTimer('timer-deadline', gameData.season.bettingDeadline);
  updateTimer('timer-episode', gameData.season.firstEpisode);
  setInterval(() => {
    updateTimer('timer-deadline', gameData.season.bettingDeadline);
    updateTimer('timer-episode', gameData.season.firstEpisode);
  }, 1000);
}

function updateTimer(elId, isoDate) {
  const el = document.getElementById(elId);
  if (!el) return;
  const diff = new Date(isoDate) - new Date();
  if (diff <= 0) {
    el.textContent = 'Passed!';
    el.classList.add('expired');
    return;
  }
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  el.textContent = `${d}d ${pad(h)}h ${pad(m)}m ${pad(s)}s`;
}

function pad(n) { return String(n).padStart(2, '0'); }

// ---- STATS ----

function renderStats() {
  const { islanders, participants, season } = gameData;
  const active = islanders.filter(i => i.status === 'active').length;
  const eliminated = islanders.filter(i => i.status === 'eliminated').length;
  const pot = calcPot();

  const stats = [
    { icon: '💰', value: `$${pot}`, label: 'Pot Total' },
    { icon: '👥', value: participants.length, label: 'Participants' },
  ];

  const grid = document.getElementById('stats-grid');
  if (!grid) return;
  grid.innerHTML = stats.map(s => `
    <div class="stat-card">
      <span class="stat-icon">${s.icon}</span>
      <div class="stat-value">${s.value}</div>
      <div class="stat-label">${s.label}</div>
    </div>
  `).join('');

  const potEl = document.getElementById('pot-amount');
  if (potEl) potEl.textContent = `$${pot}`;
}

function calcPot() {
  if (!gameData) return 0;
  return gameData.participants.reduce((sum, p) => {
    const base = p.paid ? gameData.season.entryFee : 0;
    const extra = (p.picks || []).filter((pk, i) => i > 0).reduce((s, pk) => s + (pk.cost || 0), 0);
    return sum + base + extra;
  }, 0);
}

// ---- LEADERS ----

function renderLeaders() {
  const el = document.getElementById('leaders-list');
  if (!el) return;

  const { participants, islanders } = gameData;
  if (!participants.length || !islanders.length) {
    el.innerHTML = '<p class="muted">Picks open after the first episode!</p>';
    return;
  }

  // Find participants whose current pick is still active
  const leaders = participants
    .map(p => {
      const currentPick = getCurrentPick(p);
      const islander = currentPick ? islanders.find(i => i.id === currentPick.islanderId) : null;
      return { participant: p, islander, isActive: islander && islander.status === 'active' };
    })
    .filter(l => l.isActive);

  if (!leaders.length) {
    el.innerHTML = '<p class="muted">Everyone\'s pick has been eliminated! 😬</p>';
    return;
  }

  el.innerHTML = `<div class="leaders-list">${leaders.map((l, i) => `
    <div class="leader-item">
      <span class="leader-rank">${['🥇','🥈','🥉'][i] || '🏅'}</span>
      <span class="leader-name">${escHtml(l.participant.name)}</span>
      <span class="leader-islander">${escHtml(l.islander.name)}</span>
    </div>
  `).join('')}</div>`;
}

function getCurrentPick(participant) {
  const picks = participant.picks || [];
  // Return the last pick that refers to an active islander, else last pick overall
  const activePicks = picks.filter(pk => {
    const isl = gameData.islanders.find(i => i.id === pk.islanderId);
    return isl && isl.status === 'active';
  });
  return activePicks[activePicks.length - 1] || picks[picks.length - 1] || null;
}

// ---- GAME STATUS ----

function renderGameStatus() {
  const el = document.getElementById('game-status-list');
  if (!el) return;
  const { season } = gameData;
  const now = new Date();
  const deadlinePassed = now > new Date(season.bettingDeadline);
  const episodeAired = now > new Date(season.firstEpisode);

  const items = [
    {
      dot: episodeAired ? 'green' : 'yellow',
      text: episodeAired ? '📺 Season is live!' : `📺 Season starts ${formatDate(season.firstEpisode)}`
    },
    {
      dot: deadlinePassed ? 'red' : 'yellow',
      text: deadlinePassed ? '⏰ Betting deadline passed' : `⏰ Bets due ${formatDate(season.bettingDeadline)}`
    },
    {
      dot: season.casaAmorLocked ? 'red' : 'green',
      text: season.casaAmorLocked ? '🔒 Picks locked (post-Casa Amor)' : '🔓 Picks still open (pre-Casa Amor)'
    },
    {
      dot: 'gray',
      text: `💵 Entry fee: $${season.entryFee} via Venmo ${season.venmo}`
    },
  ];

  el.innerHTML = `<div class="status-list">${items.map(i => `
    <div class="status-item">
      <span class="status-dot ${i.dot}"></span>
      <span>${i.text}</span>
    </div>
  `).join('')}</div>`;
}

// ---- ISLANDERS ----

function renderIslanders() {
  const grid = document.getElementById('islanders-grid');
  const desc = document.getElementById('islanders-desc');
  if (!grid) return;

  const { islanders, season } = gameData;

  if (!islanders.length) {
    if (desc) desc.textContent = 'Islanders will be announced soon.';
    grid.innerHTML = `
      <div class="islanders-coming-soon">
        <span class="coming-soon-emoji">🌅</span>
        <p class="coming-soon-title">Coming Soon!</p>
        <p>Check back soon!</p>
      </div>`;
    return;
  }

  const active = islanders.filter(i => i.status === 'active');
  const elim  = islanders.filter(i => i.status === 'eliminated');
  if (desc) desc.textContent = `${active.length} still in the villa · ${elim.length} eliminated`;

  const sorted = [...active, ...elim];

  grid.innerHTML = sorted.map(isl => {
    const isElim = isl.status === 'eliminated';
    const isBomb = isl.isBombshell;
    const isCasa = isl.isCasa;
    const badge  = isElim ? '<span class="islander-badge badge-eliminated">Eliminated</span>'
                 : isCasa ? '<span class="islander-badge badge-casa">Casa Amor</span><span class="islander-badge badge-active">Active</span>'
                 : isBomb ? '<span class="islander-badge badge-bombshell">Bombshell</span><span class="islander-badge badge-active">Active</span>'
                 : '<span class="islander-badge badge-active">Active ✨</span>';
    const avatar = isl.photo
      ? `<img src="${escHtml(isl.photo)}" alt="${escHtml(isl.name)}" class="islander-photo" loading="lazy" onerror="this.parentElement.innerHTML='💛'" />`
      : `<span class="islander-emoji-fallback">${isCasa ? '🏖️' : isBomb ? '💣' : (isElim ? '💔' : '💛')}</span>`;
    return `
      <div class="islander-card ${isElim ? 'eliminated' : 'active'}">
        <div class="islander-avatar">${avatar}</div>
        <div class="islander-name">${escHtml(isl.name)}</div>
        ${badge}
      </div>`;
  }).join('');
}

// ---- PICKS TABLE ----

function renderPicks() {
  const wrap = document.getElementById('picks-table-wrap');
  if (!wrap) return;
  const { participants, islanders } = gameData;

  if (!participants.length) {
    wrap.innerHTML = `<div class="empty-state">
      <span class="empty-state-emoji">💸</span>
      <p>No picks yet — be the first to join!</p>
      <br/><a href="#" class="btn btn-primary" onclick="openJoinModal(); return false;">Join the Game</a>
    </div>`;
    return;
  }

  const pot = calcPot();
  const islanderName = (id) => {
    const i = islanders.find(x => x.id === id);
    return i ? i.name : id;
  };
  const isActive = (id) => {
    const i = islanders.find(x => x.id === id);
    return i && i.status === 'active';
  };

  const rows = participants.map(p => {
    const picks = p.picks || [];
    const moneyBags = '💸'.repeat(Math.max(1, picks.length));

    const pickCells = picks.map((pk, idx) => {
      const name  = islanderName(pk.islanderId);
      const alive = isActive(pk.islanderId);
      const costHtml = pk.cost ? `<span class="pick-cost">$${pk.cost}</span>` : '';
      if (alive) {
        return `<strong class="pick-active">${escHtml(name)}</strong>${costHtml}`;
      } else {
        return `<span class="pick-eliminated">${escHtml(name)}</span>${costHtml}`;
      }
    });

    return `<tr>
      <td><span class="participant-name"><span class="money-bags">${moneyBags}</span> ${escHtml(p.name)}</span></td>
      <td>${pickCells.join(' → ') || '<span class="pick-empty">—</span>'}</td>
    </tr>`;
  });

  wrap.innerHTML = `
    <div class="picks-table-scroll">
      <table class="picks-table">
        <thead>
          <tr>
            <th>Participant</th>
            <th>Islander</th>
          </tr>
        </thead>
        <tbody>
          ${rows.join('')}
          <tr class="total-row">
            <td><strong>TOTAL</strong></td>
            <td colspan="2"><strong>$${pot}</strong></td>
          </tr>
        </tbody>
      </table>
    </div>`;
}

// ---- SCHEDULE ----

function renderSchedule() {
  const grid = document.getElementById('schedule-grid');
  if (!grid) return;
  const s = gameData.schedule;

  const days = [
    { key: 'sunday', label: 'Sunday' },
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
  ];

  grid.innerHTML = days.map(d => {
    const hasEp = s[d.key];
    return `
      <div class="day-card ${hasEp ? 'has-episode' : 'no-episode'}">
        <div class="day-name">${d.label}</div>
        <div class="day-status">${hasEp ? '📺' : '❌'}</div>
        <span class="day-label">${hasEp ? 'New Episode' : 'No Episode'}</span>
      </div>`;
  }).join('');
}

// ---- LAST UPDATED ----

function renderLastUpdated() {
  const el = document.getElementById('last-updated');
  if (el && gameData.lastUpdated) {
    el.textContent = formatDate(gameData.lastUpdated);
  }
}

// ---- JOIN MODAL ----

function setupModal() {
  const joinBtn     = document.getElementById('join-btn');
  const modal       = document.getElementById('join-modal');
  const closeBtn    = document.getElementById('join-modal-close');
  const successClose= document.getElementById('join-success-close');
  const form        = document.getElementById('join-form');

  if (joinBtn)     joinBtn.addEventListener('click', (e) => { e.preventDefault(); openJoinModal(); });
  if (closeBtn)    closeBtn.addEventListener('click', closeJoinModal);
  if (successClose) successClose.addEventListener('click', closeJoinModal);
  if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) closeJoinModal(); });
  if (form)        form.addEventListener('submit', handleJoinSubmit);
}

function openJoinModal() {
  const modal = document.getElementById('join-modal');
  if (modal) { modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false'); }
  // Reset form state
  const form = document.getElementById('join-form');
  const success = document.getElementById('join-success');
  if (form) form.classList.remove('hidden');
  if (success) success.classList.add('hidden');
}

function closeJoinModal() {
  const modal = document.getElementById('join-modal');
  if (modal) { modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true'); }
}

function populateJoinIslanderSelect() {
  const sel = document.getElementById('join-islander');
  const hint = document.getElementById('islander-hint');
  if (!sel || !gameData) return;
  const active = (gameData.islanders || []).filter(i => i.status === 'active');
  if (!active.length) {
    sel.innerHTML = '<option value="">-- Islanders TBA after June 2 --</option>';
    if (hint) hint.style.display = '';
    return;
  }
  if (hint) hint.style.display = 'none';
  sel.innerHTML = '<option value="">-- Select an islander --</option>'
    + active.map(i => `<option value="${escAttr(i.id)}">${escHtml(i.name)}</option>`).join('');
}

function handleJoinSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const name = form.name.value.trim();
  const islanderId = form.islander.value;
  const notes = form.notes.value.trim();

  if (!name) return;

  const bet = { name, islanderId, notes, submittedAt: new Date().toISOString() };

  // Save to Firebase so admin can see it from any device
  const cfg = typeof FIREBASE_CONFIG !== 'undefined' ? FIREBASE_CONFIG : null;
  if (cfg && cfg.apiKey && cfg.databaseURL) {
    try {
      if (!firebase.apps.length) firebase.initializeApp(cfg);
      firebase.database().ref('pendingBets').push(bet);
    } catch (err) {
      console.warn('Firebase write failed, falling back to localStorage', err);
      saveBetToLocalStorage(bet);
    }
  } else {
    saveBetToLocalStorage(bet);
  }

  // Show success
  document.getElementById('join-form').classList.add('hidden');
  document.getElementById('join-success').classList.remove('hidden');
}

// ---- CASA AMOR SWITCH MODAL ----

function setupSwitchModal() {
  const modal       = document.getElementById('switch-modal');
  const closeBtn    = document.getElementById('switch-modal-close');
  const successClose= document.getElementById('switch-success-close');
  const form        = document.getElementById('switch-form');

  if (closeBtn)     closeBtn.addEventListener('click', closeSwitchModal);
  if (successClose) successClose.addEventListener('click', closeSwitchModal);
  if (modal)        modal.addEventListener('click', (e) => { if (e.target === modal) closeSwitchModal(); });
  if (form)         form.addEventListener('submit', handleSwitchSubmit);
}

function openSwitchModal() {
  const modal = document.getElementById('switch-modal');
  if (modal) { modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false'); }
  const form = document.getElementById('switch-form');
  const success = document.getElementById('switch-success');
  if (form) form.classList.remove('hidden');
  if (success) success.classList.add('hidden');
  const paid = document.getElementById('switch-paid');
  if (paid) paid.checked = false;
}

function closeSwitchModal() {
  const modal = document.getElementById('switch-modal');
  if (modal) { modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true'); }
}

function renderCasaAmorBanner() {
  if (!gameData) return;
  const open = gameData.season.casaAmorOpen && !gameData.season.casaAmorLocked;
  const banner   = document.getElementById('casa-amor-banner');
  const rulesCta = document.getElementById('casa-amor-rules-cta');
  if (banner)   banner.classList.toggle('hidden', !open);
  if (rulesCta) rulesCta.classList.toggle('hidden', !open);
}

function populateSwitchSelects() {
  if (!gameData) return;

  const pSel = document.getElementById('switch-participant');
  if (pSel) {
    pSel.innerHTML = '<option value="">-- Select your name --</option>'
      + gameData.participants.map(p => `<option value="${escAttr(p.id)}">${escHtml(p.name)}</option>`).join('');
  }

  const iSel = document.getElementById('switch-islander');
  if (iSel) {
    const active = gameData.islanders.filter(i => i.status === 'active');
    iSel.innerHTML = '<option value="">-- Select new islander --</option>'
      + active.map(i => `<option value="${escAttr(i.id)}">${escHtml(i.name)}</option>`).join('');
  }
}

function handleSwitchSubmit(e) {
  e.preventDefault();
  const participantId = document.getElementById('switch-participant').value;
  const islanderId    = document.getElementById('switch-islander').value;
  const paidConfirmed = document.getElementById('switch-paid').checked;

  if (!participantId || !islanderId || !paidConfirmed) return;

  const participant = gameData.participants.find(p => p.id === participantId);
  const islander    = gameData.islanders.find(i => i.id === islanderId);

  const req = {
    participantId,
    participantName:  participant ? participant.name : participantId,
    newIslanderId:    islanderId,
    newIslanderName:  islander ? islander.name : islanderId,
    paidConfirmed:    true,
    submittedAt:      new Date().toISOString(),
  };

  const cfg = typeof FIREBASE_CONFIG !== 'undefined' ? FIREBASE_CONFIG : null;
  if (cfg && cfg.apiKey && cfg.databaseURL) {
    try {
      if (!firebase.apps.length) firebase.initializeApp(cfg);
      firebase.database().ref('switchRequests').push(req);
    } catch (err) {
      console.warn('Firebase write failed for switch request', err);
    }
  }

  document.getElementById('switch-form').classList.add('hidden');
  document.getElementById('switch-success').classList.remove('hidden');
}

// ---- TABS ----

function setupTabs() {
  const buttons = document.querySelectorAll('.tab-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      switchTab(tab);
    });
  });
}

function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tabId);
  });
  document.querySelectorAll('.tab-content').forEach(s => {
    s.classList.toggle('active', s.id === `tab-${tabId}`);
  });
  // Scroll nav button into view
  const activeBtn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
  if (activeBtn) activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
}

// ---- HELPERS ----

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function escAttr(str) { return escHtml(str); }
function setAttr(id, attr, val) {
  const el = document.getElementById(id);
  if (!el) return;
  if (attr === 'textContent') el.textContent = val;
  else el.setAttribute(attr, val);
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatRelative(date) {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
}

function saveBetToLocalStorage(bet) {
  const pending = JSON.parse(localStorage.getItem('loveIslandPendingBets') || '[]');
  pending.push(bet);
  localStorage.setItem('loveIslandPendingBets', JSON.stringify(pending));
}

// Expose for inline handlers
window.openJoinModal = openJoinModal;
window.openSwitchModal = openSwitchModal;
window.switchTab = switchTab;
