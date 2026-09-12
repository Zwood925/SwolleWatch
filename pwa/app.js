// ─── SwolleWatch PWA – Full Timer Logic ──────────────────────────────────────

const RING_CIRCUMFERENCE = 691.15; // 2π × 110

// ─── State ────────────────────────────────────────────────────────────────────
const state = {
  phase: 'idle',
  segments: [],
  currentIndex: 0,
  secondsLeft: 0,
  totalElapsed: 0,
  isRunning: false,
  lastTick: null,
  activeCues: new Set(),
  beepInterval: null,
  lastBeepSec: -1,
  ttsEnabled: true,
  ttsUrl: 'http://localhost:5002',
  ttsVoice: 'male_motivational',
  ttsVolume: 0.85,
};

// ─── Audio ─────────────────────────────────────────────────────────────────────
let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

// Generic tone player: freq, duration seconds, vol (0-1), type
function tone(freq, dur, vol = 0.35, type = 'sine') {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = type;
    gain.gain.setValueAtTime(vol * state.ttsVolume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  } catch (_) {}
}

function beepLoad()   { tone(880,  0.08, 0.4); }  // short tick
function beepTick()   { tone(1320, 0.06, 0.25); }  // solid tick each second
function beepRoundEnd(){ tone(1100, 0.25, 0.6, 'square'); tone(1540, 0.25, 0.5); } // two-tone round end
function beepRestEnd() { tone(660,  0.3,  0.55, 'sine'); tone(880, 0.3, 0.5); }     // softer rest end
function beepFinish() { tone(1760, 0.4, 0.7); setTimeout(()=>tone(2200, 0.6, 0.7), 300); } // triumphant finish
function beepWarning() { tone(700,  0.2,  0.5); }
function beepCountIn() { tone(1000, 0.3, 0.5); }

// ─── TTS ──────────────────────────────────────────────────────────────────────
async function ttsSpeak(text) {
  if (!state.ttsEnabled || !text) return;
  try {
    await fetch(`${state.ttsUrl}/speak`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice: state.ttsVoice, speed: 1.0 }),
    });
  } catch (_) {}
}

// ─── Timer Controls ───────────────────────────────────────────────────────────
function configure(segments) {
  stop();
  state.segments = segments.map(s => ({ ...s, voiceCues: s.voiceCues || [] }));
  if (segments.length) state.secondsLeft = segments[0].countInSeconds || 0;
  render();
}

function start() {
  if (!state.segments.length) { showToast('Add segments first'); return; }
  getAudioCtx(); // unlock audio on user gesture
  state.isRunning = true;
  advanceToSegment(0);
}

function pause() {
  state.isRunning = false;
  clearInterval(state.beepInterval);
  state.beepInterval = null;
  state.phase = 'paused';
  render();
}

function resume() {
  state.isRunning = true;
  state.lastTick = Date.now();
  state.phase = 'running';
  requestAnimationFrame(tick);
  render();
}

function stop() {
  state.isRunning = false;
  clearInterval(state.beepInterval);
  state.beepInterval = null;
  state.phase = 'idle';
  state.currentIndex = 0;
  state.totalElapsed = 0;
  state.secondsLeft = state.segments[0]?.countInSeconds || 0;
  state.activeCues = new Set();
  state.lastBeepSec = -1;
  render();
}

function skipSegment() {
  if (state.currentIndex >= state.segments.length - 1) return;
  advanceToSegment(state.currentIndex + 1);
}

// ─── Segment Flow ──────────────────────────────────────────────────────────────
function advanceToSegment(index) {
  clearInterval(state.beepInterval);
  state.beepInterval = null;
  state.lastBeepSec = -1;

  if (index >= state.segments.length) {
    state.isRunning = false;
    state.phase = 'finished';
    beepFinish();
    ttsSpeak('Workout complete! Amazing work!');
    showToast('🏆 Workout complete!');
    render();
    return;
  }

  state.currentIndex = index;
  state.activeCues = new Set();
  const seg = state.segments[index];

  if (seg.countInSeconds > 0) {
    state.phase = 'countIn';
    state.secondsLeft = seg.countInSeconds;
    beepCountIn();
  } else {
    startSegment(index);
  }

  state.lastTick = Date.now();
  requestAnimationFrame(tick);
  render();
}

