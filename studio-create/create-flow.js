/* Unified creation flow — 5-step wizard: what → where → format → brief → generate */
var CreateFlow = (function () {
  var CF_STEPS = ['What', 'Where', 'Format', 'Brief', 'Generate'];
  var CF_MOD_ICONS = {
    text:  '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="3.5" width="14" height="1.75" rx="0.875" fill="currentColor"/><rect x="2" y="8" width="11" height="1.75" rx="0.875" fill="currentColor"/><rect x="2" y="12.5" width="8" height="1.75" rx="0.875" fill="currentColor"/></svg>',
    image: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="14" height="14" rx="2.5" stroke="currentColor" stroke-width="1.5"/><path d="M2 13l4-5 3.5 3.5 2.5-3L16 13" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="6.5" cy="6.5" r="1.25" fill="currentColor"/></svg>',
    video: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1.5" y="4" width="10.5" height="10" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M12 8.5l4.5-3v7L12 9.5V8.5z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
    audio: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 11.5V6.5H5.5L10 3.5v11L5.5 11.5H2z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M13 6.5c1.5 1 1.5 4 0 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
  };
  var CF_MODS = [
    { id: 'text',  name: 'Written',  desc: 'Posts, articles, email, threads' },
    { id: 'image', name: 'Image',    desc: 'Feed posts, carousels, banners' },
    { id: 'video', name: 'Video',    desc: 'Short-form, long-form, ads' },
    { id: 'audio', name: 'Audio',    desc: 'Podcast, voiceover, ad spot' }
  ];
  /* SVG icon strings for platform tiles — no emoji */
  var CF_ICON_INSTAGRAM = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="3" width="14" height="12" rx="3" stroke="currentColor" stroke-width="1.5"/><circle cx="9" cy="9" r="2.5" stroke="currentColor" stroke-width="1.5"/><circle cx="13" cy="5.5" r="1" fill="currentColor"/></svg>';
  var CF_ICON_SPOTIFY   = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7" stroke="currentColor" stroke-width="1.5"/><path d="M5.5 7.5c2-0.8 5-0.5 7 0.8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M6 10c1.5-0.6 4-0.4 5.5 0.6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M6.5 12c1-0.4 2.5-0.3 3.5 0.3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>';
  var CF_ICON_APPLE     = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="6.5" y="2" width="5" height="8" rx="2.5" stroke="currentColor" stroke-width="1.5"/><path d="M3.5 9.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="9" y1="15" x2="9" y2="17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
  var CF_ICON_MIC       = '<svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="4" y="1" width="5" height="7" rx="2.5" stroke="currentColor" stroke-width="1.2"/><path d="M2 7c0 2.5 2 4.5 4.5 4.5S11 9.5 11 7" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><line x1="6.5" y1="11.5" x2="6.5" y2="13" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>';
  var CF_PLATFORMS = {
    text: [
      { id: 'LinkedIn', icon: 'in', desc: 'Posts, articles' },
      { id: 'Instagram', icon: CF_ICON_INSTAGRAM, desc: 'Captions, stories' },
      { id: 'X', icon: '𝕏', desc: 'Tweets, threads' },
      { id: 'Email', icon: '&#9993;', desc: 'Newsletters' }
    ],
    image: [
      { id: 'Instagram', icon: CF_ICON_INSTAGRAM, desc: 'Feed, Stories' },
      { id: 'LinkedIn', icon: 'in', desc: 'Banners, carousels' },
      { id: 'Facebook', icon: 'f', desc: 'Reels, feed' },
      { id: 'Pinterest', icon: 'P', desc: 'Pins' }
    ],
    video: [
      { id: 'Instagram', icon: CF_ICON_INSTAGRAM, desc: 'Reels' },
      { id: 'Facebook', icon: 'f', desc: 'Reels, feed' },
      { id: 'YouTube', icon: '&#9654;', desc: 'Shorts, long' },
      { id: 'TikTok', icon: '&#9835;', desc: 'Covers' }
    ],
    audio: [
      { id: 'Spotify', icon: CF_ICON_SPOTIFY, desc: 'Podcast' },
      { id: 'Apple', icon: CF_ICON_APPLE, desc: 'Podcasts' },
      { id: 'YouTube', icon: '&#9654;', desc: 'Video podcast' }
    ]
  };
  var CF_FORMATS = {
    text: {
      LinkedIn: [{ id: 'Post', limit: '1,300 chars' }, { id: 'Article', limit: '125k chars' }],
      Instagram: [{ id: 'Caption', limit: '2,200 chars' }, { id: 'Story text', limit: '220 chars' }],
      X: [{ id: 'Single tweet', limit: '280 chars' }, { id: 'Thread', limit: '280/tweet' }],
      Email: [{ id: 'Newsletter', limit: 'No limit' }]
    },
    image: {
      Instagram: [{ id: 'Portrait 4:5', aspect: '4:5', dims: '1080×1350' }, { id: 'Feed 1:1', aspect: '1:1', dims: '1080×1080' }, { id: 'Story 9:16', aspect: '9:16', dims: '1080×1920' }],
      LinkedIn: [{ id: 'Banner 1.91:1', aspect: '1.91:1', dims: '1200×627' }, { id: 'Square 1:1', aspect: '1:1', dims: '1200×1200' }],
      Facebook: [{ id: 'Reel cover 9:16', aspect: '9:16', dims: '1080×1920' }, { id: 'Feed 1:1', aspect: '1:1', dims: '1080×1080' }],
      Pinterest: [{ id: 'Pin 2:3', aspect: '4:5', dims: '1000×1500' }]
    },
    video: {
      Instagram: [{ id: 'Reel 9:16', aspect: '9:16', dur: '0:30' }, { id: 'Story 9:16', aspect: '9:16', dur: '0:15' }],
      Facebook: [{ id: 'Reel 9:16', aspect: '9:16', dur: '0:30' }, { id: 'Feed 1:1', aspect: '1:1', dur: '0:45' }],
      YouTube: [{ id: 'Short 9:16', aspect: '9:16', dur: '0:60' }, { id: 'Long 16:9', aspect: '16:9', dur: '3:00' }],
      TikTok: [{ id: 'Cover 9:16', aspect: '9:16', dur: '0:30' }]
    },
    audio: {
      Spotify: [{ id: 'Episode', dur: '25–45 min' }, { id: 'Short clip', dur: '3–5 min' }],
      Apple: [{ id: 'Episode', dur: '25–45 min' }],
      YouTube: [{ id: 'Video podcast', dur: '20–60 min' }]
    }
  };
  var CF_SUGGESTED = {
    'text:LinkedIn': 0, 'text:Instagram': 0, 'text:X': 1, 'text:Email': 0,
    'image:Instagram': 0, 'image:LinkedIn': 1, 'image:Facebook': 1, 'image:Pinterest': 0,
    'video:Instagram': 0, 'video:Facebook': 0, 'video:YouTube': 0, 'video:TikTok': 0,
    'audio:Spotify': 0, 'audio:Apple': 0, 'audio:YouTube': 0
  };
  var CF_SUGGEST_WHY = {
    'text:LinkedIn': 'Long-form Posts drive the most reach on LinkedIn',
    'text:Instagram': 'Captions outperform Story text for feed engagement',
    'text:X': 'Threads earn more impressions than single tweets',
    'text:Email': 'Newsletter is the only native long-form email format',
    'image:Instagram': 'Portrait 4:5 takes the most feed real estate',
    'image:LinkedIn': 'Square 1:1 reads best in the LinkedIn feed',
    'image:Facebook': 'Feed 1:1 is the safest crop for Facebook',
    'image:Pinterest': 'Tall 2:3 pins get the highest save rate',
    'video:Instagram': 'Reel 9:16 is the highest-distribution video format',
    'video:Facebook': 'Reel 9:16 gets prioritized in Facebook video',
    'video:YouTube': 'Shorts capture the most new-viewer reach',
    'video:TikTok': '9:16 cover is the native TikTok format',
    'audio:Spotify': 'Full episodes build the strongest listener habit',
    'audio:Apple': 'Full episodes index best in Apple Podcasts',
    'audio:YouTube': 'Video podcast unlocks YouTube discovery'
  };
  var CF_SAMPLE_INTELLIGENCE = {
    brand: 'Hearth Bakery',
    persona: {
      name: 'Maya Holloway',
      seg: 'Local foodie · 28–45 · drives for quality',
      insight: 'Values authenticity over trends. Responds to process stories and limited-batch urgency.'
    },
    market: {
      whiteSpace: 'Artisan craft vs ghost-kitchen convenience — competitors sell speed, Hearth sells patience.',
      gap: '68% of food-tech startups shuttered since 2023; artisan bakeries grew 14% CAGR.',
      trend: 'Slow food · local sourcing · behind-the-scenes content'
    },
    consumer: {
      trigger: 'Fear of missing the batch. Motivator: feeling part of a community, not a transaction.',
      research: 'Pre-order conversion lifts 34% when ferment process is shown. Peak engagement Sat 8–11am.'
    }
  };
  function cfHasIntelligence() {
    var intel = appState.intelligence;
    return !!(intel && intel.persona && intel.persona.name && intel.market && intel.market.whiteSpace && intel.consumer && intel.consumer.trigger);
  }
  function cfModalityOpts(f) {
    if (f.modality === 'image') {
      if (!f.imageOpts) f.imageOpts = { styleDir: 'Editorial craft', palette: (appState.cfPrefs.colors || ['#d4a853'])[0], textOverlay: true };
      return f.imageOpts;
    }
    if (f.modality === 'video') {
      if (!f.videoOpts) f.videoOpts = { visualStyle: 'Casual / UGC', captions: true, script: '' };
      return f.videoOpts;
    }
    if (f.modality === 'audio') {
      if (!f.audioOpts) f.audioOpts = { voiceStyle: 'Conversational', musicBed: true, script: '' };
      return f.audioOpts;
    }
    if (!f.textOpts) f.textOpts = { length: 'Medium (~120 words)', tone: 'Match brand tone', style: 'Story-led' };
    return f.textOpts;
  }
  function cfAppliedControlsSummary(f) {
    var o = cfModalityOpts(f);
    if (f.modality === 'text') return o.length + ' · ' + o.style + ' · Tone: ' + (o.tone === 'Match brand tone' ? appState.cfPrefs.tones.join(', ') : o.tone);
    if (f.modality === 'image') return (f.aspect || '1:1') + ' · ' + o.styleDir + ' · Overlay ' + (o.textOverlay ? 'on' : 'off');
    if (f.modality === 'video') {
      // Type and duration come from Format step (f.format, f.dims) — single source of truth
      var vType = f.format || 'Video';
      var vDur = f.dims || '';
      return vType + (vDur ? ' · ' + vDur : '') + ' · ' + (f.aspect || '9:16') + ' · ' + o.visualStyle + ' · Captions ' + (o.captions ? 'on' : 'off');
    }
    // Audio: type and duration come from Format step
    var aType = f.format || 'Audio';
    var aDur = f.dims || '';
    return aType + (aDur ? ' · ' + aDur : '') + ' · ' + o.voiceStyle + (o.musicBed ? ' · Music bed' : '');
  }
  window.cfSetOpt = function (key, value) {
    var f = cfFlow();
    cfModalityOpts(f)[key] = value;
    renderContent();
  };
  window.cfSetAspect = function (val) {
    cfFlow().aspect = val;
    renderContent();
  };
  window.cfToggleOpt = function (key) {
    var f = cfFlow();
    var o = cfModalityOpts(f);
    o[key] = !o[key];
    renderContent();
  };
  function cfLoadSampleIntelligence() {
    // Use shared global so sidebar radio stays in sync
    var sample = window.CLARITY_SAMPLE_INTELLIGENCE || CF_SAMPLE_INTELLIGENCE;
    appState.intelligence = JSON.parse(JSON.stringify(sample));
    if (window.localStorage) localStorage.setItem('clarity_intel_mode', 'on');
    if (window.renderSidebar) renderSidebar();
    var b = appState.createBrief;
    b.persona = sample.persona.name;
    if (!b.goal) b.goal = 'Drive weekend pre-orders';
    if (!b.message) b.message = 'Sourdough Saturday is back — 72-hour cold ferment, stone-baked, limited batch. Craft over convenience.';
    if (!b.whyNow) b.whyNow = 'Seasonal launch · Summer 2026';
    if (!b.proof) b.proof = sample.market.gap;
    if (!b.cta) b.cta = 'Pre-order now — closes Friday at 6 PM.';
  }
  var CF_TEXT_VARS = [
    { label: 'A', pf: 81, text: 'While ghost kitchens rise and fall, artisan baking keeps winning. Patience isn\'t a trend — it\'s the moat. Sourdough Saturday pre-orders are live.', storyboard: 'Contrarian hook → craft moat → CTA', rationale: 'Uses market gap data — ghost kitchen vs artisan CAGR' },
    { label: 'B', pf: 88, text: 'Hot take: the best food businesses aren\'t chasing trends — they\'re outlasting them.\n\n68% of food-tech startups shuttered since 2023. Artisan bakeries grew 14% CAGR.\n\nSourdough Saturday is back. Pre-orders open now.', storyboard: 'Hot take → stat proof → urgency CTA', rationale: 'Best PF for Maya — data + authenticity tone' },
    { label: 'C', pf: 74, text: 'Every Saturday: flour, water, time. No shortcuts. Just bread worth waiting for. Sourdough Saturday pre-orders are live — link in bio.', storyboard: 'Ritual → simplicity → soft CTA', rationale: 'Process-story angle from consumer research' }
  ];
  var CF_IMAGE_VARS = [
    { label: 'A', pf: 84, theme: 'bakery', headline: 'Sourdough<br>Saturday', storyboard: 'Hero product · warm light · logo lockup', rationale: 'Matches brand kit colors + weekend urgency' },
    { label: 'B', pf: 91, theme: 'sourdough', headline: 'The Art of<br>Slow Growth', storyboard: 'Full-bleed craft · headline center · accent bar', rationale: 'Highest persona fit — process over convenience' },
    { label: 'C', pf: 76, theme: 'ferment', headline: '72-Hour<br>Cold Ferment', storyboard: 'Behind-the-scenes · text overlay · subtle logo', rationale: 'Consumer research: ferment visuals +34% conversion' }
  ];
  var CF_VIDEO_VARS = [
    { label: 'A', pf: 90, title: 'Hook-first cut', dur: '0:28', storyboard: '0:00 bold claim · 0:08 proof · 0:20 CTA', rationale: 'Scroll-stop hook aligned to persona fear/motivator' },
    { label: 'B', pf: 86, title: 'Story-driven cut', dur: '0:34', storyboard: '0:00 problem · 0:12 bake process · 0:28 payoff', rationale: 'Narrative arc from brief + consumer trigger' },
    { label: 'C', pf: 83, title: 'Process montage', dur: '0:41', storyboard: 'Fast B-roll · captions · music sync', rationale: 'Platform-native reel pacing for ' + 'Instagram' }
  ];
  var CF_AUDIO_VARS = [
    { label: 'A', pf: 87, title: 'Interview + data segment', dur: '27:41', storyboard: 'Intro · interview · data · CTA', rationale: 'Balances warmth with research credibility' },
    { label: 'B', pf: 82, title: 'Solo narrative', dur: '22:15', storyboard: 'Host monologue · 3 chapters · outro', rationale: 'Efficient solo format for weekly cadence' },
    { label: 'C', pf: 79, title: 'Customer story focus', dur: '31:08', storyboard: 'Customer intro · story · community close', rationale: 'Community motivator from consumer research' }
  ];
  var CF_PERSONAS = {
    'Maya Holloway': { name: 'Maya Holloway', seg: 'Local foodie · 28–45 · drives for quality', insight: 'Values authenticity over trends. Responds to process stories and limited-batch urgency.' },
    'Alex Rivera': { name: 'Alex Rivera', seg: 'Growth-stage founder · 32–40 · efficiency-focused', insight: 'Responds to data-backed claims and before/after contrasts. Skeptical of hype.' },
    'All segments': { name: 'All segments', seg: 'Broad reach · mixed demographics', insight: 'Balanced tone — lead with universal craft story, avoid niche jargon.' }
  };
  var CF_GEN_STEPS = ['Applying brand kit…', 'Loading persona context…', 'Generating variations…', 'Scoring persona fit…'];

  function cfPfClass(pf) { return pf >= 70 ? 'green' : pf >= 40 ? 'amber' : 'red'; }
  function cfFlow() { return appState.createFlow; }
  function cfSuggestedIndex(modality, platform) {
    return CF_SUGGESTED[modality + ':' + platform] != null ? CF_SUGGESTED[modality + ':' + platform] : 0;
  }
  function cfApplyFormat(f, idx) {
    var formats = CF_FORMATS[f.modality] && CF_FORMATS[f.modality][f.platform];
    if (!formats || !formats[idx]) return;
    var fmt = formats[idx];
    f.format = fmt.id;
    f.aspect = fmt.aspect || '1:1';
    f.dims = fmt.dims || fmt.dur || fmt.limit || '';
    f.suggestedFormat = idx === cfSuggestedIndex(f.modality, f.platform);
  }
  function cfBriefSignalBar(compact) {
    var b = appState.createBrief;
    var klass = compact ? ' cf-brief-signals-compact' : '';
    return '<div class="cf-brief-signals' + klass + '">'
      + '<div class="cf-brief-signal"><span>Core message</span><strong>' + (b.message || 'No message set') + '</strong></div>'
      + '<div class="cf-brief-signal"><span>Proof</span><strong>' + (b.proof || 'No proof point set') + '</strong></div>'
      + '<div class="cf-brief-signal"><span>CTA</span><strong>' + (b.cta || 'No CTA set') + '</strong></div>'
      + '</div>';
  }

  function cfSampleLibraryItems() {
    return [
      {
        id: 'lib-1', modality: 'image', platform: 'Instagram', format: 'Feed post',
        title: 'Sourdough Saturday is back — 72-hour cold ferment, stone-baked, limited batch.',
        pf: 94, status: 'Published', date: '2 days ago', campaign: 'Sourdough Saturday Launch',
        publishMode: 'now', dims: '1080×1080', aspect: '1:1', theme: 'sourdough',
        previewText: 'Sourdough Saturday is back — 72-hour cold ferment, stone-baked, limited batch.',
        storyboard: '', rationale: 'Hero crumb shot leads with craft; limited-batch line drives urgency.',
        proof: '72-hour cold ferment, local flour, limited 120-loaf batch.',
        cta: 'Pre-order now — closes Friday at 6 PM.'
      },
      {
        id: 'lib-2', modality: 'text', platform: 'LinkedIn', format: 'Thought post',
        title: 'Why we ferment for 72 hours when the market rewards speed.',
        pf: 91, status: 'Published', date: '3 days ago', campaign: 'Craft Story Series',
        publishMode: 'now', dims: '', aspect: '1:1', theme: '',
        previewText: 'Everyone is racing to bake faster. We went the other way. Here is what 72 hours of patience does to a loaf — and to a customer relationship.',
        storyboard: '', rationale: 'Contrarian hook positions Hearth against ghost-kitchen convenience.',
        proof: '68% of food-tech startups shuttered since 2023; artisan bakeries grew 14% CAGR.',
        cta: 'Read the full story on our journal.'
      },
      {
        id: 'lib-3', modality: 'video', platform: 'Instagram', format: 'Reel',
        title: 'Behind the bake: 30 seconds of the Saturday ferment.',
        pf: 88, status: 'Scheduled', date: 'Sat 9:00 AM', campaign: 'Sourdough Saturday Launch',
        publishMode: 'schedule', dims: '1080×1920', aspect: '9:16', theme: 'sourdough',
        previewText: 'Time-lapse of the 72-hour ferment, scoring, and the oven spring.',
        storyboard: 'Mix → fold → cold proof → score → bake → crackling crust close-up.',
        rationale: 'Process content lifts pre-order conversion 34% per consumer research.',
        proof: 'Peak engagement Saturday 8–11am.',
        cta: 'Pre-order before the batch sells out.'
      },
      {
        id: 'lib-4', modality: 'email', platform: 'Email', format: 'Newsletter',
        title: 'Your Saturday loaf is ready to reserve.',
        pf: 90, status: 'In Campaign', date: '1 day ago', campaign: 'Sourdough Saturday Launch',
        publishMode: 'campaign', dims: '', aspect: '1:1', theme: '',
        previewText: 'The summer drop is here — 120 loaves, 72-hour ferment, gone by noon last week. Reserve yours before Friday 6 PM.',
        storyboard: '', rationale: 'Scarcity + personal subject line drives weekend pre-orders.',
        proof: 'Sold out in 4 hours last drop · 4.9★ from 200+ local reviews.',
        cta: 'Reserve my loaf →'
      },
      {
        id: 'lib-5', modality: 'image', platform: 'Facebook', format: 'Feed post',
        title: 'Meet the farmers behind every loaf.',
        pf: 86, status: 'Draft', date: 'Just now', campaign: 'Craft Story Series',
        publishMode: 'draft', dims: '1200×630', aspect: '1.91:1', theme: 'sourdough',
        previewText: 'A short series on the local hands that make our flour possible.',
        storyboard: '', rationale: 'Local sourcing angle builds community over transaction.',
        proof: '3-part story arc · 12k combined views on pilot episode.',
        cta: 'Follow for episode 2 this Thursday.'
      },
      {
        id: 'lib-6', modality: 'audio', platform: 'Podcast', format: 'Audiogram',
        title: 'The sound of a 72-hour crust.',
        pf: 83, status: 'Draft', date: '4 days ago', campaign: '',
        publishMode: 'draft', dims: '', aspect: '1:1', theme: '',
        previewText: 'A 20-second audiogram of the crackle — paired with the founder’s note on patience.',
        storyboard: '', rationale: 'Sensory audio hook differentiates from visual-only feeds.',
        proof: 'Limited 120-loaf batch.',
        cta: 'Listen, then pre-order.'
      },
      {
        id: 'lib-7', modality: 'text', platform: 'X', format: 'Post',
        title: '120 loaves. 72 hours. One Saturday.',
        pf: 87, status: 'Published', date: '5 days ago', campaign: 'Sourdough Saturday Launch',
        publishMode: 'now', dims: '', aspect: '1:1', theme: '',
        previewText: '120 loaves. 72 hours of cold ferment. One Saturday morning. Last drop sold out in 4 hours — set your alarm.',
        storyboard: '', rationale: 'Short numeric hook optimized for X skim-reading.',
        proof: 'Sold out in 4 hours last drop.',
        cta: 'Pre-order link in bio.'
      },
      {
        id: 'lib-8', modality: 'image', platform: 'Instagram', format: 'Story',
        title: 'Last call: pre-orders close Friday 6 PM.',
        pf: 89, status: 'Scheduled', date: 'Fri 4:00 PM', campaign: 'Sourdough Saturday Launch',
        publishMode: 'schedule', dims: '1080×1920', aspect: '9:16', theme: 'sourdough',
        previewText: 'Countdown story — pre-orders close Friday at 6 PM sharp.',
        storyboard: '', rationale: 'Deadline reminder recaptures undecided followers.',
        proof: 'Limited 120-loaf batch.',
        cta: 'Swipe up to reserve.'
      }
    ];
  }

  function init(state) {
    state.createFlow = {
      step: 1, modality: null, platform: null, format: null, aspect: '1:1', dims: '',
      generating: false, genPhase: 0, variation: null, editContent: '',
      published: false, publishMode: null, genStartedAt: null,
      campaignBannerDismissed: false
    };
    state.createdItems = cfSampleLibraryItems();
    state.cfPrefs = {
      brandKitLock: true, style: 'Warm craft', tones: ['Warm', 'Authentic'],
      colors: ['#d4a853', '#f59e0b', '#2dd4bf', '#12100e'],
      voice: 'Hearth Bakery', logoPlacement: 'Bottom-right'
    };
    state.cfPrefDrawerOpen = false;
    state.cfSidebarOpen = false;
    state.cfScheduleTime = 'Thu 10:00 AM';
    state.cfCampaign = 'Sourdough Saturday Launch';
    state.cfLibraryFilter = 'all';
    state.cfLibrarySelectedId = null;
    state.cfLibScheduleDraft = { date: '', time: '' };
    if (!state.createBrief.proof) state.createBrief.proof = '72-hour cold ferment, local flour, limited 120-loaf batch.';
    if (!state.createBrief.cta) state.createBrief.cta = 'Pre-order now — closes Friday at 6 PM.';
  }

  function cfPrefBar() {
    var p = appState.cfPrefs;
    return '<div class="cf-pref-bar"><span>&#9881;</span><span>Preferences: <strong>' + p.style + '</strong> · <strong>' + p.tones.join(', ') + '</strong> · Brand kit ' + (p.brandKitLock ? 'locked' : 'off') + '</span>'
      + '<span class="cf-pref-edit" onclick="cfOpenPrefs()">Edit</span></div>';
  }

  function cfRenderPrefDrawer() {
    var open = appState.cfPrefDrawerOpen;
    var p = appState.cfPrefs;
    var styles = ['Warm craft', 'Dark tech', 'Minimal', 'Bold promo', 'Brand Kit'];
    var tones = ['Warm', 'Authentic', 'Professional', 'Bold', 'Playful'];
    return '<div class="pref-drawer-overlay' + (open ? ' open' : '') + '" onclick="cfClosePrefs()"></div>'
      + '<div class="pref-drawer' + (open ? ' open' : '') + '">'
      + '<div class="pref-drawer-header"><span class="pref-drawer-title">Content Preferences</span><span class="modal-close" onclick="cfClosePrefs()">&#x2715;</span></div>'
      + '<div class="pref-drawer-body">'
      + '<p class="cf-muted-text">Set once — applied to every generation. Reduces friction on each create flow.</p>'
      + '<div class="cf-field"><label>Visual style</label><select onchange="appState.cfPrefs.style=this.value;renderContent()">'
      + styles.map(function (s) { return '<option' + (p.style === s ? ' selected' : '') + '>' + s + '</option>'; }).join('')
      + '</select></div>'
      + '<div class="cf-field"><label>Brand voice</label><select onchange="appState.cfPrefs.voice=this.value;renderContent()">'
      + ['Hearth Bakery', 'Clarity SaaS', 'Custom'].map(function (s) { return '<option' + (p.voice === s ? ' selected' : '') + '>' + s + '</option>'; }).join('')
      + '</select></div>'
      + '<div class="cf-field"><label>Tone</label><div class="tone-chip-row">'
      + tones.map(function (t) {
          return '<span class="tone-chip' + (p.tones.indexOf(t) >= 0 ? ' active' : '') + '" onclick="cfToggleTone(\'' + t + '\')">' + t + '</span>';
        }).join('')
      + '</div></div>'
      + '<div class="cf-field"><label>Brand colors</label><div class="cf-color-row">'
      + p.colors.map(function (c) {
          return '<div class="cf-color-swatch" style="background:' + c + ';"></div>';
        }).join('')
      + '</div></div>'
      + '<div class="cf-field"><label>Brand Kit lock</label><div style="display:flex;align-items:center;gap:10px;margin-top:4px;">'
      + '<div class="toggle-sw' + (p.brandKitLock ? ' on' : '') + '" onclick="appState.cfPrefs.brandKitLock=!appState.cfPrefs.brandKitLock;renderContent()"><div class="toggle-knob"></div></div>'
      + '<span style="font-size:12px;color:var(--muted);">Enforce colors, logo, typography</span></div></div>'
      + '<button class="btn btn-primary" style="margin-top:8px;" onclick="cfClosePrefs()">Save preferences</button>'
      + '</div></div>';
  }

  function cfIntelRail() {
    var intel = appState.intelligence || {};
    var brief = appState.createBrief;
    var p = appState.cfPrefs;
    var hasIntel = cfHasIntelligence();
    var persona = intel.persona || {};
    var market = intel.market || {};
    var consumer = intel.consumer || {};
    var intelBody = hasIntel
      ? '<div class="cf-intel-block"><div class="label">Persona</div>'
        + '<div class="cf-intel-persona" id="cf-rail-persona">' + persona.name + '</div>'
        + '<div class="cf-intel-text">' + persona.seg + '</div></div>'
        + '<div class="cf-intel-block"><div class="label">Market</div><div class="cf-intel-text">' + market.whiteSpace + '</div></div>'
        + '<div class="cf-intel-block"><div class="label">Consumer</div><div class="cf-intel-text">' + consumer.trigger + '</div></div>'
        + '<div class="evidence-item"><div class="evidence-tag research">research</div><div class="evidence-text">' + market.gap + '</div></div>'
        + '<div class="evidence-item"><div class="evidence-tag social">consumer</div><div class="evidence-text">' + consumer.research + '</div></div>'
      : '<div class="cf-intel-block cf-intel-empty"><div class="cf-intel-text" style="font-style:italic;">No research context loaded yet. Complete Intelligence setup to sharpen persona fit and messaging.</div>'
        + '<button class="btn btn-outline btn-sm" style="margin-top:10px;" onclick="cfLoadSampleIntelOnly()">Load sample intelligence</button></div>';
    return '<button class="cf-rail-reopen" onclick="cfToggleSidebar()" title="Show intelligence">&#10094;</button>'
      + '<div class="cf-intel-rail">'
      + '<button class="cf-rail-toggle" onclick="cfToggleSidebar()" title="Hide intelligence">&#10095;</button>'
      + '<div class="cf-intel-rail-head"' + (hasIntel ? '' : ' style="color:var(--muted);"') + '>' + (hasIntel ? '● Intelligence active' : '○ Intelligence pending') + '</div>'
      + intelBody
      + '<div class="cf-intel-block"><div class="label">Brief</div>'
      + '<div class="cf-intel-text"><strong style="color:var(--text);">' + brief.goal + '</strong><br><br>' + brief.message + '</div></div>'
      + '<div class="cf-intel-block"><div class="label">Preferences</div>'
      + '<div class="cf-intel-text">' + p.style + ' · ' + p.tones[0] + '<br>Brand kit ' + (p.brandKitLock ? 'locked ✓' : 'off') + '</div></div>'
      + '</div>';
  }

  function cfStepper() {
    var step = cfFlow().step;
    var html = '<div class="cf-stepper-wrap"><div class="wizard-steps">';
    CF_STEPS.forEach(function (lbl, i) {
      var n = i + 1;
      var cls = n < step ? 'done' : n === step ? 'active' : 'pending';
      html += '<div class="wizard-step" style="flex-direction:column;align-items:center;">'
        + '<div class="wiz-dot ' + cls + '">' + (n < step ? '✓' : n) + '</div>'
        + '<div class="wiz-label">' + lbl + '</div></div>';
      if (i < CF_STEPS.length - 1) html += '<div class="wiz-line' + (n < step ? ' done' : '') + '"></div>';
    });
    return html + '</div></div>';
  }

  function cfStepBrief() {
    var brief = appState.createBrief;
    var intel = appState.intelligence || {};
    var hasIntel = cfHasIntelligence();
    var brandName = hasIntel && intel.brand ? intel.brand : 'Your brand';
    var personaName = hasIntel && intel.persona ? intel.persona.name : (brief.persona || 'your audience');
    var f = cfFlow();

    var promptBlock = hasIntel
      ? '<div class="cf-brief-prompt">'
        + '<div class="cf-brief-prompt-icon">\u2736</div>'
        + '<div class="cf-brief-prompt-body">'
        + '<div class="cf-brief-prompt-label">Clara drafted this brief from your research</div>'
        + '<div class="cf-brief-prompt-text">\u201CBuild a creative brief for ' + brandName + ' aimed at ' + personaName + '. Use the market gap and consumer trigger from Intelligence, and lead with craft, differentiation, and limited-batch urgency.\u201D</div>'
        + '</div></div>'
      : '';

    var contextBar = '<div class="cf-pref-bar cf-brief-pills">'
      + '<span class="pill pill-muted">' + (f.modality ? cfPrettyModality(f.modality) : 'Type') + '</span>'
      + '<span class="pill pill-muted">' + (f.platform || 'Platform') + '</span>'
      + '<span class="pill pill-muted">' + (f.format || 'Format') + '</span>'
      + '<span style="color:var(--muted);font-size:12px;">Used for all generated variations.</span>'
      + '</div>';

    // Card 1 — Strategy
    var card1 = '<div class="cf-brief-card-section">'
      + '<div class="cf-brief-card-heading">Strategy</div>'
      + '<div class="cf-brief-card-sub">Define the goal and timing context for this piece of content.</div>'
      + '<div class="cf-brief-row">'
      + '<div class="cf-field"><label>Campaign objective</label>'
      + '<input value="' + (brief.goal || '') + '" placeholder="What measurable outcome do we want?" oninput="appState.createBrief.goal=this.value">'
      + '<div class="cf-field-help">Example: Drive weekend pre-orders from existing Instagram followers.</div></div>'
      + '<div class="cf-field"><label>Why this moment</label>'
      + '<input value="' + (brief.whyNow || '') + '" placeholder="Why this campaign now?" oninput="appState.createBrief.whyNow=this.value">'
      + '<div class="cf-field-help">Example: Summer menu launch + Saturday footfall spike.</div></div>'
      + '</div>'
      + '</div>';

    // Card 2 — Message
    var card2 = '<div class="cf-brief-card-section">'
      + '<div class="cf-brief-card-heading">Message</div>'
      + '<div class="cf-brief-card-sub">Who you\'re talking to, what to say, and what makes it credible.</div>'
      + '<div class="cf-field"><label>Primary persona</label>'
      + '<select onchange="cfSetPersona(this.value)">'
      + (function () {
          var conceptPersona = window.clarityActiveConcept && window.clarityActiveConcept();
          var cpName = (conceptPersona && conceptPersona.persona && conceptPersona.persona.name && conceptPersona.persona.name.trim()) || '';
          var fallbacks = ['Maya Holloway', 'Alex Rivera', 'All segments'];
          var options = cpName ? [cpName].concat(fallbacks.filter(function (f) { return f !== cpName; })) : fallbacks;
          return options.map(function (p) {
            return '<option' + (brief.persona === p ? ' selected' : '') + '>' + p + '</option>';
          }).join('');
        })()
      + '</select>'
      + '<div class="cf-field-help">Who this message should feel written for.</div></div>'
      + '<div class="cf-field"><label>Core message <span class="cf-field-label-note">— single clear sentence</span></label>'
      + '<textarea placeholder="What is the one idea the audience must remember?" oninput="appState.createBrief.message=this.value">' + (brief.message || '') + '</textarea>'
      + '<div class="cf-field-help">Keep it sharp: offer + differentiator + urgency.</div></div>'
      + '<div class="cf-brief-row">'
      + '<div class="cf-field"><label>Proof points</label>'
      + '<input value="' + (brief.proof || '') + '" placeholder="What makes this claim credible?" oninput="appState.createBrief.proof=this.value">'
      + '<div class="cf-field-help">Ingredients, process, data, social proof.</div></div>'
      + '<div class="cf-field"><label>Call to action</label>'
      + '<input value="' + (brief.cta || '') + '" placeholder="What exactly should people do next?" oninput="appState.createBrief.cta=this.value">'
      + '<div class="cf-field-help">Example: Pre-order now. Pickup Saturday 8–11 AM.</div></div>'
      + '</div>'
      + '</div>';

    return '<div class="cf-brief-center">'
      + '<div class="cf-step-title">Write the creative brief</div>'
      + '<div class="cf-step-sub">' + brandName + ' · lock the strategy your generator will execute</div>'
      + promptBlock
      + contextBar
      + '<div class="cf-brief-cards">'
      + card1
      + card2
      + cfCreativeControls(f)
      + '</div>'
      + '</div>';
  }

  function cfPrefsStrip() {
    var p = appState.cfPrefs;
    return '<div class="cf-prefs-strip">'
      + '<div class="cf-prefs-strip-main">'
      + '<span class="cf-prefs-strip-icon">&#9881;</span>'
      + '<span class="cf-prefs-strip-text">Applied preferences: <strong>' + p.style + '</strong> · Tone <strong>' + p.tones.join(', ') + '</strong> · Brand kit <strong>' + (p.brandKitLock ? 'locked' : 'off') + '</strong></span>'
      + '</div>'
      + '<button class="cf-prefs-strip-edit" onclick="cfOpenPrefs()">Edit</button>'
      + '</div>';
  }

  function cfCreativeControls(f) {
    var o = cfModalityOpts(f);
    var title = '<div class="cf-controls-title">' + cfPrettyModality(f.modality) + ' controls</div>'
      + '<div class="cf-controls-sub">Shape how this ' + f.modality + ' is generated.</div>';
    var body;
    if (f.modality === 'text') {
      body = cfControlSelect('length', 'Word count', o.length, ['Short (~60 words)', 'Medium (~120 words)', 'Long (~250 words)'])
        + cfControlSelect('tone', 'Tone', o.tone, ['Match brand tone', 'Warm', 'Bold', 'Professional', 'Playful'])
        + cfControlSelect('style', 'Format style', o.style, ['Story-led', 'Listicle', 'Punchy one-liner', 'Q&A / hook']);
    } else if (f.modality === 'image') {
      /* Aspect ratio is locked by Format step — show read-only */
      body = cfControlReadonly('Aspect ratio', (f.aspect || '1:1') + (f.dims ? ' · ' + f.dims : ''))
        + cfControlSelect('styleDir', 'Style direction', o.styleDir, ['Editorial craft', 'Minimal clean', 'Bold promo', 'Documentary / BTS'])
        + cfControlPalette(o.palette)
        + cfControlToggle('textOverlay', 'Text overlay', o.textOverlay);
    } else if (f.modality === 'video') {
      /* Type, duration, and aspect ratio are all locked by Format step */
      body = cfControlReadonly('Video type', f.format || '—')
        + cfControlReadonly('Duration', f.dims || '—')
        + cfControlReadonly('Aspect ratio', f.aspect || '—')
        + cfControlSelect('visualStyle', 'Visual style', o.visualStyle, ['Casual / UGC', 'Cinematic', 'Animated / Motion graphics', 'Documentary BTS'])
        + cfControlToggle('captions', 'Burn-in captions', o.captions)
        + cfControlTextarea('script', 'Script or scene description', o.script, 'Key scenes, dialogue, or shot list…');
    } else {
      /* Type and duration are locked by Format step */
      body = cfControlReadonly('Audio type', f.format || '—')
        + cfControlReadonly('Duration', f.dims || '—')
        + cfControlSelect('voiceStyle', 'Voice style', o.voiceStyle, ['Conversational', 'Calm', 'Energetic', 'Professional'])
        + cfControlToggle('musicBed', 'Background music', o.musicBed)
        + cfControlTextarea('script', 'Script or talking points', o.script, 'Key messages, bullet points, or full script…');
    }
    return '<div class="cf-creative-controls">' + title + '<div class="cf-controls-grid">' + body + '</div></div>';
  }
  function cfControlSelect(key, label, value, options) {
    return '<div class="cf-field cf-control"><label>' + label + '</label><select onchange="cfSetOpt(\'' + key + '\',this.value)">'
      + options.map(function (op) { return '<option' + (value === op ? ' selected' : '') + '>' + op + '</option>'; }).join('')
      + '</select></div>';
  }
  function cfControlReadonly(label, value) {
    return '<div class="cf-field cf-control"><label>' + label + '</label>'
      + '<div class="cf-control-static">' + value + ' <span class="cf-control-locked">from format</span></div></div>';
  }
  function cfControlAspect(f, options) {
    var current = f.aspect || options[0];
    if (options.indexOf(current) < 0) options = [current].concat(options);
    return '<div class="cf-field cf-control"><label>Aspect ratio</label><select onchange="cfSetAspect(this.value)">'
      + options.map(function (op) { return '<option' + (current === op ? ' selected' : '') + '>' + op + '</option>'; }).join('')
      + '</select></div>';
  }
  function cfControlToggle(key, label, on) {
    return '<div class="cf-field cf-control"><label>' + label + '</label>'
      + '<div style="display:flex;align-items:center;gap:10px;margin-top:2px;">'
      + '<div class="toggle-sw' + (on ? ' on' : '') + '" onclick="cfToggleOpt(\'' + key + '\')"><div class="toggle-knob"></div></div>'
      + '<span class="cf-muted-text">' + (on ? 'On' : 'Off') + '</span></div></div>';
  }
  function cfControlTextarea(key, label, value, placeholder) {
    return '<div class="cf-field cf-control cf-control-full"><label>' + label + '</label>'
      + '<textarea placeholder="' + placeholder + '" oninput="cfSetOpt(\'' + key + '\',this.value)">'
      + (value || '') + '</textarea></div>';
  }
  function cfControlPalette(selected) {
    var colors = appState.cfPrefs.colors || [];
    return '<div class="cf-field cf-control"><label>Color palette</label>'
      + '<div class="cf-palette-row">'
      + colors.map(function (c) {
          var on = selected === c;
          return '<div class="cf-palette-swatch' + (on ? ' on' : '') + '" style="background:' + c + ';" onclick="cfSetOpt(\'palette\',\'' + c + '\')" title="' + c + '"></div>';
        }).join('')
      + '<span class="cf-control-locked" style="margin-left:6px;align-self:center;">brand kit</span>'
      + '</div></div>';
  }

  function cfStepModality() {
    var f = cfFlow();
    return '<div class="cf-step-body"><div class="cf-hero">'
      + '<div class="cf-step-title">Select content type</div>'
      + '<div class="cf-step-sub">Choose the format for this piece of content.</div>'
      + '<div class="cf-mod-grid">'
      + CF_MODS.map(function (m) {
          var sel = f.modality === m.id;
          return '<div class="cf-mod-tile' + (sel ? ' selected' : '') + '" onclick="cfSelectModality(\'' + m.id + '\')">'
            + '<div class="cf-mod-icon-wrap">' + CF_MOD_ICONS[m.id] + '</div>'
            + (sel ? '<div class="cf-mod-check">&#10003;</div>' : '')
            + '<div class="cf-mod-name">' + m.name + '</div>'
            + '<div class="cf-mod-desc">' + m.desc + '</div></div>';
        }).join('')
      + '</div>'
      + '</div></div>';
  }

  function cfStepPlatform() {
    var f = cfFlow();
    var plats = CF_PLATFORMS[f.modality] || CF_PLATFORMS.text;
    var platHtml = plats.map(function (p) {
      return '<div class="platform-tile' + (f.platform === p.id ? ' active' : '') + '" onclick="cfSelectPlatform(\'' + p.id + '\')">'
        + '<div class="platform-tile-icon">' + p.icon + '</div>'
        + '<div class="platform-tile-name">' + p.id + '</div>'
        + '<div class="platform-tile-desc">' + p.desc + '</div></div>';
    }).join('');
    return '<div class="cf-step-body">'
      + '<div class="cf-step-title">Publishing platform</div>'
      + '<div class="cf-step-sub">Select the platform this content is being created for.</div>'
      + '<div class="platform-tile-grid">' + platHtml + '</div>'
      + '</div>';
  }

  function cfFormatPreview(f) {
    var mod      = f.modality;
    var aspect   = f.aspect  || '1:1';
    var dims     = f.dims    || '';
    var format   = f.format  || '';
    var isRec    = !!f.suggestedFormat;
    var platform = f.platform || '';
    var brand    = (appState.intelligence && appState.intelligence.brand)
                 || (appState.createBrief && appState.createBrief.brand)
                 || 'Your brand';

    /* Aspect ratio → pixel dimensions (max 220px on the longer side) */
    function aspectDims(asp, maxLong) {
      var p  = asp.split(':');
      var rw = parseFloat(p[0]) || 1;
      var rh = parseFloat(p[1]) || 1;
      if (rw >= rh) return { w: maxLong, h: Math.round(maxLong * rh / rw) };
      return { h: maxLong, w: Math.round(maxLong * rw / rh) };
    }

    var metaLine = [format, dims].filter(Boolean).join(' · ');
    var recBadge = isRec ? '<span class="cf-fmt-rec-badge">Recommended</span>' : '';

    /* ── Image ── */
    if (mod === 'image') {
      var id = aspectDims(aspect, 220);
      return '<div class="cf-fmt-preview">'
        + '<div class="cf-fmt-mockup">'
        + '<div class="cf-fmt-mockup-head">'
        +   '<div class="cf-fmt-avatar">' + brand.charAt(0).toUpperCase() + (brand.split(' ')[1] ? brand.split(' ')[1].charAt(0).toUpperCase() : '') + '</div>'
        +   '<div class="cf-fmt-mockup-meta"><div class="cf-fmt-mockup-name">' + brand + '</div><div class="cf-fmt-mockup-platform">' + platform + '</div></div>'
        + '</div>'
        + '<div class="cf-fmt-img-frame" style="width:' + id.w + 'px;height:' + id.h + 'px;">'
        +   '<span class="cf-fmt-img-asp">' + aspect + '</span>'
        + '</div>'
        + '<div class="cf-fmt-caption-lines">'
        +   '<div class="cf-fmt-cap-line" style="width:88%;"></div>'
        +   '<div class="cf-fmt-cap-line" style="width:64%;"></div>'
        + '</div>'
        + '</div>'
        + '<div class="cf-fmt-preview-meta"><span class="cf-fmt-preview-name">' + metaLine + '</span>' + recBadge + '</div>'
        + '</div>';
    }

    /* ── Video ── */
    if (mod === 'video') {
      var vd = aspectDims(aspect, 180);
      var dur = dims || '0:30';
      return '<div class="cf-fmt-preview">'
        + '<div class="cf-fmt-mockup">'
        + '<div class="cf-fmt-vid-frame" style="width:' + vd.w + 'px;height:' + vd.h + 'px;">'
        +   '<div class="cf-fmt-vid-play">&#9654;</div>'
        +   '<div class="cf-fmt-vid-dur">' + dur + '</div>'
        +   '<div class="cf-fmt-vid-asp">' + aspect + '</div>'
        + '</div>'
        + '<div class="cf-fmt-vid-label">' + brand + ' &middot; ' + platform + '</div>'
        + '</div>'
        + '<div class="cf-fmt-preview-meta"><span class="cf-fmt-preview-name">' + metaLine + '</span>' + recBadge + '</div>'
        + '</div>';
    }

    /* ── Text ── */
    if (mod === 'text') {
      return '<div class="cf-fmt-preview">'
        + '<div class="cf-fmt-mockup cf-fmt-mockup-text">'
        + '<div class="cf-fmt-mockup-head">'
        +   '<div class="cf-fmt-avatar">' + brand.charAt(0).toUpperCase() + (brand.split(' ')[1] ? brand.split(' ')[1].charAt(0).toUpperCase() : '') + '</div>'
        +   '<div class="cf-fmt-mockup-meta"><div class="cf-fmt-mockup-name">' + brand + '</div><div class="cf-fmt-mockup-platform">' + platform + '</div></div>'
        + '</div>'
        + '<div class="cf-fmt-text-body">'
        +   '<div class="cf-fmt-text-line" style="width:92%;height:3px;"></div>'
        +   '<div class="cf-fmt-text-line" style="width:100%;height:3px;"></div>'
        +   '<div class="cf-fmt-text-line" style="width:76%;height:3px;"></div>'
        +   '<div class="cf-fmt-text-line" style="width:88%;height:3px;margin-top:8px;"></div>'
        +   '<div class="cf-fmt-text-line" style="width:60%;height:3px;"></div>'
        +   '<div class="cf-fmt-text-line" style="width:82%;height:2px;"></div>'
        + '</div>'
        + '<div class="cf-fmt-text-cta"><div class="cf-fmt-text-btn"></div></div>'
        + '</div>'
        + '<div class="cf-fmt-preview-meta"><span class="cf-fmt-preview-name">' + metaLine + '</span>' + recBadge + '</div>'
        + '</div>';
    }

    /* ── Audio ── */
    var wbars = [28,52,40,76,50,66,36,84,60,46,70,42,80,54,30,66,46,72,42,58];
    return '<div class="cf-fmt-preview">'
      + '<div class="cf-fmt-mockup cf-fmt-mockup-audio">'
      + '<div class="cf-fmt-audio-player">'
      +   '<div class="cf-fmt-audio-play">&#9654;</div>'
      +   '<div class="cf-fmt-wave"><div class="cf-fmt-wave-inner">'
      +     wbars.map(function(h){ return '<span style="height:' + h + '%;"></span>'; }).join('')
      +   '</div></div>'
      +   '<div class="cf-fmt-audio-dur">' + (dims || '00:30') + '</div>'
      + '</div>'
      + '<div class="cf-fmt-vid-label">' + brand + ' &middot; ' + format + '</div>'
      + '</div>'
      + '<div class="cf-fmt-preview-meta"><span class="cf-fmt-preview-name">' + metaLine + '</span>' + recBadge + '</div>'
      + '</div>';
  }

  function cfStepFormat() {
    var f = cfFlow();
    var formats = (CF_FORMATS[f.modality] && f.platform && CF_FORMATS[f.modality][f.platform]) || [];
    var sugIdx = f.platform ? cfSuggestedIndex(f.modality, f.platform) : 0;
    var why = CF_SUGGEST_WHY[f.modality + ':' + f.platform] || '';

    if (!formats.length) {
      return '<div class="cf-step-body">'
        + '<div class="cf-step-title">Format</div>'
        + '<div class="cf-step-sub">Select a platform first to see available formats.</div>'
        + '</div>';
    }

    var chips = '<div class="format-chip-row cf-fmt-chips">'
      + formats.map(function (fmt, i) {
          var sug = i === sugIdx;
          var active = f.format === fmt.id;
          return '<span class="format-chip' + (active ? ' active' : '') + (sug ? ' cf-suggested' : '') + '" onclick="cfSelectFormat(' + i + ')">'
            + fmt.id + (sug ? ' <span class="format-chip-rec">Recommended</span>' : '') + '</span>';
        }).join('')
      + '</div>';

    var recNote = why
      ? '<div class="cf-rec-note">' + why + '</div>'
      : '';

    var preview = f.format ? cfFormatPreview(f) : '<div class="cf-fmt-preview-empty">Select a format above to see a preview</div>';

    return '<div class="cf-step-body">'
      + '<div class="cf-step-title">Format</div>'
      + '<div class="cf-step-sub">Pre-set to ' + (f.platform || 'platform') + ' standards. Change if needed.</div>'
      + chips
      + recNote
      + preview
      + '</div>';
  }

  function cfStepGenerateProgress() {
    var f = cfFlow();
    var phase = f.genPhase || 0;
    var hasIntel = cfHasIntelligence();
    var genSteps = hasIntel
      ? CF_GEN_STEPS
      : ['Applying brand kit…', 'Using brief context…', 'Generating variations…', 'Scoring by format fit…'];
    return '<div class="cf-gen-stage">'
      + '<div class="cf-gen-glow"></div>'
      + '<div class="cf-spin"></div>'
      + '<div class="cf-gen-title">Maker is creating…</div>'
      + '<div class="cf-gen-sub">' + (hasIntel ? appState.createBrief.persona + ' · ' : '') + f.platform + ' · ' + f.format + '</div>'
      + cfAppliedBar(f)
      + cfBriefSignalBar(true)
      + '<div class="cf-gen-steps">'
      + genSteps.map(function (s, i) {
          var cls = i < phase ? 'done' : i === phase ? 'active' : '';
          return '<div class="cf-gen-step ' + cls + '"><span class="cf-gen-step-dot"></span>' + s + '</div>';
        }).join('')
      + '</div>'
      + '<div class="cf-gen-timer">~' + Math.max(5, 28 - phase * 7) + 's remaining</div>'
      + '</div>';
  }

  var CF_VAR_PALETTES = [
    { bg: 'linear-gradient(135deg,#12100e 0%,#1c1916 100%)', accent: '#d4a853' },
    { bg: 'linear-gradient(135deg,#0d2137 0%,#1a3a2e 100%)', accent: '#2dd4bf' },
    { bg: 'linear-gradient(135deg,#2a1a0e 0%,#1c1c2e 100%)', accent: '#f59e0b' }
  ];
  var CF_PLATFORM_META = {
    LinkedIn:  { color: '#0077b5', icon: 'in', handle: 'Hearth Bakery · 1st',  followers: '4,821 followers' },
    Instagram: { color: '#e1306c', icon: '&#9679;', handle: '@hearthbakery', followers: '12.3k followers' },
    Facebook:  { color: '#1877f2', icon: 'f',  handle: 'Hearth Bakery',        followers: '8.1k followers' },
    X:         { color: '#000000', icon: '&#10005;', handle: '@hearthbakery',   followers: '2.9k followers' },
    TikTok:    { color: '#010101', icon: '&#9835;', handle: '@hearthbakery',    followers: '31k followers' },
    YouTube:   { color: '#ff0000', icon: '&#9654;', handle: 'Hearth Bakery',    followers: '6.7k subscribers' },
    Pinterest: { color: '#e60023', icon: 'P',  handle: 'Hearth Bakery',        followers: '9.4k followers' },
    Email:     { color: '#d4a853', icon: '&#9993;', handle: 'Newsletter',       followers: '3,200 subscribers' },
    Spotify:   { color: '#1db954', icon: '&#9654;', handle: 'The Hearth Podcast', followers: '1.2k listeners' },
    Apple:     { color: '#872ec4', icon: '&#9835;', handle: 'The Hearth Podcast', followers: '890 subscribers' }
  };
  var CF_WAVEFORM_SEQS = [
    [3,5,8,6,9,4,7,10,5,8,6,9,4,7,3,6,8,5,9,7,4,8,6,10,5,7,9,4,6,8],
    [6,9,4,7,10,5,8,3,9,6,4,8,7,5,10,6,3,8,5,9,7,4,6,9,5,8,3,7,10,4],
    [4,7,10,5,8,6,9,3,7,5,8,6,10,4,7,9,5,3,8,6,4,9,7,5,10,6,8,3,5,7]
  ];

  function cfTextPostMockup(v, f) {
    var pm = CF_PLATFORM_META[f.platform] || CF_PLATFORM_META['LinkedIn'];
    var avatarIdx = ['A','B','C'].indexOf(v.label);
    var avatarColors = ['#d4a853','#2dd4bf','#f59e0b'];
    var av = avatarColors[avatarIdx] || '#d4a853';
    return '<div class="cf-post-mockup">'
      + '<div class="cf-post-header" style="border-top:3px solid ' + pm.color + ';">'
      + '<div class="cf-post-avatar" style="background:' + av + ';">HB</div>'
      + '<div class="cf-post-meta"><div class="cf-post-name">Hearth Bakery</div><div class="cf-post-handle">' + pm.handle + '</div></div>'
      + '<div class="cf-post-platform-badge" style="color:' + pm.color + ';">' + pm.icon + '</div>'
      + '</div>'
      + '<div class="cf-post-body">' + v.text.replace(/\n/g, '<br>') + '</div>'
      + '<div class="cf-post-footer">'
      + '<span class="cf-post-action">&#128077; Like</span>'
      + '<span class="cf-post-action">&#128172; Comment</span>'
      + '<span class="cf-post-action">&#8594; Share</span>'
      + '</div>'
      + '</div>';
  }

  function cfImagePostMockup(v, f) {
    var aspect = f.aspect || '1:1';
    var thumb = window.StudioImage && StudioImage.renderPreview
      ? StudioImage.renderPreview(v.theme, aspect, v.headline, false)
      : '<div class="cf-img-placeholder" style="aspect-ratio:' + aspect.replace(':','/') + ';background:linear-gradient(135deg,#12100e,#1c1916);"></div>';
    var pm = CF_PLATFORM_META[f.platform] || CF_PLATFORM_META['Instagram'];
    return '<div class="cf-image-mockup">'
      + '<div class="cf-image-mockup-header">'
      + '<div class="cf-post-avatar" style="background:#d4a853;width:28px;height:28px;font-size:10px;">HB</div>'
      + '<span class="cf-image-mockup-name">hearthbakery</span>'
      + '<span class="cf-image-mockup-badge" style="color:' + pm.color + ';">' + pm.icon + '</span>'
      + '</div>'
      + '<div class="cf-image-mockup-thumb">' + thumb + '</div>'
      + '<div class="cf-image-mockup-caption">' + (v.headline || '').replace(/<br>/g,' ') + ' — <em>limited batch, pre-order open</em></div>'
      + '</div>';
  }

  function cfVideoThumbnailMockup(v, i, f) {
    var pal = CF_VAR_PALETTES[i] || CF_VAR_PALETTES[0];
    var aspect = f.aspect || '9:16';
    var ratio = aspect === '9:16' ? '9/16' : aspect === '1:1' ? '1/1' : '16/9';
    var maxH = aspect === '9:16' ? '200px' : '140px';
    return '<div class="cf-video-mockup" style="aspect-ratio:' + ratio + ';max-height:' + maxH + ';background:' + pal.bg + ';">'
      + '<div class="cf-video-play-btn" style="border-color:' + pal.accent + ';color:' + pal.accent + ';">&#9654;</div>'
      + '<div class="cf-video-dur-badge">' + v.dur + '</div>'
      + '<div class="cf-video-caption-bar" style="background:' + pal.accent + '22;">'
      + '<span style="color:' + pal.accent + ';font-weight:600;">' + v.title + '</span>'
      + '</div>'
      + '</div>';
  }

  function cfAudioWaveformMockup(v, i, f) {
    var o = cfModalityOpts(f);
    var bars = CF_WAVEFORM_SEQS[i] || CF_WAVEFORM_SEQS[0];
    var barHtml = bars.map(function(h, bi) {
      var delay = (bi * 60) % 900;
      return '<div class="cf-wave-bar" style="height:' + (h * 4) + 'px;animation-delay:' + delay + 'ms;"></div>';
    }).join('');
    return '<div class="cf-audio-mockup">'
      + '<div class="cf-audio-play">&#9654;</div>'
      + '<div class="cf-audio-body">'
      + '<div class="cf-audio-title">' + v.title + '</div>'
      + '<div class="cf-audio-sub">' + (f.format || 'Audio') + (f.dims ? ' · ' + f.dims : '') + ' · ' + (o.voiceStyle || 'Conversational') + (o.musicBed ? ' · Music' : '') + '</div>'
      + '<div class="cf-audio-waveform">' + barHtml + '</div>'
      + '<div class="cf-audio-time"><span class="cf-audio-pos">0:00</span><span class="cf-audio-sep">————</span><span class="cf-audio-dur">' + v.dur + '</span></div>'
      + '</div>'
      + '</div>';
  }

  function cfVariationCard(v, i, f) {
    var hasIntel = cfHasIntelligence();
    var pfHtml = hasIntel
      ? '<span class="pf-chip ' + cfPfClass(v.pf) + '"><span class="pf-chip-dot"></span>' + v.pf + ' PF' + (v.pf >= 85 ? ' ★' : '') + '</span>'
      : '<span class="pf-chip pill-muted" style="opacity:0.55;" title="Persona fit unavailable without intelligence"><span class="pf-chip-dot"></span>— PF</span>';
    var rationaleHtml = hasIntel
      ? '<div class="cf-rationale"><span>Why</span> ' + v.rationale + '</div>'
      : '<div class="cf-rationale cf-rationale-neutral"><span>Note</span> Generated based on your brief</div>';
    var body;
    if (f.modality === 'text') {
      body = cfTextPostMockup(v, f);
    } else if (f.modality === 'image') {
      body = cfImagePostMockup(v, f);
    } else if (f.modality === 'video') {
      body = cfVideoThumbnailMockup(v, i, f);
    } else {
      body = cfAudioWaveformMockup(v, i, f);
    }
    return '<div class="variation-card cf-var-card' + (f.variation === i ? ' selected' : '') + '" onclick="cfSelectVariation(' + i + ')">'
      + '<div class="flex-between" style="margin-bottom:10px;"><span style="font-weight:600;">Variation ' + v.label + '</span>'
      + pfHtml + '</div>'
      + body
      + '<div class="cf-storyboard" style="margin-top:10px;"><div class="cf-storyboard-label">Storyboard</div><div class="cf-storyboard-text">' + v.storyboard + '</div></div>'
      + rationaleHtml
      + '<button class="btn btn-outline btn-sm" style="width:100%;margin-top:10px;" onclick="event.stopPropagation();cfSelectVariation(' + i + ')">' + (f.variation === i ? 'Selected ✓' : 'Select') + '</button></div>';
  }

  function cfIntelGate() {
    return '<div class="cf-intel-gate">'
      + '<div class="cf-intel-gate-icon">&#128274;</div>'
      + '<div class="cf-intel-gate-title">Research is required before content generation</div>'
      + '<div class="cf-intel-gate-text">Please complete Intelligence setup first so the content engine can generate output for the right audience and business goal.</div>'
      + '<div class="cf-intel-gate-actions">'
      + '<button class="btn btn-primary" onclick="cfStartIntelligenceSetup()">Start Intelligence Setup</button>'
      + '<button class="btn btn-outline" onclick="cfUseSampleIntelligence()">Use Sample Intelligence for Demo</button>'
      + '</div></div>';
  }
  function cfAppliedBar(f) {
    var p = appState.cfPrefs;
    return '<div class="cf-applied-bar">'
      + '<span class="cf-applied-chip">&#9881; Tone: ' + p.tones.join(', ') + '</span>'
      + '<span class="cf-applied-chip">Brand kit ' + (p.brandKitLock ? 'locked' : 'off') + '</span>'
      + '<span class="cf-applied-chip">' + cfAppliedControlsSummary(f) + '</span>'
      + '</div>';
  }
  function cfStepGenerate() {
    var f = cfFlow();
    /* No intelligence gate — generation always runs regardless of intel state */
    if (f.generating) return cfStepGenerateProgress();
    var hasIntel = cfHasIntelligence();
    var vars = f.modality === 'image' ? CF_IMAGE_VARS : f.modality === 'video' ? CF_VIDEO_VARS : f.modality === 'audio' ? CF_AUDIO_VARS : CF_TEXT_VARS;
    return '<div class="cf-step-body cf-step-body-wide">'
      + '<div class="cf-step-title">Select a variation</div>'
      + '<div class="cf-step-sub">' + (hasIntel ? 'Three options, persona-scored. Select one to proceed.' : 'Three options generated from your brief. Select one to proceed.') + '</div>'
      + cfAppliedBar(f)
      + cfBriefSignalBar(true)
      + '<div class="variation-grid">' + vars.map(function (v, i) { return cfVariationCard(v, i, f); }).join('') + '</div>'
      + '<button class="btn btn-ghost btn-sm" onclick="cfRegenerate()" style="margin-top:8px;">&#8635; Regenerate</button>'
      + '</div>';
  }

  function cfStepEdit() {
    var f = cfFlow();
    var vars = f.modality === 'image' ? CF_IMAGE_VARS : f.modality === 'video' ? CF_VIDEO_VARS : f.modality === 'audio' ? CF_AUDIO_VARS : CF_TEXT_VARS;
    var v = f.variation !== null ? vars[f.variation] : vars[1];
    var storyStrip = '<div class="cf-edit-storyboard"><strong>Storyboard:</strong> ' + v.storyboard + ' · <span style="color:var(--muted);">' + v.rationale + '</span></div>';
    var banner = cfCampaignPromoBanner();

    if (f.modality === 'text') {
      var text = f.editContent || v.text;
      return banner + '<div class="cf-step-title">Edit your copy</div><div class="cf-step-sub">Live preview · persona fit updates as you type</div>' + storyStrip
        + cfBriefSignalBar(true)
        + '<div class="platform-preview cf-edit-preview">'
        + '<div class="platform-preview-header"><div class="platform-preview-avatar">HB</div>'
        + '<div class="platform-preview-meta"><div class="platform-preview-name">Hearth Bakery</div>'
        + '<div class="platform-preview-sub">' + f.platform + ' · ' + f.format + '</div></div></div>'
        + '<div class="platform-preview-body" contenteditable="true" oninput="cfFlow().editContent=this.innerText">' + text.replace(/\n/g, '<br>') + '</div></div>';
    }
    if (f.modality === 'image') {
      var imgPreview = (window.StudioImage && StudioImage.renderPreview)
        ? StudioImage.renderPreview(v.theme, f.aspect || '1:1', v.headline, true)
        : '<div class="cf-img-placeholder" style="aspect-ratio:' + (f.aspect || '1:1').replace(':', '/') + ';background:linear-gradient(135deg,#12100e,#1c1916);border-radius:var(--radius);"></div>';
      var captionVal = f.editCaption != null ? f.editCaption : (v.headline ? v.headline.replace(/<br>/g, ' ') : '');
      var altVal = f.editAlt != null ? f.editAlt : '';
      return banner + '<div class="cf-step-title">Edit your visual</div><div class="cf-step-sub">Headline preview · add caption and alt text for publishing</div>' + storyStrip
        + cfBriefSignalBar(true)
        + '<div class="cf-edit-image-layout">'
        + '<div class="cf-edit-canvas">' + imgPreview + '</div>'
        + '<div class="cf-edit-fields">'
        + '<div class="cf-field"><label>Caption</label>'
        + '<textarea oninput="cfFlow().editCaption=this.value">' + captionVal + '</textarea>'
        + '<div class="cf-field-help">Text that will accompany this image when published.</div></div>'
        + '<div class="cf-field"><label>Alt text</label>'
        + '<input value="' + altVal + '" placeholder="Describe the image for accessibility" oninput="cfFlow().editAlt=this.value">'
        + '<div class="cf-field-help">Improves accessibility and SEO. Keep under 125 characters.</div></div>'
        + '</div></div>';
    }
    if (f.modality === 'video') {
      var vidTitle = f.editTitle != null ? f.editTitle : v.title;
      var vidDesc  = f.editDesc  != null ? f.editDesc  : appState.createBrief.message || '';
      var vidNotes = f.editNotes != null ? f.editNotes : '';
      return banner + '<div class="cf-step-title">Refine your cut</div><div class="cf-step-sub">' + v.title + ' · ' + v.dur + '</div>' + storyStrip
        + cfBriefSignalBar(true)
        + '<div class="cf-edit-video-layout">'
        + '<div class="cf-video-player">▶<span>Preview</span></div>'
        + '<div class="cf-edit-fields">'
        + '<div class="cf-field"><label>Title</label>'
        + '<input value="' + vidTitle + '" placeholder="Video title for this platform" oninput="cfFlow().editTitle=this.value">'
        + '<div class="cf-field-help">Shown as the caption or title depending on platform.</div></div>'
        + '<div class="cf-field"><label>Description / Caption</label>'
        + '<textarea oninput="cfFlow().editDesc=this.value">' + vidDesc + '</textarea>'
        + '<div class="cf-field-help">Accompanies the video post. Include hashtags and CTA here.</div></div>'
        + '<div class="cf-field"><label>Refinement notes <span class="cf-field-label-note">— optional, for your editor</span></label>'
        + '<textarea placeholder="Punchier hook, add captions, tighten 0:08–0:14…" oninput="cfFlow().editNotes=this.value">' + vidNotes + '</textarea>'
        + '<div class="cf-field-help">Internal notes for re-cutting or adjusting the generated video.</div></div>'
        + '</div></div>';
    }
    // Audio (and final fallback)
    var epTitle    = f.editTitle      != null ? f.editTitle      : v.title;
    var showNotes  = f.editShowNotes  != null ? f.editShowNotes  : 'This episode covers ' + (appState.createBrief.message || 'the topic') + '. Key themes: ' + (appState.createBrief.proof || 'craft, quality, authenticity') + '.';
    var transcript = f.editTranscript != null ? f.editTranscript : '';
    return banner + '<div class="cf-step-title">Edit your episode</div><div class="cf-step-sub">' + v.title + ' · ' + v.dur + '</div>' + storyStrip
      + cfBriefSignalBar(true)
      + '<div class="cf-audio-edit">'
      + '<div class="cf-waveform">' + [40,65,55,80,45,70,50,75,60,85,48,72,55,78,62,88].map(function(h){ return '<span style="height:'+h+'%"></span>'; }).join('') + '</div>'
      + '</div>'
      + '<div class="cf-edit-fields cf-audio-edit-fields">'
      + '<div class="cf-field"><label>Episode title</label>'
      + '<input value="' + epTitle + '" placeholder="Episode title" oninput="cfFlow().editTitle=this.value">'
      + '<div class="cf-field-help">Displayed as the episode name on podcast platforms and feeds.</div></div>'
      + '<div class="cf-field"><label>Show notes / Description</label>'
      + '<textarea oninput="cfFlow().editShowNotes=this.value">' + showNotes + '</textarea>'
      + '<div class="cf-field-help">Published alongside the episode. Include timestamps, links, and CTA.</div></div>'
      + '<div class="cf-field"><label>Transcript <span class="cf-field-label-note">— optional, for accessibility</span></label>'
      + '<textarea class="cf-transcript-area" placeholder="Paste or type the spoken transcript here. Improves accessibility and SEO." oninput="cfFlow().editTranscript=this.value">' + transcript + '</textarea>'
      + '<div class="cf-field-help">Full spoken transcript. Improves SEO and accessibility for listeners.</div></div>'
      + '</div>';
  }

  function cfStepPublish() {
    var f = cfFlow();
    var vars = f.modality === 'image' ? CF_IMAGE_VARS : f.modality === 'video' ? CF_VIDEO_VARS : f.modality === 'audio' ? CF_AUDIO_VARS : CF_TEXT_VARS;
    var v = f.variation !== null ? vars[f.variation] : vars[1];
    var pf = v.pf;
    var connectors = [
      { name: f.platform, status: 'Connected', ok: true },
      { name: 'Campaign hub', status: 'Ready', ok: true }
    ];
    return cfCampaignPromoBanner()      + '<div class="cf-step-title">Review & publish</div>'
      + '<div class="cf-step-sub">' + f.platform + ' · ' + f.format + ' · ' + pf + ' PF · Brand-safe ✓</div>'
      + '<div class="cf-publish-layout">'
      + '<div class="cf-publish-preview card">'
      + '<div class="label">Preview</div>'
      + '<p class="cf-preview-text">' + (f.modality === 'text' ? (f.editContent || v.text).substring(0, 200) : appState.createBrief.message) + '</p>'
      + '<p class="cf-preview-sub"><strong style="color:var(--text);">CTA:</strong> ' + (appState.createBrief.cta || 'No CTA') + '</p>'
      + '<div class="cf-storyboard" style="margin-top:12px;"><div class="cf-storyboard-label">Storyboard</div><div class="cf-storyboard-text">' + v.storyboard + '</div></div>'
      + '<div class="cf-storyboard" style="margin-top:8px;"><div class="cf-storyboard-label">Proof Point</div><div class="cf-storyboard-text">' + (appState.createBrief.proof || 'No proof point set') + '</div></div>'
      + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;">'
      + '<span class="pf-chip ' + cfPfClass(pf) + '"><span class="pf-chip-dot"></span>' + pf + ' PF</span>'
      + '<span class="pill pill-green">Brand kit ✓</span>'
      + '<span class="pill pill-indigo">' + f.platform + '</span></div></div>'
      + '<div class="cf-publish-actions">'
      + '<div class="label">Destinations</div>'
      + connectors.map(function (c) {
          return '<div class="cf-connector' + (c.ok ? ' ok' : '') + '"><span>' + c.name + '</span><span>' + c.status + ' ✓</span></div>';
        }).join('')
      + '<div class="cf-field" style="margin-top:12px;"><label>Campaign</label>'
      + '<select onchange="appState.cfCampaign=this.value">'
      + ['Sourdough Saturday Launch', 'Summer 2026', 'Brand awareness'].map(function (c) {
          return '<option' + (appState.cfCampaign === c ? ' selected' : '') + '>' + c + '</option>';
        }).join('') + '</select></div>'
      + '<div class="cf-field"><label>Schedule</label>'
      + '<select onchange="appState.cfScheduleTime=this.value">'
      + ['Thu 10:00 AM', 'Fri 8:00 AM', 'Sat 9:00 AM', 'Custom…'].map(function (t) {
          return '<option' + (appState.cfScheduleTime === t ? ' selected' : '') + '>' + t + '</option>';
        }).join('') + '</select></div>'
      + '<button class="btn btn-primary cf-pub-btn" onclick="cfPublish(\'now\')">Publish now</button>'
      + '<button class="btn btn-outline cf-pub-btn" onclick="cfPublish(\'schedule\')">Schedule for ' + appState.cfScheduleTime + '</button>'
      + '<button class="btn btn-outline cf-pub-btn" onclick="cfPublish(\'campaign\')">Add to campaign</button>'
      + '<button class="btn btn-ghost cf-pub-btn" onclick="cfPublish(\'draft\')">Save as draft</button>'
      + '</div></div>';
  }

  function cfStepSuccess() {
    var f = cfFlow();
    var elapsed = f.genStartedAt ? Math.round((Date.now() - f.genStartedAt) / 1000) : 28;
    var campaignName = appState._lastCampaignName || appState.cfCampaign || 'campaign';
    var heading, subline;
    if (f.publishMode === 'draft') {
      heading = 'Draft saved';
      subline = 'Saved to your library — pick it up any time to publish or add to a campaign.';
    } else if (f.publishMode === 'schedule') {
      heading = 'Scheduled';
      subline = 'Scheduled for ' + appState.cfScheduleTime + ' · will publish automatically.';
    } else if (f.publishMode === 'campaign') {
      heading = 'Added to campaign';
      subline = 'Attached to <strong style="color:var(--text);">' + campaignName + '</strong> · ready for the campaign publish step.';
    } else {
      heading = 'Published!';
      subline = 'Live on ' + f.platform + ' · saved to library with full rationale and brief.';
    }
    return '<div class="cf-success">'
      + '<div class="cf-success-badge"><span class="cf-success-check">&#10003;</span><span class="cf-success-label">' + heading + '</span></div>'
      + '<p class="cf-success-sub">' + subline + '</p>'
      + '<p class="cf-success-stat">' + cfPrettyModality(f.modality) + (f.format ? ' · ' + f.format : '') + ' · ' + elapsed + 's</p>'
      + '<div class="cf-success-actions">'
      + '<button class="btn btn-primary" onclick="cfReset()">Create another</button>'
      + '<button class="btn btn-outline" onclick="cfOpenLibrary()">View library</button>'
      + '<button class="btn btn-ghost" onclick="setMode(\'home\')">Back to home</button>'
      + '</div></div>';
  }

  window.cfOpenPrefs = function () { appState.cfPrefDrawerOpen = true; renderContent(); };
  window.cfClosePrefs = function () { appState.cfPrefDrawerOpen = false; renderContent(); };
  window.cfToggleTone = function (t) {
    var tones = appState.cfPrefs.tones;
    var i = tones.indexOf(t);
    if (i >= 0) { if (tones.length > 1) tones.splice(i, 1); }
    else tones.push(t);
    renderContent();
  };
  window.cfSetPersona = function (val) {
    appState.createBrief.persona = val;
    var conceptPersona = window.clarityActiveConcept && window.clarityActiveConcept();
    var cp = (conceptPersona && conceptPersona.persona) || {};
    var cpName = (cp.name && cp.name.trim()) || '';
    var pData;
    if (cpName && val === cpName) {
      var caresAbout = (cp.caresAbout && cp.caresAbout.length) ? cp.caresAbout : [];
      pData = {
        name: cpName,
        seg: (cp.ageRange || '') + ' \u00b7 ' + (caresAbout[0] || ''),
        insight: cp.trigger || caresAbout[0] || ''
      };
    } else {
      var p = CF_PERSONAS[val] || CF_PERSONAS['Maya Holloway'];
      pData = { name: p.name, seg: p.seg, insight: p.insight };
    }
    if (!appState.intelligence) appState.intelligence = {};
    appState.intelligence.persona = pData;
    var nameEl = document.getElementById('cf-persona-name');
    var insightEl = document.getElementById('cf-persona-insight');
    var railEl = document.getElementById('cf-rail-persona');
    if (nameEl) nameEl.textContent = pData.name;
    if (insightEl) insightEl.textContent = pData.insight;
    if (railEl) railEl.textContent = pData.name;
  };
  window.cfSelectModality = function (id) {
    var f = cfFlow();
    f.modality = id;
    f.platform = null;
    f.format = null;
    f.dims = '';
    f.aspect = '1:1';
    renderContent();
  };
  window.cfSelectPlatform = function (id) {
    var f = cfFlow();
    f.platform = id;
    cfApplyFormat(f, cfSuggestedIndex(f.modality, id));
    renderContent();
  };
  window.cfSelectFormat = function (idx) {
    var f = cfFlow();
    cfApplyFormat(f, idx);
    f.suggestedFormat = idx === cfSuggestedIndex(f.modality, f.platform);
    renderContent();
  };
  window.cfSelectVariation = function (i) {
    var f = cfFlow();
    f.variation = i;
    /* Direct DOM update — toggle selected class and button text without a full re-render (no blink) */
    document.querySelectorAll('.variation-card').forEach(function (card, idx) {
      card.classList.toggle('selected', idx === i);
      var btn = card.querySelector('button');
      if (btn) btn.textContent = idx === i ? 'Selected ✓' : 'Select';
    });
    if (!f.generating && f.step === 5) {
      setTimeout(function () {
        var fc = cfFlow();
        if (fc.variation === i && fc.step === 5 && !fc.generating) {
          fc.step = 6;
          renderContent();
        }
      }, 260);
    }
  };
  window.cfRegenerate = function () {
    var f = cfFlow();
    f.variation = null;
    f.generating = true;
    f.genPhase = 0;
    renderContent();
    cfRunGeneration();
  };
  function cfRunGeneration() {
    var f = cfFlow();
    f.genPhase = 0;
    if (!f.genStartedAt) f.genStartedAt = Date.now();
    var tick = setInterval(function () {
      f.genPhase++;
      renderContent();
      if (f.genPhase >= CF_GEN_STEPS.length) {
        clearInterval(tick);
        setTimeout(function () { f.generating = false; renderContent(); }, 350);
      }
    }, 380);
  }
  window.cfContinue = function () {
    var f = cfFlow();
    /* Step 1 → 2: need a modality */
    if (f.step === 1 && !f.modality) return;
    if (f.step === 1) { f.step = 2; renderContent(); return; }
    /* Step 2 → 3: need a platform */
    if (f.step === 2 && !f.platform) return;
    if (f.step === 2) {
      f.step = 3;
      if (!f.format) cfApplyFormat(f, cfSuggestedIndex(f.modality, f.platform));
      renderContent(); return;
    }
    /* Step 3 → 4: need a format */
    if (f.step === 3 && !f.format) return;
    if (f.step === 3) { f.step = 4; renderContent(); return; }
    /* Step 4 → 5: always kick off generation regardless of intel */
    if (f.step === 4) {
      f.step = 5; f.variation = null; f.genPhase = 0;
      f.generating = true;
      if (!f.genStartedAt) f.genStartedAt = Date.now();
      renderContent(); cfRunGeneration(); return;
    }
    /* Step 5 → decision: need a variation selected and generation complete */
    if (f.step === 5 && (f.variation === null || f.generating)) return;
    if (f.step === 5) {
      /* step 6 = decision screen (Prompt 3 replaces with full overlay) */
      f.step = 6; renderContent(); return;
    }
  };
  window.cfBack = function () {
    var f = cfFlow();
    if (f.step <= 1) return;
    if (f.step === 5 || f.step === 6) f.generating = false;
    if (f.step === 6) { f.step = 5; renderContent(); return; }
    f.step--; renderContent();
  };
  window.cfPublish = function (mode) {
    var f = cfFlow();
    var vars = f.modality === 'image' ? CF_IMAGE_VARS : f.modality === 'video' ? CF_VIDEO_VARS : f.modality === 'audio' ? CF_AUDIO_VARS : CF_TEXT_VARS;
    var selectedIdx = f.variation !== null ? f.variation : 1;
    var selected = vars[selectedIdx];
    var pf = selected ? selected.pf : 88;
    appState.createdItems.unshift({
      id: 'c' + Date.now(), modality: f.modality, platform: f.platform, format: f.format,
      title: appState.createBrief.message.substring(0, 60), pf: pf,
      status: mode === 'draft' ? 'Draft' : mode === 'schedule' ? 'Scheduled' : mode === 'campaign' ? 'In Campaign' : 'Published',
      date: mode === 'schedule' ? appState.cfScheduleTime : 'Just now', campaign: appState.cfCampaign,
      publishMode: mode,
      dims: f.dims,
      aspect: f.aspect,
      theme: selected && selected.theme ? selected.theme : '',
      previewText: f.modality === 'text' ? (f.editContent || (selected && selected.text) || appState.createBrief.message) : appState.createBrief.message,
      storyboard: selected && selected.storyboard ? selected.storyboard : '',
      rationale: selected && selected.rationale ? selected.rationale : '',
      proof: appState.createBrief.proof || '',
      cta: appState.createBrief.cta || '',
      appliedTone: appState.cfPrefs.tones.join(', '),
      appliedStyle: appState.cfPrefs.style,
      brandKitLocked: appState.cfPrefs.brandKitLock,
      controls: cfAppliedControlsSummary(f)
    });
    f.publishMode = mode; f.step = 8; renderContent();
  };
  window.cfReset = function () {
    appState.createFlow = {
      step: 1, modality: null, platform: null, format: null, aspect: '1:1', dims: '',
      generating: false, genPhase: 0, variation: null, editContent: '',
      published: false, publishMode: null, genStartedAt: null,
      campaignBannerDismissed: false
    };
    nav('create-flow');
  };
  window.cfOpenLibrary = function () { nav('library'); };
  window.cfOpenHistory = function () { nav('library'); };

  function cfStatusClass(status) {
    var map = { Draft: 'pill-muted', Published: 'pill-green', Scheduled: 'pill-indigo', 'In Campaign': 'pill-amber' };
    return map[status] || 'pill-muted';
  }
  function cfEnsureStats(item) {
    if (!item.stats) {
      var base = 0;
      for (var i = 0; i < item.id.length; i++) base += item.id.charCodeAt(i) * (i + 1);
      var seed = (base * 97) % 997;
      item.stats = {
        views: 1100 + seed * 7,
        likes: 70 + (seed % 280),
        comments: 4 + (seed % 38),
        shares: 2 + (seed % 22)
      };
    }
    return item.stats;
  }
  function cfFmtNum(n) {
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return '' + n;
  }
  var CF_STAT_ICON_VIEWS    = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 6c1.3-3 2.8-4 5-4s3.7 1 5 4c-1.3 3-2.8 4-5 4s-3.7-1-5-4z" stroke="currentColor" stroke-width="1.2"/><circle cx="6" cy="6" r="1.5" fill="currentColor"/></svg>';
  var CF_STAT_ICON_LIKES    = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 10S1 6.8 1 4a2.5 2.5 0 015 0 2.5 2.5 0 015 0c0 2.8-5 6-5 6z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>';
  var CF_STAT_ICON_COMMENTS = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="1" y="1.5" width="10" height="7" rx="1.5" stroke="currentColor" stroke-width="1.2"/><path d="M3 10.5l1.5-2.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>';
  function cfStatsRow(item, compact) {
    var s = cfEnsureStats(item);
    var cls = compact ? 'cf-lib-stats' : 'cf-lib-stats cf-lib-stats-lg';
    return '<div class="' + cls + '">'
      + '<span class="cf-lib-stat">' + CF_STAT_ICON_VIEWS    + ' ' + cfFmtNum(s.views) + '</span>'
      + '<span class="cf-lib-stat">' + CF_STAT_ICON_LIKES    + ' ' + cfFmtNum(s.likes) + '</span>'
      + '<span class="cf-lib-stat">' + CF_STAT_ICON_COMMENTS + ' ' + cfFmtNum(s.comments) + '</span>'
      + '<span class="cf-lib-stat">&#8618; ' + cfFmtNum(s.shares) + '</span>'
      + '</div>';
  }
  function cfFormatSchedule(dateStr, timeStr) {
    if (!dateStr) return '';
    var parts = dateStr.split('-');
    if (parts.length !== 3) return '';
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var label = months[parseInt(parts[1], 10) - 1] + ' ' + parseInt(parts[2], 10) + ', ' + parts[0];
    if (timeStr) {
      var tp = timeStr.split(':');
      var h = parseInt(tp[0], 10);
      var m = tp[1] || '00';
      var ampm = h >= 12 ? 'PM' : 'AM';
      var h12 = h % 12;
      if (h12 === 0) h12 = 12;
      label += ' \u00B7 ' + h12 + ':' + m + ' ' + ampm;
    }
    return label;
  }
  window.cfLibSetScheduleField = function (field, value) {
    if (!appState.cfLibScheduleDraft) appState.cfLibScheduleDraft = { date: '', time: '' };
    appState.cfLibScheduleDraft[field] = value;
  };
  function cfPrettyModality(mod) {
    return mod ? mod.charAt(0).toUpperCase() + mod.slice(1) : '';
  }
  function cfGetLibraryItem(id) {
    for (var i = 0; i < appState.createdItems.length; i++) if (appState.createdItems[i].id === id) return appState.createdItems[i];
    return null;
  }
  function cfLibraryCardThumb(item) {
    if (item.modality === 'image' && window.StudioImage && StudioImage.renderPreview) {
      return '<div class="cf-lib-thumb">' + StudioImage.renderPreview(item.theme || 'sourdough', item.aspect || '1:1', ' ', false) + '</div>';
    }
    if (item.modality === 'video') return '<div class="cf-lib-thumb cf-lib-thumb-video">▶ ' + item.format + '</div>';
    if (item.modality === 'audio') return '<div class="cf-lib-thumb cf-lib-thumb-audio">' + CF_ICON_MIC + ' ' + item.format + '</div>';
    return '<div class="cf-lib-thumb cf-lib-thumb-text">' + (item.previewText || '').substring(0, 92) + '</div>';
  }
  window.cfSetLibraryFilter = function (filter) {
    appState.cfLibraryFilter = filter;
    appState.cfLibrarySelectedId = null;
    renderContent();
  };
  window.cfOpenLibraryItem = function (id) {
    appState.cfLibrarySelectedId = id;
    renderContent();
  };
  window.cfCloseLibraryItem = function () {
    appState.cfLibrarySelectedId = null;
    renderContent();
  };
  window.cfLibraryAction = function (action, id) {
    var item = cfGetLibraryItem(id);
    if (!item) return;
    if (action === 'duplicate') {
      var copy = JSON.parse(JSON.stringify(item));
      copy.id = 'c' + Date.now();
      copy.title = item.title + ' (Copy)';
      copy.status = 'Draft';
      copy.date = 'Just now';
      appState.createdItems.unshift(copy);
      appState.cfLibrarySelectedId = copy.id;
      renderContent();
      return;
    }
    if (action === 'publish') {
      item.status = 'Published';
      item.date = 'Just now';
      cfEnsureStats(item);
      renderContent();
      return;
    }
    if (action === 'unpublish') {
      item.status = 'Draft';
      item.date = 'Just now';
      renderContent();
      return;
    }
    if (action === 'schedule') {
      var d = appState.cfLibScheduleDraft || {};
      item.status = 'Scheduled';
      item.date = cfFormatSchedule(d.date, d.time) || appState.cfScheduleTime;
      appState.cfLibScheduleDraft = { date: '', time: '' };
      renderContent();
      return;
    }
    if (action === 'open' || action === 'regenerate') {
      appState.createFlow = {
        /* Both go to step 5 (Generate/pick variation):
           'open' shows variations with one pre-selected so user can proceed to decision;
           'regenerate' starts with generating=true and no selection */
        step: 5,
        modality: item.modality,
        platform: item.platform,
        format: item.format,
        aspect: item.aspect || '1:1',
        dims: item.dims || '',
        generating: action === 'regenerate',
        genPhase: 0,
        variation: action === 'regenerate' ? null : 1,
        editContent: item.previewText || '',
        published: false,
        publishMode: null,
        genStartedAt: Date.now(),
        campaignBannerDismissed: false
      };
      nav('create-flow');
      if (action === 'regenerate') cfRunGeneration();
    }
  };

  function cfCampaignPromoBanner() {
    if (cfFlow().campaignBannerDismissed) return '';
    var brief = appState.createBrief;
    var name = brief.goal || 'this content';
    return '<div class="cf-campaign-promo">'
      + '<div class="cf-campaign-promo-left">'
      + '<div class="cf-campaign-promo-icon"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 12l4-5 3 2 5-8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M11 2h3v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></div>'
      + '<div class="cf-campaign-promo-text">'
      + '<div class="cf-campaign-promo-title">Want this across more platforms too? Turn this into a campaign.</div>'
      + '<div class="cf-campaign-promo-sub">Brief, persona &amp; objectives will carry over — just pick your platforms.</div>'
      + '</div></div>'
      + '<div class="cf-campaign-promo-actions">'
      + '<button class="btn btn-primary btn-sm" onclick="cfStartCampaignFromCreate()">Start a campaign with this</button>'
      + '<button class="cf-campaign-promo-dismiss" onclick="cfDismissCampaignBanner()" title="Dismiss">&#x2715;</button>'
      + '</div></div>';
  }

  window.cfDismissCampaignBanner = function () {
    cfFlow().campaignBannerDismissed = true;
    renderContent();
  };

  window.cfToggleSidebar = function () {
    appState.cfSidebarOpen = !appState.cfSidebarOpen;
    renderContent();
  };

  function cfProceedAfterIntel() {
    var f = cfFlow();
    if (f.step < 5) f.step = 5;
    f.generating = true;
    f.variation = null;
    f.genPhase = 0;
    f.genStartedAt = Date.now();
    renderContent();
    cfRunGeneration();
  }
  window.cfStartIntelligenceSetup = function () {
    cfLoadSampleIntelligence();
    cfProceedAfterIntel();
  };
  window.cfUseSampleIntelligence = function () {
    cfLoadSampleIntelligence();
    cfProceedAfterIntel();
  };
  window.cfLoadSampleIntelOnly = function () {
    cfLoadSampleIntelligence();
    renderContent();
  };

  window.cfStartCampaignFromCreate = function () {
    var brief = appState.createBrief;
    var f = cfFlow();
    var vars = f.modality === 'image' ? CF_IMAGE_VARS : f.modality === 'video' ? CF_VIDEO_VARS : f.modality === 'audio' ? CF_AUDIO_VARS : CF_TEXT_VARS;
    var v = f.variation !== null ? vars[f.variation] : vars[0];

    /* Build seed asset from the selected variation */
    var seedAsset = {
      id: 'seed-' + Date.now(),
      platform: f.platform || '',
      modality: f.modality || 'text',
      format: f.format || '',
      label: cfPrettyModality(f.modality) + (f.platform ? ' for ' + f.platform : ''),
      title: (brief.message || 'Generated content').substring(0, 72),
      content: f.modality === 'text' ? (f.editContent || (v && v.text) || brief.message || '') : (brief.message || ''),
      status: 'Ready',
      approved: true,
      scheduledDate: null,
      fromCreate: true,
      storyboard: v ? v.storyboard : '',
      rationale: v ? v.rationale : ''
    };

    /* Open campaign wizard in overlay mode, pre-filled from brief */
    CampaignFlow.openFromCreate({
      goal: brief.goal,
      objective: brief.goal,
      persona: brief.persona,
      message: brief.message,
      proof: brief.proof,
      cta: brief.cta,
      platform: f.platform || ''
    }, seedAsset);
  };

  function cfCanContinue() {
    var f = cfFlow();
    if (f.step === 1) return !!f.modality;
    if (f.step === 2) return !!f.platform;
    if (f.step === 3) return !!f.format;
    if (f.step === 5) return f.variation !== null && !f.generating;
    return true;
  }
  function cfContinueLabel() {
    var f = cfFlow();
    if (f.step === 4) return 'Generate';
    return 'Continue';
  }

  /* ── Real decision screen ────────────────────────────────── */
  function cfRenderDecisionScreen() {
    var f = cfFlow();
    var vars = f.modality === 'image' ? CF_IMAGE_VARS : f.modality === 'video' ? CF_VIDEO_VARS : f.modality === 'audio' ? CF_AUDIO_VARS : CF_TEXT_VARS;
    var v = f.variation !== null ? vars[f.variation] : vars[0];
    var pf = v ? v.pf : '—';
    var hasIntel = cfHasIntelligence();

    /* Small condensed preview of the selected variation */
    var preview = '';
    if (v) {
      var previewBody;
      if (f.modality === 'text') previewBody = '<div class="cf-dec-preview-text">' + (v.text || '').substring(0, 160).replace(/\n/g, ' ') + (v.text && v.text.length > 160 ? '…' : '') + '</div>';
      else if (f.modality === 'image') previewBody = cfImagePostMockup(v, f);
      else if (f.modality === 'video') previewBody = cfVideoThumbnailMockup(v, 0, f);
      else previewBody = '<div class="cf-dec-preview-text">' + v.title + ' · ' + v.dur + '</div>';
      preview = '<div class="cf-dec-preview">'
        + '<div class="cf-dec-preview-head">'
        + '<span style="font-size:12px;font-weight:600;">Variation ' + v.label + ' selected</span>'
        + (hasIntel ? '<span class="pf-chip pf-chip-sm ' + cfPfClass(pf) + '"><span class="pf-chip-dot"></span>' + pf + ' PF</span>' : '')
        + '</div>'
        + '<div class="cf-dec-preview-body">' + previewBody + '</div>'
        + '</div>';
    }

    /* Publish now action — expands inline date/time when clicked */
    var publishCard = f.decisionMode === 'publish'
      ? cfRenderPublishNowPanel()
      : '<div class="cf-dec-card" onclick="cfOpenDecisionPublish()">'
        + '<div class="cf-dec-card-accent cf-dec-accent-publish"></div>'
        + '<div class="cf-dec-card-body">'
        + '<div class="cf-dec-card-title">Publish now</div>'
        + '<div class="cf-dec-card-desc">Schedule a go-live time and publish directly from here.</div>'
        + '</div>'
        + '<div class="cf-dec-card-arrow">&#8250;</div>'
        + '</div>';

    var campaignCard = '<div class="cf-dec-card" onclick="cfStartCampaignFromCreate()">'
      + '<div class="cf-dec-card-accent cf-dec-accent-campaign"></div>'
      + '<div class="cf-dec-card-body">'
      + '<div class="cf-dec-card-title">Add to campaign</div>'
      + '<div class="cf-dec-card-desc">Extend this into a multi-platform campaign. Brief and assets carry over.</div>'
      + '</div>'
      + '<div class="cf-dec-card-arrow">&#8250;</div>'
      + '</div>';

    var draftCard = '<div class="cf-dec-card cf-dec-card-ghost" onclick="cfPublish(\'draft\')">'
      + '<div class="cf-dec-card-accent cf-dec-accent-draft"></div>'
      + '<div class="cf-dec-card-body">'
      + '<div class="cf-dec-card-title">Save as draft</div>'
      + '<div class="cf-dec-card-desc">Save to your library. Return to edit, schedule, or publish at any time.</div>'
      + '</div>'
      + '</div>';

    return '<div class="cf-screen">'
      + '<div class="cf-topbar">'
      + '<button class="app-topbar-back" onclick="cfConfirmExitWizard()">&#8592; Back to home</button>'
      + '<div class="cf-brand">Clarity</div>'
      + '<div class="cf-topbar-right"></div></div>'
      + '<div class="cf-main cf-decision-wrap">'
      + '<div class="cf-decision">'
      + preview
      + '<div class="cf-dec-heading">How would you like to proceed with this ' + cfPrettyModality(f.modality) + '?</div>'
      + '<div class="cf-dec-cards">'
      + publishCard
      + campaignCard
      + draftCard
      + '</div>'
      + '<button class="btn btn-ghost btn-sm" style="margin-top:20px;" onclick="cfBack()">&#8592; Back to variations</button>'
      + '</div></div></div>';
  }

  function cfRenderPublishNowPanel() {
    var f = cfFlow();
    var now = new Date();
    var pad = function(n) { return String(n).padStart(2,'0'); };
    var defaultDate = now.getFullYear() + '-' + pad(now.getMonth()+1) + '-' + pad(now.getDate());
    var defaultTime = pad(now.getHours()) + ':' + pad(now.getMinutes());
    return '<div class="cf-dec-card cf-dec-card-expanded">'
      + '<div class="cf-dec-card-accent cf-dec-accent-publish"></div>'
      + '<div class="cf-dec-card-body">'
      + '<div class="cf-dec-card-title">Confirm publish time</div>'
      + '<div style="display:flex;gap:10px;margin:14px 0 16px;">'
      + '<div class="cf-field" style="flex:1;"><label>Date</label><input type="date" id="cf-pub-date" value="' + (f.publishDate || defaultDate) + '" onchange="appState.createFlow.publishDate=this.value"></div>'
      + '<div class="cf-field" style="flex:1;"><label>Time</label><input type="time" id="cf-pub-time" value="' + (f.publishTime || defaultTime) + '" onchange="appState.createFlow.publishTime=this.value"></div>'
      + '</div>'
      + '<div style="display:flex;gap:8px;">'
      + '<button class="btn btn-primary cf-pub-btn-expand" onclick="cfConfirmPublishNow()">Publish</button>'
      + '<button class="btn btn-outline" onclick="cfCloseDecisionPublish()">Cancel</button>'
      + '</div>'
      + '</div></div>';
  }

  window.cfOpenDecisionPublish = function() { cfFlow().decisionMode = 'publish'; renderContent(); };
  window.cfCloseDecisionPublish = function() { cfFlow().decisionMode = null; renderContent(); };
  window.cfConfirmPublishNow = function() {
    var f = cfFlow();
    var date = f.publishDate || '';
    var time = f.publishTime || '';
    var label = date && time ? date + ' at ' + time : 'Now';
    appState.cfScheduleTime = label;
    cfPublish('now');
  };
  window.cfOverlayBackdropClick = function(e) {
    if (e.target === e.currentTarget) window.campaignCloseOverlay && window.campaignCloseOverlay();
  };

  /* ── Campaign overlay container ─────────────────────────── */
  function cfRenderCampaignOverlay() {
    return '<div class="cf-camp-overlay-backdrop" onclick="cfOverlayBackdropClick(event)">'
      + '<div class="cf-camp-overlay-panel">'
      + '<div class="cf-camp-overlay-body">' + screenCampaign() + '</div>'
      + '</div></div>';
  }

  /* Exit confirmation — called when user hits Back to home from mid-wizard */
  window.cfConfirmExitWizard = function () {
    var f = cfFlow();
    /* If nothing meaningful has been entered yet, exit silently */
    if (f.step <= 1 && !f.modality) { setMode('home'); return; }
    showConfirmModal({
      title: 'Leave this draft?',
      body: 'Your progress on this content won\'t be saved. You can always start a new one from the home screen.',
      cancelLabel: 'Keep editing',
      confirmLabel: 'Discard &amp; exit',
      onConfirm: function () {
        appState.createFlow.step = 1;
        appState.createFlow.modality = null;
        appState.createFlow.platform = null;
        appState.createFlow.format = null;
        appState.createFlow.generating = false;
        appState.createFlow.variation = null;
        setMode('home');
      }
    });
  };

  function screenCreateFlow() {
    var f = cfFlow();

    /* Success screen (step 8 — after decision/publish) */
    if (f.step === 8) {
      return '<div class="cf-screen">'
        + '<div class="cf-topbar">'
        + '<button class="app-topbar-back" onclick="setMode(\'home\')">&#8592; Back to home</button>'
        + '<div class="cf-brand">Clarity</div>'
        + '<div class="cf-topbar-right"></div></div>'
        + '<div class="cf-main cf-success-wrap">' + cfStepSuccess() + '</div></div>';
    }

    /* Decision screen (step 6) + optional campaign overlay on top */
    if (f.step === 6) {
      var decisionHtml = cfRenderDecisionScreen();
      if (appState.cpOverlayOpen) {
        /* Concatenate overlay AFTER the decision screen — it is position:fixed so DOM position is irrelevant */
        return decisionHtml + cfRenderCampaignOverlay();
      }
      return decisionHtml;
    }

    /* Active wizard steps 1–5 */
    var content = f.step === 1 ? cfStepModality()
      : f.step === 2 ? cfStepPlatform()
      : f.step === 3 ? cfStepFormat()
      : f.step === 4 ? cfStepBrief()
      : cfStepGenerate();

    /* At step 5 (post-generation, picking a variation): clicking a card IS the continue action.
       Replace the Continue button with a passive hint so the footer stays visually balanced. */
    var continueSlot = (f.step === 5 && !f.generating)
      ? '<span class="cf-step5-pick-hint">Select a variation to continue</span>'
      : '<button class="btn btn-primary"' + (cfCanContinue() ? '' : ' disabled') + ' onclick="cfContinue()">' + cfContinueLabel() + '</button>';

    var footer = '<div class="cf-footer">'
      + '<button class="btn btn-outline"' + (f.step <= 1 ? ' disabled' : '') + ' onclick="cfBack()">← Back</button>'
      + '<div class="cf-footer-mid"><span class="cf-eta">Step ' + f.step + ' of ' + CF_STEPS.length + ' &mdash; ' + CF_STEPS[f.step - 1] + '</span></div>'
      + continueSlot
      + '</div>';

    return '<div class="cf-screen">'
      + '<div class="cf-topbar">'
      + '<button class="app-topbar-back" onclick="cfConfirmExitWizard()">&#8592; Back to home</button>'
      + '<div class="cf-brand">Clarity</div>'
      + '</div>'
      + '<div class="cf-body' + (appState.cfSidebarOpen ? '' : ' cf-sidebar-collapsed') + '">'
      + '<div class="cf-main">' + cfStepper() + content + '</div>'
      + cfIntelRail()
      + '</div>'
      + footer + cfRenderPrefDrawer() + '</div>';
  }

  function cfLibrarySchedulePanel(item) {
    var d = appState.cfLibScheduleDraft || { date: '', time: '' };
    return '<div class="cf-lib-schedule">'
      + '<div class="cf-lib-schedule-title">' + (item.status === 'Scheduled' ? 'Reschedule or publish now' : 'Publish or schedule this asset') + '</div>'
      + (item.status === 'Scheduled' ? '<div class="cf-lib-schedule-current">Currently scheduled for <strong>' + item.date + '</strong></div>' : '')
      + '<div class="cf-lib-schedule-row">'
      + '<div class="cf-field"><label>Date</label><input type="date" value="' + (d.date || '') + '" onchange="cfLibSetScheduleField(\'date\',this.value)"></div>'
      + '<div class="cf-field"><label>Time</label><input type="time" value="' + (d.time || '') + '" onchange="cfLibSetScheduleField(\'time\',this.value)"></div>'
      + '</div>'
      + '<div class="cf-lib-schedule-actions">'
      + '<button class="btn btn-primary btn-sm" onclick="cfLibraryAction(\'publish\',\'' + item.id + '\')">Publish now</button>'
      + '<button class="btn btn-outline btn-sm" onclick="cfLibraryAction(\'schedule\',\'' + item.id + '\')">Schedule</button>'
      + '</div></div>';
  }
  function cfLibraryDetail(item) {
    if (!item) return '';
    var isPublished = item.status === 'Published';
    return '<div class="cf-lib-overlay" onclick="cfCloseLibraryItem()"></div>'
      + '<div class="cf-lib-drawer">'
      + '<div class="cf-lib-drawer-head"><div><div class="label">Asset details</div><div class="cf-lib-title">' + item.title + '</div></div><span class="modal-close" onclick="cfCloseLibraryItem()">&#x2715;</span></div>'
      + '<div class="cf-lib-drawer-body">'
      + '<div class="cf-lib-meta-row"><span class="pill ' + cfStatusClass(item.status) + '">' + item.status + '</span><span class="pf-chip green"><span class="pf-chip-dot"></span>' + item.pf + ' PF</span><span class="pill pill-muted">' + item.platform + ' · ' + item.format + '</span></div>'
      + cfLibraryCardThumb(item)
      + (isPublished
        ? '<div class="cf-lib-perf"><div class="label">Performance</div>' + cfStatsRow(item, false) + '</div>'
        : cfLibrarySchedulePanel(item))
      + '<div class="cf-lib-preview"><div class="label">Preview</div><p>' + (item.previewText || item.title || appState.createBrief.message) + '</p></div>'
      + (item.storyboard ? '<div class="cf-storyboard"><div class="cf-storyboard-label">Storyboard</div><div class="cf-storyboard-text">' + item.storyboard + '</div></div>' : '')
      + (item.rationale ? '<div class="cf-rationale" style="margin-top:8px;"><span>Why</span>' + item.rationale + '</div>' : '')
      + (item.proof ? '<div class="cf-lib-kv"><span>Proof point</span><span>' + item.proof + '</span></div>' : '')
      + (item.cta ? '<div class="cf-lib-kv"><span>CTA</span><span>' + item.cta + '</span></div>' : '')
      + '<div class="cf-lib-kv"><span>Channel</span><span>' + item.platform + '</span></div>'
      + '<div class="cf-lib-kv"><span>Type</span><span>' + cfPrettyModality(item.modality) + '</span></div>'
      + '<div class="cf-lib-kv"><span>Campaign</span><span>' + (item.campaign || 'None') + '</span></div>'
      + (item.appliedTone ? '<div class="cf-lib-kv"><span>Applied tone</span><span>' + item.appliedTone + (item.brandKitLocked ? ' · Brand kit locked' : '') + '</span></div>' : '')
      + (item.controls ? '<div class="cf-lib-kv"><span>Controls</span><span>' + item.controls + '</span></div>' : '')
      + '<div class="cf-lib-kv"><span>Last update</span><span>' + item.date + '</span></div>'
      + '</div>'
      + '</div>'
      + '</div>';
  }

  function screenLibrary() {
    var items = appState.createdItems;
    var filter = appState.cfLibraryFilter || 'all';
    var filtered = items.filter(function (it) { return filter === 'all' || it.modality === filter; });
    var cards = filtered.map(function (it) {
      return '<div class="cf-history-card" onclick="cfOpenLibraryItem(\'' + it.id + '\')"><div class="cf-feed-tag">' + cfPrettyModality(it.modality) + ' · ' + it.platform + '</div>'
        + cfLibraryCardThumb(it)
        + '<div style="font-size:14px;font-weight:600;margin:8px 0;line-height:1.4;">' + it.title + '</div>'
        + '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:8px;">'
        + '<span class="pill ' + cfStatusClass(it.status) + '">' + it.status + '</span>'
        + '<span class="pf-chip green"><span class="pf-chip-dot"></span>' + it.pf + ' PF</span>'
        + '<span class="pill pill-muted">' + it.date + '</span>'
        + '</div>'
        + (it.status === 'Published' ? cfStatsRow(it, true) : '')
        + '</div>';
    }).join('');
    var detail = appState.cfLibrarySelectedId ? cfLibraryDetail(cfGetLibraryItem(appState.cfLibrarySelectedId)) : '';
    return '<div class="screen"><div style="margin-bottom:18px;">'
      + '<h1 class="screen-title">Library</h1><p class="screen-sub">All generated assets, reusable any time</p></div>'
      + '<div class="cf-lib-filters">'
      + ['all', 'text', 'image', 'video', 'audio'].map(function (mod) {
          return '<span class="format-chip' + (filter === mod ? ' active' : '') + '" onclick="cfSetLibraryFilter(\'' + mod + '\')">' + (mod === 'all' ? 'All' : cfPrettyModality(mod)) + '</span>';
        }).join('')
      + '</div>'
      + (items.length ? (filtered.length ? '<div class="cf-history-grid">' + cards + '</div>' : '<div class="cf-history-empty">No assets match this filter.</div>')
        : '<div class="cf-history-empty">No assets yet.<br><br><button class="btn btn-primary" onclick="cfReset()">Start creating →</button></div>')
      + detail + '</div>';
  }

  return { init: init, screenCreateFlow: screenCreateFlow, screenHistory: screenLibrary, screenLibrary: screenLibrary };
})();

window.screenCreateFlow = function () { return CreateFlow.screenCreateFlow(); };
window.screenHistory = function () { return CreateFlow.screenHistory(); };
window.screenLibrary = function () { return CreateFlow.screenLibrary(); };
