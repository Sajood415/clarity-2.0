/* Campaign flow (SMB Launchpad style) */
var CampaignFlow = (function () {
  var CP_STEPS = ['Goal & Timing', 'Platforms', 'Series', 'Asset Mix', 'Brief', 'Generate', 'Edit', 'Publish'];
  var CP_SERIES_PATTERNS = ['Custom', 'Awareness Drip', 'Launch Countdown', 'Last Call'];
  var CP_OBJECTIVES = ['Awareness', 'Launch', 'Re-engagement', 'Promotion', 'Community'];
  var CP_ICON_INSTAGRAM = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="3" width="14" height="12" rx="3" stroke="currentColor" stroke-width="1.5"/><circle cx="9" cy="9" r="2.5" stroke="currentColor" stroke-width="1.5"/><circle cx="13" cy="5.5" r="1" fill="currentColor"/></svg>';
  var CP_PLATFORMS = [
    { id: 'LinkedIn', icon: 'in', desc: 'B2B reach' },
    { id: 'Instagram', icon: CP_ICON_INSTAGRAM, desc: 'Visual + stories' },
    { id: 'Facebook', icon: 'f', desc: 'Broad local audience' },
    { id: 'Email', icon: '&#9993;', desc: 'Owned audience' },
    { id: 'X', icon: '𝕏', desc: 'Real-time updates' },
    { id: 'YouTube', icon: '&#9654;', desc: 'Long + short video' }
  ];
  var CP_BUNDLE_RULES = {
    LinkedIn:  [{ key: 'li-post',  label: 'LinkedIn posts',         count: 3, modality: 'text'  }],
    Instagram: [{ key: 'ig-image', label: 'Instagram hero images',  count: 1, modality: 'image' },
                { key: 'ig-story', label: 'Instagram stories',      count: 2, modality: 'image' }],
    Facebook:  [{ key: 'fb-post',  label: 'Facebook posts',         count: 2, modality: 'text'  }],
    Email:     [{ key: 'email',    label: 'Emails',                 count: 2, modality: 'text'  }],
    X:         [{ key: 'x-post',   label: 'X posts',                count: 4, modality: 'text'  }],
    YouTube:   [{ key: 'yt-video', label: 'YouTube videos',         count: 1, modality: 'video' }]
  };
  var CP_PLATFORM_META = {
    LinkedIn:  { color: '#0077b5', icon: 'in' },
    Instagram: { color: '#e1306c', icon: '&#9679;' },
    Facebook:  { color: '#1877f2', icon: 'f' },
    X:         { color: '#1d9bf0', icon: '&#10005;' },
    Email:     { color: '#d4a853', icon: '&#9993;' },
    YouTube:   { color: '#ff0000', icon: '&#9654;' }
  };
  var _claraTimer = null;
  var _cpLiveInterval = null;
  var _cpLiveStats = {};

  function cpInitLiveStat(id) {
    if (!_cpLiveStats[id]) {
      _cpLiveStats[id] = {
        views: 180 + Math.floor(Math.random() * 140),
        comments: 6 + Math.floor(Math.random() * 18),
        reactions: 24 + Math.floor(Math.random() * 60)
      };
    }
  }
  var CP_STAT_ICON_VIEWS    = '<svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M1 6c1.3-3 2.8-4 5-4s3.7 1 5 4c-1.3 3-2.8 4-5 4s-3.7-1-5-4z" stroke="currentColor" stroke-width="1.2"/><circle cx="6" cy="6" r="1.5" fill="currentColor"/></svg>';
  var CP_STAT_ICON_COMMENTS = '<svg width="11" height="11" viewBox="0 0 12 12" fill="none"><rect x="1" y="1.5" width="10" height="7" rx="1.5" stroke="currentColor" stroke-width="1.2"/><path d="M3 10.5l1.5-2.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>';
  var CP_STAT_ICON_LIKES    = '<svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M6 10S1 6.8 1 4a2.5 2.5 0 015 0 2.5 2.5 0 015 0c0 2.8-5 6-5 6z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>';
  function cpLiveStatInner(id) {
    var s = _cpLiveStats[id];
    if (!s) return '<span class="cp-live-metric">\u2014</span>';
    return '<span class="cp-live-metric">' + CP_STAT_ICON_VIEWS + ' ' + s.views + ' views</span>'
      + '<span class="cp-live-metric">' + CP_STAT_ICON_COMMENTS + ' ' + s.comments + ' comments</span>'
      + '<span class="cp-live-metric">' + CP_STAT_ICON_LIKES + ' ' + s.reactions + ' reactions</span>';
  }
  function cpStartLiveInterval() {
    if (_cpLiveInterval) return;
    _cpLiveInterval = setInterval(function () {
      if (appState.screen !== 'campaign') {
        clearInterval(_cpLiveInterval);
        _cpLiveInterval = null;
        return;
      }
      var all = (appState.campaigns || []).concat(CP_SAMPLE_CAMPAIGNS);
      all.forEach(function (c) {
        if (cpCampaignStatusForCard(c) !== 'Live') return;
        cpInitLiveStat(c.id);
        var s = _cpLiveStats[c.id];
        s.views += Math.floor(Math.random() * 7) + 1;
        if (Math.random() < 0.55) s.comments += Math.floor(Math.random() * 2) + 1;
        if (Math.random() < 0.65) s.reactions += Math.floor(Math.random() * 3) + 1;
        var el = document.getElementById('cp-live-stat-' + c.id);
        if (el) el.innerHTML = cpLiveStatInner(c.id);
      });
    }, 3000);
  }

  function cpSeedSampleAssets(platforms, startDate, message, allApproved, limits) {
    var assets = [];
    var seqMap = {};
    var day = 0;
    limits = limits || {};
    platforms.forEach(function (platform) {
      var defs = CP_BUNDLE_RULES[platform] || [{ key: 'generic', label: platform + ' assets', count: 2 }];
      defs.forEach(function (d) {
        var max = limits[platform + ':' + d.key];
        var count = typeof max === 'number' ? max : d.count;
        for (var i = 1; i <= count; i++) {
          var sk = platform + '|' + d.label;
          seqMap[sk] = (seqMap[sk] || 0) + 1;
          var approved = allApproved !== false ? true : assets.length % 3 !== 0;
          assets.push({
            id: 'sample-' + platform + '-' + d.key + '-' + i,
            platform: platform,
            label: d.label,
            seq: seqMap[sk],
            title: message.substring(0, 72),
            content: message,
            status: approved ? 'Ready' : 'Needs edit',
            approved: approved,
            scheduledDate: approved ? cpAddDays(startDate, day++) : null
          });
        }
      });
    });
    return assets;
  }

  var CP_SAMPLE_CAMPAIGNS = [
    {
      id: 'sample-summer-launch',
      name: 'Summer Launch Sprint',
      goal: 'Launch',
      startDate: '2026-06-18', startTime: '09:00',
      endDate: '2026-07-14', endTime: '17:00',
      status: 'Live',
      isSample: true,
      platforms: ['LinkedIn', 'Instagram', 'Email', 'X'],
      brief: {
        shared: {
          objective: 'Drive pre-orders for the summer sourdough line',
          persona: 'Maya Holloway — local food enthusiast, 28–45',
          message: 'Our summer sourdough drop is here — 72-hour cold ferment, local flour, limited 120-loaf batch.',
          proof: '4.9★ from 200+ local reviews · sold out in 4 hours last drop',
          cta: 'Pre-order now — closes Friday at 6 PM'
        }
      },
      assets: cpSeedSampleAssets(
        ['LinkedIn', 'Instagram', 'Email', 'X'],
        '2026-07-01',
        'Our summer sourdough drop is here — 72-hour cold ferment, local flour, limited 120-loaf batch.',
        true
      )
    },
    {
      id: 'sample-weekend-reengage',
      name: 'Weekend Re-engagement Push',
      goal: 'Re-engagement',
      startDate: '2026-07-20', startTime: '08:00',
      endDate: '2026-07-31', endTime: '20:00',
      status: 'Draft',
      isSample: true,
      platforms: ['Facebook', 'Instagram', 'Email', 'X'],
      brief: {
        shared: {
          objective: 'Win back lapsed weekend shoppers with a limited offer',
          persona: 'Weekend regulars who have not ordered in 30+ days',
          message: 'We miss you at the counter — come back this weekend for 15% off your favorite loaf.',
          proof: 'Last month 340 customers returned with this offer',
          cta: 'Show this post at checkout · valid Sat–Sun only'
        }
      },
      assets: cpSeedSampleAssets(
        ['Facebook', 'Instagram', 'Email', 'X'],
        '2026-07-20',
        'We miss you at the counter — come back this weekend for 15% off your favorite loaf.',
        false,
        { 'X:x-post': 1 }
      )
    },
    {
      id: 'sample-bakery-stories',
      name: 'Bakery Community Stories',
      goal: 'Community',
      startDate: '2026-08-03', startTime: '10:00',
      endDate: '2026-08-18', endTime: '18:00',
      status: 'Live',
      isSample: true,
      platforms: ['Instagram', 'Facebook', 'YouTube', 'LinkedIn', 'X'],
      brief: {
        shared: {
          objective: 'Highlight local suppliers and behind-the-scenes craft',
          persona: 'Neighborhood followers who value local sourcing',
          message: 'Meet the farmers behind our flour — a short series on the people who make every loaf possible.',
          proof: '3-part story arc · 12k combined views on pilot episode',
          cta: 'Follow for episode 2 dropping Thursday'
        }
      },
      assets: cpSeedSampleAssets(
        ['Instagram', 'Facebook', 'YouTube', 'LinkedIn', 'X'],
        '2026-08-03',
        'Meet the farmers behind our flour — a short series on the people who make every loaf possible.',
        true,
        { 'X:x-post': 1 }
      )
    }
  ];
  CP_SAMPLE_CAMPAIGNS.forEach(function (c) { c.totalAssets = c.assets.length; });

  var CP_SAMPLE_INTELLIGENCE = {
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

  function cpHasIntelligence() {
    var intel = appState.intelligence;
    if (!intel) return false;
    if (!intel.persona || !intel.persona.name) return false;
    if (!intel.market || !intel.market.whiteSpace) return false;
    if (!intel.consumer || !intel.consumer.trigger) return false;
    return true;
  }
  function cpSampleIntelligence() {
    return JSON.parse(JSON.stringify(CP_SAMPLE_INTELLIGENCE));
  }
  function cpBriefFromIntelligence(state) {
    var intel = state.intelligence || {};
    var baseBrief = state.createBrief || {};
    var concept = window.clarityActiveConcept ? window.clarityActiveConcept() : null;
    var cp = (concept && concept.persona) || {};
    var cs = (concept && concept.strategy) || {};
    var cg = (concept && concept.gtm) || {};
    var caresAbout = (cp.caresAbout && cp.caresAbout.length) ? cp.caresAbout : [];

    var persona = intel.persona || {};
    var personaLabel = persona.name
      ? persona.name + (persona.seg ? ' \u2014 ' + persona.seg : '')
      : (cp.name && cp.name.trim())
        ? cp.name.trim()
        : (baseBrief.persona || 'Your customer');

    var gapHeadline = (intel.market && intel.market.gap) || (cs.marketScan && cs.marketScan.gapHeadline) || '';
    var firstAction = (cg.plan && cg.plan.actions && cg.plan.actions.length && cg.plan.actions[0] && cg.plan.actions[0].title)
      ? cg.plan.actions[0].title : '';

    return {
      objective: baseBrief.goal || firstAction || 'Grow my customer base',
      persona: personaLabel,
      message: baseBrief.message || gapHeadline || '',
      proof: baseBrief.proof || (caresAbout.length ? 'Your customer cares about ' + caresAbout.slice(0, 2).join(' and ') : '') || gapHeadline || '',
      cta: baseBrief.cta || firstAction || ''
    };
  }
  function cpIntelHandoffCards(intel, brief, objective) {
    var i = intel || {};
    var persona = i.persona && i.persona.name ? i.persona : null;
    var market = i.market && i.market.whiteSpace ? i.market : null;
    var consumer = i.consumer && i.consumer.trigger ? i.consumer : null;
    var filled = (persona ? 1 : 0) + (market ? 1 : 0) + (consumer ? 1 : 0);

    var badge = filled === 3
      ? '<span class="pill pill-green">Intelligence Synced ✓</span>'
      : filled > 0
        ? '<span class="pill pill-amber">' + filled + ' of 3 sections filled</span>'
        : '<span class="pill pill-muted">No intelligence yet</span>';

    var title = filled === 3
      ? 'Everything is ready — plan this campaign'
      : 'Add research context to sharpen generation';

    function ph(section, label, generateFn) {
      return '<div class="cf-handoff-item cp-intel-ph">'
        + '<span>' + label + '</span>'
        + '<div class="cp-intel-ph-empty">No ' + section + ' data yet</div>'
        + '<button class="btn btn-outline btn-sm cp-intel-ph-btn" onclick="' + generateFn + '()">Generate this now</button>'
        + '</div>';
    }

    var personaCard = persona
      ? '<div class="cf-handoff-item"><span>Persona locked</span><strong>' + persona.name + '</strong><em>' + persona.seg + '</em></div>'
      : ph('persona', 'Persona', 'campaignGeneratePersona');

    var marketCard = market
      ? '<div class="cf-handoff-item"><span>Market signal</span><strong>' + market.whiteSpace + '</strong><em>' + market.gap + '</em></div>'
      : ph('market', 'Market signal', 'campaignGenerateMarket');

    var consumerCard = consumer
      ? '<div class="cf-handoff-item"><span>Consumer trigger</span><strong>' + consumer.trigger + '</strong><em>Campaign goal: ' + (objective || (brief && brief.goal) || 'Not set') + '</em></div>'
      : ph('consumer', 'Consumer trigger', 'campaignGenerateConsumer');

    return '<div class="cf-handoff">'
      + '<div class="cf-handoff-head">'
      + '<div><div class="cf-handoff-eyebrow">R&amp;D and strategy</div><div class="cf-handoff-title">' + title + '</div></div>'
      + badge
      + '</div>'
      + '<div class="cf-handoff-grid">' + personaCard + marketCard + consumerCard + '</div>'
      + (filled === 3
        ? '<div class="cf-handoff-foot">'
          + '<span class="pill pill-muted">Strategy synced to campaign</span>'
          + '<span class="pill pill-muted">Persona applied across channels</span>'
          + '<span class="pill pill-muted">Brief pre-seeded from research</span>'
          + '</div>'
        : '')
      + '</div>';
  }
  function cpApplyBriefFromIntelligence() {
    cpFlow().brief.shared = cpBriefFromIntelligence(appState);
  }

  function cpFlow() { return appState.campaignFlow; }
  /* Exposed on window so inline HTML event attributes (which evaluate in the
     global scope) can reach it — the two <input type="date"> onchange handlers
     in the publish page rely on this. */
  window.cpFlow = cpFlow;
  function cpTodayStr() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + day;
  }
  function cpAddDays(dateStr, days) {
    var d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) d = new Date(cpTodayStr() + 'T00:00:00');
    d.setDate(d.getDate() + days);
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + day;
  }
  function cpFmtDate(dateStr) {
    if (!dateStr) return 'No date';
    var d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return dateStr;
    var mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()];
    return mon + ' ' + d.getDate() + ', ' + d.getFullYear();
  }
  function cpFmtTime(t) {
    if (!t) return '';
    var parts = t.split(':');
    var h = parseInt(parts[0], 10), m = parts[1] || '00';
    var ampm = h >= 12 ? 'PM' : 'AM';
    var h12 = h % 12 || 12;
    return h12 + ':' + m + ' ' + ampm;
  }
  function cpFreshSeries(name) {
    return {
      id: 'series-' + Date.now() + '-' + Math.floor(Math.random() * 9999),
      name: name || '',
      pattern: 'Custom',
      assetMix: [],
      briefOverride: null,
      autoNamed: true,
      mixUserEdited: false,   // true once user changes any count/removes any card
      removedPlatforms: {}    // keyed by platform id → array of saved mix items
    };
  }
  function cpFreshFlow(state) {
    var concept = window.clarityActiveConcept ? window.clarityActiveConcept() : null;
    var cBiz = (concept && concept.business) || {};
    var defaultName = (cBiz.name && cBiz.name.trim()) ? cBiz.name.trim() + ' Campaign' : 'Summer Launch Sprint';
    return {
      step: 1,
      name: defaultName,
      objective: 'Launch',
      startDate: '2026-07-01', startTime: '09:00',
      endDate: '2026-07-14', endTime: '17:00',
      platforms: [],
      series: [cpFreshSeries(defaultName)],
      activeSeriesIdx: 0,
      mixInitialized: false,
      claraThinking: false,
      claraSuggested: false,
      intelBannerPending: false,
      /* Series step is skipped for single-series campaigns unless the user
         has explicitly visited it (via "Add another series" on Asset Mix). */
      seriesStepVisited: false,
      /* Campaign brief edit-mode toggle — when a from-create flow enters the
         brief step it's shown read-only. User clicks "Edit brief" to open. */
      briefEditMode: false,
      /* Asset Mix has been reached at least once — used to gate when the
         "Add another series" link becomes visible for from-create flows.
         `assetMixVisitedOnce` marks the first arrival, `assetMixVisited`
         flips to true on the second+ arrival. Standalone flows use only
         `assetMixVisited` (set immediately on first arrival). */
      assetMixVisited: false,
      assetMixVisitedOnce: false,
      brief: {
        shared: cpBriefFromIntelligence(state),
        overrides: {}
      },
      batchGenerating: false,
      batchDone: 0,
      batchTotal: 0,
      batchSeriesProgress: {},
      generatedAssets: [],
      editingAssetId: null,
      editDraft: null
    };
  }
  function init(state) {
    if (!state.campaigns) state.campaigns = [];
    state.campaignUI = { mode: 'home', selectedId: null, scheduleExpanded: false };
    if (typeof state.cpSidebarOpen === 'undefined') state.cpSidebarOpen = false;
    state.campaignFlow = cpFreshFlow(state);
  }

  function cpDefaultMixCards(platform) {
    var defs = CP_BUNDLE_RULES[platform] || [{ key: 'generic', label: platform + ' assets', count: 2, modality: 'text' }];
    return defs.map(function (d) {
      return {
        id: platform + '-' + d.key,
        platform: platform,
        label: d.label,
        count: d.count,
        modality: d.modality || 'text'
      };
    });
  }

  function cpEnsureDefaultMix() {
    var f = cpFlow();
    if (!f.platforms.length) {
      f.series.forEach(function (s) { s.assetMix = []; });
      return;
    }
    if (!f.mixInitialized) {
      f.series.forEach(function (s) {
        var seeded = [];
        f.platforms.forEach(function (p) { seeded = seeded.concat(cpDefaultMixCards(p)); });
        s.assetMix = seeded;
      });
      f.mixInitialized = true;
    }
  }

  function cpClaraAutoFill() {
    var f = cpFlow();
    f.claraThinking = false;
    var text = ((f.name || '') + ' ' + (f.objective || '')).toLowerCase();

    var platforms, heavierMix;
    if (/launch|product/.test(text)) {
      platforms = ['LinkedIn', 'Email', 'Instagram'];
      heavierMix = true;
    } else if (/awareness|brand/.test(text)) {
      platforms = ['LinkedIn', 'X'];
      heavierMix = false;
    } else if (/sale|promo/.test(text)) {
      platforms = ['Instagram', 'Facebook', 'Email'];
      heavierMix = false;
    } else {
      f.claraSuggested = false;
      return;
    }

    f.platforms = platforms.slice();
    f.mixInitialized = true;

    f.series.forEach(function (s) {
      // Never clobber a series the user has manually edited.
      if (s.mixUserEdited) return;
      s.assetMix = [];
      platforms.forEach(function (p) {
        var cards = cpDefaultMixCards(p);
        if (heavierMix) {
          cards = cards.map(function (c) {
            return { id: c.id, platform: c.platform, label: c.label, count: c.count + 2 };
          });
        }
        s.assetMix = s.assetMix.concat(cards);
      });
    });

    platforms.forEach(function (p) {
      if (!f.brief.overrides[p]) {
        f.brief.overrides[p] = { expanded: false, fields: {} };
      }
    });

    f.claraSuggested = true;
  }

  function cpStepper() {
    var f = cpFlow();
    var step = f.step;
    /* When Series is being skipped this session, render its dot as skipped
       (dimmed, no number) so the user sees the step exists but was bypassed. */
    var seriesSkipped = f.series && f.series.length <= 1 && !f.seriesStepVisited;
    var html = '<div class="cf-stepper-wrap"><div class="wizard-steps">';
    CP_STEPS.forEach(function (label, i) {
      var n = i + 1;
      var isSeriesStep = (n === 3);
      var isSkipped = isSeriesStep && seriesSkipped;
      var cls;
      if (isSkipped) cls = 'skipped';
      else if (n < step) cls = 'done';
      else if (n === step) cls = 'active';
      else cls = 'pending';
      var dotLabel = isSkipped ? '\u2014' : (n < step ? '\u2713' : n);
      html += '<div class="wizard-step" style="flex-direction:column;align-items:center;">'
        + '<div class="wiz-dot ' + cls + '">' + dotLabel + '</div>'
        + '<div class="wiz-label' + (isSkipped ? ' wiz-label-skipped' : '') + '">' + label + '</div></div>';
      if (i < CP_STEPS.length - 1) {
        html += '<div class="wiz-line' + (n < step ? ' done' : '') + '"></div>';
      }
    });
    /* Honest "Step X of Y" indicator — Y reflects the actual number of steps
       this user will pass through, not the total possible. Also lets the user
       see the objective is inherited by mentioning it in the light copy. */
    var totalSteps = seriesSkipped ? CP_STEPS.length - 1 : CP_STEPS.length;
    /* Convert internal step to displayed position (subtract 1 if we're past
       the skipped Series step). */
    var displayedStep = step;
    if (seriesSkipped && step > 3) displayedStep = step - 1;
    if (seriesSkipped && step === 3) displayedStep = 3; /* only happens once user reveals it */
    var concept = window.clarityActiveConcept ? window.clarityActiveConcept() : null;
    var objectiveInherited = !!(concept && concept.gtmComplete && concept.gtm && concept.gtm.plan
      && concept.gtm.plan.actions && concept.gtm.plan.actions[0]);
    var progressNote = 'Step ' + displayedStep + ' of ' + totalSteps;
    if (objectiveInherited && step === 1) {
      progressNote += ' \u00b7 objective inherited from your GTM strategy';
    } else if (seriesSkipped) {
      progressNote += ' \u00b7 series step skipped for single-series campaign';
    }
    html += '</div>'
      + '<div class="cp-stepper-progress-note">' + progressNote + '</div>'
      + '</div>';
    return html;
  }

  function cpStepGoalTiming() {
    var f = cpFlow();
    var claraIndicator = '';
    if (f.claraThinking) {
      claraIndicator = '<div class="clara-thinking"><span class="clara-thinking-dot"></span>Clara is thinking\u2026</div>';
    } else if (f.claraSuggested) {
      claraIndicator = '<div class="clara-ready"><span>\u2736</span> Clara pre-filled Platforms &amp; Asset Mix \u2014 tweak freely on the next steps.</div>';
    }

    /* If the active concept has a completed GTM strategy, inherit the objective
       silently and replace the dropdown with a read-only inheritance line.
       Re-checked on every render so switching concepts mid-flow updates this. */
    var concept = window.clarityActiveConcept ? window.clarityActiveConcept() : null;
    var g = (concept && concept.gtm) || {};
    var firstAction = (g.plan && g.plan.actions && g.plan.actions.length && g.plan.actions[0] && g.plan.actions[0].title)
      ? String(g.plan.actions[0].title).trim() : '';
    var objectiveInherited = !!(concept && concept.gtmComplete && firstAction);
    /* Silent default so downstream code (canContinue, cpApplyBriefFromIntelligence,
       stored campaign objects) always has a value. */
    if (objectiveInherited && !f.objective) f.objective = 'Launch';

    var objectiveBlock;
    if (objectiveInherited) {
      var truncated = firstAction.length > 60 ? firstAction.substring(0, 60) + '\u2026' : firstAction;
      objectiveBlock = '<div class="cp-field">'
        + '<label>Objective</label>'
        + '<div class="cp-objective-inherited">Inherited from your GTM strategy: '
        + '<strong>' + truncated + '</strong></div>'
        + '</div>';
    } else {
      objectiveBlock = '<div class="cp-field"><label>Objective</label><select onchange="campaignSetObjective(this.value)">'
        + CP_OBJECTIVES.map(function (o) { return '<option' + (f.objective === o ? ' selected' : '') + '>' + o + '</option>'; }).join('')
        + '</select></div>';
    }

    return '<div class="cp-setup-center">'
      + '<div class="cp-step-title">Campaign setup</div>'
      + '<div class="cp-step-sub">Define goal and timing for this campaign.</div>'
      + '<div class="cp-form">'
      + '<div class="cp-field"><label>Campaign name</label><input value="' + f.name + '" onblur="campaignNameBlur(this.value)"></div>'
      + objectiveBlock
      + '<div class="cp-row">'
      + '<div class="cp-field"><label>Start date</label><input type="date" value="' + f.startDate + '" onchange="campaignSetField(\'startDate\',this.value)"></div>'
      + '<div class="cp-field"><label>Start time</label><input type="time" value="' + (f.startTime || '09:00') + '" onchange="campaignSetField(\'startTime\',this.value)"></div>'
      + '</div>'
      + '<div class="cp-row">'
      + '<div class="cp-field"><label>End date</label><input type="date" value="' + f.endDate + '" onchange="campaignSetField(\'endDate\',this.value)"></div>'
      + '<div class="cp-field"><label>End time</label><input type="time" value="' + (f.endTime || '17:00') + '" onchange="campaignSetField(\'endTime\',this.value)"></div>'
      + '</div>'
      + claraIndicator
      + '</div>'
      + '</div>';
  }

  function cpStepPlatforms() {
    var f = cpFlow();
    var claraBadge = f.claraSuggested ? '<span class="clara-badge">\u2736 Suggested by Clara</span>' : '';
    var prefillBanner = f.prefilledFromCreate
      ? '<div class="cp-prefill-banner">'
        + '<span class="pill pill-green" style="margin-right:8px;">&#10003; Brief pre-filled from your content</span>'
        + 'Campaign name, objective, and messaging were carried over. Just pick your platforms.'
        + '</div>'
      : '';
    var seedBadge = f.seedAsset
      ? '<div class="cp-seed-asset-note">'
        + '<span class="pill pill-indigo" style="margin-right:6px;">&#10022; Asset 1 ready</span>'
        + '<span style="font-size:12px;color:var(--muted);">Your <strong style="color:var(--text);">' + (f.seedAsset.modality || 'content') + '</strong> from the create flow is already attached as the first campaign asset.</span>'
        + '</div>'
      : '';
    return '<div class="cp-step-title">Platforms' + claraBadge + '</div>'
      + prefillBanner
      + seedBadge
      + '<div class="cp-step-sub">Pick one or more channels for this campaign.</div>'
      + '<div class="platform-tile-grid">'
      + CP_PLATFORMS.map(function (p) {
          var active = f.platforms.indexOf(p.id) >= 0;
          return '<div class="platform-tile' + (active ? ' active' : '') + '" onclick="campaignTogglePlatform(\'' + p.id + '\')">'
            + '<div class="platform-tile-icon">' + p.icon + '</div>'
            + '<div class="platform-tile-name">' + p.id + '</div>'
            + '<div class="platform-tile-desc">' + p.desc + '</div>'
            + '</div>';
        }).join('')
      + '</div>'
      + (f.platforms.length ? '<div class="cp-pill-row">' + f.platforms.map(function (p) { return '<span class="pill pill-indigo">' + p + '</span>'; }).join('') + '</div>' : '');
  }

  function cpStepSeries() {
    var f = cpFlow();
    return '<div class="cp-step-title">Series</div>'
      + '<div class="cp-step-sub">A campaign can have one or more themed series. By default one series is created, named after your campaign. Add more to split your campaign into distinct content angles.</div>'
      + '<div class="cp-series-list">'
      + f.series.map(function (s, idx) {
          var hasOverride = s.briefOverride && Object.keys(s.briefOverride.fields || {}).length > 0;
          var nudge = !hasOverride
            ? '<div class="cp-series-brief-nudge">'
              + '<span class="cp-series-nudge-icon">&#9432;</span>'
              + '<span>This series will generate content using the <strong>shared campaign brief</strong>'
              + (f.name ? ' for <em>' + f.name + '</em>' : '')
              + '. To give it a distinct angle, expand its override in <strong>Step 5 — Brief</strong>.</span>'
              + '</div>'
            : '<div class="cp-series-brief-nudge cp-series-nudge-ok">'
              + '<span class="cp-series-nudge-icon">&#10003;</span>'
              + '<span>Series brief override set — this series will generate with its own angle.</span>'
              + '</div>';
          return '<div class="cp-series-card card">'
            + '<div class="cp-series-card-num">Series ' + (idx + 1) + (idx === 0 ? ' <span class="cp-series-default-badge">default</span>' : '') + '</div>'
            + (f.series.length > 1
                ? '<button class="cp-remove cp-series-remove-btn" onclick="campaignRemoveSeries(' + idx + ')" title="Remove this series">×</button>'
                : '')
            + '<div class="cp-field">'
            + '<label>Series name</label>'
            + '<input value="' + (s.name || '') + '" placeholder="e.g. Awareness, Launch Week, Last Call"'
            + ' oninput="campaignSetSeriesField(' + idx + ',\'name\',this.value)">'
            + '</div>'
            + '<div class="cp-field">'
            + '<label>Content pattern <span class="cp-field-hint">— optional, for your reference only</span></label>'
            + '<select onchange="campaignSetSeriesPattern(' + idx + ',this.value)">'
            + CP_SERIES_PATTERNS.map(function (p) {
                return '<option' + (s.pattern === p ? ' selected' : '') + '>' + p + '</option>';
              }).join('')
            + '</select>'
            + '</div>'
            + nudge
            + '</div>';
        }).join('')
      + '</div>'
      + '<button class="btn btn-outline cp-add-series-btn" onclick="campaignAddSeries()">+ Add another series</button>';
  }

  function cpMixGrid(seriesIdx, mix) {
    if (!mix.length) {
      return '<div class="cf-history-empty" style="padding:28px 0;">Select at least one platform first.</div>';
    }
    return '<div class="cp-mix-grid">'
      + mix.map(function (item, idx) {
          return '<div class="cp-mix-card">'
            + '<div class="flex-between"><span class="cp-mix-platform">' + item.platform + '</span>'
            + '<button class="cp-remove" onclick="campaignRemoveMix(' + seriesIdx + ',' + idx + ')">×</button></div>'
            + '<div class="cp-mix-label">' + item.label + '</div>'
            + '<div class="cp-stepper">'
            + '<button onclick="campaignChangeMix(' + seriesIdx + ',' + idx + ',-1)">−</button>'
            + '<span>' + item.count + '</span>'
            + '<button onclick="campaignChangeMix(' + seriesIdx + ',' + idx + ',1)">+</button>'
            + '</div>'
            + '</div>';
        }).join('')
      + '</div>';
  }

  function cpStepAssetMix() {
    var f = cpFlow();
    cpEnsureDefaultMix();
    var claraBadge = f.claraSuggested ? '<span class="clara-badge">\u2736 Suggested by Clara</span>' : '';

    /* "Add another series" link — visible when we're on a single-series campaign
       and either (a) the user is on a standalone flow, or (b) they came from
       create AND have now landed on Asset Mix at least once. Never shown until
       the user is actually here. */
    var fromCreate = !!(f.prefilledFromCreate);
    var showAddSeriesLink = f.series.length === 1
      && !f.seriesStepVisited
      && (!fromCreate || f.assetMixVisited);
    var addSeriesLink = showAddSeriesLink
      ? '<div class="cp-add-series-link-row">'
        + '<span class="cp-add-series-link" onclick="campaignRevealSeriesStep()">Running one series. Add another \u2192</span>'
        + '</div>'
      : '';

    if (f.series.length === 1) {
      // Single series: flat rendering identical to original, no visible series layer
      return addSeriesLink
        + '<div class="cp-step-title">Asset mix' + claraBadge + '</div>'
        + '<div class="cp-step-sub">Suggested bundle based on selected platforms. You can adjust counts.</div>'
        + cpMixGrid(0, f.series[0].assetMix);
    }

    // Multiple series: tab bar per series
    var activeIdx = Math.min(f.activeSeriesIdx || 0, f.series.length - 1);
    var tabs = '<div class="cp-series-tabs">'
      + f.series.map(function (s, idx) {
          var count = s.assetMix.reduce(function (n, item) { return n + item.count; }, 0);
          return '<button class="cp-series-tab' + (idx === activeIdx ? ' active' : '') + '" onclick="campaignSetActiveSeriesTab(' + idx + ')">'
            + (s.name || ('Series ' + (idx + 1)))
            + (count ? ' <span class="cp-tab-count">' + count + '</span>' : '')
            + '</button>';
        }).join('')
      + '</div>';

    return '<div class="cp-step-title">Asset mix' + claraBadge + '</div>'
      + '<div class="cp-step-sub">Each series has its own content bundle. Switch tabs to configure per series.</div>'
      + tabs
      + cpMixGrid(activeIdx, f.series[activeIdx].assetMix);
  }

  function cpPlaceholderStep(title, text) {
    return '<div class="cp-step-title">' + title + '</div><div class="cp-step-sub">' + text + '</div>'
      + '<div class="card"><p style="font-size:13px;color:var(--muted);line-height:1.6;">This step is intentionally left for the next implementation pass.</p></div>';
  }

  function cpActivateClara() {
    var f = cpFlow();
    clearTimeout(_claraTimer);
    f.claraThinking = true;
    f.claraSuggested = false;
    renderContent();
    _claraTimer = setTimeout(function () {
      cpClaraAutoFill();
      renderContent();
    }, 600);
  }

  window.campaignSetField = function (key, val) {
    cpFlow()[key] = val;
    renderContent();
  };
  window.campaignNameBlur = function (val) {
    var f = cpFlow();
    f.name = val;
    // Keep series[0] name in sync while it hasn't been manually renamed
    if (f.series && f.series[0] && f.series[0].autoNamed) {
      f.series[0].name = val;
    }
    cpActivateClara();
  };
  window.campaignSetObjective = function (val) {
    var f = cpFlow();
    f.objective = val;
    cpActivateClara();
  };
  window.campaignTogglePlatform = function (id) {
    var f = cpFlow();
    var had = f.platforms.indexOf(id) >= 0;
    var idx = f.platforms.indexOf(id);
    if (idx >= 0) f.platforms.splice(idx, 1);
    else f.platforms.push(id);

    if (had) {
      // Save each series' current items for this platform before removing them,
      // so a re-add within the same session can restore custom counts.
      f.series.forEach(function (s) {
        if (!s.removedPlatforms) s.removedPlatforms = {};
        var saved = s.assetMix.filter(function (item) { return item.platform === id; });
        if (saved.length) {
          // Deep-copy so future mutations don't alter the snapshot.
          s.removedPlatforms[id] = saved.map(function (item) {
            return { id: item.id, platform: item.platform, label: item.label, count: item.count };
          });
        }
        s.assetMix = s.assetMix.filter(function (item) { return item.platform !== id; });
      });
      delete f.brief.overrides[id];
    } else {
      f.series.forEach(function (s) {
        if (!s.removedPlatforms) s.removedPlatforms = {};
        // Restore previously saved items (with their custom counts) if available;
        // otherwise seed with fresh defaults.
        var restored = s.removedPlatforms[id];
        if (restored && restored.length) {
          s.assetMix = s.assetMix.concat(restored);
          delete s.removedPlatforms[id];
        } else {
          s.assetMix = s.assetMix.concat(cpDefaultMixCards(id));
        }
      });
      f.mixInitialized = true;
      if (!f.brief.overrides[id]) {
        f.brief.overrides[id] = { expanded: false, fields: {} };
      }
    }
    if (!f.platforms.length) f.mixInitialized = false;
    f.claraSuggested = false;
    renderContent();
  };
  window.campaignChangeMix = function (seriesIdx, mixIdx, delta) {
    var f = cpFlow();
    var s = f.series[seriesIdx];
    if (!s || !s.assetMix[mixIdx]) return;
    s.assetMix[mixIdx].count = Math.max(1, s.assetMix[mixIdx].count + delta);
    s.mixUserEdited = true;
    f.claraSuggested = false;
    renderContent();
  };
  window.campaignRemoveMix = function (seriesIdx, mixIdx) {
    var f = cpFlow();
    var s = f.series[seriesIdx];
    if (!s) return;
    s.assetMix.splice(mixIdx, 1);
    s.mixUserEdited = true;
    f.claraSuggested = false;
    renderContent();
  };
  window.campaignAddSeries = function () {
    var f = cpFlow();
    var ns = cpFreshSeries('Series ' + (f.series.length + 1));
    ns.autoNamed = false;
    f.platforms.forEach(function (p) {
      ns.assetMix = ns.assetMix.concat(cpDefaultMixCards(p));
    });
    f.series.push(ns);
    f.activeSeriesIdx = f.series.length - 1;
    renderContent();
  };
  /* Unhide the Series step for this session (called from the "Add another
     series" link on Asset Mix) and jump the wizard back to it. Once visited,
     the stepper renders it normally and the forward/back skip logic no
     longer bypasses it. */
  window.campaignRevealSeriesStep = function () {
    var f = cpFlow();
    if (!f) return;
    f.seriesStepVisited = true;
    f.step = 3;
    renderContent();
  };
  window.campaignRemoveSeries = function (idx) {
    var f = cpFlow();
    if (f.series.length <= 1) return;
    f.series.splice(idx, 1);
    if (f.activeSeriesIdx >= f.series.length) f.activeSeriesIdx = f.series.length - 1;
    renderContent();
  };
  window.campaignSetSeriesField = function (idx, field, value) {
    var f = cpFlow();
    if (!f.series[idx]) return;
    f.series[idx][field] = value;
    if (field === 'name') f.series[idx].autoNamed = false;
    renderContent();
  };
  window.campaignSetSeriesPattern = function (idx, value) {
    var f = cpFlow();
    if (f.series[idx]) f.series[idx].pattern = value;
    renderContent();
  };
  window.campaignSetActiveSeriesTab = function (idx) {
    cpFlow().activeSeriesIdx = idx;
    renderContent();
  };
  window.campaignToggleSeriesBriefOverride = function (idx) {
    var f = cpFlow();
    var s = f.series[idx];
    if (!s) return;
    if (!s.briefOverride) s.briefOverride = { expanded: true, fields: {} };
    else s.briefOverride.expanded = !s.briefOverride.expanded;
    renderContent();
  };
  window.campaignSetSeriesBriefOverride = function (idx, field, value) {
    var f = cpFlow();
    var s = f.series[idx];
    if (!s) return;
    if (!s.briefOverride) s.briefOverride = { expanded: true, fields: {} };
    s.briefOverride.fields[field] = value;
    renderContent();
  };

  function cpEnsureOverride(platform) {
    var f = cpFlow();
    if (!f.brief.overrides[platform]) f.brief.overrides[platform] = { expanded: false, fields: {} };
    return f.brief.overrides[platform];
  }
  window.campaignSetBriefShared = function (field, value) {
    var f = cpFlow();
    f.brief.shared[field] = value;
    renderContent();
  };
  /* Toggle the from-create read-only brief view into edit mode (and back). */
  window.campaignToggleBriefEdit = function () {
    var f = cpFlow();
    if (!f) return;
    f.briefEditMode = !f.briefEditMode;
    renderContent();
  };
  window.campaignToggleBriefOverride = function (platform) {
    var o = cpEnsureOverride(platform);
    o.expanded = !o.expanded;
    renderContent();
  };
  window.campaignSetBriefOverride = function (platform, field, value) {
    var o = cpEnsureOverride(platform);
    o.fields[field] = value;
    renderContent();
  };
  function cpResolveBriefForPlatform(platform) {
    var f = cpFlow();
    var shared = f.brief.shared;
    var override = (f.brief.overrides[platform] && f.brief.overrides[platform].fields) || {};
    return {
      objective: override.objective || shared.objective,
      persona: override.persona || shared.persona,
      message: override.message || shared.message,
      proof: override.proof || shared.proof,
      cta: override.cta || shared.cta
    };
  }
  window.campaignGetBriefForPlatform = function (platform) {
    return cpResolveBriefForPlatform(platform);
  };
  function cpExpandAssetPlan() {
    var f = cpFlow();
    var list = [];
    f.series.forEach(function (s) {
      s.assetMix.forEach(function (item) {
        for (var i = 0; i < item.count; i++) {
          list.push({
            id: item.id + '-' + s.id + '-' + (i + 1),
            platform: item.platform,
            label: item.label,
            modality: item.modality || 'text',
            index: i + 1,
            count: item.count,
            seriesId: s.id,
            seriesName: s.name || ('Series ' + (f.series.indexOf(s) + 1)),
            brief: window.campaignGetBriefForPlatform(item.platform)
          });
        }
      });
    });
    return list;
  }
  function cpBuildGeneratedAsset(planItem) {
    var brief = planItem.brief || {};
    return {
      id: 'ga-' + Date.now() + '-' + Math.floor(Math.random() * 10000),
      platform: planItem.platform,
      label: planItem.label,
      modality: planItem.modality || 'text',
      title: (brief.message || 'Campaign asset').substring(0, 72),
      content: brief.message || '',
      status: 'Ready',
      approved: false,
      brief: brief,
      seq: planItem.index,
      totalForType: planItem.count,
      seriesId: planItem.seriesId,
      seriesName: planItem.seriesName
    };
  }
  function cpStatusPill(status) {
    if (status === 'Ready') return 'pill-green';
    if (status === 'Needs edit') return 'pill-amber';
    return 'pill-red';
  }
  function cpGetGeneratedAsset(id) {
    var list = cpFlow().generatedAssets;
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function cpStartBatchGenerate() {
    var f = cpFlow();
    var plan = cpExpandAssetPlan();
    /* Preserve any seed asset brought in from the create flow before resetting the list */
    var seedAssets = (f.generatedAssets || []).filter(function (a) { return a.fromCreate; });
    f.generatedAssets = seedAssets;
    f.batchTotal = plan.length;
    f.batchDone = 0;
    f.batchGenerating = true;
    f.editingAssetId = null;
    f.editDraft = null;
    // Build per-series progress counters
    f.batchSeriesProgress = {};
    plan.forEach(function (item) {
      if (!f.batchSeriesProgress[item.seriesId]) {
        f.batchSeriesProgress[item.seriesId] = { name: item.seriesName, done: 0, total: 0 };
      }
      f.batchSeriesProgress[item.seriesId].total++;
    });
    if (!plan.length) { f.batchGenerating = false; return; }
    var idx = 0;
    var timer = setInterval(function () {
      if (idx >= plan.length) {
        clearInterval(timer);
        f.batchGenerating = false;
        renderContent();
        return;
      }
      var asset = cpBuildGeneratedAsset(plan[idx]);
      f.generatedAssets.push(asset);
      f.batchDone = idx + 1;
      if (asset.seriesId && f.batchSeriesProgress[asset.seriesId]) {
        f.batchSeriesProgress[asset.seriesId].done++;
      }
      idx++;
      renderContent();
    }, 260);
  }

  function cpSharedBriefFields(data) {
    return '<div class="cp-field"><label>Persona</label><input value="' + (data.persona || '') + '" oninput="campaignSetBriefShared(\'persona\',this.value)"></div>'
      + '<div class="cp-field"><label>Message</label><textarea oninput="campaignSetBriefShared(\'message\',this.value)">' + (data.message || '') + '</textarea></div>'
      + '<div class="cp-row">'
      + '<div class="cp-field"><label>Proof</label><input value="' + (data.proof || '') + '" oninput="campaignSetBriefShared(\'proof\',this.value)"></div>'
      + '<div class="cp-field"><label>CTA</label><input value="' + (data.cta || '') + '" oninput="campaignSetBriefShared(\'cta\',this.value)"></div>'
      + '</div>';
  }

  function cpOverrideBriefFields(platform, data) {
    return '<div class="cp-field"><label>Persona</label><input value="' + (data.persona || '') + '" oninput="campaignSetBriefOverride(\'' + platform + '\',\'persona\',this.value)"></div>'
      + '<div class="cp-field"><label>Message</label><textarea oninput="campaignSetBriefOverride(\'' + platform + '\',\'message\',this.value)">' + (data.message || '') + '</textarea></div>'
      + '<div class="cp-row">'
      + '<div class="cp-field"><label>Proof</label><input value="' + (data.proof || '') + '" oninput="campaignSetBriefOverride(\'' + platform + '\',\'proof\',this.value)"></div>'
      + '<div class="cp-field"><label>CTA</label><input value="' + (data.cta || '') + '" oninput="campaignSetBriefOverride(\'' + platform + '\',\'cta\',this.value)"></div>'
      + '</div>';
  }

  function cpSeriesOverrideFields(seriesIdx, data) {
    return '<div class="cp-field"><label>Message</label><textarea oninput="campaignSetSeriesBriefOverride(' + seriesIdx + ',\'message\',this.value)">' + (data.message || '') + '</textarea></div>'
      + '<div class="cp-row">'
      + '<div class="cp-field"><label>Proof</label><input value="' + (data.proof || '') + '" oninput="campaignSetSeriesBriefOverride(' + seriesIdx + ',\'proof\',this.value)"></div>'
      + '<div class="cp-field"><label>CTA</label><input value="' + (data.cta || '') + '" oninput="campaignSetSeriesBriefOverride(' + seriesIdx + ',\'cta\',this.value)"></div>'
      + '</div>';
  }

  function cpStepBrief() {
    var f = cpFlow();
    var shared = f.brief.shared;
    var platforms = f.platforms;
    // With 2+ series, each series override is expanded by default (ov.expanded !== false)
    // so the user immediately sees all series angles side-by-side without clicking "Expand."
    var seriesOverrides = f.series.length > 1
      ? '<div class="cp-override-list">'
        + '<div class="label" style="margin:0 0 8px;">Per-series brief angles</div>'
        + f.series.map(function (s, idx) {
            var ov = s.briefOverride || {};
            var fields = ov.fields || {};
            var hasEdits = Object.keys(fields).length > 0;
            // expanded by default (ov.expanded undefined = not yet toggled = show open)
            var isOpen = ov.expanded !== false;
            var resolved = {
              objective: fields.objective || shared.objective,
              message: fields.message || shared.message,
              proof: fields.proof || shared.proof,
              cta: fields.cta || shared.cta
            };
            return '<div class="card cp-override-card">'
              + '<div class="flex-between">'
              + '<div>'
              + '<div class="label">Series brief</div>'
              + '<div class="cp-override-title">' + (s.name || ('Series ' + (idx + 1))) + '</div>'
              + '</div>'
              + '<div style="display:flex;align-items:center;gap:8px;">'
              + (hasEdits ? '<span class="pill pill-green">Customised</span>' : '<span class="pill pill-muted">Using shared</span>')
              + '<button class="btn btn-outline btn-sm" onclick="campaignToggleSeriesBriefOverride(' + idx + ')">' + (isOpen ? 'Collapse' : 'Expand') + '</button>'
              + '</div></div>'
              + (isOpen
                ? '<div class="cp-form cp-override-fields">' + cpSeriesOverrideFields(idx, resolved) + '</div>'
                : '')
              + '</div>';
          }).join('')
        + '</div>'
      : '';
    /* Coming from the create wizard: the shared brief is already pre-filled
       from the create step and probably will not be re-edited. Show it
       read-only with an explicit "Edit brief" link that toggles the fields
       into editable mode. Standalone campaigns keep the fully-editable view. */
    var fromCreate = !!f.prefilledFromCreate;
    var sharedBriefBlock;
    if (fromCreate && !f.briefEditMode) {
      sharedBriefBlock = '<div class="card cp-brief-card cp-brief-readonly">'
        + '<div class="cp-brief-readonly-head">'
        + '<div class="label" style="margin:0;">Shared campaign brief</div>'
        + '<button class="cp-brief-edit-link" onclick="campaignToggleBriefEdit()">Edit brief \u2192</button>'
        + '</div>'
        + '<div class="cp-brief-readonly-grid">'
        + '<div class="cp-brief-readonly-field">'
        + '<span class="cp-brief-readonly-label">Persona</span>'
        + '<span class="cp-brief-readonly-value">' + (shared.persona || '\u2014') + '</span></div>'
        + '<div class="cp-brief-readonly-field">'
        + '<span class="cp-brief-readonly-label">Message</span>'
        + '<span class="cp-brief-readonly-value">' + (shared.message || '\u2014') + '</span></div>'
        + '<div class="cp-brief-readonly-field">'
        + '<span class="cp-brief-readonly-label">Proof</span>'
        + '<span class="cp-brief-readonly-value">' + (shared.proof || '\u2014') + '</span></div>'
        + '<div class="cp-brief-readonly-field">'
        + '<span class="cp-brief-readonly-label">CTA</span>'
        + '<span class="cp-brief-readonly-value">' + (shared.cta || '\u2014') + '</span></div>'
        + '</div>'
        + '</div>';
    } else {
      /* Editable mode — either standalone flow or from-create user clicked Edit */
      var collapseLink = fromCreate
        ? '<button class="cp-brief-edit-link" onclick="campaignToggleBriefEdit()">Done editing</button>'
        : '';
      sharedBriefBlock = '<div class="card cp-brief-card">'
        + (collapseLink
          ? '<div class="cp-brief-readonly-head"><div class="label" style="margin:0;">Shared campaign brief</div>' + collapseLink + '</div>'
          : '<div class="label">Shared campaign brief</div>')
        + '<div class="cp-form">'
        + cpSharedBriefFields(shared)
        + '</div>'
        + '</div>';
    }

    return '<div class="cp-step-title">Brief</div>'
      + '<div class="cp-step-sub">' + (f.series.length > 1 ? 'Fill in the shared brief below, then customise each series\u2019 angle. Fields left blank inherit from the shared brief.' : 'Set the campaign brief your generator will use to produce content.') + '</div>'
      + sharedBriefBlock
      + seriesOverrides
      + (platforms.length
        ? '<div class="cp-override-list">' + platforms.map(function (p) {
            var o = cpEnsureOverride(p);
            var resolved = cpResolveBriefForPlatform(p);
            var fields = o.fields || {};
            var hasEdits = Object.keys(fields).length > 0;
            return '<div class="card cp-override-card">'
              + '<div class="flex-between">'
              + '<div><div class="label">Optional platform override</div><div class="cp-override-title">Tweak for ' + p + '</div></div>'
              + '<div style="display:flex;align-items:center;gap:8px;">'
              + (hasEdits ? '<span class="pill pill-green">Edited</span>' : '<span class="pill pill-muted">Using shared</span>')
              + '<button class="btn btn-outline btn-sm" onclick="campaignToggleBriefOverride(\'' + p + '\')">' + (o.expanded ? 'Collapse' : 'Expand') + '</button>'
              + '</div></div>'
              + (o.expanded
                ? '<div class="cp-form cp-override-fields">'
                  + cpOverrideBriefFields(p, resolved)
                  + '</div>'
                : '')
              + '</div>';
          }).join('') + '</div>'
        : '');
  }

  function cpStepGenerate() {
    var f = cpFlow();
    var total = f.batchTotal || cpExpandAssetPlan().length;
    var done = f.batchDone || 0;
    var seriesCount = f.series.length;
    if (f.intelBannerPending) {
      return '<div class="cp-step-title">Generate</div>'
        + '<div class="cp-step-sub">Ready to generate ' + total + ' asset' + (total === 1 ? '' : 's') + ' across ' + seriesCount + ' series and ' + f.platforms.length + ' platform' + (f.platforms.length === 1 ? '' : 's') + '.</div>'
        + '<div class="cp-intel-nudge">'
        + '<div class="cp-intel-nudge-body">'
        + '<div class="cp-intel-nudge-icon"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="4.5" stroke="currentColor" stroke-width="1.5"/><path d="M10.5 10.5l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></div>'
        + '<div><div class="cp-intel-nudge-title">Your results will be more accurate with research context.</div>'
        + '<div class="cp-intel-nudge-sub">Complete Intelligence setup to sharpen persona fit and messaging across all generated assets.</div>'
        + '</div></div>'
        + '<div class="cp-intel-nudge-actions">'
        + '<button class="btn btn-primary btn-sm" onclick="campaignIntelSetupNow()">Set up now</button>'
        + '<button class="btn btn-ghost btn-sm" onclick="campaignIntelContinueAnyway()">Continue anyway</button>'
        + '</div></div>';
    }
    if (f.batchGenerating) {
      // Per-series progress rows (only shown when multiple series)
      var seriesProgressHtml = '';
      if (seriesCount > 1 && f.batchSeriesProgress) {
        var progressRows = f.series.map(function (s) {
          var sp = f.batchSeriesProgress[s.id] || { done: 0, total: 0 };
          return '<span class="cp-series-gen-item">'
            + '<strong>' + (s.name || 'Series') + '</strong>: ' + sp.done + ' of ' + sp.total + ' done'
            + '</span>';
        });
        seriesProgressHtml = '<div class="cp-series-gen-progress">' + progressRows.join('<span class="cp-series-gen-sep">·</span>') + '</div>';
      }
      return '<div class="cp-step-title">Generate</div>'
        + '<div class="cp-step-sub">Batch generation using campaign brief defaults and per-platform overrides.</div>'
        + '<div class="cf-gen-stage">'
        + '<div class="cf-gen-glow"></div>'
        + '<div class="cf-spin"></div>'
        + '<div class="cf-gen-title">Building campaign assets</div>'
        + '<div class="cf-gen-sub">Generating ' + done + ' of ' + total + ' assets…</div>'
        + seriesProgressHtml
        + '<div class="cp-batch-progress"><div class="cp-batch-progress-fill" style="width:' + (total ? Math.round((done / total) * 100) : 0) + '%;"></div></div>'
        + '<div class="cp-batch-meta">' + (total ? Math.round((done / total) * 100) : 0) + '% complete</div>'
        + '</div>';
    }
    return '<div class="cp-step-title">Generate</div>'
      + '<div class="cp-step-sub">Batch generation complete. Assets are ready for review.</div>'
      + '<div class="card">'
      + '<div class="flex-between"><div><div class="label">Generation summary</div><div class="cp-count-summary">' + done + ' / ' + total + ' assets generated</div></div>'
      + '<button class="btn btn-outline btn-sm" onclick="cpRegenerateBatch()">↻ Regenerate batch</button></div>'
      + cpGeneratedOverviewGrid(f.generatedAssets, false)
      + '</div>';
  }

  window.cpRegenerateBatch = function () {
    cpStartBatchGenerate();
    renderContent();
  };
  function cpAssetThumbnail(a) {
    var mod = a.modality || 'text';
    if (mod === 'image') {
      var imgHtml = (window.StudioImage && StudioImage.renderPreview)
        ? StudioImage.renderPreview('sourdough', '1:1', ' ', false)
        : '<div class="cp-asset-thumb-img-grad"></div>';
      return '<div class="cp-asset-thumb cp-asset-thumb-image">' + imgHtml + '</div>';
    }
    if (mod === 'video') {
      return '<div class="cp-asset-thumb cp-asset-thumb-video">'
        + '<div class="cp-asset-play-btn">&#9654;</div>'
        + '<div class="cp-asset-dur-badge">0:28</div>'
        + '</div>';
    }
    if (mod === 'audio') {
      var bars = [40,65,55,80,45,70,50,75,60,85,48,72,55,78,62,88];
      return '<div class="cp-asset-thumb cp-asset-thumb-audio">'
        + '<div class="cp-asset-play-btn cp-asset-play-btn-sm">&#9654;</div>'
        + '<div class="cp-asset-waveform">'
        + bars.map(function(h){ return '<span style="height:'+h+'%"></span>'; }).join('')
        + '</div>'
        + '</div>';
    }
    // text (default)
    var pm = CP_PLATFORM_META[a.platform] || { color: '#d4a853', icon: '&#9679;' };
    return '<div class="cp-asset-thumb cp-asset-thumb-text" style="border-top:2px solid ' + pm.color + ';">'
      + '<div class="cp-asset-thumb-header">'
      + '<span class="cp-asset-thumb-avatar" style="background:' + pm.color + '22;color:' + pm.color + ';">HB</span>'
      + '<span class="cp-asset-thumb-platform" style="color:' + pm.color + ';">' + pm.icon + '</span>'
      + '</div>'
      + '<div class="cp-asset-thumb-body">' + (a.content || a.title || '').substring(0, 80) + '</div>'
      + '</div>';
  }

  function cpGeneratedOverviewGrid(list, interactive) {
    var cards = list.map(function (a) {
      var approveBtn = interactive
        ? (a.approved
          ? '<button class="btn btn-outline btn-sm" onclick="campaignUnapproveAsset(\'' + a.id + '\',event)">Unapprove</button>'
          : '<button class="btn btn-primary btn-sm" onclick="campaignApproveAsset(\'' + a.id + '\',event)"' + (a.status !== 'Ready' ? ' disabled style="opacity:0.5;"' : '') + '>Approve</button>')
        : '';
      return '<div class="cp-generated-card' + (interactive ? ' interactive' : '') + '"' + (interactive ? ' onclick="campaignOpenAssetEditor(\'' + a.id + '\')"' : '') + '>'
        + '<div class="cp-generated-top"><span class="pill pill-indigo">' + a.platform + '</span><span class="pill ' + cpStatusPill(a.status) + '">' + a.status + '</span></div>'
        + cpAssetThumbnail(a)
        + '<div class="cp-generated-title">' + a.label + ' #' + a.seq + '</div>'
        + '<div class="cp-generated-foot" style="display:flex;justify-content:space-between;align-items:center;gap:8px;">'
        + (a.approved ? '<span class="pill pill-green">Approved</span>' : '<span class="pill pill-muted">Pending approval</span>')
        + approveBtn
        + '</div>'
        + '</div>';
    }).join('');
    return '<div class="cp-generated-grid">' + cards + '</div>';
  }
  window.campaignBulkApproveReady = function () {
    var f = cpFlow();
    f.generatedAssets.forEach(function (a) {
      if (a.status === 'Ready') a.approved = true;
    });
    renderContent();
  };
  window.campaignApproveAsset = function (id, ev) {
    if (ev) ev.stopPropagation();
    var a = cpGetGeneratedAsset(id);
    if (!a) return;
    if (a.status !== 'Ready') return;
    a.approved = true;
    renderContent();
  };
  window.campaignUnapproveAsset = function (id, ev) {
    if (ev) ev.stopPropagation();
    var a = cpGetGeneratedAsset(id);
    if (!a) return;
    a.approved = false;
    renderContent();
  };
  window.campaignOpenAssetEditor = function (id) {
    var f = cpFlow();
    var asset = cpGetGeneratedAsset(id);
    if (!asset) return;
    f.editingAssetId = id;
    f.editDraft = {
      title: asset.title || '',
      content: asset.content || '',
      status: asset.status || 'Ready'
    };
    renderContent();
  };
  window.campaignCloseAssetEditor = function () {
    var f = cpFlow();
    f.editingAssetId = null;
    f.editDraft = null;
    renderContent();
  };
  window.campaignSetEditDraft = function (key, value) {
    var f = cpFlow();
    if (!f.editDraft) return;
    f.editDraft[key] = value;
    renderContent();
  };
  window.campaignSaveAssetEditor = function () {
    var f = cpFlow();
    var asset = cpGetGeneratedAsset(f.editingAssetId);
    if (!asset || !f.editDraft) return;
    asset.title = f.editDraft.title;
    asset.content = f.editDraft.content;
    asset.status = f.editDraft.status;
    f.editingAssetId = null;
    f.editDraft = null;
    renderContent();
  };
  function cpStepEdit() {
    var f = cpFlow();
    if (f.editingAssetId) {
      var d = f.editDraft || { title: '', content: '', status: 'Ready' };
      return '<div class="cp-step-title">Edit asset</div>'
        + '<div class="cp-step-sub">Single-item edit view. Save to return to campaign grid.</div>'
        + '<div class="cp-edit-layout">'
        + '<div class="card cp-edit-main">'
        + '<div class="cp-field"><label>Asset title</label><input value="' + (d.title || '') + '" oninput="campaignSetEditDraft(\'title\',this.value)"></div>'
        + '<div class="cp-field"><label>Content</label><textarea oninput="campaignSetEditDraft(\'content\',this.value)">' + (d.content || '') + '</textarea></div>'
        + '</div>'
        + '<div class="card cp-edit-rail">'
        + '<div class="label">Status</div>'
        + '<div class="cp-status-row">'
        + ['Ready', 'Needs edit', 'Flagged'].map(function (s) {
            return '<button class="btn btn-outline btn-sm' + (d.status === s ? ' active' : '') + '" onclick="campaignSetEditDraft(\'status\',\'' + s + '\')">' + s + '</button>';
          }).join('')
        + '</div>'
        + '<div style="display:flex;gap:8px;margin-top:16px;">'
        + '<button class="btn btn-outline" onclick="campaignCloseAssetEditor()">Back to grid</button>'
        + '<button class="btn btn-primary" onclick="campaignSaveAssetEditor()">Save</button>'
        + '</div>'
        + '</div></div>';
    }
    var hasSeries = f.series && f.series.length > 1;
    var overviewCards;
    if (!hasSeries) {
      overviewCards = cpGeneratedOverviewGrid(f.generatedAssets, true);
    } else {
      overviewCards = f.series.map(function (s) {
        var seriesAssets = f.generatedAssets.filter(function (a) { return a.seriesId === s.id; });
        return '<div class="cp-series-group">'
          + '<div class="cp-series-group-header">'
          + '<span>' + (s.name || 'Series') + '</span>'
          + '<span class="pill pill-muted">' + seriesAssets.length + ' asset' + (seriesAssets.length === 1 ? '' : 's') + '</span>'
          + '</div>'
          + cpGeneratedOverviewGrid(seriesAssets, true)
          + '</div>';
      }).join('');
    }
    return '<div class="cp-step-title">Edit</div>'
      + '<div class="cp-step-sub">Review campaign assets. Open any item for single-asset edit.</div>'
      + '<div class="card">'
      + '<div class="flex-between"><div><div class="label">Overview</div><div class="cp-count-summary">' + f.generatedAssets.length + ' assets generated</div></div>'
      + '<button class="btn btn-outline btn-sm" onclick="campaignBulkApproveReady()">Approve all Ready</button></div>'
      + '<div style="margin:10px 0 12px;display:flex;gap:8px;flex-wrap:wrap;"><span class="pill pill-green">' + cpApprovedAssets().length + ' approved</span><span class="pill pill-muted">' + (f.generatedAssets.length - cpApprovedAssets().length) + ' pending</span></div>'
      + overviewCards
      + '</div>';
  }

  function cpApprovedAssets() {
    return cpFlow().generatedAssets.filter(function (a) { return a.approved; });
  }
  function cpEnsurePublishDefaults() {
    var f = cpFlow();
    var start = f.startDate || cpTodayStr();
    var dayOffset = 0;
    cpApprovedAssets().forEach(function (a) {
      if (!a.scheduledDate && !a.unscheduled) {
        a.scheduledDate = cpAddDays(start, dayOffset);
        dayOffset++;
      } else if (a.scheduledDate) {
        dayOffset++;
      }
    });
  }
  function cpConflictMap() {
    var map = {};
    cpApprovedAssets().forEach(function (a) {
      if (!a.scheduledDate || a.paused) return;
      var key = a.platform + '|' + a.scheduledDate;
      if (!map[key]) map[key] = [];
      map[key].push(a);
    });
    var onlyConflicts = {};
    Object.keys(map).forEach(function (k) {
      if (map[k].length > 1) onlyConflicts[k] = map[k];
    });
    return onlyConflicts;
  }
  function cpHasConflict(asset, conflicts) {
    if (!asset.scheduledDate) return null;
    var key = asset.platform + '|' + asset.scheduledDate;
    return conflicts[key] ? conflicts[key] : null;
  }
  window.campaignSetAssetDate = function (id, dateVal) {
    var a = cpGetGeneratedAsset(id);
    if (!a) return;
    a.scheduledDate = dateVal || null;
    a.unscheduled = !dateVal;
    renderContent();
  };
  window.campaignSetAssetTime = function (id, timeVal) {
    var a = cpGetGeneratedAsset(id);
    if (!a) return;
    a.scheduledTime = timeVal || '09:00';
    /* No full re-render needed — just update state silently */
  };
  window.campaignAutoSpread = function () {
    var f = cpFlow();
    var conflicts = cpConflictMap();
    var conflictedPlatforms = {};
    Object.keys(conflicts).forEach(function (k) {
      conflictedPlatforms[k.split('|')[0]] = true;
    });
    Object.keys(conflictedPlatforms).forEach(function (platform) {
      var list = cpApprovedAssets().filter(function (a) { return a.platform === platform; });
      if (!list.length) return;
      list.sort(function (a, b) {
        var da = a.scheduledDate || '';
        var db = b.scheduledDate || '';
        return da < db ? -1 : da > db ? 1 : (a.id < b.id ? -1 : 1);
      });
      var base = list[0].scheduledDate || f.startDate || cpTodayStr();
      list.forEach(function (a, i) { a.scheduledDate = cpAddDays(base, i); });
    });
    renderContent();
  };

  // ─── Series-level publish actions ─────────────────────────
  window.campaignPauseSeries = function (seriesId) {
    cpFlow().generatedAssets.forEach(function (a) {
      if (a.seriesId === seriesId && a.approved) a.paused = true;
    });
    renderContent();
  };
  window.campaignResumeSeries = function (seriesId) {
    cpFlow().generatedAssets.forEach(function (a) {
      if (a.seriesId === seriesId) a.paused = false;
    });
    renderContent();
  };
  window.campaignScheduleSeries = function (seriesId, fromDate) {
    if (!fromDate) return;
    var assets = cpFlow().generatedAssets.filter(function (a) {
      return a.seriesId === seriesId && a.approved && !a.paused;
    });
    assets.forEach(function (a, i) {
      a.scheduledDate = cpAddDays(fromDate, i);
      a.unscheduled = false;
    });
    renderContent();
  };

  var _cpDragId = null;

  window.cpDragStart = function (id, event) {
    _cpDragId = id;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', id);
  };
  window.cpDragEnterRow = function (el) {
    el._cpDragCount = (el._cpDragCount || 0) + 1;
    el.classList.add('cp-drag-over');
  };
  window.cpDragLeaveRow = function (el) {
    el._cpDragCount = (el._cpDragCount || 0) - 1;
    if (el._cpDragCount <= 0) { el._cpDragCount = 0; el.classList.remove('cp-drag-over'); }
  };
  window.cpDropOnRow = function (targetId, event) {
    event.preventDefault();
    event.currentTarget.classList.remove('cp-drag-over');
    var dragId = _cpDragId;
    _cpDragId = null;
    if (!dragId || dragId === targetId) return;
    var src = cpGetGeneratedAsset(dragId);
    var tgt = cpGetGeneratedAsset(targetId);
    if (!src || !tgt) return;
    src.scheduledDate = tgt.scheduledDate || null;
    src.unscheduled = !src.scheduledDate;
    renderContent();
  };
  window.cpDragEnterTrash = function (el) {
    el._cpDragCount = (el._cpDragCount || 0) + 1;
    el.classList.add('cp-unschedule-active');
  };
  window.cpDragLeaveTrash = function (el) {
    el._cpDragCount = (el._cpDragCount || 0) - 1;
    if (el._cpDragCount <= 0) { el._cpDragCount = 0; el.classList.remove('cp-unschedule-active'); }
  };
  window.cpDropUnschedule = function (event) {
    event.preventDefault();
    event.currentTarget.classList.remove('cp-unschedule-active');
    var dragId = _cpDragId;
    _cpDragId = null;
    if (!dragId) return;
    var a = cpGetGeneratedAsset(dragId);
    if (!a) return;
    a.scheduledDate = null;
    a.unscheduled = true;
    renderContent();
  };

  function cpCampaignStatusForPublish() {
    var today = cpTodayStr();
    var approved = cpApprovedAssets();
    if (!approved.length) return 'Draft';
    var anyLive = approved.some(function (a) { return a.scheduledDate && a.scheduledDate <= today; });
    return anyLive ? 'Live' : 'Scheduled';
  }
  function cpCampaignStatusForCard(c) {
    var today = cpTodayStr();
    if (c.status === 'Live' && c.endDate && c.endDate < today) return 'Done';
    return c.status || 'Draft';
  }
  window.campaignPublishFinal = function () {
    var f = cpFlow();
    var approved = cpApprovedAssets();
    if (!approved.length) return;
    var status = cpCampaignStatusForPublish();
    var campaign = {
      id: 'cmp-' + Date.now(),
      name: f.name,
      goal: f.objective,
      startDate: f.startDate,
      endDate: f.endDate,
      status: status,
      totalAssets: approved.length,
      platforms: f.platforms.slice(),
      brief: JSON.parse(JSON.stringify(f.brief)),
      assets: f.generatedAssets.map(function (a) {
        return {
          id: a.id,
          platform: a.platform,
          label: a.label,
          title: a.title,
          status: a.status,
          approved: !!a.approved,
          scheduledDate: a.scheduledDate || null
        };
      })
    };
    appState.campaigns.unshift(campaign);
    appState.campaignUI.mode = 'detail';
    appState.campaignUI.selectedId = campaign.id;
    appState.campaignFlow = cpFreshFlow(appState);
    renderContent();
  };
  window.cpToggleScheduleExpanded = function () {
    appState.campaignUI.scheduleExpanded = !appState.campaignUI.scheduleExpanded;
    renderContent();
  };

  /* ---- Platform color mapping for the week-grid dots.
     Uses Clarity's brand tokens (amber/teal/coral/purple) per the design
     spec rather than the true platform colors from CP_PLATFORM_META. Any
     platform not in this map falls back to the muted token. */
  var CP_PUBLISH_PLATFORM_COLOR = {
    LinkedIn:  'var(--ob-gold)',
    Instagram: 'var(--ob-teal)',
    Facebook:  'var(--ob-coral)',
    Email:     'var(--ob-purple, #9b7fd4)'
  };
  function cpPublishPlatformColor(platform) {
    return CP_PUBLISH_PLATFORM_COLOR[platform] || 'var(--ob-muted, #9a8f82)';
  }

  /* Build the visual 7-day grid data. Starts on the campaign start date and
     shows the first week; dots represent approved assets scheduled to fall
     on each day, colored by platform. Purely visual — this doesn't mutate
     asset schedules. */
  function cpBuildWeekGrid(f, approved) {
    var start = f.startDate || cpTodayStr();
    var startDate = new Date(start + 'T00:00:00');
    if (isNaN(startDate.getTime())) startDate = new Date(cpTodayStr() + 'T00:00:00');
    var dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var days = [];
    for (var i = 0; i < 7; i++) {
      var iso = cpAddDays(start, i);
      var d = new Date(iso + 'T00:00:00');
      days.push({ iso: iso, label: dayNames[d.getDay()], dots: [] });
    }
    approved.forEach(function (a) {
      if (!a.scheduledDate) return;
      for (var j = 0; j < days.length; j++) {
        if (days[j].iso === a.scheduledDate) {
          days[j].dots.push({ platform: a.platform, id: a.id });
          break;
        }
      }
    });
    return days;
  }

  /* Full-page Publish rebuild.
     cpStepPublish() (the wizard-step call) redirects to setMode('campaign-publish')
     and returns an empty string, so the page is rendered outside the campaign
     overlay/drawer. cpBuildPublishContent() below builds the shared two-column
     content used by the full page. */

  function cpBuildPublishContent() {
    var f = cpFlow();
    if (!f) return '';
    cpEnsurePublishDefaults();
    var approved = cpApprovedAssets();
    var conflicts = cpConflictMap();
    var hasConflicts = Object.keys(conflicts).length > 0;
    var scheduledCount = approved.filter(function (a) { return !!a.scheduledDate; }).length;
    if (!approved.length) {
      return '<div class="cp-pub-empty">'
        + '<div class="cp-pub-empty-msg">No approved assets yet. Go back to Edit and approve items first.</div>'
        + '<div class="cp-pub-empty-actions">'
        + '<button class="btn btn-outline" onclick="cpPublishBack()">Back to Edit</button>'
        + '<button class="btn btn-primary" onclick="campaignBulkApproveReady()">Approve all Ready now</button>'
        + '</div></div>';
    }
    var hasMultiSeries = f.series && f.series.length > 1;
    var isMobile = window.innerWidth <= 760;
    var expanded = !isMobile && !!appState.campaignUI.scheduleExpanded;

    /* ---- Group approved assets by platform for the right-column summary ---- */
    var byPlatform = {};
    approved.forEach(function (a) {
      if (!byPlatform[a.platform]) byPlatform[a.platform] = [];
      byPlatform[a.platform].push(a);
    });
    var platformOrder = Object.keys(byPlatform);
    var platformCount = platformOrder.length;

    /* ---- Week grid (visual, first 7 days from campaign start) ---- */
    var weekDays = cpBuildWeekGrid(f, approved);
    var weekGridHtml = '<div class="cp-publish-week-grid">'
      + weekDays.map(function (day) {
          var dotsHtml = day.dots.length
            ? day.dots.slice(0, 6).map(function (d) {
                return '<span class="cp-publish-dot" style="background:' + cpPublishPlatformColor(d.platform) + ';"></span>';
              }).join('')
              + (day.dots.length > 6 ? '<span class="cp-publish-dot-more">+' + (day.dots.length - 6) + '</span>' : '')
            : '<span class="cp-publish-dot cp-publish-dot-empty"></span>';
          return '<div class="cp-publish-day-col">'
            + '<div class="cp-publish-day-name">' + day.label + '</div>'
            + '<div class="cp-publish-day-dots">' + dotsHtml + '</div>'
            + '</div>';
        }).join('')
      + '</div>';

    /* ---- Left column: schedule ---- */
    var conflictLine = hasConflicts
      ? '<div class="cp-publish-conflict-note">Conflicts detected \u2014 tap Auto-spread to fix.</div>'
      : '';
    var scheduleHeading = '<div class="cp-publish-heading">When should this go out?</div>'
      + '<div class="cp-publish-sub">We\u2019ll spread your content across the campaign dates using platform best practices.</div>';

    var dateInputs = '<div class="cp-publish-date-inputs">'
      + '<div class="cp-publish-date-card">'
      + '<label>CAMPAIGN STARTS</label>'
      + '<input type="date" value="' + (f.startDate || '') + '" onchange="cpFlow().startDate=this.value;renderContent()">'
      + '</div>'
      + '<div class="cp-publish-date-card">'
      + '<label>CAMPAIGN ENDS</label>'
      + '<input type="date" value="' + (f.endDate || '') + '" onchange="cpFlow().endDate=this.value;renderContent()">'
      + '</div>'
      + '</div>';

    var actions = '<div class="cp-publish-actions">'
      + '<button class="btn btn-primary" onclick="campaignAutoSpread()">Auto-spread schedule &#8594;</button>'
      + '<a class="cp-publish-review-link" onclick="cpToggleScheduleExpanded()">' + (expanded ? '\u2190 Collapse schedule' : 'Review individual dates \u2192') + '</a>'
      + '</div>';

    /* ---- Expanded per-asset view ---- */
    function renderAssetRow(a) {
      var conflictList = cpHasConflict(a, conflicts);
      var dateCol = a.paused
        ? '<div class="cp-publish-date"><span class="pill cp-paused-pill">Paused</span></div>'
        : '<div class="cp-publish-date">'
          + '<input type="date" value="' + (a.scheduledDate || '') + '"'
          + (a.unscheduled ? ' class="cp-date-unscheduled"' : '')
          + ' onchange="campaignSetAssetDate(\'' + a.id + '\',this.value)">'
          + '<input type="time" value="' + (a.scheduledTime || '09:00') + '"'
          + ' class="cp-time-input"'
          + ' onchange="campaignSetAssetTime(\'' + a.id + '\',this.value)">'
          + (a.unscheduled ? '<div class="cp-date-unscheduled-hint">+ Add date</div>' : '')
          + '</div>';
      return '<div class="cp-publish-row' + (a.paused ? ' cp-publish-row-paused' : '') + '" draggable="' + (!a.paused) + '"'
        + (!a.paused ? ' ondragstart="cpDragStart(\'' + a.id + '\',event)"' : '')
        + ' ondragover="event.preventDefault()"'
        + ' ondragenter="cpDragEnterRow(this)"'
        + ' ondragleave="cpDragLeaveRow(this)"'
        + (!a.paused ? ' ondrop="cpDropOnRow(\'' + a.id + '\',event)"' : '')
        + '>'
        + '<div class="cp-drag-handle">' + (a.paused ? '' : '\u2807') + '</div>'
        + '<div class="cp-publish-main">'
        + '<div class="cp-generated-title">' + a.label + ' #' + a.seq + '</div>'
        + '<div class="cp-generated-msg">' + a.platform + ' \u00b7 ' + (a.title || '').substring(0, 80) + '</div>'
        + '</div>'
        + dateCol
        + '</div>'
        + (conflictList && !a.paused ? '<div class="cp-conflict">Two ' + a.platform + ' posts on ' + cpFmtDate(a.scheduledDate) + ', consider spacing these out.</div>' : '');
    }

    var publishBody;
    if (hasMultiSeries) {
      publishBody = f.series.map(function (s) {
        var seriesAssets = approved.filter(function (a) { return a.seriesId === s.id; });
        var allPaused = seriesAssets.length > 0 && seriesAssets.every(function (a) { return a.paused; });
        var assetRows = seriesAssets.length
          ? seriesAssets.map(renderAssetRow).join('')
          : '<div class="cp-series-pub-empty">No approved assets in this series yet \u2014 go back to Edit and approve items from <strong>' + (s.name || 'this series') + '</strong>.</div>';
        return '<div class="cp-series-pub-section">'
          + '<div class="cp-series-pub-header">'
          + '<span class="cp-series-pub-name">' + (s.name || 'Series') + '</span>'
          + '<div class="cp-series-pub-actions">'
          + (seriesAssets.length
              ? (allPaused
                  ? '<button class="btn btn-outline btn-sm" onclick="campaignResumeSeries(\'' + s.id + '\')">Resume series</button>'
                  : '<button class="btn btn-outline btn-sm" onclick="campaignPauseSeries(\'' + s.id + '\')">Pause series</button>')
              : '')
          + (seriesAssets.length
              ? '<div class="cp-series-schedule-group">'
                + '<input type="date" class="cp-series-date-input" id="sdpick-' + s.id + '">'
                + '<button class="btn btn-outline btn-sm" onclick="campaignScheduleSeries(\'' + s.id + '\',document.getElementById(\'sdpick-' + s.id + '\').value)">Schedule all</button>'
                + '</div>'
              : '')
          + '</div>'
          + '</div>'
          + assetRows
          + '</div>';
      }).join('');
    } else {
      publishBody = approved.map(renderAssetRow).join('');
    }

    /* Expanded per-asset editor — same drag/drop/date/time inputs the old
       screen used, just re-positioned inside the left column below the grid. */
    var expandedEditor = expanded
      ? '<div class="cp-publish-expanded card">'
        + '<div class="flex-between"><div><div class="label">Approved assets</div>'
        + '<div class="cp-count-summary">' + scheduledCount + ' of ' + approved.length + ' scheduled</div></div>'
        + (hasConflicts ? '<button class="btn btn-outline btn-sm" onclick="campaignAutoSpread()">Auto-spread schedule</button>' : '<span class="pill pill-green">No conflicts</span>')
        + '</div>'
        + (approved.length > 1 ? '<div class="cp-drag-hint"><span>\u2807</span> Drag a row onto another to take that date \u00b7 drop on the zone below to unschedule</div>' : '')
        + '<div class="cp-publish-list">' + publishBody + '</div>'
        + '<div class="cp-unschedule-zone"'
        + ' ondragover="event.preventDefault()"'
        + ' ondragenter="cpDragEnterTrash(this)"'
        + ' ondragleave="cpDragLeaveTrash(this)"'
        + ' ondrop="cpDropUnschedule(event)"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 4h10M5 4V2.5h4V4M5.5 6v4.5M8.5 6v4.5M3 4l.7 7.5h6.6L11 4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg> Drop here to unschedule</div>'
        + '</div>'
      : '';

    /* ---- Right column: asset summary grouped by platform ---- */
    var summaryGroups = platformOrder.map(function (platform) {
      var color = cpPublishPlatformColor(platform);
      var assetsHtml = byPlatform[platform].map(function (a) {
        var when = a.paused ? 'Paused' : cpFmtDate(a.scheduledDate);
        var label = (a.label ? a.label + ' #' + a.seq : (a.title || 'Asset'));
        return '<div class="cp-publish-summary-row">'
          + '<div class="cp-publish-summary-label">' + label + '</div>'
          + '<div class="cp-publish-summary-when">' + when + '</div>'
          + '</div>';
      }).join('');
      return '<div class="cp-publish-summary-group">'
        + '<div class="cp-publish-summary-platform">'
        + '<span class="cp-publish-dot" style="background:' + color + ';"></span>'
        + '<span>' + platform + '</span>'
        + '</div>'
        + assetsHtml
        + '</div>';
    }).join('');

    var rightHeading = '<div class="cp-publish-right-heading">Ready to publish</div>'
      + '<div class="cp-publish-sub">' + approved.length + ' asset' + (approved.length === 1 ? '' : 's') + ' across ' + platformCount + ' platform' + (platformCount === 1 ? '' : 's')
      + (hasConflicts ? ' \u00b7 <span style="color:var(--ob-coral, #e07b6a);">conflicts detected</span>' : '')
      + '</div>';

    var fromCreate = !!(f && f.prefilledFromCreate);
    var doneBtn = '<button class="cp-pub-done" onclick="cpPublishDone()">&#10003; Done \u2014 save campaign &#8594;</button>';

    return '<div class="cp-publish-split">'
      + '<div class="cp-publish-left">'
      + scheduleHeading
      + dateInputs
      + weekGridHtml
      + conflictLine
      + actions
      + expandedEditor
      + '</div>'
      + '<div class="cp-publish-right">'
      + rightHeading
      + '<div class="cp-publish-summary-list">' + summaryGroups + '</div>'
      + doneBtn
      + '</div>'
      + '</div>';
    /* fromCreate is only used by cpPublishDone() at click time — we always
       render the same amber Done button; the handler routes correctly. */
    void fromCreate;
  }

  /* Full page render — called by index.html's window.screenCampaignPublish. */
  window.cpRenderPublishPage = function () {
    var f = cpFlow();
    var campaignName = (f && f.name) ? f.name : 'New campaign';

    /* Topbar: full width, own back button + title + spacer (theme toggle
       is the app-wide fixed overlay, so a right-side spacer is enough). */
    var topbar = '<div class="cp-pub-topbar">'
      + '<button class="app-topbar-back cp-pub-back" onclick="cpPublishBack()">&#8592; Back</button>'
      + '<span class="cp-pub-topbar-title">Publish Schedule</span>'
      + '<div class="cp-pub-topbar-spacer"></div>'
      + '</div>';

    /* Breadcrumb: campaign name > all 8 wizard steps, Schedule active */
    var crumbSteps = CP_STEPS.map(function (label, i) {
      /* Rename the last step from "Publish" to "Schedule" per the design */
      var display = (i === CP_STEPS.length - 1) ? 'Schedule' : label;
      var active = i === CP_STEPS.length - 1;
      return '<span class="cp-pub-crumb-sep">\u203A</span>'
        + '<span class="cp-pub-crumb-item' + (active ? ' cp-pub-crumb-active' : '') + '">' + display + '</span>';
    }).join('');
    var breadcrumb = '<div class="cp-pub-breadcrumb">'
      + '<span class="cp-pub-crumb-name">' + campaignName + '</span>'
      + crumbSteps
      + '</div>';

    return '<div class="cp-pub-page">'
      + topbar
      + breadcrumb
      + '<div class="cp-pub-content">'
      + cpBuildPublishContent()
      + '</div>'
      + '</div>';
  };

  /* ---- Publish-page handlers ---- */

  /* Back button in the standalone publish page: return to the Edit step
     inside the campaign flow. The campaign flow now always lives in the
     'campaign' mode (both standalone and from-create), so a single setMode
     call handles both cases — the from-create topbar/end button will still
     render correctly because cpScreenFlow reads prefilledFromCreate. */
  window.cpPublishBack = function () {
    if (appState.campaignFlow) appState.campaignFlow.step = 7;
    setMode('campaign');
  };

  /* Done button: save-and-close for the wizard-launched (overlay) case,
     otherwise plain "back to campaigns home". We flip appState.mode BEFORE
     calling the completion handler so the intermediate renderContent()
     inside those handlers renders the destination screen (create-flow's
     success screen or the campaign home) rather than briefly re-rendering
     the empty publish page after the campaign flow state has been reset. */
  window.cpPublishDone = function () {
    var f = appState.campaignFlow;
    var fromCreate = !!(f && f.prefilledFromCreate);
    if (fromCreate) {
      appState.mode = 'wizard';
      appState.screen = 'create-flow';
      window.campaignCompleteFromCreate();
    } else {
      appState.mode = 'campaign';
      appState.screen = 'campaign';
      window.campaignBackHome();
    }
  };

  function cpStepPublish() {
    /* Deferred so the current renderApp() finishes before we swap modes —
       otherwise the outer renderApp would overwrite our new mode's output.
       Any code path that lands on campaign step 8 will redirect here. */
    if (typeof setTimeout === 'function') {
      setTimeout(function () {
        if (appState.mode !== 'campaign-publish') setMode('campaign-publish');
      }, 0);
    }
    return '';
  }

  function canContinue() {
    var f = cpFlow();
    if (f.step === 1) return !!f.name && !!f.objective && !!f.startDate && !!f.endDate;
    if (f.step === 2) return f.platforms.length > 0;
    if (f.step === 3) return f.series.length > 0 && f.series.every(function (s) { return !!s.name; });
    if (f.step === 4) return f.series.some(function (s) { return s.assetMix.length > 0; });
    if (f.step === 5) {
      // Objective is always sourced from Step 1 — sync it automatically before checking
      f.brief.shared.objective = f.objective || f.brief.shared.objective;
      return !!f.brief.shared.persona && !!f.brief.shared.message;
    }
    if (f.step === 6) return !f.batchGenerating && f.generatedAssets.length > 0;
    if (f.step === 7) return !f.editingAssetId && cpApprovedAssets().length > 0;
    if (f.step === 8) return false;
    return true;
  }
  function cpContinueLabel() {
    var s = cpFlow().step;
    if (s === 5) return 'Generate batch';
    if (s === 6) return 'Continue to edit';
    if (s === 7) return 'Continue to publish';
    return 'Continue';
  }

  window.campaignBack = function () {
    var f = cpFlow();
    /* From-create flows (overlay or full-page) skip step 1 (Goal & Timing) —
       never let them back out past step 2. Standalone flows start at 1. */
    var fromCreate = !!appState.cpOverlayOpen || !!(f && f.prefilledFromCreate);
    var floor = fromCreate ? 2 : 1;
    if (f.step > floor) {
      if (f.step === 6) f.intelBannerPending = false;
      f.step--;
      /* Mirror the forward-skip: if Series was skipped on the way in,
         skip it on the way back too so the user never sees an empty step. */
      if (f.step === 3 && f.series && f.series.length <= 1 && !f.seriesStepVisited) {
        f.step = 2;
      }
      /* Any back-navigation to Asset Mix counts as a subsequent visit — reveal
         the "Add another series" nudge to from-create flows now that the
         user has explored past this step. */
      if (f.step === 4 && f.prefilledFromCreate) {
        f.assetMixVisited = true;
      }
      renderContent();
    }
  };
  window.campaignContinue = function () {
    var f = cpFlow();
    if (!canContinue()) return;
    if (f.step < 8) {
      var prevStep = f.step;
      f.step++;
      /* Step 3 (Series) is skipped for single-series campaigns unless the
         user has explicitly asked to visit it. Casual users go 2 → 4. */
      if (f.step === 3 && f.series && f.series.length <= 1 && !f.seriesStepVisited) {
        f.step = 4;
      }
      /* Mark Asset Mix as visited only on the SECOND+ arrival — the very first
         time the user lands on Asset Mix from a create-wizard flow we hide
         the "Add another series" link so they aren't nudged before they've
         even seen the step. Standalone flows show it immediately. */
      if (f.step === 4 && prevStep !== 4) {
        if (f.prefilledFromCreate) {
          /* First arrival: leave assetMixVisited false. Subsequent arrivals
             (navigating away and back) will flip it to true via campaignBack
             or from an earlier step's Continue firing again. */
          if (f.assetMixVisitedOnce) {
            f.assetMixVisited = true;
          } else {
            f.assetMixVisitedOnce = true;
          }
        } else {
          f.assetMixVisited = true;
        }
      }
      if (f.step === 6) {
        if (!cpHasIntelligence()) {
          f.intelBannerPending = true;
        } else {
          cpStartBatchGenerate();
        }
      }
      /* Step 8 (Publish) lives on its own page — jump straight there without
         first rendering the empty wizard shell that cpStepPublish would
         short-circuit anyway. */
      if (f.step === 8) {
        setMode('campaign-publish');
        return;
      }
      renderContent();
    }
  };
  window.campaignStartFlow = function () {
    appState.campaignFlow = cpFreshFlow(appState);
    appState.campaignUI.mode = 'flow';
    appState.campaignUI.selectedId = null;
    renderContent();
  };
  function cpLoadAndSyncIntelligence() {
    if (appState.intelligence && appState.intelligence.brand
        && appState.intelligence.brand.name && appState.intelligence.brand.name !== 'Hearth Bakery') {
      return;
    }
    var sample = window.CLARITY_SAMPLE_INTELLIGENCE || CP_SAMPLE_INTELLIGENCE;
    appState.intelligence = JSON.parse(JSON.stringify(sample));
    if (window.localStorage) localStorage.setItem('clarity_intel_mode', 'on');
    if (window.renderSidebar) renderSidebar();
  }
  window.campaignUseSampleIntelligence = function () {
    cpLoadAndSyncIntelligence();
    cpApplyBriefFromIntelligence();
    renderContent();
  };
  window.campaignStartIntelligenceSetup = function () {
    cpLoadAndSyncIntelligence();
    cpApplyBriefFromIntelligence();
    renderContent();
  };
  window.campaignIntelSetupNow = function () {
    var f = cpFlow();
    f.intelBannerPending = false;
    cpLoadAndSyncIntelligence();
    cpApplyBriefFromIntelligence();
    cpStartBatchGenerate();
    renderContent();
  };
  window.campaignIntelContinueAnyway = function () {
    var f = cpFlow();
    f.intelBannerPending = false;
    cpStartBatchGenerate();
    renderContent();
  };
  window.campaignGeneratePersona = function () {
    if (!appState.intelligence) appState.intelligence = {};
    var src = window.CLARITY_SAMPLE_INTELLIGENCE || CP_SAMPLE_INTELLIGENCE;
    appState.intelligence.persona = JSON.parse(JSON.stringify(src.persona));
    if (!appState.intelligence.brand) appState.intelligence.brand = src.brand;
    cpApplyBriefFromIntelligence();
    if (cpHasIntelligence() && window.localStorage) { localStorage.setItem('clarity_intel_mode', 'on'); if (window.renderSidebar) renderSidebar(); }
    renderContent();
  };
  window.campaignGenerateMarket = function () {
    if (!appState.intelligence) appState.intelligence = {};
    var src = window.CLARITY_SAMPLE_INTELLIGENCE || CP_SAMPLE_INTELLIGENCE;
    appState.intelligence.market = JSON.parse(JSON.stringify(src.market));
    if (cpHasIntelligence() && window.localStorage) { localStorage.setItem('clarity_intel_mode', 'on'); if (window.renderSidebar) renderSidebar(); }
    renderContent();
  };
  window.campaignGenerateConsumer = function () {
    if (!appState.intelligence) appState.intelligence = {};
    var src = window.CLARITY_SAMPLE_INTELLIGENCE || CP_SAMPLE_INTELLIGENCE;
    appState.intelligence.consumer = JSON.parse(JSON.stringify(src.consumer));
    if (cpHasIntelligence() && window.localStorage) { localStorage.setItem('clarity_intel_mode', 'on'); if (window.renderSidebar) renderSidebar(); }
    renderContent();
  };
  window.campaignOpenDetail = function (id) {
    appState.campaignUI.mode = 'detail';
    appState.campaignUI.selectedId = id;
    renderContent();
  };
  window.campaignBackHome = function () {
    appState.campaignUI.mode = 'home';
    appState.campaignUI.selectedId = null;
    renderContent();
  };
  function cpGetCampaignById(id) {
    var list = appState.campaigns || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    for (var j = 0; j < CP_SAMPLE_CAMPAIGNS.length; j++) if (CP_SAMPLE_CAMPAIGNS[j].id === id) return CP_SAMPLE_CAMPAIGNS[j];
    return null;
  }
  function cpCampaignPlatforms(c) {
    if (c.platforms && c.platforms.length) return c.platforms;
    var seen = {};
    var out = [];
    (c.assets || []).forEach(function (a) {
      if (!seen[a.platform]) { seen[a.platform] = true; out.push(a.platform); }
    });
    return out;
  }
  function cpGroupAssetsByPlatform(assets) {
    var map = {};
    (assets || []).forEach(function (a) {
      if (!map[a.platform]) map[a.platform] = [];
      map[a.platform].push(a);
    });
    return map;
  }
  function cpHealthScore(c) {
    var brief = (c.brief && c.brief.shared) || {};
    var assets = c.assets || [];
    var platforms = cpCampaignPlatforms(c);
    var checks = [];

    // 1. Shared brief is filled
    var briefOk = !!(brief.objective && brief.persona && brief.message);
    checks.push({ ok: briefOk, fail: 'Brief incomplete — objective, persona, or message missing' });

    // 2. No unresolved scheduling conflicts among approved assets
    var dateMap = {};
    assets.forEach(function (a) {
      if (a.approved && a.scheduledDate) {
        var key = a.platform + '|' + a.scheduledDate;
        dateMap[key] = (dateMap[key] || 0) + 1;
      }
    });
    var conflictSlots = Object.keys(dateMap).filter(function (k) { return dateMap[k] > 1; }).length;
    checks.push({ ok: conflictSlots === 0, fail: conflictSlots + ' scheduling conflict' + (conflictSlots === 1 ? '' : 's') + ' still unresolved' });

    // 3. No assets flagged
    var flagged = assets.filter(function (a) { return a.status === 'Flagged'; });
    checks.push({ ok: flagged.length === 0, fail: flagged.length + ' post' + (flagged.length === 1 ? '' : 's') + ' still flagged' });

    // 4. Every platform has at least one asset with a scheduled date
    var unscheduled = platforms.filter(function (p) {
      return !assets.some(function (a) { return a.platform === p && a.scheduledDate; });
    });
    checks.push({ ok: unscheduled.length === 0, fail: unscheduled.join(', ') + (unscheduled.length === 1 ? ' has' : ' have') + ' no scheduled posts' });

    var passed = checks.filter(function (ch) { return ch.ok; }).length;
    return {
      score: passed * 25,
      failures: checks.filter(function (ch) { return !ch.ok; }).map(function (ch) { return ch.fail; })
    };
  }

  function cpHealthRing(score) {
    var r = 38;
    var circ = 2 * Math.PI * r;
    var offset = circ * (1 - score / 100);
    var color = score === 100 ? '#d4a853' : score >= 75 ? '#f59e0b' : score >= 50 ? '#f97316' : '#ef4444';
    var trackColor = 'rgba(255,255,255,0.08)';
    return '<svg width="100" height="100" viewBox="0 0 100 100" style="display:block;">'
      + '<circle cx="50" cy="50" r="' + r + '" fill="none" stroke="' + trackColor + '" stroke-width="8"/>'
      + '<circle cx="50" cy="50" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="8"'
      + ' stroke-dasharray="' + circ.toFixed(2) + '"'
      + ' stroke-dashoffset="' + offset.toFixed(2) + '"'
      + ' stroke-linecap="round"'
      + ' transform="rotate(-90 50 50)"/>'
      + '<text x="50" y="47" text-anchor="middle" dominant-baseline="middle"'
      + ' font-size="18" font-weight="700" fill="' + color + '" font-family="DM Sans,sans-serif">' + score + '%</text>'
      + '<text x="50" y="63" text-anchor="middle" dominant-baseline="middle"'
      + ' font-size="8.5" fill="rgba(255,255,255,0.4)" font-family="DM Sans,sans-serif" letter-spacing="0.08em">HEALTH</text>'
      + '</svg>';
  }

  function cpDetailAssetCard(a) {
    return '<div class="cp-generated-card">'
      + '<div class="cp-generated-top"><span class="pill pill-indigo">' + a.platform + '</span><span class="pill ' + cpStatusPill(a.status) + '">' + a.status + '</span></div>'
      + '<div class="cp-generated-title">' + a.label + (a.seq ? ' #' + a.seq : '') + '</div>'
      + '<div class="cp-generated-msg">' + (a.content || a.title || '').substring(0, 110) + '</div>'
      + '<div class="cp-generated-foot" style="display:flex;justify-content:space-between;align-items:center;gap:8px;">'
      + (a.approved ? '<span class="pill pill-green">Approved</span>' : '<span class="pill pill-muted">Pending approval</span>')
      + '<span class="pill pill-muted">' + (a.scheduledDate ? cpFmtDate(a.scheduledDate) : 'Not scheduled') + '</span>'
      + '</div></div>';
  }
  function cpScreenDetail() {
    var c = cpGetCampaignById(appState.campaignUI.selectedId);
    if (!c) return cpScreenHome();
    var status = cpCampaignStatusForCard(c);
    var platforms = cpCampaignPlatforms(c);
    var grouped = cpGroupAssetsByPlatform(c.assets || []);
    var approvedCount = (c.assets || []).filter(function (a) { return a.approved; }).length;
    var brief = (c.brief && c.brief.shared) || {};
    var sampleBadge = c.isSample ? '<span class="pill pill-muted cp-sample-pill">Sample</span>' : '';
    var health = cpHealthScore(c);
    var platformKpis = platforms.map(function (p) {
      var count = (grouped[p] || []).length;
      return '<div class="card cp-platform-kpi"><div class="label">' + p + '</div><div class="cp-kpi-val">' + count + '</div><div class="cp-campaign-meta">' + count + ' asset' + (count === 1 ? '' : 's') + '</div></div>';
    }).join('');
    var platformSections = platforms.map(function (p) {
      var items = grouped[p] || [];
      return '<div class="cp-detail-platform-section">'
        + '<div class="flex-between" style="margin-bottom:10px;"><div class="label">' + p + '</div><span class="pill pill-indigo">' + items.length + ' posts</span></div>'
        + '<div class="cp-generated-grid">' + items.map(cpDetailAssetCard).join('') + '</div>'
        + '</div>';
    }).join('');
    var healthCard = '<div class="card cp-health-card" style="margin-top:12px;">'
      + '<div class="cp-health-ring-wrap">'
      + cpHealthRing(health.score)
      + '<div class="cp-health-ring-label">Campaign Health</div>'
      + '</div>'
      + '<div class="cp-health-body">'
      + (health.score === 100
        ? '<div class="cp-health-all-clear"><span>&#10003;</span> All systems go — campaign is fully ready to publish.</div>'
        : '<div class="cp-health-body-title">Needs attention</div>'
          + '<ul class="cp-health-failures">'
          + health.failures.map(function (f) { return '<li>' + f + '</li>'; }).join('')
          + '</ul>')
      + '</div>'
      + '</div>';
    /* ── Scheduled timeline: assets sorted by date ── */
    var scheduledAssets = (c.assets || []).filter(function (a) { return !!a.scheduledDate; });
    scheduledAssets.sort(function (a, b) { return a.scheduledDate < b.scheduledDate ? -1 : a.scheduledDate > b.scheduledDate ? 1 : 0; });
    var byDate = {};
    var dateOrder = [];
    scheduledAssets.forEach(function (a) {
      if (!byDate[a.scheduledDate]) { byDate[a.scheduledDate] = []; dateOrder.push(a.scheduledDate); }
      byDate[a.scheduledDate].push(a);
    });
    var timelineHtml = dateOrder.length
      ? dateOrder.map(function (d) {
          return '<div class="cp-timeline-day">'
            + '<div class="cp-timeline-date">' + cpFmtDate(d) + '</div>'
            + '<div class="cp-timeline-posts">'
            + byDate[d].map(function (a) {
                return '<div class="cp-timeline-post">'
                  + '<span class="pill pill-indigo cp-timeline-plat">' + a.platform + '</span>'
                  + '<span class="cp-timeline-title">' + (a.label || a.title || '').substring(0, 60) + '</span>'
                  + (a.approved ? '<span class="pill pill-green" style="font-size:10px;">Approved</span>' : '<span class="pill pill-muted" style="font-size:10px;">Pending</span>')
                  + '</div>';
              }).join('')
            + '</div></div>';
        }).join('')
      : '<div class="cf-history-empty" style="padding:16px 0 6px;">No assets have been scheduled yet.</div>';

    return '<div class="screen"><div class="flex-between" style="margin-bottom:18px;">'
      + '<div><h1 class="screen-title">' + c.name + sampleBadge + '</h1><p class="screen-sub">' + c.goal + ' · ' + cpFmtDate(c.startDate) + (c.startTime ? ' ' + cpFmtTime(c.startTime) : '') + ' → ' + cpFmtDate(c.endDate) + (c.endTime ? ' ' + cpFmtTime(c.endTime) : '') + '</p></div>'
      + '<div style="display:flex;align-items:center;gap:8px;"><button class="btn btn-outline" onclick="campaignBackHome()">&#8592; Campaigns</button></div>'
      + '</div>'
      + '<div class="cp-detail-kpis cp-detail-kpis-wide">'
      + '<div class="card"><div class="label">Status</div>'
      + '<div class="cp-kpi-val">' + (status === 'Live' ? '<span class="cp-live-dot"></span>' : '') + status + '</div>'
      + (status === 'Live' ? '<div class="cp-live-stat-inline" id="cp-live-stat-' + c.id + '" style="margin-top:6px;">' + cpLiveStatInner(c.id) + '</div>' : '')
      + '</div>'
      + '<div class="card"><div class="label">Total assets</div><div class="cp-kpi-val">' + c.totalAssets + '</div></div>'
      + '<div class="card"><div class="label">Approved</div><div class="cp-kpi-val">' + approvedCount + '</div></div>'
      + '<div class="card"><div class="label">Platforms</div><div class="cp-kpi-val">' + platforms.length + '</div></div>'
      + '</div>'
      + healthCard
      + (platforms.length ? '<div class="card" style="margin-top:12px;"><div class="label">Channel mix</div><div class="cp-detail-platforms">' + platforms.map(function (p) { return '<span class="pill pill-indigo">' + p + '</span>'; }).join('') + '</div><div class="cp-platform-kpi-grid" style="margin-top:12px;">' + platformKpis + '</div></div>' : '')
      + (brief.message ? '<div class="card cp-detail-brief" style="margin-top:12px;"><div class="label">Campaign brief</div>'
        + '<div class="cp-brief-summary"><div><span class="cp-brief-key">Objective</span>' + (brief.objective || '—') + '</div>'
        + '<div><span class="cp-brief-key">Persona</span>' + (brief.persona || '—') + '</div>'
        + '<div><span class="cp-brief-key">Message</span>' + (brief.message || '—') + '</div>'
        + '<div class="cp-row" style="margin-top:8px;"><div><span class="cp-brief-key">Proof</span>' + (brief.proof || '—') + '</div>'
        + '<div><span class="cp-brief-key">CTA</span>' + (brief.cta || '—') + '</div></div></div></div>' : '')
      + '<div class="card" style="margin-top:12px;"><div class="label">Scheduled timeline</div>'
      + '<div class="cp-timeline">' + timelineHtml + '</div>'
      + '</div>'
      + '<div class="card" style="margin-top:12px;"><div class="label">All posts by platform</div>'
      + '<div class="cp-detail-platform-sections">' + platformSections + '</div>'
      + '</div></div>';
  }
  function cpScreenHome() {
    var campaigns = appState.campaigns || [];
    var sample = CP_SAMPLE_CAMPAIGNS;
    var createHint = '<div class="cp-create-hint">'
      + '<span style="font-size:13px;color:var(--muted);">To start a new campaign, create content and choose <strong style="color:var(--text);">Add to campaign</strong> — brief and assets carry over automatically.</span>'
      + '<button class="btn btn-outline btn-sm" style="margin-left:12px;flex-shrink:0;" onclick="setMode(\'home\')">&#8592; Go to create</button>'
      + '</div>';
    var header = '<div class="flex-between" style="margin-bottom:12px;">'
      + '<div><h1 class="screen-title">Campaigns</h1><p class="screen-sub">Your campaigns — view, review, and track performance</p></div>'
      + '</div>'
      + createHint;
    if (!campaigns.length) {
      return '<div class="screen">' + header
        + '<div class="cp-home-hero">'
        + '<div class="cp-home-hero-title">No campaigns yet</div>'
        + '<p class="cp-home-hero-sub">Create a piece of content, then choose <em>Add to campaign</em> on the decision screen to start your first campaign.</p>'
        + '</div>'
        + '<div class="label" style="margin-top:16px;">Sample campaigns (for reference)</div>'
        + '<div class="cp-campaign-list">'
        + sample.map(function (c) {
            var isLive = c.status === 'Live';
            var statusPill = '<span class="pill ' + (isLive ? 'pill-green' : c.status === 'Scheduled' ? 'pill-indigo' : 'pill-muted') + '">'
              + (isLive ? '<span class="cp-live-dot"></span>' : '') + c.status + '</span>';
            var liveLine = isLive ? '<div class="cp-live-stat" id="cp-live-stat-' + c.id + '">' + cpLiveStatInner(c.id) + '</div>' : '';
            return '<div class="cp-campaign-card" onclick="campaignOpenDetail(\'' + c.id + '\')">'
              + '<div class="flex-between"><div class="cp-campaign-name">' + c.name + '</div>' + statusPill + '</div>'
              + '<div class="cp-campaign-meta">' + c.goal + '</div>'
              + '<div class="cp-campaign-dates">' + cpFmtDate(c.startDate) + (c.startTime ? ' \u00B7 ' + cpFmtTime(c.startTime) : '') + ' \u2192 ' + cpFmtDate(c.endDate) + (c.endTime ? ' \u00B7 ' + cpFmtTime(c.endTime) : '') + '</div>'
              + '<div class="cp-campaign-meta">' + c.totalAssets + ' assets · ' + cpCampaignPlatforms(c).join(', ') + '</div>'
              + liveLine
              + '</div>';
          }).join('')
        + '</div></div>';
    }
    return '<div class="screen">' + header
      + '<div class="screen-sub cp-campaigns-sub">Manage active and scheduled campaigns</div>'
      + '<div class="cp-campaign-list">'
      + campaigns.map(function (c) {
          var status = cpCampaignStatusForCard(c);
          var isLive = status === 'Live';
          var statusPill = '<span class="pill ' + (status === 'Done' ? 'pill-muted' : isLive ? 'pill-green' : 'pill-indigo') + '">'
            + (isLive ? '<span class="cp-live-dot"></span>' : '') + status + '</span>';
          var liveLine = isLive ? '<div class="cp-live-stat" id="cp-live-stat-' + c.id + '">' + cpLiveStatInner(c.id) + '</div>' : '';
          return '<div class="cp-campaign-card" onclick="campaignOpenDetail(\'' + c.id + '\')">'
            + '<div class="flex-between"><div class="cp-campaign-name">' + c.name + '</div>' + statusPill + '</div>'
            + '<div class="cp-campaign-meta">' + c.goal + '</div>'
            + '<div class="cp-campaign-dates">' + cpFmtDate(c.startDate) + (c.startTime ? ' \u00B7 ' + cpFmtTime(c.startTime) : '') + ' \u2192 ' + cpFmtDate(c.endDate) + (c.endTime ? ' \u00B7 ' + cpFmtTime(c.endTime) : '') + '</div>'
            + '<div class="cp-campaign-meta">' + c.totalAssets + ' assets' + (cpCampaignPlatforms(c).length ? ' · ' + cpCampaignPlatforms(c).join(', ') : '') + '</div>'
            + liveLine
            + '</div>';
        }).join('')
      + '</div></div>';
  }
  function cpIntelRail() {
    var intel = appState.intelligence || {};
    var persona = intel.persona || {};
    var market = intel.market || {};
    var consumer = intel.consumer || {};
    var f = cpFlow();
    var shared = (f && f.brief && f.brief.shared) || {};
    var p = appState.cfPrefs || {};
    var hasIntel = cpHasIntelligence();

    function block(label, body) {
      return '<div class="cf-intel-block"><div class="label">' + label + '</div>' + body + '</div>';
    }
    function phBlock(label, msg) {
      return '<div class="cf-intel-block"><div class="label">' + label + '</div>'
        + '<div class="cf-intel-text cf-intel-text-empty">' + msg + '</div></div>';
    }

    var personaBlock = persona.name
      ? block('Persona', '<div class="cf-intel-persona">' + persona.name + '</div><div class="cf-intel-text">' + (persona.seg || '') + '</div>')
      : phBlock('Persona', 'No persona data yet');
    var marketBlock = market.whiteSpace
      ? block('Market', '<div class="cf-intel-text">' + market.whiteSpace + '</div>')
      : phBlock('Market', 'No market signal yet');
    var consumerBlock = consumer.trigger
      ? block('Consumer', '<div class="cf-intel-text">' + consumer.trigger + '</div>')
      : phBlock('Consumer', 'No consumer trigger yet');

    var briefBlock = block('Campaign brief',
      '<div class="cf-intel-text"><strong style="color:var(--text);">' + (shared.objective || f.name || 'Untitled campaign') + '</strong>'
      + (shared.message ? '<br><br>' + shared.message : '') + '</div>');

    var prefsBlock = (p.style || p.tones)
      ? block('Preferences', '<div class="cf-intel-text">' + (p.style || 'Default') + (p.tones && p.tones[0] ? ' · ' + p.tones[0] : '')
        + '<br>Brand kit ' + (p.brandKitLock ? 'locked ✓' : 'off') + '</div>')
      : '';

    var evidence = '';
    if (market.gap) evidence += '<div class="evidence-item"><div class="evidence-tag research">research</div><div class="evidence-text">' + market.gap + '</div></div>';
    if (consumer.research) evidence += '<div class="evidence-item"><div class="evidence-tag social">consumer</div><div class="evidence-text">' + consumer.research + '</div></div>';

    return '<button class="cf-rail-reopen" onclick="cpToggleSidebar()" title="Show intelligence">&#10094;</button>'
      + '<div class="cf-intel-rail">'
      + '<button class="cf-rail-toggle" onclick="cpToggleSidebar()" title="Hide intelligence">&#10095;</button>'
      + '<div class="cf-intel-rail-head"' + (hasIntel ? '' : ' style="color:var(--muted);"') + '>' + (hasIntel ? '● Intelligence active' : '○ Intelligence pending') + '</div>'
      + personaBlock + marketBlock + consumerBlock + briefBlock + prefsBlock + evidence
      + '</div>';
  }

  window.cpToggleSidebar = function () {
    appState.cpSidebarOpen = !appState.cpSidebarOpen;
    renderContent();
  };

  function cpScreenFlow() {
    var f = cpFlow();
    /* "From create" covers both the legacy slide-in overlay path
       (cpOverlayOpen) and the new full-page path (prefilledFromCreate).
       Both should show the wizard-return topbar/end button. */
    var isOverlay = !!appState.cpOverlayOpen;
    var fromCreate = isOverlay || !!(f && f.prefilledFromCreate);
    var content = f.step === 1 ? cpStepGoalTiming()
      : f.step === 2 ? cpStepPlatforms()
      : f.step === 3 ? cpStepSeries()
      : f.step === 4 ? cpStepAssetMix()
      : f.step === 5 ? cpStepBrief()
      : f.step === 6 ? cpStepGenerate()
      : f.step === 7 ? cpStepEdit()
      : cpStepPublish();

    var topbar = fromCreate
      ? '<div class="cf-topbar">'
        + '<button class="app-topbar-back" onclick="campaignCloseOverlay()">&#8592; Back to your content</button>'
        + '<div style="font-size:13px;color:var(--muted);font-weight:500;padding-right:56px;">' + (f.name || 'New campaign') + '</div>'
        + '<div class="cf-topbar-right">'
        + '<button class="cf-overlay-close-x" onclick="campaignCloseOverlay()" title="Close campaign setup">&#x2715;</button>'
        + '</div></div>'
      : '<div class="cf-topbar"><div class="cf-brand">Clarity <span>Campaign</span></div>'
        + '<div class="cf-topbar-right"></div></div>';

    var endBtn = fromCreate
      ? '<button class="btn btn-primary" onclick="campaignCompleteFromCreate()">&#10003; Done — save campaign</button>'
      : '<button class="btn btn-outline" onclick="campaignBackHome()">Back to campaigns</button>';

    return '<div class="cf-screen">'
      + topbar
      + '<div class="cf-body cp-flow-body' + (appState.cpSidebarOpen ? '' : ' cf-sidebar-collapsed') + '"><div class="cp-main">' + cpStepper() + content + '</div>' + cpIntelRail() + '</div>'
      + '<div class="cf-footer">'
      + '<button class="btn btn-outline"' + (f.step <= (fromCreate ? 2 : 1) ? ' disabled' : '') + ' onclick="campaignBack()">← Back</button>'
      + '<div class="cf-footer-mid"><span class="cf-eta">Campaign · ' + CP_STEPS.length + ' steps</span></div>'
      + (f.step < 8 ? '<button class="btn btn-primary"' + (canContinue() ? '' : ' disabled') + ' onclick="campaignContinue()">' + cpContinueLabel() + '</button>' : endBtn)
      + '</div>'
      + '</div>';
  }

  function screenCampaign() {
    var ui = appState.campaignUI || { mode: 'home' };
    var all = (appState.campaigns || []).concat(CP_SAMPLE_CAMPAIGNS);
    var hasLive = all.some(function (c) { return cpCampaignStatusForCard(c) === 'Live'; });
    if (hasLive && (ui.mode === 'home' || ui.mode === 'detail')) {
      all.forEach(function (c) { if (cpCampaignStatusForCard(c) === 'Live') cpInitLiveStat(c.id); });
      cpStartLiveInterval();
    }
    if (ui.mode === 'flow') return cpScreenFlow();
    if (ui.mode === 'detail') return cpScreenDetail();
    return cpScreenHome();
  }

  /* ── Called by create-flow.js to open the campaign wizard pre-filled ── */
  function openFromCreate(briefData, seedAsset) {
    var today = cpTodayStr();
    var endDate = cpAddDays(today, 13);
    var words = ((briefData.message || briefData.goal || 'Campaign') + '').trim().split(/\s+/);
    var campaignName = words.slice(0, 6).join(' ') + (words.length > 6 ? '\u2026' : '');

    var series0 = cpFreshSeries(campaignName);
    /* Seed asset is pre-approved and attached to Series 1's generated list */

    appState.campaignUI = { mode: 'flow', selectedId: null };
    appState.campaignFlow = {
      step: 2, /* Skip Step 1 — Goal & Timing is pre-filled */
      name: campaignName,
      objective: 'Launch',
      startDate: today, startTime: '09:00',
      endDate: endDate, endTime: '17:00',
      platforms: briefData.platform ? [briefData.platform] : [],
      series: [series0],
      activeSeriesIdx: 0,
      mixInitialized: false,
      claraThinking: false,
      claraSuggested: false,
      intelBannerPending: false,
      /* Series step is skipped for single-series campaigns unless explicitly
         requested by the user via the "Add another series" link */
      seriesStepVisited: false,
      /* Brief pre-filled from the create wizard → collapse into read-only mode
         and let the user opt in to editing */
      briefEditMode: false,
      /* Track when Asset Mix has been reached at least once for from-create
         flows so the "Add another series" link only appears after that.
         `assetMixVisitedOnce` is set on the first arrival, `assetMixVisited`
         on subsequent arrivals. */
      assetMixVisited: false,
      assetMixVisitedOnce: false,
      prefilledFromCreate: true,
      seedAsset: seedAsset || null,
      brief: {
        shared: {
          objective: briefData.goal || briefData.objective || '',
          persona: briefData.persona || '',
          message: briefData.message || '',
          proof: briefData.proof || '',
          cta: briefData.cta || ''
        },
        overrides: {}
      },
      batchGenerating: false,
      batchDone: 0, batchTotal: 0,
      batchSeriesProgress: {},
      /* Seed asset pre-loaded as first generated asset — already approved */
      generatedAssets: seedAsset ? [seedAsset] : [],
      editingAssetId: null,
      editDraft: null
    };
    /* Full-page transition instead of slide-in overlay: leaving cpOverlayOpen
       false and flipping the app-level mode to 'campaign' makes renderApp()
       render the campaign flow as a standalone screen. Wizard state stays
       intact in appState.createFlow, so hitting the topbar close button
       (which calls campaignCloseOverlay → setMode('wizard')) restores the
       decision screen exactly as it was. */
    appState.cpOverlayOpen = false;
    setMode('campaign');
  }

  /* ── Close campaign flow (X / Back to your content in the from-create topbar).
     Captures prefilledFromCreate BEFORE resetting the flow so we can route
     the user back to the wizard decision screen when they entered from the
     create flow. Standalone opens (never launched from create) just fall
     back to the campaign home. */
  window.campaignCloseOverlay = function () {
    var wasFromCreate = !!(appState.campaignFlow && appState.campaignFlow.prefilledFromCreate)
      || !!appState.cpOverlayOpen;
    appState.cpOverlayOpen = false;
    appState.campaignFlow = cpFreshFlow(appState);
    appState.campaignUI = { mode: 'home', selectedId: null };
    if (wasFromCreate) {
      setMode('wizard');
    } else {
      renderContent();
    }
  };

  /* ── Called when user completes campaign wizard inside the overlay ── */
  window.campaignCompleteFromCreate = function () {
    var f = cpFlow();
    if (!appState.campaigns) appState.campaigns = [];
    /* Compute Live/Scheduled/Draft from the actual approved-and-scheduled
       assets (same logic campaignPublishFinal uses) so the saved campaign
       reflects what the user just set up on the Schedule page instead of
       always being 'Draft'. */
    var computedStatus = cpCampaignStatusForPublish();
    /* Save the campaign */
    var campaign = {
      id: 'camp-' + Date.now(),
      name: f.name,
      goal: f.objective,
      startDate: f.startDate, startTime: f.startTime,
      endDate: f.endDate, endTime: f.endTime,
      platforms: f.platforms.slice(),
      brief: { shared: f.brief.shared, overrides: f.brief.overrides },
      status: computedStatus,
      assets: f.generatedAssets || [],
      totalAssets: (f.generatedAssets || []).length
    };
    appState.campaigns.unshift(campaign);
    /* Save the campaign name for the success screen */
    appState._lastCampaignName = f.name;
    /* Close overlay and reset */
    appState.cpOverlayOpen = false;
    appState.campaignFlow = cpFreshFlow(appState);
    appState.campaignUI = { mode: 'home', selectedId: null };
    /* Advance create flow to success with "campaign" publish mode */
    if (window.cfPublish && appState.createFlow && appState.createFlow.step < 8) {
      window.cfPublish('campaign');
    } else {
      renderContent();
    }
  };

  /* ── Expose resetFlow so create-flow.js can call it ── */
  window.campaignResetFlow = function () {
    appState.campaignFlow = cpFreshFlow(appState);
    appState.campaignUI = { mode: 'home', selectedId: null };
  };

  return { init: init, screenCampaign: screenCampaign, openFromCreate: openFromCreate };
})();

window.screenCampaign = function () { return CampaignFlow.screenCampaign(); };
