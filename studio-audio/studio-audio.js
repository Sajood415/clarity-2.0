/* Studio: Audio — mockup module (My Library + goal-first creation flow) */
var StudioAudio = (function () {
  /* ---------------- Reference data ---------------- */
  var SA_GOALS = [
    { id: 'podcast',   emoji: '🎙️', label: 'Podcast',          desc: 'Multi-speaker show with hosts & guests', multi: true },
    { id: 'ad',        emoji: '📣', label: 'Marketing Ad',     desc: 'Short, high-energy promo spot' },
    { id: 'narration', emoji: '📖', label: 'Narration',        desc: 'Audiobook or explainer voiceover' },
    { id: 'elearning', emoji: '🎓', label: 'E-Learning',       desc: 'Clear, instructional course audio' },
    { id: 'character', emoji: '🎮', label: 'Character / Game', desc: 'Expressive character voices' },
    { id: 'social',    emoji: '📱', label: 'Social Clip',      desc: 'Snappy voiceover for short video' }
  ];

  var SA_VOICES = [
    { id: 'aria', name: 'Aria', desc: 'Warm narrator · F · en-US' },
    { id: 'deon', name: 'Deon', desc: 'Deep host · M · en-US' },
    { id: 'max',  name: 'Max',  desc: 'Upbeat promo · M · en-US' },
    { id: 'lila', name: 'Lila', desc: 'Friendly instructor · F · en-GB' },
    { id: 'nova', name: 'Nova', desc: 'Gen-Z creator · F · en-US' },
    { id: 'kai',  name: 'Kai',  desc: 'Character range · NB · en-US' }
  ];

  // Per-goal AI preset: the "80% technical heavy lifting" done for the user.
  var SA_PRESET = {
    podcast:   { vibe: 'Conversational & Warm',     voice: 'deon', music: 'Soft Lo-fi Bed',   stability: 55, pace: 'Natural (150 wpm)',  acoustics: 'Professional Studio (dry)', tones: ['Conversational', 'Warm', 'Curious'], sample: 'So here’s what nobody tells you about the 4am bake…' },
    ad:        { vibe: 'Energetic & Persuasive',     voice: 'max',  music: 'Upbeat Pop',       stability: 38, pace: 'Fast (175 wpm)',     acoustics: 'Punchy / Bright',           tones: ['Energetic', 'Confident', 'Upbeat'], sample: 'This weekend only — everything must go!' },
    narration: { vibe: 'Professional & Trustworthy', voice: 'aria', music: 'Cinematic Ambient', stability: 72, pace: 'Measured (140 wpm)', acoustics: 'Intimate Booth',             tones: ['Calm', 'Authoritative', 'Warm'], sample: 'The new horizon awaits those who wait for the rise…' },
    elearning: { vibe: 'Clear & Friendly',           voice: 'lila', music: 'None',             stability: 78, pace: 'Clear (135 wpm)',    acoustics: 'Clean / Neutral',           tones: ['Clear', 'Friendly', 'Patient'], sample: 'In this module, we’ll cover three core techniques.' },
    character: { vibe: 'Expressive & Playful',       voice: 'kai',  music: 'Game Score',       stability: 25, pace: 'Dynamic',           acoustics: 'Stylized FX',               tones: ['Playful', 'Bold', 'Quirky'], sample: 'Ha! You’ll never catch the Doughboy!' },
    social:    { vibe: 'Snappy & Trendy',            voice: 'nova', music: 'Trending Beat',    stability: 42, pace: 'Fast (170 wpm)',     acoustics: 'Phone-native',              tones: ['Snappy', 'Trendy', 'Energetic'], sample: 'Ok wait — you NEED to see this before Saturday.' }
  };

  var SA_TRIO = [
    { tag: 'H', color: '#34d399', name: 'Aria', role: 'Host — deep, anchoring' },
    { tag: 'C', color: '#d4a853', name: 'Max',  role: 'Co-host — high-energy' },
    { tag: 'E', color: '#f59e0b', name: 'Lila', role: 'Expert — neutral, measured' }
  ];

  var SA_TONE_POOL = ['Conversational', 'Warm', 'Energetic', 'Confident', 'Calm', 'Authoritative', 'Playful', 'Friendly', 'Bold', 'Trendy', 'Curious', 'Upbeat'];
  var SA_MUSIC_OPTS = ['None', 'Soft Lo-fi Bed', 'Upbeat Pop', 'Cinematic Ambient', 'Corporate Dance', 'Game Score', 'Trending Beat'];
  var SA_PACE_OPTS = ['Slow (120 wpm)', 'Clear (135 wpm)', 'Measured (140 wpm)', 'Natural (150 wpm)', 'Fast (170 wpm)', 'Fast (175 wpm)', 'Dynamic'];
  var SA_ACOUSTIC_OPTS = ['Professional Studio (dry)', 'Intimate Booth', 'Clean / Neutral', 'Punchy / Bright', 'Phone-native', 'Stylized FX'];
  var SA_FLOW_LABELS = ['SELECT A GOAL', 'VIBE LOCKED', 'SCRIPT READY', 'SETTINGS TUNED', 'GENERATING…', 'REFINING TAKE', 'READY TO SHIP'];

  var SA_DRAFTS = {
    podcast: 'HOST: Welcome back to Crust & Crumb. Today we’re up at 4am to find out what really happens before the doors open.\nCO-HOST: And honestly? It’s messier and more beautiful than I expected.',
    ad: 'Summer Clearance starts now. Every loaf, every pastry — up to 40% off. This weekend only, while stocks last. Crumb & Co. Taste the craft.',
    narration: 'Chapter One. Long before the first oven was lit, the method was already centuries old — patience, flour, water, and time.',
    elearning: 'In this module, you’ll learn to read a sourdough starter: when it’s active, when it’s hungry, and when it’s ready to bake.',
    character: 'Doughboy: You think you can out-bake ME? Ha! I’ve got a 72-hour ferment and nothing left to lose!',
    social: 'Stop scrolling. Pre-orders for Sourdough Saturday close in 3 hours and they are going FAST. Link in bio.'
  };

  var SA_TAKE_READS = [
    { read: 'Hook-led read', desc: 'Opens on the strongest line, lets it breathe, then drives.' },
    { read: 'Story-led read', desc: 'Eases in, builds warmth, lands the payoff softly.' },
    { read: 'Punchy read', desc: 'Tight pacing, crisp consonants, zero dead air.' },
    { read: 'Measured read', desc: 'Calm authority, generous pauses, trustworthy tone.' },
    { read: 'High-energy read', desc: 'Bright, fast, and relentlessly upbeat throughout.' },
    { read: 'Intimate read', desc: 'Close-mic warmth, conversational and personal.' }
  ];
  var SA_TAKE_DURS = ['0:28', '0:34', '0:41', '0:22', '0:30', '0:45'];
  var SA_TAKE_FITS = [91, 86, 83, 88, 80, 84];

  // Hearth Bakery / Crumb & Co. brand continuity with the other studios.
  var DEFAULT_AUDIO = [
    { id: 'a1', title: 'Crust & Crumb — Ep. 12: The 4am Bake', goal: 'Podcast',      voice: 'Dynamic Trio',     duration: '28:14', status: 'Published',  daysAgo: 3,  plays: '4.2k' },
    { id: 'a2', title: 'Summer Clearance — 30s radio spot',     goal: 'Marketing Ad', voice: 'Max (Upbeat)',     duration: '0:30',  status: 'Published',  daysAgo: 6,  plays: '18.9k' },
    { id: 'a3', title: 'Sourdough 101 — Module 3 narration',    goal: 'E-Learning',   voice: 'Lila (Instructor)', duration: '6:42',  status: 'In Review', daysAgo: 1,  plays: '—' },
    { id: 'a4', title: 'The Artisan Method — audiobook ch.1',   goal: 'Narration',    voice: 'Aria (Narrator)',  duration: '14:08', status: 'Scheduled', daysAgo: 2,  plays: '—' },
    { id: 'a5', title: 'Pre-order drop — IG audio teaser',      goal: 'Social Clip',  voice: 'Nova (Creator)',   duration: '0:22',  status: 'Generating', daysAgo: 0, plays: '—' },
    { id: 'a6', title: 'Mascot voice — "Doughboy" lines',       goal: 'Character / Game', voice: 'Kai (Character)', duration: '1:55', status: 'Draft',     daysAgo: 5,  plays: '—' }
  ];

  /* ---------------- Helpers ---------------- */
  function saEsc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function saAttr(t) { return saEsc(t).replace(/"/g, '&quot;'); }
  function saGoal(id) { return SA_GOALS.filter(function (g) { return g.id === id; })[0] || null; }
  function saVoice(id) { return SA_VOICES.filter(function (v) { return v.id === id; })[0] || null; }
  function saStatusPill(status) {
    var map = { Draft: 'pill-muted', Generating: 'pill-gen', 'In Review': 'pill-amber', Scheduled: 'pill-indigo', Published: 'pill-green' };
    return map[status] || 'pill-muted';
  }
  function saDateLabel(d) { return d <= 0 ? 'Today' : d === 1 ? 'Yesterday' : d + 'd ago'; }

  // Deterministic waveform bar heights (stable across re-renders).
  function saWave(seed, n) {
    var x = (seed * 9301 + 49297) % 233280, out = [];
    for (var i = 0; i < n; i++) { x = (x * 9301 + 49297) % 233280; out.push(18 + Math.round((x / 233280) * 82)); }
    return out;
  }
  function saWaveHtml(seed, n, anim) {
    return saWave(seed, n).map(function (h, i) {
      var d = anim ? ' style="height:' + h + '%;animation-delay:' + (i % 12 * 0.07).toFixed(2) + 's"' : ' style="height:' + h + '%"';
      return '<span' + d + '></span>';
    }).join('');
  }
  function saSeed(id) { var s = 0; for (var i = 0; i < id.length; i++) s += id.charCodeAt(i) * (i + 1); return s + 7; }

  /* ---------------- State ---------------- */
  function saFreshFlow() {
    return {
      open: false, step: 0,
      goal: null, vibe: '', tones: [], voice: null, samplePlayed: false,
      scriptMode: 'paste', script: '', uploadName: '',
      music: '', stability: 60, pace: '', acoustics: '',
      takes: null, selectedTake: null, generating: false, refine: '', regenCount: 0
    };
  }

  function init(state) {
    state.saFilters = { search: '', goal: 'All', status: 'All', date: 'All' };
    state.saAudios = DEFAULT_AUDIO.map(function (a) {
      return { id: a.id, title: a.title, goal: a.goal, voice: a.voice, duration: a.duration, status: a.status, daysAgo: a.daysAgo, plays: a.plays };
    });
    state.saToast = null;
    state.saFlow = saFreshFlow();
  }

  function saFiltered() {
    var f = appState.saFilters;
    return appState.saAudios.filter(function (a) {
      if (f.search && a.title.toLowerCase().indexOf(f.search.toLowerCase()) < 0) return false;
      if (f.goal !== 'All' && a.goal !== f.goal) return false;
      if (f.status !== 'All' && a.status !== f.status) return false;
      if (f.date !== 'All') {
        if (f.date === 'Today' && a.daysAgo > 0) return false;
        if (f.date === '7' && a.daysAgo > 7) return false;
        if (f.date === '30' && a.daysAgo > 30) return false;
      }
      return true;
    });
  }

  /* ---------------- Library handlers ---------------- */
  window.saSetFilter = function (key, val) { appState.saFilters[key] = val; renderContent(); };
  window.saShowToast = function (msg) {
    appState.saToast = msg;
    renderContent();
    setTimeout(function () { appState.saToast = null; renderContent(); }, 2400);
  };
  window.saOpenAudio = function (id) {
    var a = appState.saAudios.filter(function (x) { return x.id === id; })[0];
    saShowToast((a ? '“' + a.title + '”' : 'Audio') + ' — player opens in the next step');
  };
  window.saNewAudio = function () { appState.saFlow = saFreshFlow(); appState.saFlow.open = true; renderContent(); };

  /* ---------------- Flow handlers ---------------- */
  window.saFlowExit = function () { appState.saFlow.open = false; renderContent(); };
  window.saFlowGoTo = function (p) {
    appState.saFlow.step = p;
    appState.saFlow.sync = p === 0 ? 6 : Math.round((p / 6) * 100);
    renderContent();
  };
  window.saFlowSetGoal = function (id) {
    var fl = appState.saFlow;
    var preset = SA_PRESET[id];
    fl.goal = id;
    fl.vibe = preset.vibe;
    fl.tones = preset.tones.slice();
    fl.voice = preset.voice;
    fl.music = preset.music;
    fl.stability = preset.stability;
    fl.pace = preset.pace;
    fl.acoustics = preset.acoustics;
    fl.samplePlayed = false;
    saFlowGoTo(1);
  };
  window.saFlowSetVoice = function (id) { appState.saFlow.voice = id; renderContent(); };
  window.saFlowToggleTone = function (t) {
    var tones = appState.saFlow.tones, i = tones.indexOf(t);
    if (i >= 0) { if (tones.length > 1) tones.splice(i, 1); } else { tones.push(t); }
    renderContent();
  };
  window.saFlowSample = function () { appState.saFlow.samplePlayed = true; renderContent(); };
  window.saFlowSetField = function (key, val) { appState.saFlow[key] = val; renderContent(); };
  window.saFlowAiDraft = function () {
    var fl = appState.saFlow;
    fl.script = SA_DRAFTS[fl.goal] || '';
    fl.scriptMode = 'ai';
    fl.uploadName = '';
    renderContent();
  };
  window.saFlowUpload = function (input) {
    var f = input.files && input.files[0];
    if (!f) return;
    var fl = appState.saFlow;
    fl.uploadName = f.name;
    fl.scriptMode = 'upload';
    var ext = (f.name.split('.').pop() || '').toLowerCase();
    if (ext === 'txt') {
      var rd = new FileReader();
      rd.onload = function (e) { appState.saFlow.script = String(e.target.result || '').slice(0, 4000); renderContent(); };
      rd.readAsText(f);
    } else {
      // Mock extraction for pdf/docx (no parser in a static mockup).
      fl.script = '[Imported from ' + f.name + ']\n\n' + (SA_DRAFTS[fl.goal] || 'Your uploaded script text appears here, ready to edit.');
      renderContent();
    }
  };
  window.saFlowClearUpload = function () {
    appState.saFlow.uploadName = '';
    appState.saFlow.script = '';
    appState.saFlow.scriptMode = 'paste';
    renderContent();
  };

  function saBuildTakes() {
    var fl = appState.saFlow;
    var start = (fl.regenCount * 3) % SA_TAKE_READS.length;
    var labels = ['A', 'B', 'C'], out = [];
    for (var i = 0; i < 3; i++) {
      var idx = (start + i) % SA_TAKE_READS.length;
      out.push({
        label: labels[i], read: SA_TAKE_READS[idx].read, desc: SA_TAKE_READS[idx].desc,
        fit: Math.max(72, SA_TAKE_FITS[idx] - (fl.regenCount % 2) * 2),
        duration: SA_TAKE_DURS[idx], seed: saSeed(fl.goal + idx + fl.regenCount)
      });
    }
    return out;
  }
  window.saFlowGenerate = function () {
    var fl = appState.saFlow;
    fl.step = 4; fl.generating = true; fl.takes = null; fl.selectedTake = null;
    fl.sync = Math.round((4 / 6) * 100);
    renderContent();
    setTimeout(function () {
      appState.saFlow.takes = saBuildTakes();
      appState.saFlow.generating = false;
      renderContent();
    }, 1500);
  };
  window.saFlowRegen = function () { appState.saFlow.regenCount++; saFlowGenerate(); };
  window.saFlowSelectTake = function (i) { appState.saFlow.selectedTake = i; renderContent(); };
  window.saFlowSetStability = function (val) {
    appState.saFlow.stability = parseInt(val, 10);
    var el = document.getElementById('saf-stab-val');
    if (el) el.textContent = val;
  };
  window.saFlowPublish = function (mode) {
    var fl = appState.saFlow;
    var g = saGoal(fl.goal);
    var t = fl.takes && fl.selectedTake != null ? fl.takes[fl.selectedTake] : null;
    var voiceLabel = fl.goal === 'podcast' ? 'Dynamic Trio' : (saVoice(fl.voice) ? saVoice(fl.voice).name : 'AI voice');
    var title = saTitleFromScript(fl.script, g);
    var status = mode === 'publish' ? 'Published' : mode === 'schedule' ? 'Scheduled' : 'In Review';
    appState.saAudios.unshift({
      id: 'a' + Date.now(),
      title: title,
      goal: g ? g.label : 'Audio',
      voice: voiceLabel,
      duration: t ? t.duration : '0:30',
      status: status,
      daysAgo: 0,
      plays: status === 'Published' ? '0' : '—'
    });
    appState.saFilters = { search: '', goal: 'All', status: 'All', date: 'All' };
    appState.saFlow.open = false;
    var msg = mode === 'publish' ? 'Published — added to My Library'
      : mode === 'schedule' ? 'Scheduled — added to My Library'
      : 'Added to campaign — sent for review';
    saShowToast(msg);
  };

  function saTitleFromScript(script, g) {
    var s = (script || '').replace(/^\[Imported[^\]]*\]\s*/, '').replace(/^[A-Z\- ]+:\s*/, '').trim();
    if (!s) return (g ? g.label : 'Audio') + ' — untitled';
    s = s.split('\n')[0].split('.')[0].trim();
    return s.length > 54 ? s.slice(0, 54).replace(/\s+\S*$/, '') + '…' : s;
  }

  /* ---------------- Library render ---------------- */
  function saStatCard(num, label, accent) {
    return '<div class="sa-stat"><div class="sa-stat-num' + (accent ? ' accent' : '') + '">' + num + '</div><div class="sa-stat-label">' + label + '</div></div>';
  }
  function saFilterSelect(key, options) {
    var cur = appState.saFilters[key];
    return '<select class="sa-filter-select" onchange="saSetFilter(\'' + key + '\',this.value)">'
      + options.map(function (o) { return '<option value="' + o.val + '"' + (cur === o.val ? ' selected' : '') + '>' + o.label + '</option>'; }).join('')
      + '</select>';
  }
  function saCard(a) {
    var genDot = a.status === 'Generating' ? '<span class="sa-gen-dot"></span>' : '';
    return '<div class="sa-card" onclick="saOpenAudio(\'' + a.id + '\')">'
      + '<div class="sa-thumb"><div class="sa-thumb-wave">' + saWaveHtml(saSeed(a.id), 40, false) + '</div>'
      + '<span class="sa-goal-chip">' + a.goal + '</span>'
      + '<div class="sa-play"><span class="sa-play-ico"></span></div>'
      + '<span class="sa-dur">' + a.duration + '</span></div>'
      + '<div class="sa-card-body">'
      + '<div class="sa-card-title">' + saEsc(a.title) + '</div>'
      + '<div class="sa-card-meta"><span class="sa-voice">🎙️ ' + saEsc(a.voice) + '</span>'
      + '<span class="pill ' + saStatusPill(a.status) + '">' + genDot + a.status + '</span></div>'
      + '<div class="sa-card-foot"><span class="sa-date">' + saDateLabel(a.daysAgo) + '</span>'
      + '<span class="sa-date">' + (a.plays !== '—' ? '▸ ' + a.plays + ' plays' : 'Not published') + '</span></div>'
      + '</div></div>';
  }
  function renderStudioAudioLibrary() {
    var f = appState.saFilters;
    var all = appState.saAudios;
    var audios = saFiltered();
    var published = all.filter(function (a) { return a.status === 'Published'; }).length;
    var inProgress = all.length - published;
    var cards = audios.map(saCard).join('');
    return '<div>'
      + '<div class="sa-lib-head">'
      + '<div><h2 class="sa-lib-title">My Library</h2><p class="screen-sub">Crumb &amp; Co. · Audio content · Maker agent</p></div>'
      + '<div class="sa-lib-actions"><button class="btn btn-primary btn-sm" onclick="saNewAudio()">+ New Audio</button></div>'
      + '</div>'
      + '<div class="sa-statbar">'
      + saStatCard(all.length, 'Total audio', false)
      + saStatCard(published, 'Published', false)
      + saStatCard(inProgress, 'In progress', true)
      + '</div>'
      + '<div class="sa-filter-bar">'
      + '<div class="sa-search-wrap"><span class="sa-search-ico">&#128269;</span>'
      + '<input class="sa-search" placeholder="Search by name…" value="' + saAttr(f.search) + '" oninput="saSetFilter(\'search\',this.value)"></div>'
      + saFilterSelect('goal', [{ val: 'All', label: 'All types' }].concat(SA_GOALS.map(function (g) { return { val: g.label, label: g.label }; })))
      + saFilterSelect('status', [{ val: 'All', label: 'All statuses' }, { val: 'Draft', label: 'Draft' }, { val: 'Generating', label: 'Generating' }, { val: 'In Review', label: 'In Review' }, { val: 'Scheduled', label: 'Scheduled' }, { val: 'Published', label: 'Published' }])
      + saFilterSelect('date', [{ val: 'All', label: 'Any date' }, { val: 'Today', label: 'Today' }, { val: '7', label: 'Last 7 days' }, { val: '30', label: 'Last 30 days' }])
      + '</div>'
      + '<div class="sa-result-count"><strong>' + audios.length + '</strong> of ' + all.length + ' track' + (all.length === 1 ? '' : 's') + '</div>'
      + (audios.length ? '<div class="sa-grid">' + cards + '</div>' : '<div class="sa-empty">No audio matches your filters. Try clearing a filter or creating a new track.</div>')
      + '</div>';
  }

  /* ---------------- Flow render ---------------- */
  function saFlowSyncBar() {
    var fl = appState.saFlow;
    var width = fl.step === 0 ? 6 : Math.round((fl.step / 6) * 100);
    return '<div class="saf-sync">'
      + '<div class="saf-sync-mono">Production Sync</div>'
      + '<div class="saf-sync-track"><div id="saf-sync-fill" class="saf-sync-fill" style="width:' + width + '%;"></div></div>'
      + '<div id="saf-sync-status" class="saf-sync-status">' + (SA_FLOW_LABELS[fl.step] || 'SYSTEM IDLE') + '</div>'
      + '</div>';
  }
  function saSelect(field, options) {
    var cur = appState.saFlow[field];
    return '<select onchange="saFlowSetField(\'' + field + '\',this.value)">'
      + options.map(function (o) { return '<option' + (cur === o ? ' selected' : '') + '>' + o + '</option>'; }).join('')
      + '</select>';
  }
  function saFooter(backStep, nextStep, nextLabel, nextOk) {
    var nextAttr = nextOk === false ? ' disabled style="opacity:0.4;cursor:not-allowed;"' : ' onclick="saFlowGoTo(' + nextStep + ')"';
    return '<div class="saf-foot"><button class="btn btn-outline" onclick="saFlowGoTo(' + backStep + ')">Back</button>'
      + '<button class="btn btn-primary"' + nextAttr + '>' + nextLabel + ' →</button></div>';
  }

  function saStep0() {
    var fl = appState.saFlow;
    var grid = SA_GOALS.map(function (g) {
      return '<div class="saf-goal' + (fl.goal === g.id ? ' active' : '') + '" onclick="saFlowSetGoal(\'' + g.id + '\')">'
        + '<span class="saf-goal-emoji">' + g.emoji + '</span><div class="saf-goal-name">' + g.label + '</div>'
        + '<div class="saf-goal-desc">' + g.desc + '</div></div>';
    }).join('');
    return '<div class="saf-step">'
      + '<h1 class="saf-h1" style="font-size:44px;text-align:center;margin-bottom:10px;">What are we creating today?</h1>'
      + '<p class="saf-sub" style="text-align:center;font-size:18px;margin-bottom:36px;">Pick a goal and Maker pre-tunes the voice, music, and pacing for you. You stay the director.</p>'
      + '<div class="saf-goal-grid">' + grid + '</div></div>';
  }

  function saStep1() {
    var fl = appState.saFlow;
    var g = saGoal(fl.goal);
    var rec = '<div class="saf-rec"><span class="saf-rec-ico">✨</span><div>Based on <b>' + (g ? g.label : '') + '</b>, Maker recommends a <b>' + saEsc(fl.vibe) + '</b> vibe. Everything below is overridable.</div></div>';

    var voiceBlock;
    if (g && g.multi) {
      voiceBlock = '<div class="saf-label">Multi-speaker studio · Dynamic Trio</div><div class="saf-trio">'
        + SA_TRIO.map(function (s) {
            return '<div class="saf-speaker"><div class="saf-speaker-tag" style="background:' + s.color + ';">' + s.tag + '</div>'
              + '<div><div class="saf-speaker-name">' + s.name + '</div><div class="saf-speaker-role">' + s.role + '</div></div></div>';
          }).join('')
        + '</div><p class="saf-script-hint" style="margin-top:10px;">Color-coded speaker tags carry through to the script editor.</p>';
    } else {
      voiceBlock = '<div class="saf-label">Voice · tap to override</div><div class="saf-voice-grid">'
        + SA_VOICES.map(function (v) {
            var isRec = SA_PRESET[fl.goal] && SA_PRESET[fl.goal].voice === v.id;
            return '<div class="saf-voice' + (fl.voice === v.id ? ' active' : '') + '" onclick="saFlowSetVoice(\'' + v.id + '\')">'
              + (isRec ? '<span class="saf-voice-rec">AI PICK</span>' : '')
              + '<div class="saf-voice-name">' + v.name + '</div><div class="saf-voice-desc">' + v.desc + '</div></div>';
          }).join('')
        + '</div>';
    }

    var tones = '<div class="saf-label" style="margin-top:20px;">Vibe tones</div><div class="saf-tone-row">'
      + SA_TONE_POOL.map(function (t) { return '<span class="saf-tone' + (fl.tones.indexOf(t) >= 0 ? ' active' : '') + '" onclick="saFlowToggleTone(\'' + t + '\')">' + t + '</span>'; }).join('')
      + '</div>';

    var sample = fl.samplePlayed
      ? '<div class="saf-sample"><div class="saf-sample-wave">' + saWaveHtml(saSeed(fl.goal + 'sample'), 22, true) + '</div>'
        + '<div class="saf-sample-quote">“' + saEsc(SA_PRESET[fl.goal].sample) + '”</div></div>'
      : '<div style="margin-top:18px;"><button class="btn btn-outline btn-sm" onclick="saFlowSample()">▶ Hear a 5-sec sample</button></div>';

    return '<div class="saf-step">'
      + '<h1 class="saf-h1" style="font-size:34px;text-align:center;margin-bottom:10px;">Vibe &amp; Voice</h1>'
      + '<p class="saf-sub" style="text-align:center;margin-bottom:24px;">Approve Maker’s picks or swap them — your call.</p>'
      + rec
      + '<div class="saf-card">' + voiceBlock + tones + sample + '</div>'
      + saFooter(0, 2, 'Continue')
      + '</div>';
  }

  function saStep2() {
    var fl = appState.saFlow;
    var fileChip = fl.uploadName
      ? '<div class="saf-file-chip">📎 ' + saEsc(fl.uploadName) + ' <span class="x" onclick="saFlowClearUpload()">✕</span></div>'
      : '';
    return '<div class="saf-step">'
      + '<h1 class="saf-h1" style="font-size:34px;text-align:center;margin-bottom:10px;">Script</h1>'
      + '<p class="saf-sub" style="text-align:center;margin-bottom:24px;">Paste it, let Maker draft it, or upload a file — then edit freely.</p>'
      + '<div class="saf-card">'
      + '<div class="saf-script-actions">'
      + '<button class="btn btn-outline btn-sm" onclick="saFlowAiDraft()">✨ Draft with AI</button>'
      + '<label class="saf-upload btn btn-outline btn-sm">⬆ Upload file<input type="file" accept=".pdf,.docx,.doc,.txt" onchange="saFlowUpload(this)"></label>'
      + '</div>'
      + fileChip
      + '<textarea rows="9" placeholder="Paste or write your script here…" oninput="appState.saFlow.script=this.value">' + saEsc(fl.script) + '</textarea>'
      + '<p class="saf-script-hint">Accepts .pdf, .docx, .txt · ' + (fl.script ? fl.script.length + ' characters' : 'no script yet') + '</p>'
      + '</div>'
      + saFooter(1, 3, 'Continue', !!(fl.script && fl.script.trim()))
      + '</div>';
  }

  function saSetRow(label, tip, control, badge) {
    return '<div class="saf-set-row"><div class="saf-set-label">' + label + '<span class="saf-tt" data-tip="' + saAttr(tip) + '">?</span></div>'
      + '<div>' + control + '</div>'
      + '<div>' + (badge !== false ? '<span class="saf-ai-badge">✨ AI-set</span>' : '') + '</div></div>';
  }
  function saStep3() {
    var fl = appState.saFlow;
    var g = saGoal(fl.goal);
    var voiceControl = g && g.multi
      ? '<div style="font-size:13px;font-weight:600;color:var(--text);">Dynamic Trio (3 speakers)</div>'
      : '<select onchange="saFlowSetVoice(this.value)">' + SA_VOICES.map(function (v) { return '<option value="' + v.id + '"' + (fl.voice === v.id ? ' selected' : '') + '>' + v.name + ' · ' + v.desc + '</option>'; }).join('') + '</select>';
    var stabilityControl = '<div class="saf-slider-wrap"><input class="saf-slider" type="range" min="0" max="100" value="' + fl.stability + '" oninput="saFlowSetStability(this.value)">'
      + '<span class="saf-slider-val" id="saf-stab-val">' + fl.stability + '</span></div>';
    return '<div class="saf-step">'
      + '<h1 class="saf-h1" style="font-size:34px;text-align:center;margin-bottom:10px;">Production</h1>'
      + '<p class="saf-sub" style="text-align:center;margin-bottom:24px;">Maker did the technical heavy lifting. Tweak anything — hover the <b>?</b> for why.</p>'
      + '<div class="saf-settings">'
      + saSetRow('Voice', 'Chosen to match your goal and vibe. Swap for any voice in the library.', voiceControl)
      + saSetRow('Background music', 'Set to suit the energy of a ' + (g ? g.label.toLowerCase() : 'track') + '. Pick None for a clean voice-only mix.', saSelect('music', SA_MUSIC_OPTS))
      + saSetRow('Expressiveness', 'Higher = more emotional, dynamic delivery. Lower = steadier and more consistent.', stabilityControl)
      + saSetRow('Pacing', 'Words-per-minute target tuned to the format. Faster for ads, slower for narration.', saSelect('pace', SA_PACE_OPTS))
      + saSetRow('Acoustics', 'The room sound. Dry studio for podcasts, intimate booth for audiobooks.', saSelect('acoustics', SA_ACOUSTIC_OPTS))
      + '</div>'
      + '<div class="saf-foot"><button class="btn btn-outline" onclick="saFlowGoTo(2)">Back</button>'
      + '<button class="btn btn-primary" style="background:var(--accent);color:#07140e;" onclick="saFlowGenerate()">✨ Generate Takes</button></div>'
      + '</div>';
  }

  function saStep4() {
    var fl = appState.saFlow;
    if (fl.generating) {
      return '<div class="saf-step"><div class="saf-generating"><div class="saf-spinner"></div>'
        + '<div style="font-size:15px;color:var(--text);">Maker is voicing your script…</div>'
        + '<div class="saf-sub" style="font-size:13px;">Rendering three reads in a ' + saEsc(fl.vibe) + ' vibe</div></div></div>';
    }
    var takes = fl.takes || [];
    var cards = takes.map(function (t, i) {
      return '<div class="saf-take' + (fl.selectedTake === i ? ' selected' : '') + '" onclick="saFlowSelectTake(' + i + ')">'
        + '<div class="saf-take-wave">' + saWaveHtml(t.seed, 34, false) + '</div>'
        + '<div class="saf-take-head"><span class="saf-take-label">Take ' + t.label + ' · ' + t.read + '</span><span class="saf-take-fit">' + t.fit + '% fit</span></div>'
        + '<div class="saf-take-desc">' + t.desc + '</div>'
        + '<div class="saf-take-foot"><span>▸ play</span><span>' + t.duration + '</span></div>'
        + '</div>';
    }).join('');
    return '<div class="saf-step">'
      + '<h1 class="saf-h1" style="font-size:34px;text-align:center;margin-bottom:10px;">Generate</h1>'
      + '<p class="saf-sub" style="text-align:center;margin-bottom:24px;">Maker returned three reads scored for fit. Pick one to preview and refine.</p>'
      + '<div class="saf-take-grid">' + cards + '</div>'
      + '<div style="text-align:center;margin-top:14px;"><button class="btn btn-ghost btn-sm" onclick="saFlowRegen()">↻ Regenerate takes</button></div>'
      + '<div class="saf-foot"><button class="btn btn-outline" onclick="saFlowGoTo(3)">Back</button>'
      + '<button class="btn btn-primary"' + (fl.selectedTake != null ? ' onclick="saFlowGoTo(5)"' : ' disabled style="opacity:0.4;cursor:not-allowed;"') + '>Preview &amp; edit →</button></div>'
      + '</div>';
  }

  function saRailField(label, inner) { return '<div class="saf-rail-field"><label>' + label + '</label>' + inner + '</div>'; }
  function saStep5() {
    var fl = appState.saFlow;
    var t = fl.takes && fl.selectedTake != null ? fl.takes[fl.selectedTake] : null;
    if (!t) return saStep4();
    var voiceField = saGoal(fl.goal) && saGoal(fl.goal).multi
      ? '<div style="font-size:12.5px;font-weight:600;color:var(--text);">Dynamic Trio</div>'
      : '<select onchange="saFlowSetVoice(this.value)">' + SA_VOICES.map(function (v) { return '<option value="' + v.id + '"' + (fl.voice === v.id ? ' selected' : '') + '>' + v.name + '</option>'; }).join('') + '</select>';
    return '<div class="saf-step">'
      + '<h1 class="saf-h1" style="font-size:34px;text-align:center;margin-bottom:10px;">Preview &amp; Edit</h1>'
      + '<p class="saf-sub" style="text-align:center;margin-bottom:24px;">Refine the read, or regenerate for fresh takes based on your notes.</p>'
      + '<div class="saf-preview-layout">'
      + '<div class="saf-player"><div class="saf-player-wave">' + saWaveHtml(t.seed, 56, true) + '</div>'
      + '<div class="saf-player-controls"><div class="saf-player-play"><i></i></div>'
      + '<div class="saf-player-bar"></div><span class="saf-player-time">0:10 / ' + t.duration + '</span></div></div>'
      + '<div class="saf-edit-rail">'
      + '<div class="saf-card" style="padding:16px;margin-bottom:0;"><div class="saf-rail-h">Take ' + t.label + '</div>'
      + '<div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:4px;">' + t.read + '</div>'
      + '<div class="saf-take-desc">' + t.desc + '</div></div>'
      + '<div class="saf-card" style="padding:16px;margin-bottom:0;"><div class="saf-rail-h">Refine this read</div>'
      + '<textarea rows="3" placeholder="e.g. warmer open, slow the CTA, less music…" oninput="appState.saFlow.refine=this.value">' + saEsc(fl.refine) + '</textarea>'
      + '<button class="btn btn-outline btn-sm" style="width:100%;margin-top:10px;" onclick="saFlowRegen()">↻ Regenerate with changes</button></div>'
      + '<div class="saf-card" style="padding:16px;margin-bottom:0;"><div class="saf-rail-h">Settings · editable</div>'
      + saRailField('Voice', voiceField)
      + saRailField('Music', saSelect('music', SA_MUSIC_OPTS))
      + saRailField('Pacing', saSelect('pace', SA_PACE_OPTS))
      + saRailField('Acoustics', saSelect('acoustics', SA_ACOUSTIC_OPTS))
      + '</div></div></div>'
      + '<div class="saf-foot"><button class="btn btn-outline" onclick="saFlowGoTo(4)">← Back to takes</button>'
      + '<button class="btn btn-primary" onclick="saFlowGoTo(6)">Use this take →</button></div>'
      + '</div>';
  }

  function saStep6() {
    var fl = appState.saFlow;
    var g = saGoal(fl.goal);
    var t = fl.takes && fl.selectedTake != null ? fl.takes[fl.selectedTake] : null;
    var voiceLabel = g && g.multi ? 'Dynamic Trio' : (saVoice(fl.voice) ? saVoice(fl.voice).name : 'AI voice');
    var title = saTitleFromScript(fl.script, g);
    return '<div class="saf-step">'
      + '<h1 class="saf-h1" style="font-size:34px;text-align:center;margin-bottom:10px;">Publish</h1>'
      + '<p class="saf-sub" style="text-align:center;margin-bottom:24px;">Your track is ready. Ship it now, schedule it, or drop it into a campaign.</p>'
      + '<div class="saf-card saf-summary">'
      + '<div class="saf-summary-wave">' + saWaveHtml(t ? t.seed : saSeed(fl.goal), 30, false) + '</div>'
      + '<div><div class="saf-summary-title">' + saEsc(title) + '</div>'
      + '<div class="saf-summary-sub">' + (g ? g.label : '') + ' · ' + voiceLabel + (t ? ' · Take ' + t.label + ' (' + t.read + ')' : '') + '</div>'
      + '<div class="saf-summary-specs">' + saEsc(fl.music) + ' · ' + saEsc(fl.pace) + ' · ' + saEsc(fl.acoustics) + '</div></div></div>'
      + '<div class="saf-publish-actions">'
      + '<div class="saf-pub primary" onclick="saFlowPublish(\'publish\')"><span class="ico">🚀</span><span class="t">Publish now</span><span class="s">Push the track live</span></div>'
      + '<div class="saf-pub" onclick="saFlowPublish(\'schedule\')"><span class="ico">📅</span><span class="t">Schedule</span><span class="s">Queue for later</span></div>'
      + '<div class="saf-pub" onclick="saFlowPublish(\'campaign\')"><span class="ico">🗂️</span><span class="t">Add to Campaign</span><span class="s">Send for review</span></div>'
      + '</div>'
      + '<div class="saf-foot"><button class="btn btn-outline" onclick="saFlowGoTo(5)">← Back</button><span></span></div>'
      + '</div>';
  }

  function saFlowOverlay() {
    var step = appState.saFlow.step;
    var body = step === 0 ? saStep0() : step === 1 ? saStep1() : step === 2 ? saStep2()
      : step === 3 ? saStep3() : step === 4 ? saStep4() : step === 5 ? saStep5() : saStep6();
    return '<div class="saf-overlay">'
      + '<div class="saf-topbar"><div class="saf-brand">Studio — Audio<em>New Audio</em></div>'
      + '<button class="btn btn-outline btn-sm" onclick="saFlowExit()">✕ Exit</button></div>'
      + '<div class="saf-scroll"><div class="saf-inner">' + saFlowSyncBar() + body + '</div></div>'
      + '</div>';
  }

  function screenStudioAudio() {
    var toast = appState.saToast ? '<div class="sa-toast">' + appState.saToast + '</div>' : '';
    var overlay = (appState.saFlow && appState.saFlow.open) ? saFlowOverlay() : '';
    return '<div class="screen">' + renderStudioAudioLibrary() + overlay + toast + '</div>';
  }

  return { init: init, screenStudioAudio: screenStudioAudio };
})();

window.screenStudioAudio = function () { return StudioAudio.screenStudioAudio(); };
