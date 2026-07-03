/* ============================================================
   GTM STRATEGY FLOW  —  IIFE module
   Two sequential sub-flows: My Plan (plan-context → plan-loading →
   plan-output) then My Pricing (pricing-context → pricing-loading →
   pricing-output). Mirrors the screen-building conventions used by
   studio-strategy/strategy-flow.js and studio-persona/persona-flow.js.
   ============================================================ */
/* ---- Active-concept accessors — same pattern as pfActiveConcept() ---- */
function gtmActiveConcept() {
  return (window.clarityActiveConcept && window.clarityActiveConcept()) || null;
}
function gtmBiz() {
  var c = gtmActiveConcept();
  return (c && c.business) || {};
}
function gtmStrategy() {
  var c = gtmActiveConcept();
  return (c && c.strategy) || { marketScan: null, customerIntelligence: null, competition: null };
}
function gtmPersona() {
  var c = gtmActiveConcept();
  return (c && c.persona) || { name: '', ageRange: '', description: '', caresAbout: [], otherTraits: '', trigger: '' };
}
function gtmData() {
  var c = gtmActiveConcept();
  if (c && !c.gtm) c.gtm = { plan: { actions: [] }, pricing: { inputs: {}, suggestions: [] } };
  return (c && c.gtm) || { plan: { actions: [] }, pricing: { inputs: {}, suggestions: [] } };
}