function startSegment(index) {
  const seg = state.segments[index];
  state.phase = 'running';
  state.secondsLeft = seg.durationSeconds;

  // Start segment cue
  const startCue = seg.voiceCues.find(c => c.when === 'start');
  if (startCue) ttsSpeak(startCue.text);
  else ttsSpeak(seg.name);

  // Kick off beep interval if solidTick is on
  if (seg.solidTick !== false) {
    startBeepInterval(seg);
  }

  render();
}

function startBeepInterval(seg) {
  clearInterval(state.beepInterval);
  state.lastBeepSec = Math.ceil(state.secondsLeft);
  state.beepInterval = setInterval(() => {
    const currentSec = Math.ceil(state.secondsLeft);
    if (currentSec !== state.lastBeepSec && currentSec > 0) {
      beepTick();
      state.lastBeepSec = currentSec;
    }
  }, 200);
}

// ─── Tick ─────────────────────────────────────────────────────────────────────
function tick() {
  if (!state.isRunning) return;

  const now = Date.now();
  const dt = (now - state.lastTick) / 1000;
  state.lastTick = now;
  state.totalElapsed += dt;

  const seg = state.segments[state.currentIndex];
  if (!seg) return;

  if (state.phase === 'countIn') {
    state.secondsLeft -= dt;
    if (state.secondsLeft <= 0) { startSegment(state.currentIndex); return; }
  } else if (state.phase === 'running') {
    state.secondsLeft -= dt;

    // Custom voice cues
    for (const cue of seg.voiceCues) {
      if (cue.when !== 'start' && !state.activeCues.has(cue.id)) {
        const secBefore = parseInt(cue.when);
        if (!isNaN(secBefore) && state.secondsLeft <= secBefore) {
          state.activeCues.add(cue.id);
          ttsSpeak(cue.text);
          beepWarning();
        }
      }
    }

    // Segment end
    if (state.secondsLeft <= 0) {
      state.phase = 'ending';
      handleSegmentEnd(seg);
      return;
    }
  }

  render();
  requestAnimationFrame(tick);
}

function handleSegmentEnd(seg) {
  clearInterval(state.beepInterval);
  state.beepInterval = null;

  if (seg.type === 'rest') {
    beepRestEnd();
  } else {
    beepRoundEnd();
  }

  advanceToSegment(state.currentIndex + 1);
}

// ─── Render ───────────────────────────────────────────────────────────────────
function render() {
  const seg = state.segments[state.currentIndex];
  const total = seg ? (state.phase === 'countIn' ? seg.countInSeconds : seg.durationSeconds) : 0;
  const progress = total > 0 ? Math.max(0, 1 - state.secondsLeft / total) : 0;

  const secs = Math.max(0, Math.ceil(state.secondsLeft));
  document.getElementById('timerDisplay').textContent =
    `${String(Math.floor(secs / 60)).padStart(2,'0')}:${String(secs % 60).padStart(2,'0')}`;

  const ring = document.getElementById('ringProgress');
  ring.style.strokeDashoffset = RING_CIRCUMFERENCE * (1 - progress);

  const color = seg?.type === 'rest' ? '#2aff8a' : '#ff2a2a';
  ring.style.stroke = color;

  const bgEl = document.getElementById('bgRadial');
  const glowColor = seg?.type === 'rest' ? 'rgba(42,255,138,0.18)' : 'rgba(255,42,42,0.18)';
  bgEl.style.background = `radial-gradient(circle at 50% 30%, ${glowColor}, transparent 60%)`;

  const phaseMap = {
    idle:'READY', countIn:'GET READY', running:(seg?.name||'').toUpperCase(),
    ending: (seg?.type==='rest'?'REST':'ROUND')+' DONE',
    paused:'PAUSED', finished:'DONE'
  };
  document.getElementById('phaseLabel').textContent = phaseMap[state.phase] || 'READY';

  const dot = document.getElementById('segmentDot');
  const name = document.getElementById('segmentName');
  const meta = document.getElementById('segmentMeta');
  if (seg) {
    dot.style.background = seg.type === 'rest' ? '#2aff8a' : '#ff2a2a';
    dot.style.boxShadow = `0 0 8px ${seg.type === 'rest' ? '#2aff8a' : '#ff2a2a'}`;
    name.textContent = seg.name.toUpperCase();
    meta.textContent = `${seg.durationSeconds}s · ${seg.countInSeconds}s CI · ${seg.solidTick !== false ? 'Tick On' : 'Tick Off'}`;
  } else {
    dot.style.background = '#888'; name.textContent = '—'; meta.textContent = 'Configure a workout';
  }

  const upcoming = document.getElementById('upcomingList');
  upcoming.innerHTML = state.segments.slice(state.currentIndex + 1, state.currentIndex + 5)
    .map(s => `<div class="upcoming-chip" style="border-color:${s.type==='rest'?'#2aff8a33':'#ff2a2a33'}">${s.name} ${s.durationSeconds}s</div>`).join('');

  // Main button
  const mainBtn = document.getElementById('mainBtn');
  const mainIcon = document.getElementById('mainBtnIcon');
  const mainLabel = document.getElementById('mainBtnLabel');
  if (state.phase === 'idle') {
    mainIcon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"/>';
    mainLabel.textContent = 'START'; mainBtn.className = 'ctrl-btn ctrl-primary';
  } else if (state.isRunning) {
    mainIcon.innerHTML = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';
    mainLabel.textContent = 'PAUSE'; mainBtn.className = 'ctrl-btn ctrl-primary';
  } else if (state.phase === 'paused') {
    mainIcon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"/>';
    mainLabel.textContent = 'RESUME'; mainBtn.className = 'ctrl-btn ctrl-primary';
  } else if (state.phase === 'finished') {
    mainIcon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"/>';
    mainLabel.textContent = 'RESTART'; mainBtn.className = 'ctrl-btn ctrl-primary';
  }

  // Countdown bar
  updateCountdownBar();
}

