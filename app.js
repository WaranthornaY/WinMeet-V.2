(() => {
'use strict';

/* ------------------------------------------------------------------ helpers */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const ICONS = {
  mic: '<path d="M12 3.5a3 3 0 0 0-3 3V12a3 3 0 0 0 6 0V6.5a3 3 0 0 0-3-3z"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>',
  micOff: '<path d="M15 9.5V6.5a3 3 0 0 0-5.7-1.3M9 9v3a3 3 0 0 0 4.7 2.5"/><path d="M5.5 11a6.5 6.5 0 0 0 10.2 5.3M18.5 11c0 .9-.2 1.7-.5 2.5M12 17.5V21M3.5 3.5l17 17"/>',
  cam: '<rect x="3" y="6.5" width="13" height="11" rx="2.5"/><path d="M16 10.5l5-3v9l-5-3z"/>',
  camOff: '<path d="M7 6.5h6.5A2.5 2.5 0 0 1 16 9v6.5M16 10.5l5-3v9l-4-2.4M3.5 8.5V15A2.5 2.5 0 0 0 6 17.5h8M3.5 3.5l17 17"/>',
  screen: '<rect x="3" y="4.5" width="18" height="12" rx="2.5"/><path d="M8.5 20h7M12 16.5V20"/>',
  cc: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10 10.3a2.5 2.5 0 1 0 0 3.4M17 10.3a2.5 2.5 0 1 0 0 3.4"/>',
  record: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.2" fill="currentColor" stroke="none"/>',
  chat: '<path d="M5.5 5h13A2.5 2.5 0 0 1 21 7.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 3.5V18A2.5 2.5 0 0 1 3 15.5v-8A2.5 2.5 0 0 1 5.5 5z"/>',
  people: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6M16 4.7a3.5 3.5 0 0 1 0 6.6M18.2 14.3c2.1.6 3.3 2.6 3.3 5.7"/>',
  leave: '<path d="M2.8 14.2c5.4-5 12.9-5 18.4 0l-2.2 2.9-3.3-1.6v-2.6a9.5 9.5 0 0 0-7.4 0v2.6L5 17.1z"/>',
  more: '<circle cx="5.5" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="18.5" cy="12" r="1.5" fill="currentColor"/>',
  pin: '<path d="M9 3.5h6l-.8 6 3 3.2H6.8l3-3.2zM12 12.7V21"/>',
  send: '<path d="M4 11.5L20 4l-5.5 16-3-6.5z"/><path d="M11.5 13.5L20 4"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2.5"/><path d="M15.5 8.5V6.5A2.5 2.5 0 0 0 13 4H6.5A2.5 2.5 0 0 0 4 6.5V13a2.5 2.5 0 0 0 2.5 2.5h2"/>'
};
const ico = n => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n]}</svg>`;
$$('[data-icon]').forEach(el => { el.innerHTML = ICONS[el.dataset.icon]; });

function toast(msg) {
  const d = document.createElement('div');
  d.textContent = msg;
  $('#toast').appendChild(d);
  setTimeout(() => d.remove(), 3600);
}
function setMsg(text, kind) {
  const m = $('#formMsg');
  m.textContent = text || '';
  m.className = 'msg' + (kind ? ' ' + kind : '');
  if (kind === 'error') m.setAttribute('role', 'alert'); else m.setAttribute('role', 'status');
}
const AV = ['#5b8def', '#e07a5f', '#3fa796', '#b56cd6', '#d08a1f', '#d4507a'];
const avColor = name => AV[[...name].reduce((a, c) => a + c.codePointAt(0), 0) % AV.length];
const initials = name => (name.trim().split(/\s+/).slice(0, 2).map(w => [...w][0] || '').join('') || '?').toUpperCase();
const CODE_RE = /^[a-z]{3}-[a-z]{4}-[a-z]{3}$/;
function genCode() {
  const a = 'abcdefghjkmnpqrstuvwxyz';
  const r = n => Array.from(crypto.getRandomValues(new Uint8Array(n)), v => a[v % a.length]).join('');
  return `${r(3)}-${r(4)}-${r(3)}`;
}
const fmtTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/* -------------------------------------------------------------------- state */
const me = {
  stream: null, camTrack: null, micTrack: null, screen: null,
  noCam: false, noMic: false,
  mic: true, cam: true, hand: false, sharing: false, mirror: true, rec: false
};
const S = {
  name: '', peer: null, myId: null, code: '', isHost: false, hostId: null,
  peers: new Map(), pinned: null, panel: null, unread: 0,
  caps: false, capLang: 'en-US', sr: null, rec: null, t0: 0, timer: null, speakTimer: null, busy: false
};
const tiles = new Map();
let audioCtx = null;
const PEER_OPTS = {
  debug: 0,
  config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] }
};

/* -------------------------------------------------------------- media setup */
function placeholderVideoTrack() {
  const c = document.createElement('canvas');
  c.width = 640; c.height = 360;
  const g = c.getContext('2d');
  const paint = () => { g.fillStyle = '#26364a'; g.fillRect(0, 0, 640, 360); };
  paint();
  setInterval(paint, 1000);
  return c.captureStream(5).getVideoTracks()[0];
}
async function getMedia(camId, micId) {
  const audio = { echoCancellation: true, noiseSuppression: true, autoGainControl: true };
  if (micId) audio.deviceId = { exact: micId };
  const video = camId ? { deviceId: { exact: camId } } : { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' };
  const gum = c => navigator.mediaDevices.getUserMedia(c);
  try { return await gum({ video, audio }); } catch (e) {}
  try { return await gum({ video: false, audio }); } catch (e) {}
  try { return await gum({ video, audio: false }); } catch (e) {}
  return null;
}
function stopStream(s) { if (s) s.getTracks().forEach(t => { try { t.stop(); } catch (e) {} }); }

async function initPreview() {
  stopStream(me.stream);
  me.stream = null;
  const note = $('#pvNote');
  note.hidden = true;
  let stream = null;
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    stream = await getMedia($('#camSel').value || null, $('#micSel').value || null);
  } else {
    note.textContent = 'This page can only use your camera and microphone over https. Open it from your hosted link.';
    note.hidden = false;
  }
  if (!stream) stream = new MediaStream();
  me.noCam = stream.getVideoTracks().length === 0;
  me.noMic = stream.getAudioTracks().length === 0;
  if (me.noCam) stream.addTrack(placeholderVideoTrack());
  me.stream = stream;
  me.camTrack = stream.getVideoTracks()[0];
  me.micTrack = stream.getAudioTracks()[0] || null;
  if (me.camTrack) me.camTrack.enabled = me.cam;
  if (me.micTrack) me.micTrack.enabled = me.mic;
  if (me.noCam || me.noMic) {
    note.textContent = me.noCam && me.noMic
      ? 'No camera or microphone available. Allow access in your browser to be seen and heard. You can still watch and chat.'
      : me.noCam ? 'No camera found. You can still join with audio.' : 'No microphone found. You can still join with video.';
    note.hidden = false;
  }
  const pv = $('#pvVideo');
  pv.srcObject = me.noCam ? null : stream;
  await fillDevices();
  updateBtns();
}
async function fillDevices() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
  const list = await navigator.mediaDevices.enumerateDevices();
  const fill = (sel, kind, current) => {
    const opts = list.filter(d => d.kind === kind);
    sel.textContent = '';
    if (!opts.length) { sel.add(new Option('None found', '')); sel.disabled = true; return; }
    sel.disabled = false;
    opts.forEach((d, i) => sel.add(new Option(d.label || `${kind === 'videoinput' ? 'Camera' : 'Microphone'} ${i + 1}`, d.deviceId)));
    if (current && opts.some(d => d.deviceId === current)) sel.value = current;
  };
  fill($('#camSel'), 'videoinput', me.noCam ? null : me.camTrack.getSettings().deviceId);
  fill($('#micSel'), 'audioinput', me.micTrack ? me.micTrack.getSettings().deviceId : null);
}

/* ------------------------------------------------------------- button state */
function updateBtns() {
  const micOff = !me.mic || me.noMic, camOff = !me.cam || me.noCam;
  ['#pvMic', '#mic'].forEach(s => {
    const b = $(s);
    b.classList.toggle('off', micOff);
    b.innerHTML = ico(micOff ? 'micOff' : 'mic');
    b.setAttribute('aria-label', micOff ? 'Turn on microphone' : 'Turn off microphone');
    b.title = (micOff ? 'Turn on microphone' : 'Turn off microphone') + ' (M)';
  });
  ['#pvCam', '#cam'].forEach(s => {
    const b = $(s);
    b.classList.toggle('off', camOff);
    b.innerHTML = ico(camOff ? 'camOff' : 'cam');
    b.setAttribute('aria-label', camOff ? 'Turn on camera' : 'Turn off camera');
    b.title = (camOff ? 'Turn on camera' : 'Turn off camera') + ' (V)';
  });
  const off = $('#pvOff');
  off.hidden = !camOff;
  off.textContent = me.noCam ? 'No camera found' : 'Camera is off';
  const tog = (sel, on, onLabel, offLabel) => {
    const b = $(sel);
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', String(on));
    b.setAttribute('aria-label', on ? onLabel : offLabel);
  };
  tog('#caps', S.caps, 'Turn off captions', 'Turn on captions');
  tog('#present', me.sharing, 'Stop presenting', 'Present your screen');
  tog('#hand', me.hand, 'Lower hand', 'Raise hand');
  tog('#rec', me.rec, 'Stop recording', 'Record meeting');
  $('#mMirrorState').textContent = me.mirror ? 'On' : 'Off';
}
function myState() { return { mic: me.mic && !me.noMic, cam: me.cam && !me.noCam, hand: me.hand, sharing: me.sharing }; }
function pushState() { bcast({ t: 'state', state: myState() }); }
function setMic(on) {
  if (me.noMic) { toast('No microphone found'); return; }
  me.mic = on; me.micTrack.enabled = on;
  updateBtns(); updateTile('me'); pushState(); syncCaps();
}
function setCam(on) {
  if (me.noCam) { toast('No camera found'); return; }
  me.cam = on; me.camTrack.enabled = on;
  updateBtns(); updateTile('me'); pushState();
}

/* ---------------------------------------------------------------- messaging */
function bcast(msg) { S.peers.forEach(p => { if (p.conn && p.conn.open) { try { p.conn.send(msg); } catch (e) {} } }); }
function getPeer(id) {
  let p = S.peers.get(id);
  if (!p) {
    p = { id, name: 'Guest', conn: null, call: null, stream: null, helloed: false, incoming: false, rec: false,
          state: { mic: true, cam: true, hand: false, sharing: false } };
    S.peers.set(id, p);
  }
  return p;
}
const visible = p => p.helloed || !!p.stream;

function wireConn(conn) {
  conn.on('open', () => conn.send({ t: 'hello', name: S.name, state: myState() }));
  conn.on('data', d => onData(conn, d));
  conn.on('close', () => dropPeer(conn.peer));
  conn.on('error', () => {});
}
function wireCall(call) {
  const p = getPeer(call.peer);
  p.call = call;
  call.on('stream', stream => {
    p.stream = stream;
    ensureTile(p.id);
    attachAudio(p.id, stream);
    updateTile(p.id); renderPeople(); layout();
  });
  call.on('close', () => { if (!p.conn || !p.conn.open) dropPeer(p.id); });
  call.on('error', () => {});
}
function outStream() {
  if (me.sharing && me.screen) {
    const tracks = [me.screen.getVideoTracks()[0]];
    if (me.micTrack) tracks.push(me.micTrack);
    return new MediaStream(tracks);
  }
  return me.stream;
}
function connectTo(id) {
  const p = getPeer(id);
  if (!p.conn) { const c = S.peer.connect(id, { reliable: true }); p.conn = c; wireConn(c); }
  if (!p.call) { wireCall(S.peer.call(id, outStream())); }
}

function onData(conn, d) {
  if (!d || typeof d !== 'object') return;
  const p = getPeer(conn.peer);
  const fromHost = conn.peer === S.hostId;
  switch (d.t) {
    case 'hello': {
      const first = !p.helloed;
      p.helloed = true;
      p.name = String(d.name || 'Guest').slice(0, 30);
      if (d.state) p.state = Object.assign(p.state, d.state);
      ensureTile(p.id); updateTile(p.id); renderPeople(); layout();
      if (first) {
        sys(`${p.name} joined`);
        toast(`${p.name} joined`);
        if (S.isHost && p.incoming) {
          const list = [S.myId, ...[...S.peers.values()].filter(x => x.helloed && x.id !== p.id).map(x => x.id)];
          conn.send({ t: 'peers', list });
        }
      }
      break;
    }
    case 'peers':
      if (fromHost && Array.isArray(d.list)) d.list.forEach(id => { if (typeof id === 'string' && id !== S.myId) connectTo(id); });
      break;
    case 'state': {
      const was = p.state;
      p.state = Object.assign({}, was, d.state || {});
      if (p.state.hand && !was.hand) toast(`${p.name} raised a hand`);
      updateTile(p.id); renderPeople(); layout();
      break;
    }
    case 'chat':
      addChat({ name: p.name, text: String(d.text || '').slice(0, 600), time: fmtTime() });
      break;
    case 'react': floatEmoji(p.id, String(d.e || '').slice(0, 8)); break;
    case 'cap': if (S.caps) showCaption(p.id, p.name, String(d.text || ''), !!d.final); break;
    case 'rec':
      p.rec = !!d.on;
      if (p.rec) toast(`${p.name} started recording`);
      updateRecPill();
      break;
    case 'mute': if (fromHost && me.mic) { setMic(false); toast('The host muted everyone'); } break;
    case 'kick': if (fromHost) leave('The host removed you from the meeting.'); break;
    case 'end': if (fromHost) leave('The host ended the meeting.'); break;
  }
}
function dropPeer(id) {
  const p = S.peers.get(id);
  if (!p) return;
  S.peers.delete(id);
  try { p.call && p.call.close(); } catch (e) {}
  try { p.conn && p.conn.close(); } catch (e) {}
  const t = tiles.get(id);
  if (t) { t.el.remove(); tiles.delete(id); }
  if (S.pinned === id) S.pinned = null;
  if (visible(p)) { sys(`${p.name} left`); toast(`${p.name} left`); }
  renderPeople(); layout(); updateRecPill();
}

/* -------------------------------------------------------------------- peers */
function makePeer(id) {
  return new Promise((resolve, reject) => {
    let opened = false;
    const p = new Peer(id || undefined, PEER_OPTS);
    p.on('open', () => { opened = true; resolve(p); });
    p.on('error', e => {
      if (!opened) { try { p.destroy(); } catch (x) {} reject(e); }
      else onPeerError(e);
    });
  });
}
function onPeerError(e) {
  if (e.type === 'peer-unavailable') return;           // someone left while we were dialing
  if (e.type === 'network' || e.type === 'server-error' || e.type === 'socket-error') toast('Connection to the meeting service is unstable.');
}
function friendly(e) {
  switch (e && e.type) {
    case 'peer-unavailable': return "That meeting doesn't exist yet, or the host has left. Check the code and try again.";
    case 'timeout': return "Couldn't reach the host. Check your connection and try again.";
    case 'network': case 'server-error': case 'socket-error': case 'socket-closed':
      return "Can't reach the WinMeet signalling service. Check your internet connection and try again.";
    case 'browser-incompatible': return "This browser doesn't support video calls. Try the latest Chrome, Edge, Firefox or Safari.";
    default: return 'Something went wrong while connecting. Please try again.';
  }
}
function attachPeerHandlers() {
  S.myId = S.peer.id;
  S.peer.on('connection', conn => {
    const p = getPeer(conn.peer);
    p.incoming = true;
    if (!p.conn) p.conn = conn;
    wireConn(conn);
  });
  S.peer.on('call', call => { call.answer(outStream()); wireCall(call); });
  S.peer.on('disconnected', () => { toast('Reconnecting to the meeting service…'); try { S.peer.reconnect(); } catch (e) {} });
}
function setBusy(b) {
  S.busy = b;
  $('#newBtn').disabled = b;
  $('#joinBtn').disabled = b || !CODE_RE.test($('#codeIn').value);
}
function fail(msg) {
  setMsg(msg, 'error');
  if (S.peer) { try { S.peer.destroy(); } catch (e) {} S.peer = null; }
  S.peers.clear();
  setBusy(false);
}
function readName() {
  const n = $('#nameIn').value.trim().replace(/\s+/g, ' ');
  if (!n) { setMsg('Enter your name first so others know who you are.', 'error'); $('#nameIn').focus(); return null; }
  try { localStorage.setItem('winmeet-name', n); } catch (e) {}
  return n;
}

async function startMeeting() {
  if (S.busy) return;
  const name = readName(); if (!name) return;
  S.name = name; S.isHost = true;
  setBusy(true); setMsg('Creating your meeting…');
  ensureAudio();
  for (let i = 0; i < 4 && !S.peer; i++) {
    const code = genCode();
    try {
      S.peer = await makePeer('winmeet-' + code);
      S.code = code;
    } catch (e) {
      if (e.type !== 'unavailable-id') { fail(friendly(e)); return; }
    }
  }
  if (!S.peer) { fail('Could not create a meeting. Please try again.'); return; }
  attachPeerHandlers();
  S.hostId = S.myId;
  enter();
}
async function joinMeeting() {
  if (S.busy) return;
  const name = readName(); if (!name) return;
  const code = $('#codeIn').value.trim();
  if (!CODE_RE.test(code)) { setMsg('Meeting codes look like abc-defg-hij.', 'error'); return; }
  S.name = name; S.isHost = false; S.code = code; S.hostId = 'winmeet-' + code;
  setBusy(true); setMsg('Joining…');
  ensureAudio();
  try {
    S.peer = await makePeer();
    attachPeerHandlers();
    const hp = getPeer(S.hostId);
    const conn = S.peer.connect(S.hostId, { reliable: true });
    hp.conn = conn; wireConn(conn);
    await new Promise((resolve, reject) => {
      const t = setTimeout(() => reject({ type: 'timeout' }), 12000);
      conn.on('open', () => { clearTimeout(t); resolve(); });
      const onErr = e => { if (e.type === 'peer-unavailable') { clearTimeout(t); reject(e); } };
      S.peer.on('error', onErr);
    });
  } catch (e) { fail(friendly(e)); return; }
  enter();
}

/* -------------------------------------------------------------- entering UI */
function ensureAudio() {
  audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
}
function enter() {
  setBusy(false); setMsg('');
  S.t0 = Date.now(); S.pinned = null; S.unread = 0;
  $('#chatList').textContent = '';
  $('#lobby').hidden = true;
  $('#meeting').hidden = false;
  $('#mtgCode').textContent = S.code;
  try { history.replaceState(null, '', '#' + S.code); } catch (e) {}
  ensureTile('me');
  attachAudio('me', me.stream);
  updateTile('me'); updateBtns(); renderPeople(); layout();
  clearInterval(S.timer); clearInterval(S.speakTimer);
  S.timer = setInterval(tick, 1000); tick();
  S.speakTimer = setInterval(speakLoop, 180);
  sys(S.isHost ? `You started ${S.code}. Share the invite link so others can join.` : `You joined ${S.code}`);
  if (S.isHost) toast('Meeting ready. Copy the invite link to share it.');
}
function tick() {
  const s = ((Date.now() - S.t0) / 1000) | 0;
  const h = (s / 3600) | 0, m = ((s % 3600) / 60) | 0, sec = s % 60;
  $('#elapsed').textContent = (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(sec).padStart(2, '0');
}

/* -------------------------------------------------------------------- tiles */
function ensureTile(id) {
  if (tiles.has(id)) return tiles.get(id);
  const el = document.createElement('div');
  el.className = 'tile';
  el.innerHTML = '<video autoplay playsinline></video><div class="avatar"><span></span></div>' +
    '<div class="chip hand" hidden>✋</div><div class="chip who"><span class="mi"></span><span class="nm"></span></div>' +
    '<button class="pin" type="button"></button><div class="fx"></div>';
  const t = {
    el, video: $('video', el), av: $('.avatar span', el), hand: $('.hand', el), mi: $('.mi', el),
    nm: $('.nm', el), pin: $('.pin', el), fx: $('.fx', el), an: null
  };
  t.pin.innerHTML = ico('pin');
  t.pin.addEventListener('click', () => { S.pinned = S.pinned === id ? null : id; tiles.forEach((_, k) => updateTile(k)); layout(); });
  if (id === 'me') t.video.muted = true;
  $('#grid').appendChild(el);
  tiles.set(id, t);
  return t;
}
function updateTile(id) {
  const t = tiles.get(id); if (!t) return;
  const isMe = id === 'me';
  const p = isMe ? null : S.peers.get(id);
  if (!isMe && !p) return;
  const name = isMe ? S.name : p.name;
  const sharing = isMe ? me.sharing : !!p.state.sharing;
  const camOff = isMe ? (me.noCam || !me.cam) : p.state.cam === false;
  const micOff = isMe ? (me.noMic || !me.mic) : p.state.mic === false;
  const hand = isMe ? me.hand : !!p.state.hand;
  const stream = isMe ? (sharing && me.screen ? me.screen : me.stream) : p.stream;
  if (stream && t.video.srcObject !== stream) { t.video.srcObject = stream; t.video.play().catch(() => {}); }
  t.el.classList.toggle('camoff', camOff && !sharing);
  t.el.classList.toggle('sharing', sharing);
  t.el.classList.toggle('mirror', isMe && me.mirror && !sharing);
  t.el.classList.toggle('pinned', S.pinned === id);
  t.av.textContent = initials(name);
  t.av.style.background = avColor(name);
  t.nm.textContent = (isMe ? 'You' : name) + (sharing ? ' (presenting)' : '');
  t.mi.innerHTML = micOff ? ico('micOff') : '';
  t.mi.style.display = micOff ? 'flex' : 'none';
  t.hand.hidden = !hand;
  t.pin.setAttribute('aria-label', S.pinned === id ? 'Unpin' : 'Pin to main view');
  t.pin.title = S.pinned === id ? 'Unpin' : 'Pin to main view';
}
function floatEmoji(id, e) {
  const t = tiles.get(id); if (!t || !e) return;
  const s = document.createElement('span');
  s.textContent = e;
  s.style.left = (10 + Math.random() * 70) + '%';
  t.fx.appendChild(s);
  setTimeout(() => s.remove(), 2500);
}

/* ------------------------------------------------------------------- layout */
function spotlightId() {
  if (S.pinned && tiles.has(S.pinned)) return S.pinned;
  for (const id of tiles.keys()) {
    const sh = id === 'me' ? me.sharing : (S.peers.get(id) || { state: {} }).state.sharing;
    if (sh) return id;
  }
  return null;
}
function computeRects(W, H, ids, spot, gap) {
  const R = new Map(); const n = ids.length;
  if (!n || W <= 0 || H <= 0) return R;
  if (spot && n > 1 && ids.includes(spot)) {
    const others = ids.filter(i => i !== spot), k = others.length;
    if (W >= 760 && W > H * 0.9) {
      const sw = Math.round(Math.min(230, Math.max(150, W * 0.2)));
      R.set(spot, { x: 0, y: 0, w: W - sw - gap, h: H });
      let th = Math.round(sw * 9 / 16);
      if (k * th + (k - 1) * gap > H) th = Math.floor((H - (k - 1) * gap) / k);
      let y = Math.max(0, Math.round((H - (k * th + (k - 1) * gap)) / 2));
      others.forEach(id => { R.set(id, { x: W - sw, y, w: sw, h: th }); y += th + gap; });
    } else {
      const sh = Math.round(Math.min(110, H * 0.2));
      R.set(spot, { x: 0, y: 0, w: W, h: H - sh - gap });
      let tw = Math.round(sh * 16 / 9);
      if (k * tw + (k - 1) * gap > W) tw = Math.floor((W - (k - 1) * gap) / k);
      let x = Math.max(0, Math.round((W - (k * tw + (k - 1) * gap)) / 2));
      others.forEach(id => { R.set(id, { x, y: H - sh, w: tw, h: sh }); x += tw + gap; });
    }
    return R;
  }
  let best = null;
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);
    const tw = (W - (cols - 1) * gap) / cols, th = (H - (rows - 1) * gap) / rows;
    if (tw <= 0 || th <= 0) continue;
    const fit = Math.min(tw, th * 4 / 3);
    const score = fit * fit * 3 / 4;
    if (!best || score > best.score) best = { cols, rows, tw, th, score };
  }
  let i = 0;
  for (let r = 0; r < best.rows; r++) {
    const inRow = Math.min(best.cols, n - r * best.cols);
    const rowW = inRow * best.tw + (inRow - 1) * gap;
    let x = (W - rowW) / 2;
    for (let c = 0; c < inRow; c++) {
      R.set(ids[i++], { x: Math.round(x), y: Math.round(r * (best.th + gap)), w: Math.floor(best.tw), h: Math.floor(best.th) });
      x += best.tw + gap;
    }
  }
  return R;
}
function layout() {
  const box = $('#grid');
  const rects = computeRects(box.clientWidth, box.clientHeight, [...tiles.keys()], spotlightId(), 10);
  rects.forEach((r, id) => {
    const t = tiles.get(id); if (!t) return;
    const s = t.el.style;
    s.left = r.x + 'px'; s.top = r.y + 'px'; s.width = r.w + 'px'; s.height = r.h + 'px';
    t.el.classList.toggle('mini', r.w < 200);
  });
}
new ResizeObserver(layout).observe($('#grid'));

/* ------------------------------------------------------------ active speaker */
function attachAudio(id, stream) {
  const t = tiles.get(id);
  if (!t || !stream || !stream.getAudioTracks().length) return;
  try {
    ensureAudio();
    const src = audioCtx.createMediaStreamSource(new MediaStream(stream.getAudioTracks()));
    const an = audioCtx.createAnalyser();
    an.fftSize = 512;
    src.connect(an);
    t.an = { an, buf: new Uint8Array(an.fftSize) };
    if (S.rec) src.connect(S.rec.dest);
  } catch (e) {}
}
function speakLoop() {
  tiles.forEach((t, id) => {
    if (!t.an) return;
    t.an.an.getByteTimeDomainData(t.an.buf);
    let s = 0;
    for (const v of t.an.buf) { const x = (v - 128) / 128; s += x * x; }
    const micOn = id === 'me' ? (me.mic && !me.noMic) : ((S.peers.get(id) || { state: {} }).state.mic !== false);
    t.el.classList.toggle('speaking', micOn && Math.sqrt(s / t.an.buf.length) > 0.045);
  });
}

/* --------------------------------------------------------------- chat + people */
function addChat(m) {
  const list = $('#chatList');
  const d = document.createElement('div');
  if (m.sys) { d.className = 'm sys'; d.textContent = m.text; }
  else {
    d.className = 'm' + (m.me ? ' me' : '');
    const meta = document.createElement('div'); meta.className = 'meta'; meta.textContent = `${m.me ? 'You' : m.name} · ${m.time}`;
    const txt = document.createElement('div'); txt.className = 'txt'; txt.textContent = m.text;
    d.append(meta, txt);
    if (!m.me && (S.panel !== 'chat' || $('#panel').hidden)) { S.unread++; updateBadge(); }
  }
  list.appendChild(d);
  list.scrollTop = list.scrollHeight;
}
const sys = text => addChat({ sys: true, text });
function updateBadge() {
  const b = $('#chatBadge');
  b.hidden = S.unread === 0;
  b.textContent = S.unread > 9 ? '9+' : S.unread;
}
function renderPeople() {
  const ul = $('#peopleList'); if (!ul) return;
  ul.textContent = '';
  const rows = [{ id: 'me', name: S.name, you: true, host: S.isHost, mic: me.mic && !me.noMic, hand: me.hand }];
  S.peers.forEach(p => { if (visible(p)) rows.push({ id: p.id, name: p.name, host: p.id === S.hostId, mic: p.state.mic !== false, hand: !!p.state.hand }); });
  $('#peopleCount').textContent = `${rows.length} in this meeting`;
  $('#muteAll').hidden = !(S.isHost && rows.length > 1);
  rows.forEach(r => {
    const li = document.createElement('li');
    const av = document.createElement('div'); av.className = 'pav'; av.textContent = initials(r.name); av.style.background = avColor(r.name);
    const pn = document.createElement('div'); pn.className = 'pn'; pn.textContent = r.name;
    if (r.you || r.host) { const s = document.createElement('small'); s.textContent = [r.you ? 'You' : '', r.host ? 'Host' : ''].filter(Boolean).join(', '); pn.appendChild(s); }
    const st = document.createElement('div'); st.className = 'pst';
    st.innerHTML = (r.hand ? '<span>✋</span>' : '') + (r.mic ? '' : `<span class="off">${ico('micOff')}</span>`);
    li.append(av, pn, st);
    if (S.isHost && !r.you) {
      const b = document.createElement('button'); b.className = 'rm'; b.type = 'button'; b.textContent = 'Remove';
      b.setAttribute('aria-label', `Remove ${r.name}`);
      b.onclick = () => { const p = S.peers.get(r.id); if (p && p.conn && p.conn.open) p.conn.send({ t: 'kick' }); setTimeout(() => dropPeer(r.id), 300); };
      li.appendChild(b);
    }
    ul.appendChild(li);
  });
}
function openPanel(tab) {
  S.panel = tab;
  $('#panel').hidden = false;
  $('#tabChat').setAttribute('aria-selected', String(tab === 'chat'));
  $('#tabPeople').setAttribute('aria-selected', String(tab === 'people'));
  $('#paneChat').hidden = tab !== 'chat';
  $('#panePeople').hidden = tab !== 'people';
  if (tab === 'chat') { S.unread = 0; updateBadge(); $('#chatList').scrollTop = 1e9; if (innerWidth > 760) $('#chatIn').focus(); }
  else renderPeople();
}
function closePanel() { $('#panel').hidden = true; S.panel = null; }
function togglePanel(tab) { if (!$('#panel').hidden && S.panel === tab) closePanel(); else openPanel(tab); }

/* ------------------------------------------------------------------ popovers */
function closePops(except) { $$('.pop').forEach(p => { if (p !== except) p.hidden = true; }); }
function openPop(pop, btn) {
  const wasHidden = pop.hidden;
  closePops();
  if (!wasHidden) return;
  pop.hidden = false;
  const r = btn.getBoundingClientRect();
  const left = Math.max(8, Math.min(r.left + r.width / 2 - pop.offsetWidth / 2, innerWidth - pop.offsetWidth - 8));
  pop.style.left = left + 'px';
  pop.style.bottom = (innerHeight - r.top + 10) + 'px';
}
document.addEventListener('click', e => { if (!e.target.closest('.pop') && !e.target.closest('[data-pop]')) closePops(); });

/* ---------------------------------------------------------- screen sharing */
function replaceVideo(track) {
  S.peers.forEach(p => {
    const pc = p.call && p.call.peerConnection; if (!pc) return;
    const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
    if (sender) sender.replaceTrack(track).catch(() => {});
  });
}
async function startShare() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) { toast("Screen sharing isn't supported on this device."); return; }
  try {
    const ds = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    const vt = ds.getVideoTracks()[0];
    me.screen = ds; me.sharing = true;
    vt.onended = () => stopShare();
    replaceVideo(vt);
    updateBtns(); updateTile('me'); pushState(); layout();
  } catch (e) { /* cancelled */ }
}
function stopShare() {
  if (!me.screen) return;
  stopStream(me.screen);
  me.screen = null; me.sharing = false;
  replaceVideo(me.camTrack);
  updateBtns(); updateTile('me'); pushState(); layout();
}

/* ---------------------------------------------------------------- captions */
const capTimers = {};
function showCaption(id, name, text, fin) {
  if (!S.caps || !text) return;
  const box = $('#captions'); box.hidden = false;
  let line = box.querySelector(`[data-id="${CSS.escape(id)}"]`);
  if (!line) {
    line = document.createElement('p'); line.dataset.id = id;
    line.append(document.createElement('b'), document.createElement('span'));
    box.appendChild(line);
    while (box.children.length > 3) box.firstChild.remove();
  }
  line.firstChild.textContent = name;
  line.lastChild.textContent = text.slice(-170);
  clearTimeout(capTimers[id]);
  capTimers[id] = setTimeout(() => { line.remove(); if (!box.children.length) box.hidden = true; }, fin ? 3500 : 5500);
}
function syncCaps() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const want = S.caps && me.mic && !me.noMic && !$('#meeting').hidden;
  if (want && !S.sr && SR) {
    const r = new SR();
    r.continuous = true; r.interimResults = true; r.lang = S.capLang;
    let last = 0;
    r.onresult = e => {
      let txt = '', fin = false;
      for (let i = e.resultIndex; i < e.results.length; i++) { txt += e.results[i][0].transcript; if (e.results[i].isFinal) fin = true; }
      txt = txt.trim(); if (!txt) return;
      showCaption('me', 'You', txt, fin);
      const now = Date.now();
      if (fin || now - last > 300) { last = now; bcast({ t: 'cap', text: txt, final: fin }); }
    };
    r.onend = () => { if (S.sr === r) { S.sr = null; if (S.caps) setTimeout(syncCaps, 200); } };
    r.onerror = e => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        S.caps = false; S.sr = null; updateBtns(); toast('Captions need permission to use the microphone for speech recognition.');
      }
    };
    S.sr = r;
    try { r.start(); } catch (e) {}
  } else if (!want && S.sr) {
    const r = S.sr; S.sr = null; try { r.stop(); } catch (e) {}
  }
}
function toggleCaps() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR && !S.caps) { toast('Live captions need Chrome, Edge or Safari. You can still read other people\'s captions once they turn theirs on.'); }
  S.caps = !S.caps;
  if (!S.caps) { $('#captions').textContent = ''; $('#captions').hidden = true; }
  else if (!me.mic) toast('Unmute to have your own speech captioned.');
  updateBtns(); syncCaps();
}

/* --------------------------------------------------------------- recording */
function rr(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function drawCover(g, v, x, y, w, h, contain) {
  const vw = v.videoWidth, vh = v.videoHeight; if (!vw || !vh) return;
  const s = contain ? Math.min(w / vw, h / vh) : Math.max(w / vw, h / vh);
  const dw = vw * s, dh = vh * s;
  g.drawImage(v, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}
function drawFrame() {
  const r = S.rec; if (!r) return;
  const { g, cv } = r, W = cv.width, H = cv.height;
  g.fillStyle = '#141c26'; g.fillRect(0, 0, W, H);
  const rects = computeRects(W, H, [...tiles.keys()], spotlightId(), 10);
  rects.forEach((rc, id) => {
    const t = tiles.get(id); if (!t) return;
    const isMe = id === 'me', p = isMe ? null : S.peers.get(id);
    const name = isMe ? S.name : (p ? p.name : 'Guest');
    const sharing = isMe ? me.sharing : !!(p && p.state.sharing);
    const camOff = isMe ? (me.noCam || !me.cam) : (p && p.state.cam === false);
    g.save(); rr(g, rc.x, rc.y, rc.w, rc.h, 16); g.clip();
    g.fillStyle = '#26364a'; g.fillRect(rc.x, rc.y, rc.w, rc.h);
    if (!camOff || sharing) {
      if (isMe && me.mirror && !sharing) { g.translate(rc.x * 2 + rc.w, 0); g.scale(-1, 1); }
      drawCover(g, t.video, rc.x, rc.y, rc.w, rc.h, sharing);
    } else {
      const rad = Math.min(rc.h * 0.28, 70);
      g.fillStyle = avColor(name); g.beginPath(); g.arc(rc.x + rc.w / 2, rc.y + rc.h / 2, rad, 0, 7); g.fill();
      g.fillStyle = '#fff'; g.font = `700 ${Math.round(rad * 0.8)}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(initials(name), rc.x + rc.w / 2, rc.y + rc.h / 2 + 2);
    }
    g.restore();
    g.font = '600 15px sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle';
    const label = isMe ? 'You' : name, tw = g.measureText(label).width + 20;
    g.fillStyle = 'rgba(20,28,38,.8)'; rr(g, rc.x + 10, rc.y + rc.h - 36, tw, 26, 9); g.fill();
    g.fillStyle = '#eef3f7'; g.fillText(label, rc.x + 20, rc.y + rc.h - 23);
  });
}
function recAudio(stream) {
  if (!S.rec || !stream || !stream.getAudioTracks().length) return;
  try { audioCtx.createMediaStreamSource(new MediaStream(stream.getAudioTracks())).connect(S.rec.dest); } catch (e) {}
}
function startRec() {
  if (!window.MediaRecorder) { toast("Recording isn't supported in this browser."); return; }
  ensureAudio();
  const cv = document.createElement('canvas'); cv.width = 1280; cv.height = 720;
  const dest = audioCtx.createMediaStreamDestination();
  const r = { cv, g: cv.getContext('2d'), dest, chunks: [], mr: null, timer: null };
  S.rec = r;
  recAudio(me.stream);
  S.peers.forEach(p => recAudio(p.stream));
  const out = new MediaStream([...cv.captureStream(15).getVideoTracks(), ...dest.stream.getAudioTracks()]);
  const mime = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'].find(m => MediaRecorder.isTypeSupported(m)) || '';
  try { r.mr = new MediaRecorder(out, mime ? { mimeType: mime, videoBitsPerSecond: 2500000 } : undefined); }
  catch (e) { S.rec = null; toast("Recording isn't supported in this browser."); return; }
  const code = S.code;
  r.mr.ondataavailable = e => { if (e.data && e.data.size) r.chunks.push(e.data); };
  r.mr.onstop = () => {
    const type = r.mr.mimeType || 'video/webm';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(r.chunks, { type }));
    a.download = `winmeet-${code}-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.${type.includes('mp4') ? 'mp4' : 'webm'}`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  };
  drawFrame();
  r.timer = setInterval(drawFrame, 66);
  r.mr.start(1000);
  me.rec = true;
  bcast({ t: 'rec', on: true });
  updateBtns(); updateRecPill();
  toast('Recording started. Everyone in the call has been told. Keep this tab open.');
}
function stopRec() {
  const r = S.rec; if (!r) return;
  clearInterval(r.timer);
  try { r.mr.stop(); } catch (e) {}
  S.rec = null; me.rec = false;
  bcast({ t: 'rec', on: false });
  updateBtns(); updateRecPill();
  toast('Recording saved to your downloads.');
}
function updateRecPill() {
  const names = [];
  if (me.rec) names.push('You');
  S.peers.forEach(p => { if (p.rec) names.push(p.name); });
  const pill = $('#recPill');
  pill.hidden = !names.length;
  pill.textContent = 'Recording';
  pill.title = names.length ? `Recording: ${names.join(', ')}` : '';
}

