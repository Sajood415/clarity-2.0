/* Studio: Video — mockup module (My Library) */
var StudioVideo = (function () {
  var SV_PLATFORMS = [
    { id: 'Instagram', dot: '#dd2a7b' },
    { id: 'Facebook',  dot: '#1877f2' },
    { id: 'LinkedIn',  dot: '#0a66c2' },
    { id: 'YouTube',   dot: '#ff0000' }
  ];

  // Hearth Bakery brand — same fictional client as Studio: Text, for cross-screen continuity.
  var DEFAULT_VIDEOS = [
    { id: 'v1', title: 'Sourdough Saturday — 45s hero reel',       platform: 'Instagram', aspect: '9:16', duration: '0:45', status: 'Published', daysAgo: 2,  views: '12.4k', motif: '🥖', thumb: 'linear-gradient(135deg,#3a2418,#7c4a26)' },
    { id: 'v2', title: '72-hour cold ferment — the science',        platform: 'YouTube',   aspect: '16:9', duration: '3:12', status: 'Published', daysAgo: 9,  views: '8.1k',  motif: '🔬', thumb: 'linear-gradient(135deg,#1c2337,#3a2a5c)' },
    { id: 'v3', title: 'Behind the bake: the 4am routine',          platform: 'LinkedIn',  aspect: '16:9', duration: '1:20', status: 'In Review', daysAgo: 1,  views: '—',     motif: '🌅', thumb: 'linear-gradient(135deg,#2a1d3a,#5c3a55)' },
    { id: 'v4', title: 'Meet Millie — a customer story',            platform: 'Facebook',  aspect: '1:1',  duration: '2:05', status: 'Scheduled', daysAgo: 3,  views: '—',     motif: '👩‍🍳', thumb: 'linear-gradient(135deg,#16263a,#2a5066)' },
    { id: 'v5', title: 'Stone oven, no shortcuts',                  platform: 'Instagram', aspect: '9:16', duration: '0:30', status: 'Rendering', daysAgo: 0,  views: '—',     motif: '🔥', thumb: 'linear-gradient(135deg,#3a1f18,#7c3322)' },
    { id: 'v6', title: 'Pre-order drop — teaser',                   platform: 'YouTube',   aspect: '9:16', duration: '0:18', status: 'Draft',     daysAgo: 5,  views: '—',     motif: '📦', thumb: 'linear-gradient(135deg,#2a2418,#5c4a26)' },
    { id: 'v7', title: 'Artisan craft vs ghost kitchens',          platform: 'LinkedIn',  aspect: '16:9', duration: '2:48', status: 'Draft',     daysAgo: 6,  views: '—',     motif: '⚖️', thumb: 'linear-gradient(135deg,#1e2233,#39406b)' },
    { id: 'v8', title: 'Cinnamon roll ASMR',                        platform: 'Instagram', aspect: '9:16', duration: '0:52', status: 'Published', daysAgo: 12, views: '21.7k', motif: '🌀', thumb: 'linear-gradient(135deg,#3a2a18,#7c5a2a)' }
  ];

  // —— New Video flow (4-pillar consultation) ——
  var SV_FLOW_DATA = {
    filter: {
      q1: "Most filters sell 'purity.' Your White Space is 'Independence' — the ability to survive anywhere without buying plastic water bottles.",
      q2: "The 'Convenience Gap.' Most portable filters are bulky and ugly. You are filling the gap for 'Ultra-Minimalist Travelers.'",
      q3: "The 'Solo Explorer.' Budget-conscious but high-adventure travelers who hate being tethered to tourist traps.",
      q4: "Fear: Getting sick in a foreign country. Motivator: Feeling like a savvy, prepared expert.",
      hook: "Stop paying for bottled water every time you land in a new city."
    },
    fallback: {
      q1: "Industry focuses on generic features. Your White Space is 'Lifestyle Freedom' and 'Professional Empowerment'.",
      q2: "The 'Quality Gap.' You are providing a high-end alternative to a market flooded with cheap, disposable clones.",
      q3: "The 'Modern Achiever.' A time-poor professional who values efficiency and status-driven tools.",
      q4: "Fear: Being slow / obsolete. Motivator: Optimization and professional dominance.",
      hook: "This is the one tool that changes the way you look at [Product Category]."
    }
  };
  var SV_FLOW_PLATFORMS = [
    { type: 'fb-reel',  emoji: '📱', label: 'Facebook Reel',  lib: 'Facebook',  aspect: '9:16', ratio: '9:16 (Vertical)',  res: '1080 x 1920' },
    { type: 'ig-reel',  emoji: '📸', label: 'Instagram Reel', lib: 'Instagram', aspect: '9:16', ratio: '9:16 (Vertical)',  res: '1080 x 1920' },
    { type: 'yt-short', emoji: '🎬', label: 'YouTube Short',  lib: 'YouTube',   aspect: '9:16', ratio: '9:16 (Vertical)',  res: '1080 x 1920' },
    { type: 'linkedin', emoji: '💼', label: 'LinkedIn Video', lib: 'LinkedIn',  aspect: '1:1',  ratio: '1:1 (Square)',     res: '1080 x 1080' },
    { type: 'yt-long',  emoji: '🖥️', label: 'YouTube Long',   lib: 'YouTube',   aspect: '16:9', ratio: '16:9 (Landscape)', res: '3840 x 2160 (4K)' },
    { type: 'custom',   emoji: '⚙️', label: 'Custom Format',  lib: 'Instagram', aspect: '1:1',  ratio: '1:1 (Square)',     res: '1080 x 1080' }
  ];
  var SV_FLOW_LABELS = ['SYSTEM IDLE', 'INTELLIGENCE SYNCED', 'PERSONA SYNCED', 'GTM OPTIMIZED', 'ENGINE READY', 'GENERATING…', 'REFINING CUT', 'READY TO SHIP'];
  var SV_VAR_ANGLES = [
    { angle: 'Hook-first cut', desc: 'Opens on the boldest claim, then proves it in three fast beats.' },
    { angle: 'Story-driven cut', desc: 'Follows the Hero from the problem straight to the payoff.' },
    { angle: 'Founder UGC cut', desc: 'Raw, talking-to-camera energy that reads as authentic, not an ad.' },
    { angle: 'Data-led cut', desc: 'Leads with the one number that stops the scroll cold.' },
    { angle: 'Fast-montage cut', desc: 'Rapid B-roll synced to a driving track and a tight voiceover.' },
    { angle: 'Tutorial cut', desc: 'Shows the product solving the pain, step by step.' }
  ];
  var SV_VAR_THUMBS = ['linear-gradient(135deg,#3a2418,#7c4a26)', 'linear-gradient(135deg,#1c2337,#3a2a5c)', 'linear-gradient(135deg,#2a1d3a,#5c3a55)', 'linear-gradient(135deg,#16263a,#2a5066)', 'linear-gradient(135deg,#3a1f18,#7c3322)', 'linear-gradient(135deg,#1e2233,#39406b)'];
  var SV_VAR_MOTIFS = ['🎬', '🎞️', '🎥', '✨', '🔥', '📈'];
  var SV_VAR_DURS = ['0:28', '0:34', '0:41', '0:22', '0:30', '0:45'];
  var SV_VAR_FITS = [90, 86, 83, 88, 80, 84];
  var SV_ASPECT_OPTS = ['9:16 (Vertical)', '16:9 (Landscape)', '1:1 (Square)', '4:5 (Portrait)'];
  var SV_RES_OPTS = ['1080 x 1920', '1080 x 1080', '1920 x 1080', '3840 x 2160 (4K)', '720 x 1280'];
  var SV_TYPE_OPTS = ['Live-action film', 'Cartoon / 2D animation', '3D animation', 'Motion graphics', 'Stop-motion', 'Mixed media', 'Talking-head / UGC'];

  function svFreshFlow() {
    return {
      open: false, step: 0, seed: '', q1: '', q2: '', q3: '', q4: '',
      platform: null, ratio: '', res: '', contentType: '', recommend: null, sync: 0,
      variations: null, selectedVar: null, generating: false, refine: '', regenCount: 0
    };
  }
  // Heuristic "AI" platform pick from the seed idea (mockup logic).
  function svFlowRecommend(seed) {
    var s = (seed || '').toLowerCase();
    function has(list) { return list.some(function (w) { return s.indexOf(w) >= 0; }); }
    if (has(['b2b', 'saas', 'enterprise', 'software', 'platform', 'dashboard', 'api', 'professional', 'consult', 'workflow', 'analytics']))
      return { type: 'linkedin', reason: 'a professional / B2B product — decision-makers discover and vet these on LinkedIn.' };
    if (has(['game', 'kids', 'toy', 'cartoon', 'anime', 'tutorial', 'how-to', 'course', 'learn', 'review', 'unbox']))
      return { type: 'yt-short', reason: 'discovery- and tutorial-driven — YouTube Shorts reaches intent-led viewers searching for it.' };
    if (has(['filter', 'water', 'bottle', 'travel', 'outdoor', 'adventure', 'fashion', 'beauty', 'food', 'drink', 'lifestyle', 'fitness', 'wellness', 'wallet', 'gear', 'skincare']))
      return { type: 'ig-reel', reason: 'a visual, lifestyle product — Instagram Reels rewards aspirational short-form video.' };
    return { type: 'ig-reel', reason: 'short-form vertical video on Instagram Reels gives the widest reach for a new launch.' };
  }
  function svfEsc(t) {
    return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function svFlowPlatform(type) {
    return SV_FLOW_PLATFORMS.filter(function (p) { return p.type === type; })[0] || null;
  }

  function svStatusPill(status) {
    var map = { Draft: 'pill-muted', Rendering: 'pill-render', 'In Review': 'pill-amber', Scheduled: 'pill-indigo', Published: 'pill-green' };
    return map[status] || 'pill-muted';
  }
  function svPlatformDot(platform) {
    var match = SV_PLATFORMS.filter(function (p) { return p.id === platform; })[0];
    return match ? match.dot : 'var(--muted)';
  }
  function svDateLabel(daysAgo) {
    if (daysAgo <= 0) return 'Today';
    if (daysAgo === 1) return 'Yesterday';
    return daysAgo + 'd ago';
  }

  function init(state) {
    state.svFilters = { search: '', platform: 'All', status: 'All', date: 'All' };
    state.svVideos = [];
    state.svToast = null;
    state.svFlow = svFreshFlow();
  }

  function svFiltered() {
    var f = appState.svFilters;
    return appState.svVideos.filter(function (v) {
      if (f.search && v.title.toLowerCase().indexOf(f.search.toLowerCase()) < 0) return false;
      if (f.platform !== 'All' && v.platform !== f.platform) return false;
      if (f.status !== 'All' && v.status !== f.status) return false;
      if (f.date !== 'All') {
        if (f.date === 'Today' && v.daysAgo > 0) return false;
        if (f.date === '7' && v.daysAgo > 7) return false;
        if (f.date === '30' && v.daysAgo > 30) return false;
      }
      return true;
    });
  }

  window.svSetFilter = function (key, val) { appState.svFilters[key] = val; renderContent(); };
  window.svShowToast = function (msg) {
    appState.svToast = msg;
    renderContent();
    setTimeout(function () { appState.svToast = null; renderContent(); }, 2400);
  };
  window.svOpenVideo = function (id) {
    var v = appState.svVideos.filter(function (x) { return x.id === id; })[0];
    svShowToast((v ? '“' + v.title + '”' : 'Video') + ' — editor opens in the next step');
  };
  window.svNewVideo = function () {
    appState.svFlow = svFreshFlow();
    appState.svFlow.open = true;
    renderContent();
  };
  window.svNewVideoFromIntel = function () {
    appState.svFlow = svFreshFlow();
    var brief = appState.createBrief || {};
    var intel = appState.intelligence || {};
    var fl = appState.svFlow;
    fl.open = true;
    fl.seed = brief.message || '';
    fl.q1 = intel.market ? intel.market.whiteSpace : '';
    fl.q2 = intel.market ? intel.market.gap : '';
    fl.q3 = intel.persona ? intel.persona.name + ' — ' + intel.persona.seg : '';
    fl.q4 = intel.consumer ? intel.consumer.trigger : '';
    var rec = svFlowRecommend(fl.seed);
    var p = svFlowPlatform(rec.type);
    fl.recommend = rec;
    fl.platform = rec.type;
    fl.ratio = p.ratio;
    fl.res = p.res;
    fl.contentType = 'Live-action film';
    fl.step = 3;
    fl.sync = 72;
    renderContent();
  };
  window.svFlowExit = function () {
    appState.svFlow.open = false;
    nav('create-home');
  };
  window.svFlowGoTo = function (p) {
    appState.svFlow.step = p;
    appState.svFlow.sync = p === 0 ? 5 : Math.round((p / 7) * 100);
    renderContent();
  };
  window.svFlowStart = function () {
    var fl = appState.svFlow;
    if (!fl.seed || !fl.seed.trim()) { svShowToast('Share your idea first to begin'); return; }
    var data = fl.seed.toLowerCase().indexOf('filter') >= 0 ? SV_FLOW_DATA.filter : SV_FLOW_DATA.fallback;
    fl.q1 = data.q1; fl.q2 = data.q2; fl.q3 = data.q3; fl.q4 = data.q4;
    // AI pre-selects the best-fit platform + default specs; the user can override in Pillar 3.
    var rec = svFlowRecommend(fl.seed);
    var p = svFlowPlatform(rec.type);
    fl.recommend = rec;
    fl.platform = rec.type;
    fl.ratio = p.ratio;
    fl.res = p.res;
    if (!fl.contentType) fl.contentType = 'Live-action film';
    svFlowGoTo(1);
  };
  window.svFlowSetGTM = function (type) {
    var p = svFlowPlatform(type);
    if (!p) return;
    var fl = appState.svFlow;
    fl.platform = type; fl.ratio = p.ratio; fl.res = p.res;
    renderContent();
  };
  window.svFlowSetSpec = function (key, val) { appState.svFlow[key] = val; renderContent(); };
  // Lightweight, no-rerender progress nudge while the user edits a consultation answer.
  window.svFlowPulse = function () {
    var fl = appState.svFlow;
    if (fl.sync >= 95) return;
    fl.sync = Math.min(95, fl.sync + 2);
    var fill = document.getElementById('svf-sync-fill');
    var status = document.getElementById('svf-sync-status');
    if (fill) fill.style.width = fl.sync + '%';
    if (status) status.textContent = 'REFINING PILLARS…';
  };
  function svBuildVariations() {
    var fl = appState.svFlow;
    var start = (fl.regenCount * 3) % SV_VAR_ANGLES.length;
    var labels = ['A', 'B', 'C'];
    var out = [];
    for (var i = 0; i < 3; i++) {
      var idx = (start + i) % SV_VAR_ANGLES.length;
      out.push({
        label: labels[i],
        angle: SV_VAR_ANGLES[idx].angle,
        desc: SV_VAR_ANGLES[idx].desc,
        fit: Math.max(72, SV_VAR_FITS[idx] - (fl.regenCount % 2) * 2),
        duration: SV_VAR_DURS[idx],
        motif: SV_VAR_MOTIFS[idx],
        thumb: SV_VAR_THUMBS[idx]
      });
    }
    return out;
  }
  // Pillar 4 → kick off generation: AI returns variations after a short "thinking" beat.
  window.svFlowGenerate = function () {
    var fl = appState.svFlow;
    fl.step = 5; fl.generating = true; fl.variations = null; fl.selectedVar = null;
    fl.sync = Math.round((5 / 7) * 100);
    renderContent();
    setTimeout(function () {
      appState.svFlow.variations = svBuildVariations();
      appState.svFlow.generating = false;
      renderContent();
    }, 1500);
  };
  window.svFlowRegen = function () { appState.svFlow.regenCount++; svFlowGenerate(); };
  window.svFlowSelectVar = function (i) { appState.svFlow.selectedVar = i; renderContent(); };
  window.svFlowPublish = function (mode) {
    var fl = appState.svFlow;
    var p = svFlowPlatform(fl.platform) || svFlowPlatform('ig-reel');
    var v = fl.variations && fl.selectedVar != null ? fl.variations[fl.selectedVar] : null;
    var title = fl.seed && fl.seed.trim() ? fl.seed.trim() : 'Untitled video';
    if (title.length > 56) title = title.slice(0, 56).replace(/\s+\S*$/, '') + '…';
    var status = mode === 'publish' ? 'Published' : mode === 'schedule' ? 'Scheduled' : 'In Review';
    var aspect = (fl.ratio || p.ratio).split(' ')[0];
    appState.svVideos.unshift({
      id: 'v' + Date.now(),
      title: title,
      platform: p.lib,
      aspect: aspect,
      duration: v ? v.duration : '0:30',
      status: status,
      daysAgo: 0,
      views: status === 'Published' ? '0' : '—',
      motif: v ? v.motif : '🎬',
      thumb: v ? v.thumb : 'linear-gradient(135deg,#2a1d3a,#5c3a55)'
    });
    appState.svFilters = { search: '', platform: 'All', status: 'All', date: 'All' };
    appState.svFlow.open = false;
    var msg = mode === 'publish' ? 'Published to ' + p.lib + ' — added to My Library'
      : mode === 'schedule' ? 'Scheduled — added to My Library'
      : 'Added to campaign — sent for review';
    svShowToast(msg);
  };

  function svFlowSyncBar() {
    var fl = appState.svFlow;
    var width = fl.step === 0 ? 5 : Math.round((fl.step / 7) * 100);
    var status = SV_FLOW_LABELS[fl.step] || 'SYSTEM IDLE';
    return '<div class="svf-sync">'
      + '<div class="svf-sync-mono">Production Sync</div>'
      + '<div class="svf-sync-track"><div id="svf-sync-fill" class="svf-sync-fill" style="width:' + width + '%;"></div></div>'
      + '<div id="svf-sync-status" class="svf-sync-status">' + status + '</div>'
      + '</div>';
  }

  function svFlowQCard(tag, label, tip, field) {
    return '<div class="svf-card">'
      + '<div class="svf-tag">' + tag + '</div>'
      + '<label class="svf-qlabel">' + label + '<span class="svf-tt" data-tip="' + tip + '">?</span></label>'
      + '<textarea rows="3" oninput="appState.svFlow.' + field + '=this.value;svFlowPulse()">' + svfEsc(appState.svFlow[field]) + '</textarea>'
      + '</div>';
  }

  function svFlowFooter(backStep, nextStep, nextLabel) {
    return '<div class="svf-foot">'
      + '<button class="btn btn-outline" onclick="svFlowGoTo(' + backStep + ')">Back</button>'
      + '<button class="btn btn-primary" onclick="svFlowGoTo(' + nextStep + ')">' + nextLabel + ' →</button>'
      + '</div>';
  }

  function svFlowStep0() {
    return '<div class="svf-step">'
      + '<h1 class="svf-h1" style="font-size:46px;text-align:center;margin-bottom:10px;">What are we building?</h1>'
      + '<p class="svf-sub" style="text-align:center;font-size:18px;margin-bottom:36px;">Enter your product idea or link to begin the 4-Pillar Consultation.</p>'
      + '<textarea class="svf-seed" rows="6" placeholder="e.g. A portable water filter that fits in a wallet for world travelers…" oninput="appState.svFlow.seed=this.value">' + svfEsc(appState.svFlow.seed) + '</textarea>'
      + '<div style="text-align:center;margin-top:36px;"><button class="btn btn-primary" onclick="svFlowStart()">Initialize Strategy Engine →</button></div>'
      + '</div>';
  }

  function svFlowStep1() {
    return '<div class="svf-step">'
      + '<h1 class="svf-h1" style="font-size:34px;margin-bottom:32px;">Pillar 1: Market Intelligence</h1>'
      + svFlowQCard('AI STRATEGY ASSISTANT', 'What is the "White Space" for this product?', "The specific 'angle' where your competitors are silent. This is how we make you stand out.", 'q1')
      + svFlowQCard('AI STRATEGY ASSISTANT', 'Which Market "Gap" are we exploiting?', "The #1 frustration customers have with existing products that you solve.", 'q2')
      + svFlowFooter(0, 2, 'Confirm Intelligence')
      + '</div>';
  }

  function svFlowStep2() {
    return '<div class="svf-step">'
      + '<h1 class="svf-h1" style="font-size:34px;margin-bottom:32px;">Pillar 2: Persona Studio</h1>'
      + svFlowQCard('AI PERSONA ARCHITECT', 'Who is the "Hero" of your video story?', "The specific character whose life is changed by this. This dictates our visual and vocal style.", 'q3')
      + svFlowQCard('AI PERSONA ARCHITECT', 'What is their core Motivator or Fear?', "The psychological 'trigger' that will make them stop scrolling.", 'q4')
      + svFlowFooter(1, 3, 'Confirm Persona')
      + '</div>';
  }

  function svFlowSelect(field, options) {
    var cur = appState.svFlow[field];
    return '<select onchange="svFlowSetSpec(\'' + field + '\',this.value)">'
      + options.map(function (o) { return '<option' + (cur === o ? ' selected' : '') + '>' + o + '</option>'; }).join('')
      + '</select>';
  }

  function svFlowStep3() {
    var fl = appState.svFlow;
    var rec = fl.recommend;
    var grid = SV_FLOW_PLATFORMS.map(function (p) {
      var isRec = rec && rec.type === p.type;
      var badge = isRec ? '<span class="svf-rec-badge">AI PICK</span>' : '';
      return '<div class="svf-platform-item' + (fl.platform === p.type ? ' active' : '') + (isRec ? ' rec' : '') + '" onclick="svFlowSetGTM(\'' + p.type + '\')">' + badge + '<span>' + p.emoji + '</span>' + p.label + '</div>';
    }).join('');

    var recBanner = rec
      ? '<div class="svf-rec"><span class="svf-rec-ico">✨</span><div><b>AI recommends ' + svFlowPlatform(rec.type).label + '</b> — ' + rec.reason + ' Tap any platform to override.</div></div>'
      : '';

    var specs = '<div class="svf-specs">'
      + '<div class="svf-spec-box"><label>ASPECT RATIO ✨</label>' + svFlowSelect('ratio', SV_ASPECT_OPTS) + '</div>'
      + '<div class="svf-spec-box"><label>RESOLUTION ✨</label>' + svFlowSelect('res', SV_RES_OPTS) + '</div>'
      + '<div class="svf-spec-box"><label>CONTENT TYPE ✨</label>' + svFlowSelect('contentType', SV_TYPE_OPTS) + '</div>'
      + '<div class="svf-specs-hint">✦ AI-suggested defaults — override any field</div>'
      + '</div>';

    return '<div class="svf-step">'
      + '<h1 class="svf-h1" style="font-size:34px;text-align:center;margin-bottom:10px;">Pillar 3: GTM Strategy</h1>'
      + '<p class="svf-sub" style="text-align:center;margin-bottom:24px;">Where will your Hero find this? The pick sets the video size and technical specs.</p>'
      + recBanner
      + '<div class="svf-platform-grid">' + grid + '</div>'
      + specs
      + '<div class="svf-foot"><button class="btn btn-outline" onclick="svFlowGoTo(2)">Back</button>'
      + '<button class="btn btn-primary" onclick="svFlowGoTo(4)">Lock Strategy →</button></div>'
      + '</div>';
  }

  function svFlowStep4() {
    return '<div class="svf-step">'
      + '<h1 class="svf-h1" style="font-size:34px;text-align:center;margin-bottom:10px;">Pillar 4: Content Engine</h1>'
      + '<p class="svf-sub" style="text-align:center;margin-bottom:32px;">Finalize the production vibe to fuel the asset generation model.</p>'
      + '<div class="svf-card svf-finish-card">'
      + '<h3 style="font-family:\'Cormorant Garamond\',serif;font-weight:500;font-size:24px;margin-bottom:10px;color:var(--accent);">All Pillars Synchronized</h3>'
      + '<p class="svf-sub" style="margin-bottom:28px;">Intelligence, Persona, GTM, and Format are locked. Your Campaign Vitality is 100%.</p>'
      + '<button class="btn btn-primary" style="background:var(--accent);color:var(--bg);width:100%;justify-content:center;font-size:16px;" onclick="svFlowGenerate()">✨ Generate Variations</button>'
      + '</div>'
      + '<div class="svf-foot"><button class="btn btn-outline" onclick="svFlowGoTo(3)">Back</button><span></span></div>'
      + '</div>';
  }

  function svFlowHeroLabel() {
    var q3 = appState.svFlow.q3 || '';
    if (!q3.trim()) return 'your audience';
    var s = q3.split('.')[0].replace(/^the\s+/i, '').trim();
    return s.length > 38 ? s.slice(0, 38) + '…' : s;
  }
  function svFlowFrameAR(ratio) {
    var r = (ratio || '').split(' ')[0];
    return r === '16:9' ? '16/9' : r === '1:1' ? '1/1' : r === '4:5' ? '4/5' : '9/16';
  }
  function svFlowPlatformSelect() {
    var cur = appState.svFlow.platform;
    return '<select onchange="svFlowSetGTM(this.value)">'
      + SV_FLOW_PLATFORMS.map(function (p) { return '<option value="' + p.type + '"' + (cur === p.type ? ' selected' : '') + '>' + p.label + '</option>'; }).join('')
      + '</select>';
  }
  function svFlowRailField(label, inner) {
    return '<div class="svf-rail-field"><label>' + label + '</label>' + inner + '</div>';
  }

  function svFlowStep5() {
    var fl = appState.svFlow;
    if (fl.generating) {
      return '<div class="svf-step"><div class="svf-generating"><div class="svf-spinner"></div>'
        + '<div style="font-size:15px;color:var(--text);">Maker is generating video variations…</div>'
        + '<div class="svf-sub" style="font-size:13px;">Scoring cuts against ' + svfEsc(svFlowHeroLabel()) + '</div></div></div>';
    }
    var vars = fl.variations || [];
    var cards = vars.map(function (v, i) {
      var fitCls = v.fit >= 85 ? 'svf-fit-hi' : 'svf-fit-mid';
      return '<div class="svf-var-card' + (fl.selectedVar === i ? ' selected' : '') + '" onclick="svFlowSelectVar(' + i + ')">'
        + '<div class="svf-var-thumb" style="background:' + v.thumb + ';"><div class="svf-var-motif">' + v.motif + '</div>'
        + '<div class="svf-vp"><i></i></div><span class="svf-var-dur">' + v.duration + '</span></div>'
        + '<div class="svf-var-body"><div class="svf-var-head"><span class="svf-var-label">Variation ' + v.label + ' · ' + v.angle + '</span>'
        + '<span class="svf-var-fit ' + fitCls + '">' + v.fit + '% fit</span></div>'
        + '<div class="svf-var-desc">' + v.desc + '</div></div></div>';
    }).join('');
    var nextAttr = fl.selectedVar != null ? ' onclick="svFlowGoTo(6)"' : ' disabled style="opacity:0.4;cursor:not-allowed;"';
    return '<div class="svf-step">'
      + '<h1 class="svf-h1" style="font-size:34px;text-align:center;margin-bottom:10px;">Generate</h1>'
      + '<p class="svf-sub" style="text-align:center;margin-bottom:24px;">Maker returned three cuts scored for persona fit. Pick one to preview and refine.</p>'
      + '<div class="svf-var-grid">' + cards + '</div>'
      + '<div style="text-align:center;margin-top:14px;"><button class="btn btn-ghost btn-sm" onclick="svFlowRegen()">↻ Regenerate variations</button></div>'
      + '<div class="svf-foot"><button class="btn btn-outline" onclick="svFlowGoTo(4)">Back</button>'
      + '<button class="btn btn-primary"' + nextAttr + '>Preview &amp; edit →</button></div>'
      + '</div>';
  }

  function svFlowStep6() {
    var fl = appState.svFlow;
    var v = fl.variations && fl.selectedVar != null ? fl.variations[fl.selectedVar] : null;
    if (!v) return svFlowStep5();
    var p = svFlowPlatform(fl.platform);
    var ar = svFlowFrameAR(fl.ratio);
    return '<div class="svf-step">'
      + '<h1 class="svf-h1" style="font-size:34px;text-align:center;margin-bottom:10px;">Preview &amp; Edit</h1>'
      + '<p class="svf-sub" style="text-align:center;margin-bottom:24px;">Refine the cut, or regenerate for fresh variations based on your notes.</p>'
      + '<div class="svf-preview-layout">'
      + '<div class="svf-monitor"><div class="svf-frame" style="aspect-ratio:' + ar + ';background:' + v.thumb + ';">'
      + '<div class="svf-frame-motif">' + v.motif + '</div><div class="svf-vp lg"><i></i></div>'
      + '<div class="svf-frame-cap">' + svfEsc(v.angle) + (p ? ' · ' + p.label : '') + '</div></div></div>'
      + '<div class="svf-edit-rail">'
      + '<div class="svf-card" style="padding:16px;margin-bottom:0;"><div class="svf-rail-h">Variation ' + v.label + '</div>'
      + '<div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:4px;">' + v.angle + '</div>'
      + '<div class="svf-var-desc">' + v.desc + '</div></div>'
      + '<div class="svf-card" style="padding:16px;margin-bottom:0;"><div class="svf-rail-h">Refine this cut</div>'
      + '<textarea rows="3" placeholder="e.g. punchier hook, add captions, swap the music…" oninput="appState.svFlow.refine=this.value">' + svfEsc(fl.refine) + '</textarea>'
      + '<button class="btn btn-outline btn-sm" style="width:100%;margin-top:10px;" onclick="svFlowRegen()">↻ Regenerate with changes</button></div>'
      + '<div class="svf-card" style="padding:16px;margin-bottom:0;"><div class="svf-rail-h">Specs · editable</div>'
      + svFlowRailField('Platform', svFlowPlatformSelect())
      + svFlowRailField('Aspect ratio', svFlowSelect('ratio', SV_ASPECT_OPTS))
      + svFlowRailField('Resolution', svFlowSelect('res', SV_RES_OPTS))
      + svFlowRailField('Content type', svFlowSelect('contentType', SV_TYPE_OPTS))
      + '</div></div></div>'
      + '<div class="svf-foot"><button class="btn btn-outline" onclick="svFlowGoTo(5)">← Back to variations</button>'
      + '<button class="btn btn-primary" onclick="svFlowGoTo(7)">Use this cut →</button></div>'
      + '</div>';
  }

  function svFlowStep7() {
    var fl = appState.svFlow;
    var v = fl.variations && fl.selectedVar != null ? fl.variations[fl.selectedVar] : null;
    var p = svFlowPlatform(fl.platform);
    var title = fl.seed && fl.seed.trim() ? fl.seed.trim() : 'Untitled video';
    return '<div class="svf-step">'
      + '<h1 class="svf-h1" style="font-size:34px;text-align:center;margin-bottom:10px;">Publish</h1>'
      + '<p class="svf-sub" style="text-align:center;margin-bottom:24px;">Your cut is ready. Ship it now, schedule it, or drop it into a campaign.</p>'
      + '<div class="svf-card svf-summary">'
      + '<div class="svf-summary-thumb" style="background:' + (v ? v.thumb : '#1c2337') + ';"><span>' + (v ? v.motif : '🎬') + '</span></div>'
      + '<div class="svf-summary-meta"><div class="svf-summary-title">' + svfEsc(title) + '</div>'
      + '<div class="svf-summary-sub">' + (v ? 'Variation ' + v.label + ' · ' + v.angle + ' · ' : '') + (p ? p.label : '') + '</div>'
      + '<div class="svf-summary-specs">' + svfEsc(fl.ratio) + ' · ' + svfEsc(fl.res) + ' · ' + svfEsc(fl.contentType) + '</div></div></div>'
      + '<div class="svf-publish-actions">'
      + '<div class="svf-pub primary" onclick="svFlowPublish(\'publish\')"><span class="ico">🚀</span><span class="t">Publish now</span><span class="s">Push live to ' + (p ? p.lib : 'channel') + '</span></div>'
      + '<div class="svf-pub" onclick="svFlowPublish(\'schedule\')"><span class="ico">📅</span><span class="t">Schedule</span><span class="s">Queue for later</span></div>'
      + '<div class="svf-pub" onclick="svFlowPublish(\'campaign\')"><span class="ico">🗂️</span><span class="t">Add to Campaign</span><span class="s">Send for review</span></div>'
      + '</div>'
      + '<div class="svf-foot"><button class="btn btn-outline" onclick="svFlowGoTo(6)">← Back</button><span></span></div>'
      + '</div>';
  }

  function svFlowOverlay() {
    var step = appState.svFlow.step;
    var body = step === 0 ? svFlowStep0()
      : step === 1 ? svFlowStep1()
      : step === 2 ? svFlowStep2()
      : step === 3 ? svFlowStep3()
      : step === 4 ? svFlowStep4()
      : step === 5 ? svFlowStep5()
      : step === 6 ? svFlowStep6()
      : svFlowStep7();
    return '<div class="svf-overlay">'
      + '<div class="svf-topbar">'
      + '<div class="svf-brand">Studio — Video<em>New Video</em></div>'
      + '<button class="btn btn-outline btn-sm" onclick="svFlowExit()">✕ Exit</button>'
      + '</div>'
      + '<div class="svf-scroll"><div class="svf-inner">'
      + svFlowSyncBar()
      + body
      + '</div></div>'
      + '</div>';
  }

  function svStatCard(num, label, accent) {
    return '<div class="sv-stat"><div class="sv-stat-num' + (accent ? ' accent' : '') + '">' + num + '</div><div class="sv-stat-label">' + label + '</div></div>';
  }

  function svFilterSelect(key, options) {
    var cur = appState.svFilters[key];
    return '<select class="sv-filter-select" onchange="svSetFilter(\'' + key + '\',this.value)">'
      + options.map(function (o) {
          return '<option value="' + o.val + '"' + (cur === o.val ? ' selected' : '') + '>' + o.label + '</option>';
        }).join('')
      + '</select>';
  }

  function svCard(v) {
    var renderDot = v.status === 'Rendering' ? '<span class="sv-render-dot"></span>' : '';
    return '<div class="sv-card" onclick="svOpenVideo(\'' + v.id + '\')">'
      + '<div class="sv-thumb" style="background:' + v.thumb + ';">'
      + '<div class="sv-thumb-motif">' + v.motif + '</div>'
      + '<div class="sv-play"><span class="sv-play-ico"></span></div>'
      + '<span class="sv-aspect">' + v.aspect + '</span>'
      + '<span class="sv-dur">' + v.duration + '</span>'
      + '</div>'
      + '<div class="sv-card-body">'
      + '<div class="sv-card-title">' + v.title + '</div>'
      + '<div class="sv-card-meta">'
      + '<span class="sv-platform"><span class="sv-platform-dot" style="background:' + svPlatformDot(v.platform) + ';"></span>' + v.platform + '</span>'
      + '<span class="pill ' + svStatusPill(v.status) + '">' + renderDot + v.status + '</span>'
      + '</div>'
      + '<div class="sv-card-foot">'
      + '<span class="sv-date">' + svDateLabel(v.daysAgo) + '</span>'
      + '<span class="sv-date">' + (v.views !== '—' ? '▸ ' + v.views + ' views' : 'Not published') + '</span>'
      + '</div>'
      + '</div></div>';
  }

  function renderStudioVideoLibrary() {
    var f = appState.svFilters;
    var all = appState.svVideos;
    var videos = svFiltered();
    var published = all.filter(function (v) { return v.status === 'Published'; }).length;
    var inProgress = all.length - published;

    var cards = videos.map(svCard).join('');

    return '<div>'
      + '<div class="sv-lib-head">'
      + '<div><h2 class="sv-lib-title">My Library</h2><p class="screen-sub">Crumb &amp; Co. · Video content · Maker agent</p></div>'
      + '<div class="sv-lib-actions"><button class="btn btn-primary btn-sm" onclick="svNewVideo()">+ New Video</button></div>'
      + '</div>'
      + '<div class="sv-statbar">'
      + svStatCard(all.length, 'Total videos', false)
      + svStatCard(published, 'Published', false)
      + svStatCard(inProgress, 'In progress', true)
      + '</div>'
      + '<div class="sv-filter-bar">'
      + '<div class="sv-search-wrap"><span class="sv-search-ico">&#128269;</span>'
      + '<input class="sv-search" placeholder="Search by name…" value="' + (f.search || '') + '" oninput="svSetFilter(\'search\',this.value)"></div>'
      + svFilterSelect('platform', [
          { val: 'All', label: 'All platforms' },
          { val: 'Instagram', label: 'Instagram' },
          { val: 'Facebook', label: 'Facebook' },
          { val: 'LinkedIn', label: 'LinkedIn' },
          { val: 'YouTube', label: 'YouTube' }
        ])
      + svFilterSelect('status', [
          { val: 'All', label: 'All statuses' },
          { val: 'Draft', label: 'Draft' },
          { val: 'Rendering', label: 'Rendering' },
          { val: 'In Review', label: 'In Review' },
          { val: 'Scheduled', label: 'Scheduled' },
          { val: 'Published', label: 'Published' }
        ])
      + svFilterSelect('date', [
          { val: 'All', label: 'Any date' },
          { val: 'Today', label: 'Today' },
          { val: '7', label: 'Last 7 days' },
          { val: '30', label: 'Last 30 days' }
        ])
      + '</div>'
      + '<div class="sv-result-count"><strong>' + videos.length + '</strong> of ' + all.length + ' video' + (all.length === 1 ? '' : 's') + '</div>'
      + (videos.length
          ? '<div class="sv-grid">' + cards + '</div>'
          : '<div class="sv-empty">No videos match your filters. Try clearing a filter or creating a new video.</div>')
      + '</div>';
  }

  function screenStudioVideo() {
    var toast = appState.svToast ? '<div class="sv-toast">' + appState.svToast + '</div>' : '';
    var overlay = (appState.svFlow && appState.svFlow.open) ? svFlowOverlay() : '';
    return '<div class="screen">'
      + renderStudioVideoLibrary()
      + overlay
      + toast
      + '</div>';
  }

  return { init: init, screenStudioVideo: screenStudioVideo };
})();

window.screenStudioVideo = function () { return StudioVideo.screenStudioVideo(); };