// Mini countdown bar showing next 5 cues
function updateCountdownBar() {
  const bar = document.getElementById('cueBar');
  if (!bar) return;
  const seg = state.segments[state.currentIndex];
  if (!seg || !seg.voiceCues || seg.voiceCues.length === 0) {
    bar.innerHTML = '';
    return;
  }
  bar.innerHTML = seg.voiceCues
    .filter(c => c.when !== 'start')
    .sort((a,b) => parseInt(a.when) - parseInt(b.when))
    .map(c => `<span class="cue-chip" data-sec="${c.when}">${c.when}s: ${c.text}</span>`)
    .join('');
}

// ─── UI Helpers ────────────────────────────────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3500);
}

// ─── Full Editor ───────────────────────────────────────────────────────────────
let editorSegments = [];

function openEditor() {
  editorSegments = state.segments.map(s => ({...s, voiceCues: (s.voiceCues||[]).map(c=>({...c}))}));
  document.getElementById('workoutName').value = 'Elite HIIT';
  renderEditorList();
  document.getElementById('editorOverlay').classList.add('open');
}

function closeEditor() {
  document.getElementById('editorOverlay').classList.remove('open');
}

function renderEditorList() {
  const list = document.getElementById('segmentsList');
  list.innerHTML = editorSegments.map((s, i) => `
    <div class="seg-card" id="segCard${i}">
      <div style="width:100%">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <input class="seg-name-input" value="${s.name}" data-i="${i}" placeholder="Segment name">
          <button class="del-seg-btn" onclick="removeSeg(${i})">✕</button>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <div class="field-row">
            <label>Type</label>
            <select data-i="${i}" class="seg-type">
              <option value="work" ${s.type==='work'?'selected':''}>Round</option>
              <option value="rest" ${s.type==='rest'?'selected':''}>Rest</option>
            </select>
          </div>
          <div class="field-row">
            <label>Duration (s)</label>
            <input type="number" value="${s.durationSeconds}" data-i="${i}" class="seg-dur" min="1">
          </div>
          <div class="field-row">
            <label>Count-in (s)</label>
            <input type="number" value="${s.countInSeconds}" data-i="${i}" class="seg-ci" min="0">
          </div>
          <div class="field-row">
            <label>Solid tick/sec</label>
            <select data-i="${i}" class="seg-tick">
              <option value="true" ${s.solidTick!==false?'selected':''}>On</option>
              <option value="false" ${s.solidTick===false?'selected':''}>Off</option>
            </select>
          </div>
        </div>
        <div style="margin-top:8px">
          <div style="font-size:10px;letter-spacing:1px;opacity:0.5;margin-bottom:4px;font-weight:700">VOICE CUES</div>
          ${renderCueFields(i, s.voiceCues)}
          <button class="add-cue-btn" onclick="addCue(${i})">+ Add Voice Cue</button>
        </div>
      </div>
    </div>
  `).join('');
}