function gtmEsc(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function gtmAttrEsc(str) {
  return (str || '').replace(/"/g, '&quot;');
}

var GtmFlow = (function () {
  var state;

  /* ---- init ---- */
  function init(s) {
    state = s;
    if (!state.gtmFlow) {
      state.gtmFlow = { step: 'plan-context', planFocus: '', pricingInputs: { avgOrder: '', marketAvg: '', margin: '', bestSeller: '' } };
    }
    if (!state.gtmFlow.pricingInputs) {
      state.gtmFlow.pricingInputs = { avgOrder: '', marketAvg: '', margin: '', bestSeller: '' };
    }
  }

  function gtmFlowState() {
    if (!state.gtmFlow) state.gtmFlow = { step: 'plan-context', planFocus: '', pricingInputs: { avgOrder: '', marketAvg: '', margin: '', bestSeller: '' } };
    return state.gtmFlow;
  }

  /* ============================================================
     SHARED CHROME — topbar with centered label
     ============================================================ */
  function gtmTopbar(backLabel, backAction) {
    return '<div class="gtm-topbar">'
      + '<div class="gtm-topbar-side gtm-topbar-left"><button class="app-topbar-back" onclick="' + backAction + '">&#8592; ' + backLabel + '</button></div>'
      + '<div class="gtm-topbar-label">GTM Strategy</div>'
      + '<div class="gtm-topbar-side gtm-topbar-right"></div>'
      + '</div>';
  }

  /* ---- Research summary card — shown on plan-context ---- */
  function gtmResearchCard() {
    var s = gtmStrategy();
    var p = gtmPersona();

    var gapHeadline = (s.marketScan && s.marketScan.gapHeadline) ? s.marketScan.gapHeadline : 'Not yet identified — complete Market Scan first.';
    var personaName = (p.name && p.name.trim()) ? p.name.trim() : 'Your Persona';
    var topCare     = (p.caresAbout && p.caresAbout.length) ? p.caresAbout[0] : '';
    var whitespace  = (s.competition && s.competition.whitespace) ? s.competition.whitespace : 'Not yet identified — complete Competition first.';

    function row(color, label, value, chip) {
      return '<div class="gtm-research-row">'
        + '<span class="gtm-research-dot" style="background:' + color + '"></span>'
        + '<div class="gtm-research-text">'
        + '<div class="gtm-research-label">' + label + '</div>'
        + '<div class="gtm-research-val">' + gtmEsc(value) + (chip ? ' ' + chip : '') + '</div>'
        + '</div></div>';
    }

    var careChip = topCare ? '<span class="gtm-research-chip">' + gtmEsc(topCare) + '</span>' : '';

    return '<div class="gtm-research-card">'
      + row('var(--ob-gold)', 'Market Gap', gapHeadline)
      + row('var(--ob-teal)', 'Persona', personaName, careChip)
      + row('var(--ob-coral)', 'Competitor Whitespace', whitespace)
      + '</div>';
  }

  /* ============================================================
     SHARED — loading engine (independent of Strategic Planning's,
     runs at 700ms/phase per spec, uses gtm- prefixed DOM hooks)
     ============================================================ */
  function gtmBuildLoadingScreen(phases) {
    return '<div class="gtm-loading-screen">'
      + '<div class="gtm-loading-inner">'
      + '<div class="gtm-loading-orb"><div class="gtm-orb-ring"></div><div class="gtm-orb-ring delay1"></div><div class="gtm-orb-ring delay2"></div></div>'
      + '<div class="gtm-loading-brand">Clarity</div>'
      + '<div class="gtm-loading-phase" id="gtm-loading-phase">' + phases[0] + '</div>'
      + '<div class="gtm-loading-bar-track"><div class="gtm-loading-bar" id="gtm-loading-bar" style="width:25%"></div></div>'
      + '<div class="gtm-loading-phases-list">'
      + phases.map(function (p, i) {
          return '<div class="gtm-phase-item" id="gtm-phase-item-' + i + '"' + (i === 0 ? ' style="opacity:1"' : '') + '>'
            + '<span class="gtm-phase-dot" id="gtm-phase-dot-' + i + '">' + (i === 0 ? '&#9679;' : '&#9675;') + '</span>'
            + p + '</div>';
        }).join('')
      + '</div></div></div>';
  }

  function gtmRunLoadingPhases(phases, onDone) {
    var current = 0;
    function tick() {
      current++;
      if (current >= phases.length) { setTimeout(onDone, 450); return; }
      var phaseEl = document.getElementById('gtm-loading-phase');
      var barEl   = document.getElementById('gtm-loading-bar');
      if (phaseEl) {
        phaseEl.style.opacity = '0'; phaseEl.style.transform = 'translateY(6px)';
        setTimeout(function () { if (phaseEl) { phaseEl.textContent = phases[current]; phaseEl.style.opacity = '1'; phaseEl.style.transform = 'translateY(0)'; } }, 200);
      }
      if (barEl) barEl.style.width = ((current + 1) / phases.length * 100) + '%';
      for (var i = 0; i < phases.length; i++) {
        var dotEl  = document.getElementById('gtm-phase-dot-' + i);
        var itemEl = document.getElementById('gtm-phase-item-' + i);
        if (!dotEl || !itemEl) continue;
        if (i < current)        { dotEl.innerHTML = '&#10003;'; dotEl.className = 'gtm-phase-dot done';   itemEl.style.opacity = '0.5'; }
        else if (i === current) { dotEl.innerHTML = '&#9679;';  dotEl.className = 'gtm-phase-dot active'; itemEl.style.opacity = '1'; }
        else                     { dotEl.innerHTML = '&#9675;'; dotEl.className = 'gtm-phase-dot';        itemEl.style.opacity = '0.35'; }
      }
      setTimeout(tick, 700);
    }
    setTimeout(tick, 700);
  }

  /* Loading hook — called by renderApp after gtm-strategy innerHTML, same
     wiring pattern as window.msCheckLoadingHook in strategy-flow.js */
  function checkLoadingHook() {
    var f = gtmFlowState();
    if (f.step === 'plan-loading')    { setTimeout(window.gtmStartPlanLoading, 80);    return; }
    if (f.step === 'pricing-loading') { setTimeout(window.gtmStartPricingLoading, 80); }
  }

  /* ============================================================
     CONTENT DATA — branched on business type (food/retail/creative/
     tech/trades/other), same key set used across strategy-flow.js
     ============================================================ */
  var GTM_PLAN_DATA = {
    food: [
      { title: 'Launch process-led content on Instagram & TikTok', owner: 'Marketing', timeline: 'Week 1-2', priority: 'P0',
        desc: function (c) { return 'Post 2-3 short videos a week showing sourcing, prep, or the people behind ' + c.bizName + ' \u2014 ' + c.personaName + ' responds to seeing the process, not just the finished product.'; } },
      { title: 'Get your first 15 Google reviews', owner: 'Sales', timeline: 'Week 1-2', priority: 'P0',
        desc: function (c) { return 'Personally ask your next 15 happy customers to leave a review. This directly closes the gap your research surfaced: \u201c' + c.gapHeadline + '\u201d'; } },
      { title: 'Book two local market or pop-up slots', owner: 'Operations', timeline: 'Month 1', priority: 'P1',
        desc: function (c) { return 'Face-to-face sampling converts skeptics faster than any ad. Use these to introduce ' + c.bizName + ' to people who haven\u2019t discovered you yet.'; } },
      { title: 'Launch a pre-order or subscription option', owner: 'Product', timeline: 'Month 2', priority: 'P1',
        desc: function (c) { return 'Smooth out seasonal demand swings and build recurring revenue \u2014 a natural fit for ' + c.personaName + (c.personaTrigger ? ', who told you: \u201c' + c.personaTrigger + '\u201d' : ', a repeat customer at heart') + '.'; } },
      { title: 'Partner with 2 complementary local businesses', owner: 'Marketing', timeline: 'Month 3', priority: 'P2',
        desc: function () { return 'Cross-promote with a nearby cafe, gift shop, or event venue to reach new pockets of your target customer without paid ads.'; } }
    ],
    retail: [
      { title: 'Launch a launch-week promotion across in-store and online', owner: 'Marketing', timeline: 'Week 1-2', priority: 'P0',
        desc: function (c) { return 'Give ' + c.personaName + ' a clear reason to buy in the first two weeks \u2014 this is your fastest lever against the gap identified in your research: \u201c' + c.gapHeadline + '\u201d'; } },
      { title: 'Set up email capture at checkout', owner: 'Operations', timeline: 'Week 1-2', priority: 'P0',
        desc: function (c) { return 'Every buyer becomes a retargetable contact instead of a one-time sale for ' + c.bizName + '.'; } },
      { title: 'Run a first-time buyer discount campaign', owner: 'Sales', timeline: 'Month 1', priority: 'P1',
        desc: function (c) { return 'Lower the barrier to a first purchase for shoppers who match ' + c.personaName + '\u2019s profile' + (c.topCare ? ', especially those who care about ' + c.topCare : '') + '.'; } },
      { title: 'Add a loyalty or repeat-purchase incentive', owner: 'Product', timeline: 'Month 2', priority: 'P1',
        desc: function () { return 'Turn one-time buyers into repeat customers with a simple points or punch-card style reward.'; } },
      { title: 'Pitch 2 local retailers or marketplaces for wholesale', owner: 'Sales', timeline: 'Month 3', priority: 'P2',
        desc: function (c) { return 'Expand distribution beyond your own storefront to reach customers ' + c.bizName + ' can\u2019t reach directly yet.'; } }
    ],
    creative: [
      { title: 'Publish a portfolio case study addressing your market gap', owner: 'Marketing', timeline: 'Week 1-2', priority: 'P0',
        desc: function (c) { return 'Write up one past project as a case study framed around the gap your research found: \u201c' + c.gapHeadline + '\u201d \u2014 this is what ' + c.personaName + ' needs to see before reaching out.'; } },
      { title: 'Reach out directly to 10 prospects matching your persona', owner: 'Sales', timeline: 'Week 1-2', priority: 'P0',
        desc: function (c) { return 'Send a short, specific message to 10 people or businesses who look like ' + c.personaName + ', referencing a problem you know they have.'; } },
      { title: 'Ask your last 3 clients for a testimonial or referral', owner: 'Sales', timeline: 'Month 1', priority: 'P1',
        desc: function () { return 'Social proof closes deals faster than a portfolio alone \u2014 make asking a standard part of every project wrap-up.'; } },
      { title: 'Package your most-requested service into a fixed-price offer', owner: 'Product', timeline: 'Month 2', priority: 'P1',
        desc: function (c) { return 'Remove pricing friction for ' + c.personaName + (c.personaTrigger ? ', who wants \u201c' + c.personaTrigger + '\u201d' : '') + ' by turning your most common project into a clear, fixed-scope package.'; } },
      { title: 'Build one strategic partnership with a complementary freelancer or agency', owner: 'Marketing', timeline: 'Month 3', priority: 'P2',
        desc: function (c) { return 'Partner with someone who serves the same audience with an adjacent skill set to create a steady referral pipeline for ' + c.bizName + '.'; } }
    ],
    tech: [
      { title: 'Launch targeted outreach to your persona\u2019s segment', owner: 'Marketing', timeline: 'Week 1-2', priority: 'P0',
        desc: function (c) { return 'Reach ' + c.personaName + '\u2019s segment directly using the angle identified in your research: \u201c' + c.gapHeadline + '\u201d \u2014 generic messaging won\u2019t cut through here.'; } },
      { title: 'Ship a lightweight lead magnet (free tool or trial)', owner: 'Product', timeline: 'Week 1-2', priority: 'P0',
        desc: function (c) { return 'Give ' + c.personaName + ' a low-risk way to experience ' + c.bizName + '\u2019s value before committing to a paid plan.'; } },
      { title: 'Set up a simple automated onboarding email sequence', owner: 'Operations', timeline: 'Month 1', priority: 'P1',
        desc: function () { return 'Guide new signups to their first meaningful action so trials convert instead of going cold.'; } },
      { title: 'Run 5 discovery calls with target users', owner: 'Sales', timeline: 'Month 1', priority: 'P1',
        desc: function (c) { return 'Talk directly to 5 people matching ' + c.personaName + (c.personaTrigger ? ' about why they said: \u201c' + c.personaTrigger + '\u201d' : '') + ' to sharpen your pitch with real language.'; } },
      { title: 'Publish one case study or proof point', owner: 'Marketing', timeline: 'Month 3', priority: 'P2',
        desc: function (c) { return 'Turn your best early result into a concrete, numbers-backed story that closes the trust gap for new prospects.'; } }
    ],
    trades: [
      { title: 'Claim and fully optimize your Google Business Profile', owner: 'Marketing', timeline: 'Week 1-2', priority: 'P0',
        desc: function (c) { return 'Local search is how ' + c.personaName + ' finds you when they\u2019re ready to book \u2014 complete photos, hours, and service areas this week.'; } },
      { title: 'Ask your last 10 customers for reviews', owner: 'Sales', timeline: 'Week 1-2', priority: 'P0',
        desc: function (c) { return 'Reviews close the exact trust gap your research flagged: \u201c' + c.gapHeadline + '\u201d'; } },
      { title: 'Set up a referral incentive for existing customers', owner: 'Operations', timeline: 'Month 1', priority: 'P1',
        desc: function (c) { return 'Word of mouth is the highest-trust channel for ' + c.bizName + ' \u2014 give happy customers a concrete reason to refer their neighbors.'; } },
      { title: 'Create a simple before/after portfolio', owner: 'Marketing', timeline: 'Month 2', priority: 'P1',
        desc: function (c) { return 'Visual proof of quality work is what turns a quote request into a booked job for ' + c.personaName + '.'; } },
      { title: 'Partner with 1-2 complementary trades for referrals', owner: 'Sales', timeline: 'Month 3', priority: 'P2',
        desc: function () { return 'Build a two-way referral relationship with a trade that serves the same customers at a different stage of their project.'; } }
    ],
    other: [
      { title: 'Clarify your core offer messaging', owner: 'Marketing', timeline: 'Week 1-2', priority: 'P0',
        desc: function (c) { return 'Rewrite your core pitch around the gap your research found: \u201c' + c.gapHeadline + '\u201d so ' + c.personaName + ' understands the value in one sentence.'; } },
      { title: 'Reach out directly to your first 10 target customers', owner: 'Sales', timeline: 'Week 1-2', priority: 'P0',
        desc: function (c) { return 'Personal outreach beats any ad at this stage \u2014 message 10 people who match ' + c.personaName + '\u2019s profile directly.'; } },
      { title: 'Collect and publish 3 pieces of social proof', owner: 'Marketing', timeline: 'Month 1', priority: 'P1',
        desc: function () { return 'Testimonials, reviews, or results \u2014 anything that shows a real person got value from what you offer.'; } },
      { title: 'Systemize your sales or fulfillment process', owner: 'Operations', timeline: 'Month 2', priority: 'P1',
        desc: function (c) { return 'Document the steps from first contact to delivery so ' + c.bizName + ' can grow without every step depending on you personally.'; } },
      { title: 'Test one new channel or partnership', owner: 'Sales', timeline: 'Month 3', priority: 'P2',
        desc: function (c) { return 'Try one channel you haven\u2019t used yet to reach ' + c.personaName + (c.personaTrigger ? ', who is motivated by \u201c' + c.personaTrigger + '\u201d' : '\u2019s segment directly') + '.'; } }
    ]
  };
  var GTM_MARKET_AVG_DEFAULT = { food: '18', retail: '45', creative: '850', tech: '49', trades: '350', other: '75' };

  var GTM_PRICING_DATA = {
    food: [
      { headline: 'Introduce a limited-batch premium tier', impact: 'High', effort: 'Low',
        explain: function (c) { return 'Price a small-batch version of ' + c.bestSeller + ' 20-30% above your average order of ' + c.avgOrderFmt + '. Scarcity and quality framing let you capture customers who already trust you, without discounting your core menu.'; } },
      { headline: 'Bundle your best seller into a value pack', impact: 'Medium', effort: 'Low',
        explain: function (c) { return 'Package ' + c.bestSeller + ' with 1-2 complementary items at a slight discount to lift orders above ' + c.avgOrderFmt + '. This rewards bigger baskets without cutting your per-item margin.'; } },
      { headline: 'Test a small price increase on your slowest-moving items', impact: 'Medium', effort: 'Medium',
        explain: function (c) { return 'Raise prices 5-8% on lower-velocity items while holding ' + c.bestSeller + ' steady. Monitor unit sales for 30 days before extending it further.'; } }
    ],
    retail: [
      { headline: 'Introduce a "better" tier bundle', impact: 'High', effort: 'Low',
        explain: function (c) { return 'Bundle ' + c.bestSeller + ' with a complementary add-on priced to lift your average order above ' + c.avgOrderFmt + '. Most shoppers default to the middle option when given a clear upgrade path.'; } },
      { headline: 'Test a free-shipping or pickup threshold', impact: 'Medium', effort: 'Low',
        explain: function (c) { return 'Set your free-shipping threshold slightly above ' + c.avgOrderFmt + ' to nudge basket size up without touching a single price tag.'; } },
      { headline: 'Reposition your slowest sellers as premium add-ons', impact: 'Medium', effort: 'Medium',
        explain: function (c) { return 'Move underperforming SKUs into an "upgrade" slot next to ' + c.bestSeller + ' instead of discounting them into the clearance bin.'; } }
    ],
    creative: [
      { headline: 'Introduce a productized "starter" package', impact: 'High', effort: 'Low',
        explain: function (c) { return 'Package ' + c.bestSeller + ' into a fixed-scope offer priced near ' + c.avgOrderFmt + ' to convert browsers who hesitate at custom-quote pricing.'; } },
      { headline: 'Add a premium tier above your current average', impact: 'Medium', effort: 'Low',
        explain: function (c) { return 'Offer a priority-turnaround version of ' + c.bestSeller + ' priced above ' + c.avgOrderFmt + ' for clients who\u2019ll happily pay more for speed.'; } },
      { headline: 'Bundle recurring services into a monthly retainer', impact: 'Medium', effort: 'Medium',
        explain: function (c) { return 'Turn repeat requests for ' + c.bestSeller + ' into a retainer priced above your one-off average of ' + c.avgOrderFmt + ' for predictable monthly revenue.'; } }
    ],
    tech: [
      { headline: 'Introduce a usage-based or seat-based tier', impact: 'High', effort: 'Medium',
        explain: function (c) { return 'Add a higher tier above ' + c.avgOrderFmt + ' for power users of ' + c.bestSeller + ' who are already getting outsized value from it.'; } },
      { headline: 'Add an annual plan discount to lift lifetime value', impact: 'Medium', effort: 'Low',
        explain: function (c) { return 'Offer 2 months free on an annual plan anchored to your current average of ' + c.avgOrderFmt + ' to reduce churn and improve cash flow.'; } },
      { headline: 'Test a premium support or onboarding add-on', impact: 'Medium', effort: 'Low',
        explain: function (c) { return 'Price white-glove onboarding as an upsell on top of ' + c.avgOrderFmt + ' for customers who want a faster path to value from ' + c.bestSeller + '.'; } }
    ],
    trades: [
      { headline: 'Bundle your best-selling job with a maintenance plan', impact: 'High', effort: 'Medium',
        explain: function (c) { return 'Turn a one-off ' + c.bestSeller + ' job priced around ' + c.avgOrderFmt + ' into a recurring maintenance contract for steadier, more predictable revenue.'; } },
      { headline: 'Introduce tiered pricing (good / better / best)', impact: 'Medium', effort: 'Low',
        explain: function (c) { return 'Give customers who\u2019d happily pay more than ' + c.avgOrderFmt + ' an obvious upgrade path above your standard ' + c.bestSeller + ' offer.'; } },
      { headline: 'Add a rush or emergency-fee tier', impact: 'Medium', effort: 'Low',
        explain: function (c) { return 'Price urgent jobs above your standard ' + c.avgOrderFmt + ' rate \u2014 customers who need it now are far less price-sensitive.'; } }
    ],
    other: [
      { headline: 'Test a "better" tier above your current average', impact: 'High', effort: 'Low',
        explain: function (c) { return 'Anchor a premium version of ' + c.bestSeller + ' above your average order of ' + c.avgOrderFmt + ' to capture customers who\u2019d pay more for more.'; } },
      { headline: 'Bundle your best seller with a complementary add-on', impact: 'Medium', effort: 'Low',
        explain: function (c) { return 'Package ' + c.bestSeller + ' with something adjacent to lift average order value above ' + c.avgOrderFmt + '.'; } },
      { headline: 'Introduce a small price increase on low-margin items', impact: 'Medium', effort: 'Medium',
        explain: function (c) { return 'Raise prices modestly on your thinnest-margin items while holding ' + c.bestSeller + ' steady to protect what\u2019s already working.'; } }
    ]
  };

  function gtmTypeKey() {
    var t = (gtmBiz() || {}).type;
    return GTM_PLAN_DATA[t] ? t : 'other';
  }

  /* ============================================================
     STEP 1 — PLAN CONTEXT
     ============================================================ */
  function screenPlanContext() {
    var f = gtmFlowState();
    var focusVal = f.planFocus || '';

    var body = '<div class="gtm-eyebrow">GTM STRATEGY</div>'
      + '<div class="gtm-heading">Build your go-to-market plan.</div>'
      + '<p class="gtm-sub">Based on your research and persona, we\u2019ll generate a 90-day action plan specific to your business.</p>'
      + gtmResearchCard()
      + '<div class="gtm-focus-wrap">'
      + '<label class="gtm-focus-label">Anything specific you want to focus on in the next 90 days? <span class="gtm-optional">(optional)</span></label>'
      + '<textarea class="gtm-focus-input" id="gtm-plan-focus" rows="3" placeholder="e.g. growing weekend foot traffic, landing 3 new wholesale accounts\u2026" oninput="gtmSetPlanFocus(this.value)">' + gtmEsc(focusVal) + '</textarea>'
      + '</div>'
      + '<button class="gtm-btn-primary gtm-btn-lg" onclick="gtmGeneratePlan()">Generate my plan &#8594;</button>';

    return '<div class="gtm-screen">'
      + gtmTopbar('Back to Persona Studio', 'gtmBackToPersona()')
      + '<div class="gtm-body"><div class="gtm-content-wrap">' + body + '</div></div>'
      + '</div>';
  }

  /* ============================================================
     STEP 2 — PLAN LOADING
     ============================================================ */
  var PLAN_PHASES = ['Reading your research\u2026', 'Mapping your priorities\u2026', 'Building your action steps\u2026', 'Finalizing your plan.'];

  function screenPlanLoading() {
    return gtmBuildLoadingScreen(PLAN_PHASES);
  }

  /* ============================================================
     STEP 3 — PLAN OUTPUT
     ============================================================ */
  function gtmBuildPlanActions() {
    var s = gtmStrategy();
    var p = gtmPersona();
    var biz = gtmBiz();

    var ctx = {
      bizName: (biz.name && biz.name.trim()) ? biz.name.trim() : 'your business',
      gapHeadline: (s.marketScan && s.marketScan.gapHeadline) ? s.marketScan.gapHeadline : 'a clear opening in your market',
      personaName: (p.name && p.name.trim()) ? p.name.trim() : 'your customer',
      personaTrigger: (p.trigger && p.trigger.trim()) ? p.trigger.trim() : '',
      topCare: (p.caresAbout && p.caresAbout.length) ? p.caresAbout[0] : ''
    };

    var defs = GTM_PLAN_DATA[gtmTypeKey()];
    return defs.map(function (d) {
      return { title: d.title, desc: d.desc(ctx), owner: d.owner, timeline: d.timeline, priority: d.priority };
    });
  }

  function gtmPriorityChip(priority) {
    var color = priority === 'P0' ? 'var(--ob-coral)' : (priority === 'P1' ? 'var(--ob-gold)' : 'var(--ob-muted)');
    return '<span class="gtm-chip gtm-chip-priority" style="color:' + color + ';border-color:' + color + '">' + priority + '</span>';
  }

  /* Read-only plan action cards — shared by plan-output and the completed view */
  function gtmPlanCardsHtml() {
    var actions = gtmBuildPlanActions();
    return actions.map(function (a, i) {
      return '<div class="gtm-action-card">'
        + '<div class="gtm-action-num">' + (i + 1) + '</div>'
        + '<div class="gtm-action-body">'
        + '<div class="gtm-action-title">' + gtmEsc(a.title) + '</div>'
        + '<div class="gtm-action-desc">' + gtmEsc(a.desc) + '</div>'
        + '<div class="gtm-action-chips">'
        + '<span class="gtm-chip">' + a.owner + '</span>'
        + '<span class="gtm-chip">' + a.timeline + '</span>'
        + gtmPriorityChip(a.priority)
        + '</div>'
        + '</div></div>';
    }).join('');
  }

  function screenPlanOutput() {
    var biz = gtmBiz();
    var bizName = (biz.name && biz.name.trim()) ? biz.name.trim() : 'Your Business';

    var body = '<div class="gtm-eyebrow">MY PLAN</div>'
      + '<div class="gtm-heading">' + gtmEsc(bizName) + ' \u2014 90-Day Action Plan</div>'
      + '<div class="gtm-action-list">' + gtmPlanCardsHtml() + '</div>'
      + '<button class="gtm-btn-primary gtm-btn-lg" onclick="gtmContinueToPricing()">Continue to My Pricing &#8594;</button>';

    return '<div class="gtm-screen">'
      + gtmTopbar('Back to My Plan setup', 'gtmBackToPlanContext()')
      + '<div class="gtm-body"><div class="gtm-content-wrap gtm-content-wrap-wide">' + body + '</div></div>'
      + '</div>';
  }

  /* ============================================================
     STEP 4 — PRICING CONTEXT
     ============================================================ */
  function gtmPricingField(id, label, placeholder, value, prefix, note) {
    return '<div class="gtm-price-card">'
      + '<label class="gtm-focus-label">' + label + '</label>'
      + '<div class="gtm-price-input-wrap">'
      + (prefix ? '<span class="gtm-price-prefix">' + prefix + '</span>' : '')
      + '<input type="text" class="gtm-focus-input gtm-price-input" id="' + id + '" value="' + gtmAttrEsc(value) + '"'
      + ' placeholder="' + gtmAttrEsc(placeholder) + '" oninput="gtmSetPricingInput(\'' + id.replace('gtm-price-', '') + '\', this.value)" />'
      + '</div>'
      + (note ? '<div class="gtm-price-note">' + note + '</div>' : '')
      + '</div>';
  }

  function screenPricingContext() {
    var f = gtmFlowState();
    var inputs = f.pricingInputs || {};
    var type = gtmTypeKey();

    if (!inputs.marketAvg && GTM_MARKET_AVG_DEFAULT[type]) {
      inputs.marketAvg = GTM_MARKET_AVG_DEFAULT[type];
    }

    var grid = '<div class="gtm-price-grid">'
      + gtmPricingField('gtm-price-avgOrder',   'AVG ORDER', 'Your typical sale value', inputs.avgOrder || '', '$')
      + gtmPricingField('gtm-price-marketAvg',  'MARKET AVG', 'Typical sale value for your category', inputs.marketAvg || '', '$', 'AI suggested based on your competitor scan')
      + gtmPricingField('gtm-price-margin',     'MARGIN', 'Your profit margin', inputs.margin || '', '%')
      + gtmPricingField('gtm-price-bestSeller', 'BEST SELLER', 'Your top product or service', inputs.bestSeller || '', '')
      + '</div>';

    var body = '<div class="gtm-eyebrow">MY PRICING</div>'
      + '<div class="gtm-heading">Stress-test your prices against the market.</div>'
      + '<p class="gtm-sub">A few numbers help Clarity find pricing moves that fit how ' + gtmEsc((gtmBiz().name || 'your business')) + ' actually sells today.</p>'
      + grid
      + '<div class="gtm-price-error" id="gtm-price-error" style="display:none">Please fill in all four fields before continuing.</div>'
      + '<button class="gtm-btn-primary gtm-btn-lg" onclick="gtmGeneratePricing()">Generate pricing suggestions &#8594;</button>';

    return '<div class="gtm-screen">'
      + gtmTopbar('Back to My Plan', 'gtmBackToPlanOutput()')
      + '<div class="gtm-body"><div class="gtm-content-wrap">' + body + '</div></div>'
      + '</div>';
  }

  /* ============================================================
     STEP 5 — PRICING LOADING
     ============================================================ */
  var PRICING_PHASES = ['Analysing your numbers\u2026', 'Comparing to your market\u2026', 'Finding your best angles\u2026', 'Building your suggestions.'];

  function screenPricingLoading() {
    return gtmBuildLoadingScreen(PRICING_PHASES);
  }

  /* ============================================================
     STEP 6 — PRICING OUTPUT
     ============================================================ */
  function gtmBuildPricingSuggestions() {
    var f = gtmFlowState();
    var inputs = f.pricingInputs || {};
    var p = gtmPersona();

    var bestSeller = (inputs.bestSeller && inputs.bestSeller.trim()) ? inputs.bestSeller.trim() : 'your best seller';
    var avgOrderFmt = inputs.avgOrder ? '$' + inputs.avgOrder : 'your current average';

    var ctx = { bestSeller: bestSeller, avgOrderFmt: avgOrderFmt };
    var defs = GTM_PRICING_DATA[gtmTypeKey()];

    var personaName = (p.name && p.name.trim()) ? p.name.trim() : 'your persona';
    var topCare = (p.caresAbout && p.caresAbout.length) ? p.caresAbout[0] : 'what matters most to them';

    return defs.map(function (d) {
      return {
        headline: d.headline,
        explain: d.explain(ctx),
        personaLine: 'This works because ' + personaName + ' responds to ' + topCare + '.',
        impact: d.impact,
        effort: d.effort
      };
    });
  }

  function gtmImpactEffortChip(kind, level) {
    var color;
    if (kind === 'impact') {
      color = level === 'High' ? 'var(--ob-teal)' : (level === 'Medium' ? 'var(--ob-gold)' : 'var(--ob-coral)');
    } else {
      color = level === 'High' ? 'var(--ob-coral)' : (level === 'Medium' ? 'var(--ob-gold)' : 'var(--ob-teal)');
    }
    var label = (kind === 'impact' ? 'Impact: ' : 'Effort: ') + level;
    return '<span class="gtm-chip gtm-chip-outline" style="color:' + color + ';border-color:' + color + '">' + label + '</span>';
  }

  /* Read-only pricing suggestion cards — shared by pricing-output and the completed view */
  function gtmPricingCardsHtml() {
    var suggestions = gtmBuildPricingSuggestions();
    return suggestions.map(function (s, i) {
      return '<div class="gtm-adjust-card">'
        + '<div class="gtm-adjust-eyebrow">ADJUSTMENT ' + (i + 1) + '</div>'
        + '<div class="gtm-adjust-headline">' + gtmEsc(s.headline) + '</div>'
        + '<div class="gtm-adjust-explain">' + gtmEsc(s.explain) + '</div>'
        + '<div class="gtm-adjust-persona">' + gtmEsc(s.personaLine) + '</div>'
        + '<div class="gtm-action-chips">'
        + gtmImpactEffortChip('impact', s.impact)
        + gtmImpactEffortChip('effort', s.effort)
        + '</div>'
        + '</div>';
    }).join('');
  }

  function screenPricingOutput() {
    var body = '<div class="gtm-eyebrow">MY PRICING</div>'
      + '<div class="gtm-heading">Three ways to grow your revenue.</div>'
      + '<div class="gtm-adjust-list">' + gtmPricingCardsHtml() + '</div>'
      + '<button class="gtm-btn-primary gtm-btn-lg" onclick="gtmLockInStrategy()">Lock in my GTM strategy &#8594;</button>';

    return '<div class="gtm-screen">'
      + gtmTopbar('Back to Pricing setup', 'gtmBackToPricingContext()')
      + '<div class="gtm-body"><div class="gtm-content-wrap gtm-content-wrap-wide">' + body + '</div></div>'
      + '</div>';
  }

  /* ============================================================
     COMPLETED VIEW — read-only revisit from the dashboard
     Tabbed view reusing Strategic Planning's buildTabsUI()/spSwitchTab():
     "My Plan" (default) + "My Pricing". No view-all toggle, no PDF,
     no forward/edit buttons; only "Back to Dashboard" up top.
     ============================================================ */
  function screenGtmCompletedView() {
    var biz = gtmBiz();
    var bizName = (biz.name && biz.name.trim()) ? biz.name.trim() : 'Your Business';
    var accent = 'var(--ob-gold)';

    var planContent = '<div class="sp-tab-content-title" style="color:' + accent + '">' + gtmEsc(bizName) + '</div>'
      + '<div class="gtm-action-list">' + gtmPlanCardsHtml() + '</div>';

    var pricingContent = '<div class="sp-tab-content-title" style="color:' + accent + '">Three ways to grow your revenue.</div>'
      + '<div class="gtm-adjust-list">' + gtmPricingCardsHtml() + '</div>';

    var tabsHtml = window.buildTabsUI
      ? window.buildTabsUI({
          wrapId: 'gtm-completed-tabs',
          accentVar: accent,
          hideViewAll: true,
          tabs: [
            { label: 'My Plan',    content: planContent },
            { label: 'My Pricing', content: pricingContent }
          ]
        })
      : '';

    return '<div class="gtm-screen">'
      + gtmTopbar('Back to Dashboard', 'setMode(\'dashboard\')')
      + '<div class="gtm-body"><div class="gtm-content-wrap gtm-content-wrap-wide">' + tabsHtml + '</div></div>'
      + '</div>';
  }

  /* ============================================================
     DISPATCH
     ============================================================ */
  function screenGtmFlow() {
    var c = gtmActiveConcept();
    var conceptId = c ? c.id : null;

    /* Guard against a stale GTM flow state carried over from a different
       concept (e.g. one that already completed GTM). Any entry point that
       forgets to reset gtmFlow (like skipping straight in from Persona Chat)
       would otherwise resume mid-flow or jump to a finished pricing-output
       screen for a concept that has never touched GTM. Reset to fresh
       defaults whenever the tracked concept doesn't match the active one
       and this concept's GTM isn't actually complete. */
    if (state.gtmFlow && state.gtmFlow._conceptId !== conceptId && !(c && c.gtmComplete)) {
      state.gtmFlow = {
        step: 'plan-context',
        planFocus: '',
        pricingInputs: { avgOrder: '', marketAvg: '', margin: '', bestSeller: '' },
        returnTo: null,
        _conceptId: conceptId
      };
    } else if (state.gtmFlow) {
      state.gtmFlow._conceptId = conceptId;
    }

    var st = gtmFlowState();
    /* Revisiting a finished GTM strategy from the dashboard → read-only combined view */
    if (st.returnTo === 'dashboard' && c && c.gtmComplete) return screenGtmCompletedView();

    var step = st.step;
    if (step === 'plan-loading')    return screenPlanLoading();
    if (step === 'plan-output')     return screenPlanOutput();
    if (step === 'pricing-context') return screenPricingContext();
    if (step === 'pricing-loading') return screenPricingLoading();
    if (step === 'pricing-output')  return screenPricingOutput();
    return screenPlanContext();
  }

  return {
    init: init,
    screenGtmFlow: screenGtmFlow,
    gtmFlowState: gtmFlowState,
    checkLoadingHook: checkLoadingHook,
    runLoadingPhases: gtmRunLoadingPhases,
    planPhases: PLAN_PHASES,
    pricingPhases: PRICING_PHASES,
    buildPlanActions: gtmBuildPlanActions,
    buildPricingSuggestions: gtmBuildPricingSuggestions
  };
})();

window.screenGtmFlow = function () { return GtmFlow.screenGtmFlow(); };
window.gtmCheckLoadingHook = function () { GtmFlow.checkLoadingHook(); };

/* ===================== NAVIGATION & HANDLERS ===================== */
window.gtmBackToPersona = function () { setMode('persona-studio'); };

window.gtmBackToPlanContext = function () {
  GtmFlow.gtmFlowState().step = 'plan-context';
  renderContent();
};

window.gtmBackToPlanOutput = function () {
  GtmFlow.gtmFlowState().step = 'plan-output';
  renderContent();
};

window.gtmBackToPricingContext = function () {
  GtmFlow.gtmFlowState().step = 'pricing-context';
  renderContent();
};

window.gtmSetPlanFocus = function (val) {
  GtmFlow.gtmFlowState().planFocus = val;
};

window.gtmGeneratePlan = function () {
  var el = document.getElementById('gtm-plan-focus');
  if (el) GtmFlow.gtmFlowState().planFocus = el.value;
  GtmFlow.gtmFlowState().step = 'plan-loading';
  renderContent();
};

window.gtmStartPlanLoading = function () {
  GtmFlow.runLoadingPhases(GtmFlow.planPhases, function () {
    GtmFlow.gtmFlowState().step = 'plan-output';
    renderContent();
  });
};

window.gtmContinueToPricing = function () {
  var c = gtmActiveConcept();
  if (c) {
    if (!c.gtm) c.gtm = { plan: { actions: [] }, pricing: { inputs: {}, suggestions: [] } };
    c.gtm.plan.actions = GtmFlow.buildPlanActions();
  }
  GtmFlow.gtmFlowState().step = 'pricing-context';
  renderContent();
};

window.gtmSetPricingInput = function (key, val) {
  GtmFlow.gtmFlowState().pricingInputs[key] = val;
};

window.gtmGeneratePricing = function () {
  var f = GtmFlow.gtmFlowState();
  var inputs = f.pricingInputs || {};
  var errEl = document.getElementById('gtm-price-error');
  var ok = !!(inputs.avgOrder && String(inputs.avgOrder).trim())
    && !!(inputs.marketAvg && String(inputs.marketAvg).trim())
    && !!(inputs.margin && String(inputs.margin).trim())
    && !!(inputs.bestSeller && String(inputs.bestSeller).trim());
  if (!ok) {
    if (errEl) errEl.style.display = 'block';
    return;
  }
  if (errEl) errEl.style.display = 'none';
  f.step = 'pricing-loading';
  renderContent();
};

window.gtmStartPricingLoading = function () {
  GtmFlow.runLoadingPhases(GtmFlow.pricingPhases, function () {
    GtmFlow.gtmFlowState().step = 'pricing-output';
    renderContent();
  });
};

window.gtmLockInStrategy = function () {
  var c = gtmActiveConcept();
  var f = GtmFlow.gtmFlowState();
  if (c) {
    if (!c.gtm) c.gtm = { plan: { actions: [] }, pricing: { inputs: {}, suggestions: [] } };
    c.gtm.pricing.suggestions = GtmFlow.buildPricingSuggestions();
    c.gtm.pricing.inputs = {
      avgOrder:   f.pricingInputs.avgOrder,
      marketAvg:  f.pricingInputs.marketAvg,
      margin:     f.pricingInputs.margin,
      bestSeller: f.pricingInputs.bestSeller
    };
    c.gtmComplete = true;
  }
  if (window._saveLaunchpadState) window._saveLaunchpadState();
  setTransition({
    title: 'GTM Strategy',
    summary: 'Your go-to-market plan is set.',
    nextBadge: 'Launchpad ready',
    nextMode: 'launchpad-home'
  });
};