/* ------------------------------------------------------------------- leaving */
function leave(message, endForAll) {
  if (endForAll && S.isHost) bcast({ t: 'end' });
  if (S.rec) stopRec();
  stopShare();
  if (S.sr) { const r = S.sr; S.sr = null; try { r.stop(); } catch (e) {} }
  S.caps = false;
  clearInterval(S.timer); clearInterval(S.speakTimer);
  const finalize = () => {
    S.peers.forEach(p => { try { p.call && p.call.close(); } catch (e) {} try { p.conn && p.conn.close(); } catch (e) {} });
    S.peers.clear();
    tiles.forEach(t => t.el.remove()); tiles.clear();
    if (S.peer) { try { S.peer.destroy(); } catch (e) {} S.peer = null; }
  };
  if (endForAll) setTimeout(finalize, 300); else finalize();
  closePanel(); closePops();
  $('#captions').textContent = ''; $('#captions').hidden = true;
  me.hand = false; me.rec = false; me.mic = true; me.cam = true;
  S.pinned = null; S.isHost = false; S.hostId = null; S.myId = null;
  try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
  $('#meeting').hidden = true;
  $('#lobby').hidden = false;
  setBusy(false);
  setMsg(message || 'You left the meeting.');
  initPreview();
}

/* ------------------------------------------------------------------ wiring */
$('#pvMic').onclick = $('#mic').onclick = () => setMic(!(me.mic && !me.noMic));
$('#pvCam').onclick = $('#cam').onclick = () => setCam(!(me.cam && !me.noCam));
$('#caps').onclick = toggleCaps;
$('#present').onclick = () => (me.sharing ? stopShare() : startShare());
$('#hand').onclick = () => { me.hand = !me.hand; updateBtns(); updateTile('me'); renderPeople(); pushState(); };
$('#rec').onclick = () => (S.rec ? stopRec() : startRec());
$('#react').onclick = () => openPop($('#popReact'), $('#react'));
$('#more').onclick = () => openPop($('#popMore'), $('#more'));
$('#popReact').onclick = e => {
  const b = e.target.closest('button[data-e]'); if (!b) return;
  floatEmoji('me', b.dataset.e); bcast({ t: 'react', e: b.dataset.e }); closePops();
};
$('#mFull').onclick = () => { closePops(); if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen && document.documentElement.requestFullscreen(); };
$('#mMirror').onclick = () => { me.mirror = !me.mirror; updateBtns(); updateTile('me'); };
$('#capLang').onchange = e => {
  S.capLang = e.target.value;
  if (S.sr) { const r = S.sr; S.sr = null; try { r.stop(); } catch (x) {} setTimeout(syncCaps, 250); }
};
$('#people').onclick = () => togglePanel('people');
$('#chat').onclick = () => togglePanel('chat');
$('#tabChat').onclick = () => openPanel('chat');
$('#tabPeople').onclick = () => openPanel('people');
$('#panelClose').onclick = closePanel;
$('#muteAll').onclick = () => { bcast({ t: 'mute' }); toast('Asked everyone to mute'); };
$('#chatForm').onsubmit = e => {
  e.preventDefault();
  const inp = $('#chatIn'), text = inp.value.trim(); if (!text) return;
  bcast({ t: 'chat', text }); addChat({ me: true, text, time: fmtTime() });
  inp.value = '';
};
$('#copyLink').onclick = async () => {
  const link = location.href.split('#')[0] + '#' + S.code;
  try { await navigator.clipboard.writeText(link); toast('Invite link copied'); }
  catch (e) { window.prompt('Copy this invite link:', link); }
};
$('#leave').onclick = () => {
  if (S.isHost && [...S.peers.values()].some(visible)) openPop($('#popLeave'), $('#leave'));
  else leave('You left the meeting.', S.isHost);
};
$('#lvOnly').onclick = () => leave('You left the meeting. Others can keep talking, but no one new can join.');
$('#lvAll').onclick = () => leave('You ended the meeting for everyone.', true);