function renderCueFields(segIdx, cues) {
  if (!cues || cues.length === 0) return '<div style="font-size:11px;opacity:0.4">No cues yet</div>';
  return cues.map((c, ci) => `
    <div class="cue-row">
      <input type="text" class="cue-text" value="${c.text||''}" placeholder="e.g. You got this!" data-si="${segIdx}" data-ci="${ci}" style="flex:2">
      <span style="font-size:10px;opacity:0.5;white-space:nowrap">at</span>
      <input type="number" class="cue-when" value="${c.when||10}" data-si="${segIdx}" data-ci="${ci}" min="1" style="width:50px" placeholder="sec">
      <span style="font-size:10px;opacity:0.5;white-space:nowrap">sec left</span>
      <button class="del-cue-btn" onclick="removeCue(${segIdx},${ci})">✕</button>
    </div>
  `).join('');
}

function addSeg() {
  const type = editorSegments.length % 2 === 0 ? 'work' : 'rest';
  const dur = type === 'work' ? 60 : 30;
  editorSegments.push({
    id: crypto.randomUUID(),
    name: type === 'work' ? 'Round' : 'Rest',
    type,
    durationSeconds: dur,
    countInSeconds: 0,
    solidTick: true,
    voiceCues: [{ id: crypto.randomUUID(), text: type==='work' ? 'Let\'s go!' : 'Recover.', when: 'start' }]
  });
  renderEditorList();
}

function removeSeg(i) {
  editorSegments.splice(i, 1);
  renderEditorList();
}

function addCue(segIdx) {
  editorSegments[segIdx].voiceCues.push({ id: crypto.randomUUID(), text: 'You got this!', when: '10' });
  renderEditorList();
}

function removeCue(segIdx, cueIdx) {
  editorSegments[segIdx].voiceCues.splice(cueIdx, 1);
  renderEditorList();
}

function collectEditorData() {
  // Gather all inline input values into the segments array
  document.querySelectorAll('.seg-name-input').forEach(inp => {
    const i = parseInt(inp.dataset.i);
    editorSegments[i].name = inp.value;
  });
  document.querySelectorAll('.seg-type').forEach(inp => {
    const i = parseInt(inp.dataset.i);
    editorSegments[i].type = inp.value;
  });
  document.querySelectorAll('.seg-dur').forEach(inp => {
    const i = parseInt(inp.dataset.i);
    editorSegments[i].durationSeconds = parseInt(inp.value) || 60;
  });
  document.querySelectorAll('.seg-ci').forEach(inp => {
    const i = parseInt(inp.dataset.i);
    editorSegments[i].countInSeconds = parseInt(inp.value) || 0;
  });
  document.querySelectorAll('.seg-tick').forEach(inp => {
    const i = parseInt(inp.dataset.i);
    editorSegments[i].solidTick = inp.value === 'true';
  });
  // Cues
  document.querySelectorAll('.cue-text').forEach(inp => {
    const si = parseInt(inp.dataset.si), ci = parseInt(inp.dataset.ci);
    if (editorSegments[si] && editorSegments[si].voiceCues[ci]) {
      editorSegments[si].voiceCues[ci].text = inp.value;
    }
  });
  document.querySelectorAll('.cue-when').forEach(inp => {
    const si = parseInt(inp.dataset.si), ci = parseInt(inp.dataset.ci);
    if (editorSegments[si] && editorSegments[si].voiceCues[ci]) {
      editorSegments[si].voiceCues[ci].when = inp.value;
    }
  });
}

function saveWorkout() {
  collectEditorData();
  if (!editorSegments.length) { showToast('Add at least one segment'); return; }
  configure(editorSegments);
  localStorage.setItem('swolleworkout', JSON.stringify({ name: document.getElementById('workoutName').value, segments: editorSegments }));
  closeEditor();
  showToast('Workout saved!');
}

// ─── TTS Settings ─────────────────────────────────────────────────────────────
function openTTS() {
  document.getElementById('ttsEnabled').checked = state.ttsEnabled;
  document.getElementById('ttsUrl').value = state.ttsUrl;
  document.getElementById('voicePreset').value = state.ttsVoice;
  document.getElementById('ttsVolume').value = state.ttsVolume;
  document.getElementById('ttsOverlay').classList.add('open');
}

