/* ===========================
   LOVE ISLAND USA 2026
   Group Chat (Firebase)
   =========================== */

const CHAT_NAME_KEY = 'liChatName';
const MAX_MESSAGES  = 200;

let chatDb       = null;
let chatReady    = false;
let nameSet      = false;

// ---- INIT ----

document.addEventListener('DOMContentLoaded', () => {
  initFirebase();
  setupNameUI();

  // Wire up tab click to scroll to bottom when switching to Chat
  document.querySelectorAll('.tab-btn').forEach(btn => {
    if (btn.dataset.tab === 'chat') {
      btn.addEventListener('click', () => {
        if (chatReady) setTimeout(scrollFeedToBottom, 80);
      });
    }
  });
});

function initFirebase() {
  const cfg = typeof FIREBASE_CONFIG !== 'undefined' ? FIREBASE_CONFIG : null;
  const configured = cfg && cfg.apiKey && cfg.databaseURL;

  if (!configured) {
    showConfigNotice();
    return;
  }

  try {
    if (!firebase.apps.length) firebase.initializeApp(cfg);
    chatDb = firebase.database();
    chatReady = true;

    // Only subscribe when chat tab is first opened
    document.querySelectorAll('.tab-btn').forEach(btn => {
      if (btn.dataset.tab === 'chat') {
        btn.addEventListener('click', onChatTabOpen, { once: true });
      }
    });
  } catch (e) {
    console.error('Firebase init error:', e);
    showConfigNotice();
  }
}

function onChatTabOpen() {
  if (!chatReady) return;
  subscribeToMessages();
  const name = localStorage.getItem(CHAT_NAME_KEY);
  if (name) showChatInterface();
}

// ---- NAME UI ----

function setupNameUI() {
  const storedName = localStorage.getItem(CHAT_NAME_KEY);
  if (storedName) {
    nameSet = true;
    showNameBar(storedName);
  } else {
    showNameSetup();
  }

  const nameForm = document.getElementById('chat-name-form');
  if (nameForm) {
    nameForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = document.getElementById('chat-name-input').value.trim();
      if (!val) return;
      localStorage.setItem(CHAT_NAME_KEY, val);
      nameSet = true;
      showNameBar(val);
      if (chatReady) {
        showChatInterface();
        subscribeToMessages();
      }
    });
  }

  const changeBtn = document.getElementById('chat-change-name-btn');
  if (changeBtn) {
    changeBtn.addEventListener('click', () => {
      showNameSetup();
      const input = document.getElementById('chat-name-input');
      if (input) {
        input.value = localStorage.getItem(CHAT_NAME_KEY) || '';
        input.focus();
      }
    });
  }
}

function showNameBar(name) {
  document.getElementById('chat-name-setup').classList.add('hidden');
  const bar = document.getElementById('chat-name-bar');
  bar.classList.remove('hidden');
  const el = document.getElementById('chat-current-name');
  if (el) {
    el.textContent = name;
    el.style.background = nameColor(name);
  }
}

function showNameSetup() {
  document.getElementById('chat-name-bar').classList.add('hidden');
  document.getElementById('chat-name-setup').classList.remove('hidden');
  document.getElementById('chat-name-input')?.focus();
}

function showChatInterface() {
  document.getElementById('chat-feed-wrap')?.classList.remove('hidden');
  document.getElementById('chat-compose')?.classList.remove('hidden');
  setupSendForm();
}

function showConfigNotice() {
  document.getElementById('chat-config-notice')?.classList.remove('hidden');
}

// ---- SEND ----

function setupSendForm() {
  const form = document.getElementById('chat-send-form');
  if (!form || form.dataset.wired) return;
  form.dataset.wired = '1';

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('chat-message-input');
    const text  = input.value.trim();
    if (!text || !chatDb) return;

    const name = localStorage.getItem(CHAT_NAME_KEY) || 'Anonymous';
    input.value = '';
    input.focus();

    try {
      await chatDb.ref('messages').push({
        name,
        text,
        ts: firebase.database.ServerValue.TIMESTAMP,
      });
    } catch (err) {
      console.error('Send failed:', err);
      input.value = text; // restore on failure
    }
  });
}

// ---- RECEIVE ----

let firstLoad = true;

function subscribeToMessages() {
  if (!chatDb) return;

  const feed = document.getElementById('chat-feed');

  chatDb.ref('messages')
    .limitToLast(MAX_MESSAGES)
    .on('value', (snapshot) => {
      if (!snapshot.exists()) {
        feed.innerHTML = '<div class="chat-empty">No messages yet — say hi! 👋</div>';
        firstLoad = false;
        return;
      }

      const msgs = [];
      snapshot.forEach(child => {
        msgs.push({ id: child.key, ...child.val() });
      });

      renderMessages(msgs);
      firstLoad = false;
    });
}

function renderMessages(msgs) {
  const feed = document.getElementById('chat-feed');
  if (!feed) return;

  const myName     = localStorage.getItem(CHAT_NAME_KEY);
  const atBottom   = isNearBottom(feed);
  const prevScroll = feed.scrollTop;

  feed.innerHTML = msgs.map(m => {
    const isMine = m.name === myName;
    const color  = nameColor(m.name);
    const time   = formatChatTime(m.ts);
    return `
      <div class="chat-msg ${isMine ? 'chat-msg-mine' : ''}">
        ${!isMine ? `<div class="chat-msg-name" style="color:${color}">${escHtml(m.name)}</div>` : ''}
        <div class="chat-bubble ${isMine ? 'chat-bubble-mine' : 'chat-bubble-theirs'}">
          ${escHtml(m.text)}
        </div>
        <div class="chat-msg-time">${time}</div>
      </div>`;
  }).join('');

  if (atBottom || firstLoad) {
    scrollFeedToBottom();
  }
}

// ---- HELPERS ----

function isNearBottom(el) {
  return el.scrollHeight - el.scrollTop - el.clientHeight < 80;
}

function scrollFeedToBottom() {
  const feed = document.getElementById('chat-feed');
  if (feed) feed.scrollTop = feed.scrollHeight;
}

function formatChatTime(ts) {
  if (!ts) return '';
  const d    = new Date(ts);
  const now  = new Date();
  const diff = Math.floor((now - d) / 1000);

  if (diff < 60)  return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
}

// Deterministic pastel color from a name string
function nameColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 65%, 40%)`;
}

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