$('#newBtn').onclick = startMeeting;
$('#joinForm').onsubmit = e => { e.preventDefault(); joinMeeting(); };
$('#codeIn').oninput = e => {
  let raw = e.target.value; const h = raw.lastIndexOf('#'); if (h >= 0) raw = raw.slice(h + 1);
  const v = raw.toLowerCase().replace(/[^a-z]/g, '').slice(0, 10);
  e.target.value = v.slice(0, 3) + (v.length > 3 ? '-' + v.slice(3, 7) : '') + (v.length > 7 ? '-' + v.slice(7) : '');
  $('#joinBtn').disabled = S.busy || !CODE_RE.test(e.target.value);
};
$('#nameIn').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); if (CODE_RE.test($('#codeIn').value)) joinMeeting(); else startMeeting(); } };
$('#camSel').onchange = $('#micSel').onchange = () => initPreview();

document.addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === 'Escape') { closePops(); if ($('#meeting').hidden === false) closePanel(); return; }
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) || $('#meeting').hidden) return;
  const k = e.key.toLowerCase();
  if (k === 'm') $('#mic').click();
  else if (k === 'v') $('#cam').click();
  else if (k === 'h') $('#hand').click();
  else if (k === 'c') $('#caps').click();
});
window.addEventListener('pagehide', () => { if (S.peer) { try { S.peer.destroy(); } catch (e) {} } });

/* -------------------------------------------------------------------- boot */
(function boot() {
  try { $('#nameIn').value = localStorage.getItem('winmeet-name') || ''; } catch (e) {}
  const h = decodeURIComponent(location.hash.slice(1)).toLowerCase();
  if (CODE_RE.test(h)) {
    $('#codeIn').value = h; $('#joinBtn').disabled = false;
    setMsg(`You're joining ${h}. Enter your name, then choose Join.`);
    $('#nameIn').focus();
  }
  updateBtns();
  initPreview();
})();
})();