function closeTTS() { document.getElementById('ttsOverlay').classList.remove('open'); }

function saveTTS() {
  state.ttsEnabled = document.getElementById('ttsEnabled').checked;
  state.ttsUrl = document.getElementById('ttsUrl').value;
  state.ttsVoice = document.getElementById('voicePreset').value;
  state.ttsVolume = parseFloat(document.getElementById('ttsVolume').value);
  localStorage.setItem('swolletts', JSON.stringify({ enabled: state.ttsEnabled, url: state.ttsUrl, voice: state.ttsVoice, volume: state.ttsVolume }));
  closeTTS();
  showToast(state.ttsEnabled ? 'Voice enabled' : 'Voice off');
}

// ─── Default Workout ───────────────────────────────────────────────────────────
function defaultWorkout() {
  return [
    { id:crypto.randomUUID(), name:'Warmup', type:'work', durationSeconds:240, countInSeconds:5, solidTick:true,
      voiceCues:[
        { id:crypto.randomUUID(), text:'Warm up. Let\'s go!', when:'start' },
        { id:crypto.randomUUID(), text:'One minute left. Keep it up!', when:'60' },
        { id:crypto.randomUUID(), text:'10 seconds! You got this!', when:'10' },
        { id:crypto.randomUUID(), text:'3, 2, 1...', when:'3' }
      ]
    },
    { id:crypto.randomUUID(), name:'Rest', type:'rest', durationSeconds:45, countInSeconds:0, solidTick:true,
      voiceCues:[
        { id:crypto.randomUUID(), text:'Recover. Breathe.', when:'start' },
        { id:crypto.randomUUID(), text:'5 seconds left. Get ready!', when:'5' }
      ]
    },
    { id:crypto.randomUUID(), name:'Round', type:'work', durationSeconds:420, countInSeconds:0, solidTick:true,
      voiceCues:[
        { id:crypto.randomUUID(), text:'Let\'s work! Push hard!', when:'start' },
        { id:crypto.randomUUID(), text:'One minute left! You\'re doing great!', when:'60' },
        { id:crypto.randomUUID(), text:'10 seconds! You got this!', when:'10' },
        { id:crypto.randomUUID(), text:'3, 2, 1...', when:'3' }
      ]
    },
    { id:crypto.randomUUID(), name:'Rest', type:'rest', durationSeconds:90, countInSeconds:0, solidTick:true,
      voiceCues:[
        { id:crypto.randomUUID(), text:'Recover. 90 seconds.', when:'start' },
        { id:crypto.randomUUID(), text:'15 seconds left. Almost there!', when:'15' }
      ]
    },
  ];
}

// ─── Init ─────────────────────────────────────────────────────────────────────
function init() {
  const saved = localStorage.getItem('swolleworkout');
  if (saved) { try { const w = JSON.parse(saved); state.segments = w.segments || []; } catch (_) { state.segments = defaultWorkout(); } }
  else { state.segments = defaultWorkout(); }

  const savedTTS = localStorage.getItem('swolletts');
  if (savedTTS) { try { const t = JSON.parse(savedTTS); Object.assign(state, t); } catch (_) {} }

  if (state.segments.length) state.secondsLeft = state.segments[0].countInSeconds || 0;

  // Events
  document.getElementById('mainBtn').addEventListener('click', () => {
    if (state.phase === 'idle' || state.phase === 'finished') start();
    else if (state.isRunning) pause();
    else if (state.phase === 'paused') resume();
  });
  document.getElementById('resetBtn').addEventListener('click', stop);
  document.getElementById('skipBtn').addEventListener('click', skipSegment);
  document.getElementById('configureBtn').addEventListener('click', openEditor);
  document.getElementById('addSegBtn').addEventListener('click', addSeg);
  document.getElementById('saveEditor').addEventListener('click', saveWorkout);
  document.getElementById('closeEditor').addEventListener('click', closeEditor);
  document.getElementById('cancelEditor').addEventListener('click', closeEditor);
  document.getElementById('ttsBtn').addEventListener('click', openTTS);
  document.getElementById('closeTTS').addEventListener('click', closeTTS);
  document.getElementById('saveTTS').addEventListener('click', saveTTS);

  render();
  showToast('SwolleWatch loaded — configure your workout!');
}

window.addEventListener('DOMContentLoaded', init);
