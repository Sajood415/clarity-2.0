/* ============================================================
   STRATEGY FLOW  —  IIFE module
   Screens: hub | market-scan (1-3) | customer-intel (1-3) | competition (1-3)
   ============================================================ */
var StrategyFlow = (function () {
  var state;

  /* ---- Module accent colors ---- */
  var MS_COLOR   = '#d4a853';
  var CI_COLOR   = '#2dd4bf';
  var COMP_COLOR = '#e07b6a';

  function init(s) {
    state = s;
    if (!state.strategyFlow) {
      state.strategyFlow = { screen: 'hub', marketScan: { step: 1, focus: '' }, customerIntel: { step: 1, focus: '' }, competition: { step: 1, focus: '' } };
    }
    if (!state.strategy) {
      state.strategy = { marketScan: null, customerIntelligence: null, competition: null };
    }
  }

  function spFlow() {
    if (!state.strategyFlow) state.strategyFlow = { screen: 'hub', marketScan: { step: 1, focus: '' }, customerIntel: { step: 1, focus: '' }, competition: { step: 1, focus: '' } };
    return state.strategyFlow;
  }

  function spTopbar(backLabel, backAction) {
    return '<div class="cf-topbar">'
      + '<div class="cf-brand">Clarity <span>Strategic Planning</span></div>'
      + '<button class="app-topbar-back" onclick="' + backAction + '">&#8592; ' + backLabel + '</button>'
      + '</div>';
  }

  /* ============================================================
     HUB — sequential module cards
     ============================================================ */
  function spScreenHub() {
    var msComplete   = !!(state.strategy && state.strategy.marketScan);
    var ciComplete   = !!(state.strategy && state.strategy.customerIntelligence);
    var compComplete = !!(state.strategy && state.strategy.competition);

    var msStatus   = msComplete   ? 'complete' : 'active';
    var ciStatus   = msComplete   ? (ciComplete   ? 'complete' : 'active') : 'locked';
    var compStatus = ciComplete   ? (compComplete  ? 'complete' : 'active') : 'locked';

    var allComplete = msComplete && ciComplete && compComplete;

    function moduleCard(opts) {
      var isLocked   = opts.status === 'locked';
      var isComplete = opts.status === 'complete';
      var isActive   = opts.status === 'active';

      var badge = isLocked
        ? '<div class="sp-mod-badge locked"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg> Locked</div>'
        : isComplete
          ? '<div class="sp-mod-badge complete">&#10003; Complete</div>'
          : '<div class="sp-mod-badge active"><span class="sp-mod-dot"></span>Active</div>';

      var clickAttr = (!isLocked && opts.onclick) ? ' onclick="' + opts.onclick + '"' : '';
      var cls = 'sp-module-card' + (opts.slug ? ' ' + opts.slug : '') + (isLocked ? ' locked' : '') + (isComplete ? ' complete' : '') + (isActive ? ' active' : '');
      var cta = isLocked ? ''
        : isComplete
          ? '<button class="sp-module-cta outline">View Report</button>'
          : '<button class="sp-module-cta primary">Start ' + opts.title + ' &#8594;</button>';

      return '<div class="' + cls + '"' + clickAttr + '>'
        + '<div class="sp-module-card-top"><div class="sp-module-icon">' + opts.icon + '</div>' + badge + '</div>'
        + '<div class="sp-module-title">' + opts.title + '</div>'
        + '<div class="sp-module-desc">' + opts.desc + '</div>'
        + '<div class="sp-module-footer">' + cta + '</div>'
        + '</div>';
    }

    var scanIcon = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>';
    var custIcon = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>';
    var compIcon = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>';

    var cards = moduleCard({ slug: 'ms',   icon: scanIcon, title: 'Market Scan',          status: msStatus,   onclick: 'spGoMarketScan()',    desc: 'Scan your market for emerging trends, competitive gaps, and opportunity signals grounded in your business context.' })
      + moduleCard({ slug: 'ci',   icon: custIcon, title: 'Customer Intelligence', status: ciStatus,   onclick: 'spGoCustomerIntel()', desc: 'Understand who is buying, what motivates them, and how they make decisions — so your content speaks their language.' })
      + moduleCard({ slug: 'comp', icon: compIcon, title: 'Competition',            status: compStatus, onclick: 'spGoCompetition()',    desc: 'Map your competitive landscape, identify whitespace, and understand how to position against key players.' });

    var continueBtn = allComplete
      ? '<div class="sp-hub-continue"><button class="btn sp-btn-save" onclick="spGoToPersona()">Continue to Persona Studio &#8594;</button></div>'
      : '';

    return '<div class="sp-hub-wrap">'
      + spTopbar('Back to home', 'spGoWelcome()')
      + '<div class="sp-hub-body">'
      + '<div class="sp-hub-eyebrow">Strategic Planning</div>'
      + '<div class="sp-hub-title">Build your strategic foundation</div>'
      + '<div class="sp-hub-sub">Three research modules that give Clarity the context it needs to generate targeted, high-quality content for your business.</div>'
      + '<div class="sp-modules-grid">' + cards + '</div>'
      + continueBtn
      + '</div></div>';
  }

  /* ============================================================
     SHARED: context screen
     ============================================================ */
  function buildContextScreen(opts) {
    var biz = state.business || {};
    var typeLabels = { food: 'Food & Hospitality', retail: 'Retail & Products', creative: 'Creative & Design', tech: 'Tech & Software', trades: 'Trades & Services', other: 'Other' };
    var typeName = typeLabels[biz.type] || biz.type || 'Not specified';
    var bizName  = (biz.name && biz.name.trim()) ? biz.name.trim() : '\u2014';
    var bizDesc  = (biz.description && biz.description.trim()) ? biz.description.trim() : '\u2014';
    var focusVal = (opts.focusVal || '').replace(/"/g, '&quot;');
    var locs     = biz.locations || [];
    var locLabel = locs.length
      ? (locs[0] === 'Global' ? 'Global / Worldwide' : locs.join(', '))
      : '\u2014';

    var contextCard = '<div class="ms-context-card">'
      + '<div class="ms-context-label">Your business context</div>'
      + '<div class="ms-context-row"><span class="ms-context-key">Business</span><span class="ms-context-val">' + bizName + '</span></div>'
      + '<div class="ms-context-row"><span class="ms-context-key">Category</span><span class="ms-context-val">' + typeName + '</span></div>'
      + '<div class="ms-context-row"><span class="ms-context-key">Location</span><span class="ms-context-val">' + locLabel + '</span></div>'
      + '<div class="ms-context-row border-0"><span class="ms-context-key">About</span><span class="ms-context-val">' + bizDesc + '</span></div>'
      + '</div>';

    var focusField = '<div class="ms-focus-wrap">'
      + '<label class="ms-focus-label">' + opts.focusLabel + ' <span class="ms-optional">(optional)</span></label>'
      + '<input type="text" id="' + opts.focusId + '" class="ms-focus-input" value="' + focusVal + '"'
      + ' placeholder="' + opts.focusPlaceholder + '" oninput="' + opts.focusOninput + '(this.value)" />'
      + '<div class="ms-focus-hint">Leave blank to run a general analysis for your category.</div>'
      + '</div>';

    var footer = '<div class="cf-footer">'
      + '<button class="btn btn-outline" onclick="spGoHub()">&#8592; Back</button>'
      + '<div class="cf-footer-mid"><span class="cf-eta">' + opts.eta + '</span></div>'
      + '<button class="btn btn-primary" onclick="' + opts.runAction + '()">' + opts.runLabel + ' &#8594;</button>'
      + '</div>';

    return '<div class="cf-screen">'
      + spTopbar('Back to Strategic Planning', 'spGoHub()')
      + '<div class="ms-body"><div class="ms-context-wrap">'
      + '<div class="cf-step-title">' + opts.title + '</div>'
      + '<div class="cf-step-sub">' + opts.sub + '</div>'
      + contextCard + focusField
      + '</div></div>' + footer + '</div>';
  }

  /* ============================================================
     SHARED: loading screen
     ============================================================ */
  function buildLoadingScreen(phases) {
    return '<div class="ms-loading-screen">'
      + '<div class="ms-loading-inner">'
      + '<div class="ms-loading-orb"><div class="ms-orb-ring"></div><div class="ms-orb-ring delay1"></div><div class="ms-orb-ring delay2"></div></div>'
      + '<div class="ms-loading-brand">Clarity</div>'
      + '<div class="ms-loading-phase" id="ms-loading-phase">' + phases[0] + '</div>'
      + '<div class="ms-loading-bar-track"><div class="ms-loading-bar" id="ms-loading-bar" style="width:25%"></div></div>'
      + '<div class="ms-loading-phases-list">'
      + phases.map(function (p, i) {
          return '<div class="ms-phase-item" id="ms-phase-item-' + i + '"' + (i === 0 ? ' style="opacity:1"' : '') + '>'
            + '<span class="ms-phase-dot" id="ms-phase-dot-' + i + '">' + (i === 0 ? '&#9679;' : '&#9675;') + '</span>'
            + p.replace(/\u2026$/, '') + '</div>';
        }).join('')
      + '</div></div></div>';
  }

  /* ============================================================
     SHARED: report frame
     ============================================================ */
  function buildReportScreen(opts) {
    var now    = new Date();
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var biz    = state.business || {};
    var bizName = (biz.name && biz.name.trim()) ? biz.name.trim() : 'Your Business';
    var accent = opts.accentColor || MS_COLOR;

    /* Header — own card within the report column */
    var pdfBtn = '<button class="ms-pdf-btn" onclick="downloadReportPDF()" title="Download as PDF">'
      + '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>'
      + ' Download PDF</button>';

    var header = '<div class="ms-report-header ms-stage-section" style="border-left:3px solid ' + accent + '">'
      + '<div class="ms-report-header-left"><div class="ms-report-eyebrow" style="color:' + accent + '">' + opts.eyebrow + '</div><div class="ms-report-biz">' + bizName + '</div></div>'
      + '<div class="ms-report-header-right">' + pdfBtn + '<div class="ms-report-date">' + months[now.getMonth()] + ' ' + now.getDate() + ', ' + now.getFullYear() + '</div>'
      + '<div class="ms-report-status-chip">AI Generated &middot; Mock Data</div></div>'
      + '</div>';

    /* Stage progress bar — fills as sections reveal */
    var progressBar = '<div class="sp-stage-progress"><div class="sp-stage-bar" id="sp-stage-bar" style="background:' + accent + ';width:0%"></div></div>';

    var footer = '<div class="cf-footer">'
      + '<button class="btn btn-outline sp-btn-warm-outline" onclick="' + opts.rerunAction + '()">&#8635; Re-run</button>'
      + '<div class="cf-footer-mid"><span class="cf-eta">' + opts.eyebrow + '</span></div>'
      + '<button class="btn sp-btn-save" onclick="' + opts.saveAction + '()">Looks good, save this &#8594;</button>'
      + '</div>';

    var isLib   = !!(state.libraryMode);
    var backLbl = isLib ? 'Back to library'  : 'Back to Strategic Planning';
    var backFn  = isLib ? 'libGoBack()'      : 'spGoHub()';

    return '<div class="cf-screen">'
      + spTopbar(backLbl, backFn)
      + '<div class="ms-body ms-report-body"><div class="ms-report-card">'
      + header + opts.sections.join('') + '</div></div>'
      + progressBar
      + footer + '</div>';
  }

  /* Highlight key numbers/stats in narrative text with accent color */
  function hlStat(text, color) {
    if (!color || !text) return text;
    return text.replace(/(\$[\d,.]+(?:[MBKT](?:illion)?)?(?:\/(?:month|year|project))?|[\d]+(?:\.\d+)?(?:%|×|x)(?:\s*CAGR)?|[\d]+(?:\.\d+)?–[\d]+(?:\.\d+)?%?|[\d]+(?:\.\d+)?(?:\s*(?:CAGR|ARR|YoY))|[\d]+(?:\s*–\s*[\d]+)?\s*(?:weeks?|months?|years?|times?)\b)/g,
      function(m) { return '<strong style="color:' + color + ';font-weight:600">' + m + '</strong>'; });
  }

  /* ============================================================
     MARKET SCAN
     ============================================================ */
  function msScreenContext() {
    var f = spFlow().marketScan || {};
    return buildContextScreen({ title: 'Confirm your context', sub: 'We\'ll run your Market Scan against this information.', focusLabel: 'Anything specific you want us to focus on?', focusPlaceholder: 'e.g. weekend farmers market customers in Auckland', focusId: 'ms-focus-input', focusOninput: 'msFocusInput', focusVal: f.focus || '', runLabel: 'Run Market Scan', runAction: 'msRunScan', eta: 'Market Scan \u00b7 3 screens' });
  }
  function msScreenLoading() {
    return buildLoadingScreen(['Scanning your market\u2026', 'Identifying key trends\u2026', 'Finding your gap\u2026', 'Building your report\u2026']);
  }

  function msGetReportData() {
    var t = (state.business && state.business.type) || 'other';
    var d = {
      food: { overview: 'The local food and hospitality market is experiencing strong growth in artisan and experience-led dining, with specialty food businesses growing at 8.4% annually across Australasia. Consumers are actively seeking out authentic, locally sourced products and willing to pay a meaningful premium for provenance and founder-led storytelling. Independent operators are well-positioned to capture this sentiment where chains cannot.', trend: { icon: '📈', headline: 'The \'Local First\' Premium', body: 'Consumers are paying 20–35% more for food products with verified local provenance and clear founder stories — a gap that supermarkets and chains are structurally unable to fill.' }, gap: { headline: 'Your opportunity', body: 'There is a clear opening for independent food businesses that deliver artisan quality with the consistency and visibility of a small chain. Most local operators underinvest in brand — the gap is in the story and the reach, not the product itself.' }, competitors: [{ name: 'Chain Operators', pos: 'Volume and price. Limited local authenticity or founder connection.' }, { name: 'Ghost Kitchens', pos: 'Delivery-first, no dine-in experience or brand depth.' }, { name: 'Supermarket Deli', pos: 'Convenience-led. Low emotional connection with customers.' }], evidence: [{ pub: 'Food & Beverage Quarterly', snippet: 'Artisan food sector grew 8.4% YoY, outpacing mainstream grocery', confidence: '87%' }, { pub: 'IBISWorld NZ', snippet: 'Independent café closures offset by premium niche openings in 2025', confidence: '82%' }, { pub: 'Statista Consumer Trends', snippet: '67% of consumers willing to pay premium for locally sourced ingredients', confidence: '91%' }] },
      retail: { overview: 'Retail is undergoing a fundamental shift toward direct-to-consumer models, with physical retail consolidating while online-first independent brands take share. Shoppers are bypassing traditional chains in favour of niche brands with a clear point of view. The mid-market is hollowing out — creating a structural opening for specialist independents with strong brand identity.', trend: { icon: '🛍️', headline: 'DTC Brands Are Winning on Story', body: 'Retail brands with a clear founder narrative and community-first approach are growing 3× faster than category averages — with customer lifetime value meaningfully higher than acquisition-led peers.' }, gap: { headline: 'Your opportunity', body: 'Mid-market retail is contracting on both ends. Specialist independents who invest in community before conversion — and who build emotional brand equity alongside their product — are capturing the loyalty that mass-market players cannot.' }, competitors: [{ name: 'Mass-Market Chains', pos: 'Price and range. No community depth or brand intimacy.' }, { name: 'E-commerce Aggregators', pos: 'High discoverability via marketplace. Low brand loyalty.' }, { name: 'Pop-Up Specialists', pos: 'Event-led presence. Limited repeat purchase infrastructure.' }], evidence: [{ pub: 'Retail Intelligence Report', snippet: 'DTC brands outperforming wholesale-led peers by 3.1× in 2025', confidence: '89%' }, { pub: 'Nielsen Consumer Pulse', snippet: 'Independent retail share of wallet up 12% among 25–44 demographic', confidence: '84%' }, { pub: 'Deloitte Commerce Study', snippet: 'Brand story cited as top purchase driver for 58% of independent retail shoppers', confidence: '79%' }] },
      creative: { overview: 'The creative services market is expanding rapidly, driven by the explosion in content demand across digital channels. Businesses of every size now require visual identity, video, and social content — creating a large addressable market for independent creative operators. AI tools are reshaping production economics while simultaneously increasing demand for high-touch, strategic creative work that AI cannot replicate.', trend: { icon: '✨', headline: 'High-Touch Creative Outperforms AI-First', body: 'Clients are actively seeking human-led studios after disappointing results from AI-only production. Premium positioning is less competitive than mid-market, with higher client retention and larger project values.' }, gap: { headline: 'Your opportunity', body: 'Most creative operators compete on portfolio. Almost none compete on outcome-based positioning — articulating the revenue impact or brand equity their work creates. Independents who package strategy + execution together command significantly higher rates and lower client churn.' }, competitors: [{ name: 'Large Creative Agencies', pos: 'Full-service but expensive and slow. Often over-built for SMBs.' }, { name: 'Freelance Marketplaces', pos: 'Low cost. No strategic layer, inconsistent quality and accountability.' }, { name: 'In-House Teams', pos: 'Internal alignment advantage. Limited external perspective and capacity.' }], evidence: [{ pub: 'Adobe Creative Economy Report', snippet: 'Independent creative operators grew revenue 14% YoY, outpacing the agency sector', confidence: '86%' }, { pub: 'Clutch B2B Research', snippet: '71% of SMB clients prefer boutique studios for brand-defining projects', confidence: '83%' }, { pub: 'Statista Digital Marketing', snippet: 'Global creative services market projected to reach $780B by 2027', confidence: '88%' }] },
      tech: { overview: 'SaaS adoption across SMB and enterprise segments continues to accelerate, with global software spending projected to exceed $1.1 trillion by 2027. The new battleground is vertical SaaS — purpose-built tools for specific industries that deliver faster time-to-value than horizontal platforms. AI-native product features are now a baseline expectation rather than a differentiator, shifting competition toward user experience and niche depth.', trend: { icon: '⚡', headline: 'Vertical SaaS Is Capturing Mid-Market', body: 'Industry-specific software is growing at 2.4× the rate of horizontal SaaS, with SMBs prioritising solutions that require minimal configuration and deliver immediate value within their workflow.' }, gap: { headline: 'Your opportunity', body: 'The SMB software market remains meaningfully underserved in the $50–$200/month tier. Founders who can simplify complex workflows for a clearly defined niche build defensible positions that large horizontal platforms are reluctant to attack.' }, competitors: [{ name: 'Enterprise Platforms', pos: 'Feature-rich but over-engineered for SMBs. Long sales cycles, high switching cost.' }, { name: 'Generic SaaS Tools', pos: 'Affordable but require heavy customisation, integrations, and training.' }, { name: 'Spreadsheet Workarounds', pos: 'Familiar and flexible. Error-prone, unscalable — the primary incumbent in underserved niches.' }], evidence: [{ pub: 'Gartner Software Report', snippet: 'Vertical SaaS growing at 24% CAGR vs 11% for horizontal platforms through 2027', confidence: '92%' }, { pub: 'Bessemer Venture Partners', snippet: 'SMB SaaS ARR multiples highest in vertical-specific segments globally', confidence: '85%' }, { pub: 'IDC Cloud Index', snippet: '$1.1T in global software spending projected for 2027', confidence: '90%' }] },
      trades: { overview: 'The skilled trades and services sector is experiencing robust demand driven by housing activity, infrastructure investment, and ageing property stock. Operators who invest in professional branding and digital presence command 25–40% price premiums over equivalently skilled competitors. The market is large, fragmented, and structurally underbranded — making trust-led differentiation both achievable and durable.', trend: { icon: '🏗️', headline: 'Brand Trust Is the New Pricing Power', body: 'Tradespeople with strong online reviews and professional presentation are booking out 6–8 weeks in advance while unbranded competitors compete on price — a gap that is widening, not narrowing.' }, gap: { headline: 'Your opportunity', body: 'The trades sector has a significant trust deficit — most operators rely entirely on word of mouth with no owned marketing presence. Building a consistent brand presence creates a durable competitive moat that the majority of competitors cannot quickly or cheaply replicate.' }, competitors: [{ name: 'National Service Franchises', pos: 'Consistent systems and recognition. Expensive, impersonal, slow to respond.' }, { name: 'Online Marketplaces', pos: 'High discoverability. Race-to-bottom pricing pressure, no brand loyalty.' }, { name: 'Unbranded Sole Traders', pos: 'Lower overhead. No digital presence, no trust signals, no repeat business infrastructure.' }], evidence: [{ pub: 'BCI Construction Analytics', snippet: 'Branded trade operators charge 28% premium on average residential jobs vs unbranded peers', confidence: '83%' }, { pub: 'Google Business Insights NZ', snippet: 'Trades businesses with 4.5+ star rating convert 3× more inbound leads', confidence: '88%' }, { pub: 'Statista Home Services', snippet: 'Home services market growing at 6.1% annually, driven by urban property demand', confidence: '86%' }] },
      other: { overview: 'Your market sector is showing consistent growth driven by shifting consumer preferences and accelerating digital adoption. Businesses that invest in brand clarity and customer-centric positioning are capturing disproportionate share. Independent operators with a clearly defined niche are consistently outperforming generalist competitors on both retention and margin.', trend: { icon: '📊', headline: 'Niche Positioning Drives Premium Pricing', body: 'Businesses with a clearly defined customer and a differentiated value proposition command 20–30% higher prices and report meaningfully lower customer acquisition costs than category generalists.' }, gap: { headline: 'Your opportunity', body: 'Most businesses in this space compete on features or price without owning a clear point of view. The gap is in consistent, trust-building communication — businesses that show up reliably with relevant content build the relationships that convert and retain.' }, competitors: [{ name: 'Established Generalists', pos: 'Wide range and brand recognition. No clear niche depth or differentiated story.' }, { name: 'Low-Cost Alternatives', pos: 'Price-competitive. Sacrifice quality, relationship, and long-term customer value.' }, { name: 'Enterprise Providers', pos: 'High capability. Often inaccessible in price and responsiveness to smaller buyers.' }], evidence: [{ pub: 'Business Strategy Review', snippet: 'Niche-focused businesses outperform generalists on NPS and annual retention rates', confidence: '81%' }, { pub: 'Deloitte SMB Report', snippet: 'Brand investment ROI averages 3.7× for small businesses with under 50 employees', confidence: '79%' }, { pub: 'Statista Business Trends', snippet: 'Independent operator confidence index at 5-year high entering 2026', confidence: '85%' }] }
    };
    return d[t] || d.other;
  }

  function msScreenReport() {
    var d  = msGetReportData();
    var c  = MS_COLOR;
    var ml = 'Market Scan';
    var overview = msSection('Market Overview',
      '<div class="ms-section-card"><div class="ms-overview-text">' + hlStat(d.overview, c) + '</div></div>',
      c, ml);
    var trend = msSection('Key Trend',
      '<div class="ms-trend-callout"><div class="ms-trend-icon">' + d.trend.icon + '</div>'
      + '<div class="ms-trend-body"><div class="ms-trend-headline">' + d.trend.headline + '</div>'
      + '<div class="ms-trend-text">' + hlStat(d.trend.body, c) + '</div></div></div>',
      c, ml);
    var gap = msSection('Market Gap',
      '<div class="ms-gap-card"><div class="ms-gap-headline">' + d.gap.headline + '</div>'
      + '<div class="ms-gap-text">' + d.gap.body + '</div></div>',
      c, ml);
    var compCards = d.competitors.map(function (cv) {
      return '<div class="ms-comp-card"><div class="ms-comp-name">' + cv.name + '</div>'
        + '<div class="ms-comp-pos">' + cv.pos + '</div></div>';
    }).join('');
    var comp = msSection('Competitive Landscape', '<div class="ms-comp-grid">' + compCards + '</div>', c, ml);
    var evid = msSectionLast('Evidence', buildEvidenceRows(d.evidence), c, ml);
    return buildReportScreen({ eyebrow: 'Market Scan Report', accentColor: c, sections: [overview, trend, gap, comp, evid], saveAction: 'msSaveReport', rerunAction: 'msRerunScan' });
  }

  /* ============================================================
     CUSTOMER INTELLIGENCE
     ============================================================ */
  function ciScreenContext() {
    var f = spFlow().customerIntel || {};
    return buildContextScreen({ title: 'Confirm your context', sub: 'We\'ll run your Customer Intelligence analysis against this information.', focusLabel: 'Anything specific about your customers you want us to look into?', focusPlaceholder: 'e.g. first-time buyers vs repeat customers, or customers who gift to others', focusId: 'ci-focus-input', focusOninput: 'ciFocusInput', focusVal: f.focus || '', runLabel: 'Run Customer Intelligence', runAction: 'ciRunScan', eta: 'Customer Intelligence \u00b7 3 screens' });
  }
  function ciScreenLoading() {
    return buildLoadingScreen(['Analysing your customer category\u2026', 'Mapping decision journeys\u2026', 'Identifying emotional triggers\u2026', 'Building your profile\u2026']);
  }

  function ciGetReportData() {
    var t = (state.business && state.business.type) || 'other';
    var d = {
      food: { demographics: { chips: ['Ages 25–45', 'Mid–High Income', 'Urban Dwellers', 'Values Local'], summary: 'Urban and suburban adults who actively seek out quality-led food experiences. Skew toward women, dual-income households, and social buyers who use food as a form of self-expression and gifting.' }, jtbd: ['When I want to treat myself without guilt, I buy from a local artisan so I feel good about the indulgence.', 'When I\'m hosting people I care about, I buy premium local food so I feel proud of what I serve.', 'When I want to connect with my community, I shop at local markets so I feel part of something meaningful.'], journey: [{ step: 'Discover', desc: 'Instagram, word of mouth, or a local market stall' }, { step: 'Consider', desc: 'Checks freshness, provenance story, and brand values' }, { step: 'Decide', desc: 'Based on perceived quality, packaging, and trust' }, { step: 'Return', desc: 'When the experience felt personal and product delivered' }], triggers: ['Fear of missing out', 'Community belonging', 'Pride in supporting local', 'Treating themselves', 'Health consciousness'], wtp: { position: 62, label: 'Mid–High', spend: '$15–$45 per transaction', priority: 'quality and provenance over lowest price' }, evidence: [{ pub: 'Mintel Food & Drink Report', snippet: '72% of premium food buyers cite provenance as key purchase driver', confidence: '88%' }, { pub: 'Nielsen Consumer Panel', snippet: 'Repeat purchase rate 2.3× higher when brand has clear local story', confidence: '85%' }, { pub: 'Food Standards Australia NZ', snippet: 'Artisan food purchase frequency up 31% among 25–45 age group in 2025', confidence: '79%' }] },
      retail: { demographics: { chips: ['Ages 30–50', 'Dual Income', 'Suburban', 'Research-Led'], summary: 'Mid-career adults in dual-income households who research purchases carefully. Motivated by value alignment and brand story as much as product quality — and highly likely to become brand advocates when expectations are exceeded.' }, jtbd: ['When I need to replace something important, I research carefully so I feel confident I made the right choice.', 'When I discover a brand that aligns with my values, I buy more so I can feel like a supporter, not just a customer.', 'When I find a quality product I love, I tell my friends so I become the person who finds good things first.'], journey: [{ step: 'Discover', desc: 'Social media ads, search, or friend recommendation' }, { step: 'Consider', desc: 'Reads reviews, compares options, checks return policy' }, { step: 'Decide', desc: 'Based on perceived value, brand trust, ease of purchase' }, { step: 'Return', desc: 'When quality matched expectations and service felt responsive' }], triggers: ['Value for money', 'Social proof', 'Brand alignment', 'Discovery joy', 'Gifting instinct'], wtp: { position: 48, label: 'Mid', spend: '$40–$120 per transaction', priority: 'perceived value and quality over the lowest price' }, evidence: [{ pub: 'Retail Intelligence Quarterly', snippet: 'Brand loyalty 41% higher among DTC customers vs marketplace buyers', confidence: '86%' }, { pub: 'Shopify Commerce Report 2025', snippet: 'Average order value 28% higher when brand story prominently featured', confidence: '83%' }, { pub: 'Deloitte Consumer Pulse', snippet: '58% of independent retail customers return within 60 days when experience met expectations', confidence: '80%' }] },
      creative: { demographics: { chips: ['Ages 30–50', 'Business Owners', 'Time-Poor', 'Growth Focused'], summary: 'Founders and marketing managers at growing SMBs who need creative output but lack the in-house capacity to produce it. They buy on trust, chemistry, and confidence — not just portfolio.' }, jtbd: ['When I need to refresh my brand, I hire a creative studio so I can feel confident in how we show up.', 'When I\'m launching something important, I want creative support so it lands the way I\'ve imagined it.', 'When my in-house team is stretched, I bring in specialists so I can move faster without sacrificing quality.'], journey: [{ step: 'Discover', desc: 'Referrals, LinkedIn, or portfolio sites' }, { step: 'Consider', desc: 'Reviews work samples, checks process, requests a proposal' }, { step: 'Decide', desc: 'Based on chemistry, communication style, and confidence' }, { step: 'Return', desc: 'When the work generated real results and process felt smooth' }], triggers: ['Fear of looking amateur', 'Trust in specialist', 'Deadline pressure', 'Pride in output', 'Status signalling'], wtp: { position: 78, label: 'High', spend: '$2,000–$15,000 per project', priority: 'quality, speed, and creative confidence over cost' }, evidence: [{ pub: 'Clutch B2B Services Survey', snippet: '71% of creative buyers chose their provider based on a personal referral', confidence: '87%' }, { pub: 'HubSpot Agency Report 2025', snippet: 'Average project value up 22% for studios with defined process documentation', confidence: '82%' }, { pub: 'LinkedIn Professional Insights', snippet: 'Decision-maker trust in creative partner established within first 2 touchpoints', confidence: '78%' }] },
      tech: { demographics: { chips: ['Ages 28–45', 'Founders & Ops', 'Early Adopters', 'ROI Focused'], summary: 'Startup founders and operations leads at growing companies who are comfortable evaluating software independently. They move fast, expect pricing transparency, and churn quickly if onboarding fails to deliver value.' }, jtbd: ['When my team is wasting time on manual work, I evaluate new software so I can reclaim hours without adding headcount.', 'When I need to scale a process, I look for a tool that can grow with us so I don\'t rebuild in 12 months.', 'When a competitor moves faster, I look for tools that close the gap so I can stay ahead.'], journey: [{ step: 'Discover', desc: 'G2, ProductHunt, newsletters, or peer recommendation' }, { step: 'Consider', desc: 'Signs up for trial, checks integrations, reviews changelog' }, { step: 'Decide', desc: 'Based on time-to-value, pricing transparency, and support' }, { step: 'Return', desc: 'When the tool solved the problem without creating new ones' }], triggers: ['Efficiency anxiety', 'Competitive pressure', 'Trust in product', 'Fear of switching costs', 'Team alignment'], wtp: { position: 44, label: 'Mid', spend: '$50–$250/month', priority: 'time-to-value and integration compatibility over pricing' }, evidence: [{ pub: 'G2 Software Buyer Report', snippet: 'Average SaaS evaluation cycle 2.3 weeks among SMB buyers in 2025', confidence: '89%' }, { pub: 'Tomasz Tunguz B2B Research', snippet: 'Free trial activation increases conversion 3.7× vs demo-only flows', confidence: '84%' }, { pub: 'Intercom Customer Journey Study', snippet: '68% of SaaS churn occurs within first 30 days due to onboarding friction', confidence: '86%' }] },
      trades: { demographics: { chips: ['Ages 35–60', 'Homeowners', 'Mid–High Income', 'Trust-Led'], summary: 'Mid-to-senior homeowners who make high-consideration decisions based primarily on trust, reliability, and social proof. Slow to decide but highly loyal and refer freely when experience exceeds expectations.' }, jtbd: ['When something in my home needs fixing, I look for a tradesperson I can trust so I don\'t have to think about it again.', 'When I\'m planning a renovation, I want someone who communicates clearly so I feel in control of the process.', 'When a tradesperson delivers, I refer them immediately so I become the person people ask for recommendations.'], journey: [{ step: 'Discover', desc: 'Google search, Facebook groups, or personal referrals' }, { step: 'Consider', desc: 'Checks reviews, views past work photos, requests a quote' }, { step: 'Decide', desc: 'Based on responsiveness, price clarity, and gut trust' }, { step: 'Return', desc: 'When job was on time, on budget, communication was clear' }], triggers: ['Trust in tradesperson', 'Fear of being ripped off', 'Home pride', 'Convenience', 'Neighbourhood reputation'], wtp: { position: 52, label: 'Mid', spend: '$300–$2,500 per job', priority: 'reliability and trust over getting the cheapest quote' }, evidence: [{ pub: 'HiPages Trade Services Report', snippet: '86% of homeowners would pay a premium for a tradesperson with verified reviews', confidence: '88%' }, { pub: 'Houzz Renovation Trends 2025', snippet: 'Average renovation budget up 18% when homeowner had prior positive trade experience', confidence: '83%' }, { pub: 'Google Local Services Data', snippet: 'Tradespeople with photo galleries receive 2.4× more quote requests', confidence: '85%' }] },
      other: { demographics: { chips: ['Ages 28–50', 'Mid Income', 'Problem-Solvers', 'Value Seekers'], summary: 'A broad but engaged customer base motivated by solving a specific problem. They prioritise trust and expertise when selecting a provider, and are highly likely to become repeat customers when their first experience is positive.' }, jtbd: ['When I have a problem I can\'t solve myself, I look for a specialist so I can trust the outcome.', 'When I find a business I trust, I return without comparison shopping because the relationship matters more than the price.', 'When something works well for me, I tell others so I can help them and feel useful in my network.'], journey: [{ step: 'Discover', desc: 'Search, social media, or word of mouth' }, { step: 'Consider', desc: 'Reviews options, looks at social proof, compares propositions' }, { step: 'Decide', desc: 'Based on perceived expertise, trust signals, ease of engagement' }, { step: 'Return', desc: 'When expectations were met or exceeded on first interaction' }], triggers: ['Problem relief', 'Trust in expert', 'Value confidence', 'Social proof', 'Word-of-mouth instinct'], wtp: { position: 46, label: 'Mid', spend: '$50–$500 per engagement', priority: 'trust and reliability over finding the cheapest option' }, evidence: [{ pub: 'Edelman Trust Barometer Business', snippet: 'Trusted brands command 23% higher purchase intent among value-conscious buyers', confidence: '82%' }, { pub: 'Nielsen Global Commerce Report', snippet: 'Word-of-mouth referrals drive 32% of first-time purchases for independent businesses', confidence: '79%' }, { pub: 'Bain & Company Loyalty Research', snippet: 'Returning customers spend 67% more than first-time buyers on average', confidence: '85%' }] }
    };
    return d[t] || d.other;
  }

  function ciScreenReport() {
    var d  = ciGetReportData();
    var c  = CI_COLOR;
    var ml = 'Customer Intelligence';
    var demoChips = d.demographics.chips.map(function (chip) { return '<span class="ci-stat-chip">' + chip + '</span>'; }).join('');
    var whoBuying = msSection('Who\'s Buying',
      '<div class="ci-demo-card"><div class="ci-stat-chips">' + demoChips + '</div>'
      + '<div class="ci-demo-summary">' + hlStat(d.demographics.summary, c) + '</div></div>',
      c, ml);
    var jtbdCards = d.jtbd.map(function (j, i) {
      return '<div class="ci-jtbd-card"><div class="ci-jtbd-num">' + (i + 1) + '</div>'
        + '<div class="ci-jtbd-text">&ldquo;' + j + '&rdquo;</div></div>';
    }).join('');
    var jtbd = msSection('Jobs To Be Done', '<div class="ci-jtbd-list">' + jtbdCards + '</div>', c, ml);
    var journeySteps = d.journey.map(function (j, i) {
      return '<div class="ci-journey-step"><div class="ci-journey-step-inner">'
        + '<div class="ci-journey-step-label">' + j.step + '</div>'
        + '<div class="ci-journey-step-desc">' + j.desc + '</div>'
        + '</div></div>'
        + (i < d.journey.length - 1 ? '<div class="ci-journey-arrow">&#8594;</div>' : '');
    }).join('');
    var journey = msSection('Decision Journey', '<div class="ci-journey-flow">' + journeySteps + '</div>', c, ml);
    var triggerChips = d.triggers.map(function (t) { return '<span class="ci-trigger-chip">' + t + '</span>'; }).join('');
    var triggers = msSection('Emotional Triggers', '<div class="ci-trigger-chips">' + triggerChips + '</div>', c, ml);
    var wtpSpend = '<strong style="color:' + c + '">' + d.wtp.spend + '</strong>';
    var wtp = msSection('Willingness to Pay',
      '<div class="ci-wtp-wrap">'
      + '<div class="ci-wtp-labels"><span>Low spend</span><span>Mid range</span><span>High spend</span></div>'
      + '<div class="ci-wtp-track"><div class="ci-wtp-fill" style="width:' + d.wtp.position + '%"></div>'
      + '<div class="ci-wtp-marker" style="left:calc(' + d.wtp.position + '% - 7px)"></div></div>'
      + '<div class="ci-wtp-level">' + d.wtp.label + ' willingness to spend</div>'
      + '<div class="ci-wtp-text">Customers in this category typically spend ' + wtpSpend + ' per engagement and prioritise ' + d.wtp.priority + '.</div>'
      + '</div>',
      c, ml);
    var evid = msSectionLast('Evidence', buildEvidenceRows(d.evidence), c, ml);
    return buildReportScreen({ eyebrow: 'Customer Intelligence Report', accentColor: c, sections: [whoBuying, jtbd, journey, triggers, wtp, evid], saveAction: 'ciSaveReport', rerunAction: 'ciRerunScan' });
  }

  /* ============================================================
     COMPETITION
     ============================================================ */
  function compScreenContext() {
    var f = spFlow().competition || {};
    return buildContextScreen({ title: 'Confirm your context', sub: 'We\'ll scan your competitive landscape against this business context.', focusLabel: 'Who are your main competitors?', focusPlaceholder: 'e.g. The local bakery down the road, supermarket deli section, meal kit delivery services', focusId: 'comp-focus-input', focusOninput: 'compFocusInput', focusVal: f.focus || '', runLabel: 'Run Competition Scan', runAction: 'compRunScan', eta: 'Competition \u00b7 3 screens' });
  }
  function compScreenLoading() {
    return buildLoadingScreen(['Scanning your competitive landscape\u2026', 'Profiling key players\u2026', 'Mapping positioning gaps\u2026', 'Identifying your whitespace\u2026']);
  }

  function compGetReportData() {
    var t = (state.business && state.business.type) || 'other';
    var d = {
      food: {
        overview: 'Food and hospitality at the independent level is highly competitive at the commodity end — dominated by chain cafés, fast-food operators, and supermarket prepared food competing on price, speed, and convenience. At the craft end, the field thins significantly. Few operators combine genuine quality with consistent brand presence and community connection, leaving a meaningful gap for an independent with a clear identity.',
        players: [
          { name: 'Chain Café Groups', pos: 'High-volume, franchise-led café and food service operators', strength: 'Scale, location density, and brand recognition', weakness: 'No authenticity, community, or craft differentiation' },
          { name: 'Supermarket Deli', pos: 'Convenience food prepared in-store at major supermarket chains', strength: 'Accessibility, price, and daily foot traffic', weakness: 'Generic product, no brand story, no repeat experience' },
          { name: 'Meal Kit Services', pos: 'Subscription-based meal delivery targeting home cooks', strength: 'Convenience and novelty, strong digital marketing', weakness: 'High churn, no in-person connection, commoditised offering' }
        ],
        map: { xLabel: 'Convenience', yLabel: 'Craft & Quality', competitors: [{ name: 'Chain Cafés', x: 78, y: 20 }, { name: 'Supermarket Deli', x: 86, y: 12 }, { name: 'Meal Kit Services', x: 52, y: 34 }], you: { x: 22, y: 78 } },
        whitespace: 'The high-craft, community-connected quadrant of the food market is structurally underserved. Customers who care about provenance, founder story, and the experience of buying — not just the product — have nowhere good to go at scale. The opportunity is to become the obvious choice for this audience: the brand that feels personal, stands for something, and delivers consistently.',
        evidence: [{ pub: 'IBISWorld Food Services Report', snippet: 'Chain operators control 62% of café revenue but only 31% of preference among 25–45 demographic', confidence: '84%' }, { pub: 'Mintel Competitive Landscape NZ', snippet: 'Craft food segment growing 3× faster than mainstream grocery-prepared competitors', confidence: '88%' }, { pub: 'Food & Beverage Business Review', snippet: 'Independent operators with strong brand identity retain customers 2.8× longer', confidence: '81%' }]
      },
      retail: {
        overview: 'The retail market bifurcates sharply. The mass-market end is dominated by large chains and e-commerce aggregators competing aggressively on price, range, and fulfilment speed. The premium, story-led end is fragmented — occupied by a mix of heritage brands and newcomers — but rarely by operators who combine genuine product quality with consistent brand storytelling. The gap between cheap-and-available and premium-and-meaningful is wider than most retailers recognise.',
        players: [
          { name: 'Mass-Market Chains', pos: 'Large format retail and e-commerce competing on price and range', strength: 'Scale, logistics, and brand recognition', weakness: 'Generic, impersonal, easily commoditised at every price point' },
          { name: 'E-commerce Aggregators', pos: 'Marketplace platforms hosting multiple independent brands', strength: 'Discovery and convenience for price-sensitive buyers', weakness: 'No brand loyalty, race-to-bottom on price, margins crushed' },
          { name: 'Premium Lifestyle Brands', pos: 'Aspirational brands with strong aesthetics and high price points', strength: 'Brand desirability and repeat customer rates', weakness: 'Often inaccessible pricing, perceived as exclusive' }
        ],
        map: { xLabel: 'Price Point', yLabel: 'Brand Story', competitors: [{ name: 'Mass-Market Chains', x: 15, y: 15 }, { name: 'E-commerce Aggregators', x: 26, y: 22 }, { name: 'Premium Brands', x: 78, y: 70 }], you: { x: 65, y: 84 } },
        whitespace: 'The premium, story-led quadrant is real but underoccupied among independent operators. Most DTC brands either compete on price or build strong stories without the operational consistency to back them up. The opportunity is in combining emotional resonance with reliable product quality — becoming the brand customers feel good choosing and confident recommending.',
        evidence: [{ pub: 'Euromonitor Retail Landscape Report', snippet: 'Story-led independent brands command 34% higher average transaction value than category-average competitors', confidence: '86%' }, { pub: 'Shopify Merchant Intelligence 2025', snippet: 'Brands with clear founder narrative reduce paid acquisition dependency by 41%', confidence: '83%' }, { pub: 'McKinsey Consumer Segmentation', snippet: 'Premium-independent segment growing at 9.2% vs 2.1% for mass market retail', confidence: '89%' }]
      },
      creative: {
        overview: 'The creative services market spans an enormous range from ultra-cheap freelance marketplaces to multi-million-dollar agency retainers. The middle of the market is the most contested — where generalist studios and mid-size agencies compete on portfolio and price. The strategic end is far less crowded: few independent operators position on business outcomes rather than creative deliverables, and fewer still can combine strategic thinking with boutique-quality execution.',
        players: [
          { name: 'Large Creative Agencies', pos: 'Full-service agencies offering brand, digital, and campaign creative', strength: 'End-to-end capability and established client relationships', weakness: 'Expensive, slow, and often over-built for most SMBs' },
          { name: 'Freelance Marketplaces', pos: 'Platforms connecting clients with individual designers and copywriters', strength: 'Speed, low cost, and broad talent access', weakness: 'No strategic layer, inconsistent quality, no accountability' },
          { name: 'Mid-Size Generalist Studios', pos: 'Boutique agencies offering brand and digital creative to SMBs', strength: 'More personal than large agencies, broader than freelancers', weakness: 'Undifferentiated, compete on price, high churn' }
        ],
        map: { xLabel: 'Project Scale', yLabel: 'Strategy Integration', competitors: [{ name: 'Large Agencies', x: 84, y: 65 }, { name: 'Freelance Marketplaces', x: 15, y: 12 }, { name: 'Mid-Size Studios', x: 50, y: 34 }], you: { x: 36, y: 82 } },
        whitespace: 'The boutique-strategic quadrant — where studios deliver business-outcome-focused creative at a scale SMBs can actually afford — is structurally underserved. Clients want the thinking of a large agency and the agility of a freelancer. Independent studios that position on measured outcomes rather than just aesthetics are capturing this demand at meaningfully higher rates.',
        evidence: [{ pub: 'Clutch Creative Services Benchmark', snippet: 'Clients who brief on outcomes rather than deliverables report 38% higher satisfaction scores', confidence: '87%' }, { pub: 'Adobe Freelance Economy Report 2025', snippet: 'Strategic creative studios outperform execution-only peers on client retention by 2.6×', confidence: '83%' }, { pub: 'Business of Design Research', snippet: 'Boutique studio segment growing at 18% annually vs 6% for large agency sector', confidence: '79%' }]
      },
      tech: {
        overview: 'The SaaS market is saturated with horizontal tools that try to serve everyone. The dominant players compete on feature breadth and integration ecosystem. The emerging opportunity is the opposite: vertical tools that go deep on a single niche, deliver instant time-to-value, and resist the pressure to generalise. Few players in this tier have built meaningful brand presence to accompany their product.',
        players: [
          { name: 'Enterprise Platforms', pos: 'Large-scale SaaS suites targeting enterprise with comprehensive feature sets', strength: 'Deep integration capabilities and established enterprise relationships', weakness: 'Overwhelming complexity, long implementation cycles, poor SMB fit' },
          { name: 'Horizontal SMB Tools', pos: 'General-purpose SaaS targeting broad SMB market at accessible price points', strength: 'Low price point and recognisable brand in their category', weakness: 'Requires heavy customisation, no niche expertise, high churn' },
          { name: 'Emerging Verticals', pos: 'Newer software targeting specific industry workflows with niche focus', strength: 'Fast time-to-value and niche relevance for target buyer', weakness: 'Limited brand presence, early-stage trust signals' }
        ],
        map: { xLabel: 'Complexity', yLabel: 'Specialisation', competitors: [{ name: 'Enterprise Platforms', x: 84, y: 22 }, { name: 'Horizontal SMB Tools', x: 48, y: 18 }, { name: 'Emerging Verticals', x: 30, y: 66 }], you: { x: 22, y: 82 } },
        whitespace: 'The simple, highly-specialised quadrant is the least contested in the SaaS market. Enterprise tools are too complex; horizontal tools are too generic; emerging verticals lack trust signals. An operator who combines niche depth with a genuinely simple user experience — and wraps it in a clear brand story — can build a defensible position that attracts loyal customers and resists commoditisation.',
        evidence: [{ pub: 'Gartner SaaS Competitive Index', snippet: 'Vertical-specific SaaS commands 31% lower churn vs horizontal equivalents at same price point', confidence: '91%' }, { pub: 'ProductHunt Maker Survey 2025', snippet: 'Simple, niche-focused tools top B2B recommendation lists 4× more than feature-heavy competitors', confidence: '84%' }, { pub: 'a16z Software Market Report', snippet: 'Vertical SaaS startups reaching $10M ARR 40% faster than horizontal equivalents', confidence: '87%' }]
      },
      trades: {
        overview: 'The trades sector is dominated at one end by large national franchises with established brand presence, and at the other by sole traders competing entirely on price and availability. The middle — skilled independent operators — is structurally weak on brand and digital presence. Most rely exclusively on word of mouth with no content, no owned marketing. This creates an unusual competitive advantage for any operator willing to invest modestly in brand.',
        players: [
          { name: 'National Franchises', pos: 'Branded franchise networks offering standardised trade services', strength: 'Brand recognition, systems, and national marketing support', weakness: 'Expensive, impersonal, slow to respond, limited local trust' },
          { name: 'Quote Marketplaces', pos: 'Platforms connecting homeowners with competing tradespeople', strength: 'High lead volume and discoverability for new operators', weakness: 'Race-to-bottom pricing, no brand loyalty, margin pressure' },
          { name: 'Unbranded Sole Traders', pos: 'Independent operators relying on word-of-mouth and referral only', strength: 'Flexibility and personal relationships with local clients', weakness: 'No digital presence, no trust signals, limited scalability' }
        ],
        map: { xLabel: 'Price Point', yLabel: 'Brand Trust', competitors: [{ name: 'National Franchises', x: 66, y: 58 }, { name: 'Quote Marketplaces', x: 22, y: 26 }, { name: 'Unbranded Sole Traders', x: 28, y: 16 }], you: { x: 60, y: 84 } },
        whitespace: 'The premium, trusted quadrant of the trades market is almost entirely unoccupied by independent operators. Homeowners who want quality work from someone they can trust — and who will communicate clearly throughout — are forced to choose between expensive franchises or a gamble on an unverified sole trader. An independent with strong reviews, professional brand presence, and a consistent content voice can own this space in their local market.',
        evidence: [{ pub: 'Master Builders Association Research', snippet: 'Branded independent operators win 67% of conversions vs 34% for unbranded equivalents', confidence: '85%' }, { pub: 'Consumer NZ Trade Services Survey', snippet: 'Trust and communication quality ranked #1 selection criteria above price by 71% of homeowners', confidence: '88%' }, { pub: 'ServiceNow Field Services Report', snippet: 'Tradespeople with 10+ verified reviews command 22% premium on quoted job value', confidence: '83%' }]
      },
      other: {
        overview: 'Most service and product markets exhibit a similar pattern: commoditised competition at the low end focused on price and availability, with genuine differentiation scarce above it. Independent businesses in this category face two primary competitors — established generalists with brand recognition, and low-cost alternatives with price advantages. Neither typically invests in authentic storytelling, leaving this territory available for an operator with a clear voice.',
        players: [
          { name: 'Established Generalists', pos: 'Businesses with broad offering and existing market presence', strength: 'Reputation, range, and existing customer relationships', weakness: 'Generic, no differentiation, slow to adapt to niche needs' },
          { name: 'Low-Cost Alternatives', pos: 'Budget-positioned competitors prioritising volume over quality', strength: 'Price advantage and easy accessibility for budget buyers', weakness: 'No loyalty, no brand equity, high churn rate' },
          { name: 'Enterprise Providers', pos: 'Large operators with comprehensive capability and premium pricing', strength: 'Capability depth and established credibility in the market', weakness: 'Inaccessible for many buyers, impersonal, slow to respond' }
        ],
        map: { xLabel: 'Price Point', yLabel: 'Expertise & Story', competitors: [{ name: 'Established Generalists', x: 48, y: 36 }, { name: 'Low-Cost Alternatives', x: 18, y: 18 }, { name: 'Enterprise Providers', x: 78, y: 60 }], you: { x: 58, y: 82 } },
        whitespace: 'The specialist, story-led segment at a mid-to-premium price point remains largely unoccupied in most markets. Established players rely on legacy reputation rather than active brand building; low-cost alternatives have no brand at all. An independent operator who invests in clear positioning, consistent content, and authentic storytelling can carve a defensible niche that attracts the right customers and commands appropriate prices.',
        evidence: [{ pub: 'Edelman Trust Barometer SMB Edition', snippet: 'Specialist positioning increases first-contact conversion by 29% vs generalist competitors', confidence: '82%' }, { pub: 'McKinsey Small Business Growth Study', snippet: 'Independent operators with differentiated brand story grow 2.4× faster than undifferentiated peers', confidence: '80%' }, { pub: 'Deloitte Market Position Analysis', snippet: 'Premium-positioned independents show 67% higher customer lifetime value than commodity competitors', confidence: '85%' }]
      }
    };
    return d[t] || d.other;
  }

  function buildPositioningMap(m) {
    /* m = { xLabel, yLabel, competitors:[{name,x,y}], you:{x,y} } */
    function dotHtml(comp, isYou) {
      var tp  = (100 - comp.y);   /* CSS top% — high y → low top% (near top) */
      var lp  = comp.x;
      /* Label placement: right of dot for x<50, left for x>=70, below otherwise */
      var lblStyle;
      if (lp >= 68) {
        lblStyle = 'right:calc(' + (100 - lp) + '% + 12px);top:calc(' + tp + '% - 9px)';
      } else if (lp <= 32) {
        lblStyle = 'left:calc(' + lp + '% + 12px);top:calc(' + tp + '% - 9px)';
      } else {
        lblStyle = 'left:' + lp + '%;top:calc(' + tp + '% + 11px);transform:translateX(-50%)';
      }
      var ring = isYou ? '<div class="comp-you-ring" style="position:absolute;left:' + lp + '%;top:' + tp + '%;transform:translate(-50%,-50%)"></div>' : '';
      var dotCls = isYou ? 'comp-dot comp-dot-you' : 'comp-dot comp-dot-grey';
      return ring
        + '<div class="' + dotCls + '" style="position:absolute;left:' + lp + '%;top:' + tp + '%;transform:translate(-50%,-50%)"></div>'
        + '<div class="comp-dot-label' + (isYou ? ' comp-dot-label-you' : '') + '" style="position:absolute;' + lblStyle + '">' + comp.name + '</div>';
    }

    var compDots = m.competitors.map(function (c) { return dotHtml(c, false); }).join('');
    var youDot   = dotHtml({ name: 'You', x: m.you.x, y: m.you.y }, true);

    return '<div class="comp-map-wrap">'
      /* Y-axis column */
      + '<div class="comp-map-yaxis">'
      + '<span class="comp-map-yaxis-hi">High</span>'
      + '<span class="comp-map-yaxis-name">' + m.yLabel + '</span>'
      + '<span class="comp-map-yaxis-lo">Low</span>'
      + '</div>'
      /* Map + x-axis */
      + '<div class="comp-map-col">'
      + '<div class="comp-map-field">'
      + '<div class="comp-map-hline"></div>'
      + '<div class="comp-map-vline"></div>'
      /* quadrant hint labels */
      + '<div class="comp-map-quad comp-map-quad-tl">Low ' + m.xLabel + '<br>High ' + m.yLabel + '</div>'
      + '<div class="comp-map-quad comp-map-quad-tr">High ' + m.xLabel + '<br>High ' + m.yLabel + '</div>'
      + '<div class="comp-map-quad comp-map-quad-bl">Low ' + m.xLabel + '<br>Low ' + m.yLabel + '</div>'
      + '<div class="comp-map-quad comp-map-quad-br">High ' + m.xLabel + '<br>Low ' + m.yLabel + '</div>'
      + compDots + youDot
      + '</div>'
      + '<div class="comp-map-xaxis">'
      + '<span>&#8592; Low ' + m.xLabel + '</span>'
      + '<span>High ' + m.xLabel + ' &#8594;</span>'
      + '</div>'
      + '</div>'
      + '</div>';
  }

  function compScreenReport() {
    var d  = compGetReportData();
    var c  = COMP_COLOR;
    var ml = 'Competition';

    var overview = msSection('Competitive Overview',
      '<div class="ms-section-card"><div class="ms-overview-text">' + hlStat(d.overview, c) + '</div></div>',
      c, ml);

    var playerCards = d.players.map(function (p) {
      return '<div class="comp-player-card">'
        + '<div class="comp-player-name">' + p.name + '</div>'
        + '<div class="comp-player-pos">' + p.pos + '</div>'
        + '<div class="comp-player-row"><span class="comp-player-tag strength">&#9650; Strength</span><span class="comp-player-detail">' + p.strength + '</span></div>'
        + '<div class="comp-player-row"><span class="comp-player-tag weakness">&#9660; Weakness</span><span class="comp-player-detail">' + p.weakness + '</span></div>'
        + '</div>';
    }).join('');
    var players = msSection('Key Players', '<div class="comp-players-grid">' + playerCards + '</div>', c, ml);

    var posMap = msSection('Positioning Map', buildPositioningMap(d.map), c, ml);

    var whitespace = msSection('Whitespace Opportunity',
      '<div class="ms-gap-card" style="border-color:' + c + ';background:rgba(224,123,106,0.08)">'
      + '<div class="ms-gap-headline" style="color:' + c + '">Where you can win</div>'
      + '<div class="ms-gap-text">' + d.whitespace + '</div></div>',
      c, ml);

    var evid = msSectionLast('Evidence', buildEvidenceRows(d.evidence), c, ml);

    return buildReportScreen({ eyebrow: 'Competition Report', accentColor: c, sections: [overview, players, posMap, whitespace, evid], saveAction: 'compSaveReport', rerunAction: 'compRerunScan' });
  }

  /* ============================================================
     SHARED SECTION BUILDERS
     ============================================================ */
  function msSection(label, body, accentColor, moduleLabel) {
    var bdr = accentColor ? ' style="border-left:3px solid ' + accentColor + '"' : '';
    var eye = (moduleLabel && accentColor)
      ? '<div class="ms-section-eyebrow" style="color:' + accentColor + '">' + moduleLabel + '</div>'
      : '';
    return '<div class="ms-section ms-stage-section"' + bdr + '>'
      + eye
      + '<div class="ms-section-label">' + label + '</div>'
      + body + '</div>';
  }
  function msSectionLast(label, body, accentColor, moduleLabel) {
    var bdr = accentColor ? ' style="border-left:3px solid ' + accentColor + '"' : '';
    var eye = (moduleLabel && accentColor)
      ? '<div class="ms-section-eyebrow" style="color:' + accentColor + '">' + moduleLabel + '</div>'
      : '';
    return '<div class="ms-section ms-stage-section border-0"' + bdr + '>'
      + eye
      + '<div class="ms-section-label">' + label + '</div>'
      + body + '</div>';
  }
  function buildEvidenceRows(evidence) {
    return '<div class="ms-evidence-list">'
      + evidence.map(function (e) {
          return '<div class="ms-evidence-row">'
            + '<div class="ms-evidence-meta"><div class="ms-evidence-pub">' + e.pub + '</div><div class="ms-evidence-snippet">&ldquo;' + e.snippet + '&rdquo;</div></div>'
            + '<div class="ms-confidence-chip">' + e.confidence + ' confidence</div>'
            + '</div>';
        }).join('')
      + '</div>';
  }

  /* ============================================================
     MAIN RENDERER
     ============================================================ */
  function screenStrategyFlow() {
    var f = spFlow();
    if (f.screen === 'market-scan') {
      var ms = (f.marketScan && f.marketScan.step) || 1;
      if (ms === 1) return msScreenContext();
      if (ms === 2) return msScreenLoading();
      if (ms === 3) return msScreenReport();
    }
    if (f.screen === 'customer-intel') {
      var ci = (f.customerIntel && f.customerIntel.step) || 1;
      if (ci === 1) return ciScreenContext();
      if (ci === 2) return ciScreenLoading();
      if (ci === 3) return ciScreenReport();
    }
    if (f.screen === 'competition') {
      var co = (f.competition && f.competition.step) || 1;
      if (co === 1) return compScreenContext();
      if (co === 2) return compScreenLoading();
      if (co === 3) return compScreenReport();
    }
    return spScreenHub();
  }

  /* ---- Library summary getters (called from screenReportLibrary) ---- */
  window.msReportSummary   = function () { var d = msGetReportData();   return { gapHeadline: d.gap.headline, gapText: d.gap.body.slice(0, 110) }; };
  window.ciReportSummary   = function () { var d = ciGetReportData();   return { topTrigger: d.triggers[0], wtpLabel: d.wtp.label, wtpSpend: d.wtp.spend, demographicChips: (d.demographics && d.demographics.chips) ? d.demographics.chips : [] }; };
  window.compReportSummary = function () { var d = compGetReportData(); return { whitespace: d.whitespace.slice(0, 120) }; };

  return { init: init, screenStrategyFlow: screenStrategyFlow };
})();

window.screenStrategyFlow = function () { return StrategyFlow.screenStrategyFlow(); };

/* ============================================================
   GLOBAL EVENT HANDLERS
   ============================================================ */

window.spGoWelcome = function () { appState.onboarding = { step: 1, authMode: 'signup', subStep: 1 }; appState.business = { name: '', description: '', type: null }; setMode('onboarding'); };

window.spGoHub = function () { appState.strategyFlow.screen = 'hub'; renderContent(); };

window.spGoMarketScan = function () {
  appState.strategyFlow.screen = 'market-scan';
  if (!appState.strategyFlow.marketScan) appState.strategyFlow.marketScan = { step: 1, focus: '' };
  var goingToReport = !!(appState.strategy.marketScan);
  appState.strategyFlow.marketScan.step = goingToReport ? 3 : 1;
  renderContent();
  if (goingToReport) requestAnimationFrame(function () { window.stageRevealReport(); });
};

window.spGoCustomerIntel = function () {
  if (!appState.strategy.marketScan) return;
  appState.strategyFlow.screen = 'customer-intel';
  if (!appState.strategyFlow.customerIntel) appState.strategyFlow.customerIntel = { step: 1, focus: '' };
  var goingToReport = !!(appState.strategy.customerIntelligence);
  appState.strategyFlow.customerIntel.step = goingToReport ? 3 : 1;
  renderContent();
  if (goingToReport) requestAnimationFrame(function () { window.stageRevealReport(); });
};

window.spGoCompetition = function () {
  if (!appState.strategy.customerIntelligence) return;
  appState.strategyFlow.screen = 'competition';
  if (!appState.strategyFlow.competition) appState.strategyFlow.competition = { step: 1, focus: '' };
  var goingToReport = !!(appState.strategy.competition);
  appState.strategyFlow.competition.step = goingToReport ? 3 : 1;
  renderContent();
  if (goingToReport) requestAnimationFrame(function () { window.stageRevealReport(); });
};

window.spGoToPersona = function () {
  setTransition({ title: 'Strategy locked in', summary: 'Your market, customer, and competitive research is ready to guide your persona.', nextBadge: 'Next: Persona Studio', nextMode: 'persona-studio' });
};

/* Loading hook — called by renderApp after strategic-plan innerHTML */
window.msCheckLoadingHook = function () {
  var f = appState.strategyFlow;
  if (!f) return;
  if (f.screen === 'market-scan'   && f.marketScan   && f.marketScan.step   === 2) { setTimeout(window.msStartLoading,   80); return; }
  if (f.screen === 'customer-intel' && f.customerIntel && f.customerIntel.step === 2) { setTimeout(window.ciStartLoading,   80); return; }
  if (f.screen === 'competition'   && f.competition   && f.competition.step   === 2) { setTimeout(window.compStartLoading, 80); }
};

/* Shared phase cycling engine */
function runLoadingPhases(phases, onDone) {
  var current = 0;
  function tick() {
    current++;
    if (current >= phases.length) { setTimeout(onDone, 500); return; }
    var phaseEl = document.getElementById('ms-loading-phase');
    var barEl   = document.getElementById('ms-loading-bar');
    if (phaseEl) { phaseEl.style.opacity = '0'; phaseEl.style.transform = 'translateY(6px)'; setTimeout(function () { if (phaseEl) { phaseEl.textContent = phases[current]; phaseEl.style.opacity = '1'; phaseEl.style.transform = 'translateY(0)'; } }, 220); }
    if (barEl) barEl.style.width = ((current + 1) / phases.length * 100) + '%';
    for (var i = 0; i < phases.length; i++) {
      var dotEl  = document.getElementById('ms-phase-dot-' + i);
      var itemEl = document.getElementById('ms-phase-item-' + i);
      if (!dotEl || !itemEl) continue;
      if (i < current)       { dotEl.innerHTML = '&#10003;'; dotEl.className = 'ms-phase-dot done';   itemEl.style.opacity = '0.5'; }
      else if (i === current){ dotEl.innerHTML = '&#9679;';  dotEl.className = 'ms-phase-dot active'; itemEl.style.opacity = '1'; }
      else                   { dotEl.innerHTML = '&#9675;';  dotEl.className = 'ms-phase-dot';        itemEl.style.opacity = '0.35'; }
    }
    setTimeout(tick, 800);
  }
  setTimeout(tick, 800);
}

window.msStartLoading   = function () { runLoadingPhases(['Scanning your market\u2026', 'Identifying key trends\u2026', 'Finding your gap\u2026', 'Building your report\u2026'], function () { if (appState.strategyFlow && appState.strategyFlow.marketScan) { appState.strategyFlow.marketScan.step = 3; renderContent(); requestAnimationFrame(function () { window.stageRevealReport(); }); } }); };
window.ciStartLoading   = function () { runLoadingPhases(['Analysing your customer category\u2026', 'Mapping decision journeys\u2026', 'Identifying emotional triggers\u2026', 'Building your profile\u2026'], function () { if (appState.strategyFlow && appState.strategyFlow.customerIntel) { appState.strategyFlow.customerIntel.step = 3; renderContent(); requestAnimationFrame(function () { window.stageRevealReport(); }); } }); };
window.compStartLoading = function () { runLoadingPhases(['Scanning your competitive landscape\u2026', 'Profiling key players\u2026', 'Mapping positioning gaps\u2026', 'Identifying your whitespace\u2026'], function () { if (appState.strategyFlow && appState.strategyFlow.competition) { appState.strategyFlow.competition.step = 3; renderContent(); requestAnimationFrame(function () { window.stageRevealReport(); }); } }); };

/* Market Scan */
window.msRunScan     = function () { var e = document.getElementById('ms-focus-input'); if (e) appState.strategyFlow.marketScan.focus = e.value; appState.strategyFlow.marketScan.step = 2; renderContent(); };
window.msSaveReport  = function () {
  var s = window.msReportSummary ? window.msReportSummary() : {};
  appState.strategy.marketScan = { savedAt: Date.now(), type: (appState.business || {}).type || 'other', gapHeadline: s.gapHeadline || '', gapText: s.gapText || '' };
  if (appState.libraryMode) { appState.libraryMode = false; setMode('report-library'); }
  else { appState.strategyFlow.screen = 'hub'; renderContent(); }
};
window.msRerunScan   = function () { appState.strategy.marketScan = null; appState.strategyFlow.marketScan = { step: 1, focus: (appState.strategyFlow.marketScan || {}).focus || '' }; appState.strategyFlow.screen = 'market-scan'; renderContent(); };
window.msFocusInput  = function (v) { if (!appState.strategyFlow.marketScan) appState.strategyFlow.marketScan = { step: 1, focus: '' }; appState.strategyFlow.marketScan.focus = v; };

/* Customer Intelligence */
window.ciRunScan     = function () { var e = document.getElementById('ci-focus-input'); if (!appState.strategyFlow.customerIntel) appState.strategyFlow.customerIntel = { step: 1, focus: '' }; if (e) appState.strategyFlow.customerIntel.focus = e.value; appState.strategyFlow.customerIntel.step = 2; renderContent(); };
window.ciSaveReport  = function () {
  var s = window.ciReportSummary ? window.ciReportSummary() : {};
  appState.strategy.customerIntelligence = { savedAt: Date.now(), type: (appState.business || {}).type || 'other', topTrigger: s.topTrigger || '', wtpLabel: s.wtpLabel || '', wtpSpend: s.wtpSpend || '', demographicChips: s.demographicChips || [] };
  if (appState.libraryMode) { appState.libraryMode = false; setMode('report-library'); }
  else { appState.strategyFlow.screen = 'hub'; renderContent(); }
};
window.ciRerunScan   = function () { appState.strategy.customerIntelligence = null; appState.strategyFlow.customerIntel = { step: 1, focus: (appState.strategyFlow.customerIntel || {}).focus || '' }; appState.strategyFlow.screen = 'customer-intel'; renderContent(); };
window.ciFocusInput  = function (v) { if (!appState.strategyFlow.customerIntel) appState.strategyFlow.customerIntel = { step: 1, focus: '' }; appState.strategyFlow.customerIntel.focus = v; };

/* Competition */
window.compRunScan    = function () { var e = document.getElementById('comp-focus-input'); if (!appState.strategyFlow.competition) appState.strategyFlow.competition = { step: 1, focus: '' }; if (e) appState.strategyFlow.competition.focus = e.value; appState.strategyFlow.competition.step = 2; renderContent(); };
window.compSaveReport = function () {
  var s = window.compReportSummary ? window.compReportSummary() : {};
  appState.strategy.competition = { savedAt: Date.now(), type: (appState.business || {}).type || 'other', whitespace: s.whitespace || '' };
  if (appState.libraryMode) { appState.libraryMode = false; setMode('report-library'); }
  else { appState.strategyFlow.screen = 'hub'; renderContent(); }
};
window.compRerunScan  = function () { appState.strategy.competition = null; appState.strategyFlow.competition = { step: 1, focus: (appState.strategyFlow.competition || {}).focus || '' }; appState.strategyFlow.screen = 'competition'; renderContent(); };
window.compFocusInput = function (v) { if (!appState.strategyFlow.competition) appState.strategyFlow.competition = { step: 1, focus: '' }; appState.strategyFlow.competition.focus = v; };

/* ============================================================
   LIBRARY — back navigation and view/rerun from report library
   ============================================================ */

/* Return from a report to the library */
window.libGoBack = function () {
  appState.libraryMode = false;
  setMode('report-library');
};

/* Open a module's report screen from the library */
window.libViewReport = function (mod) {
  appState.libraryMode = true;
  appState.mode = 'strategic-plan';
  if (mod === 'ms')   window.spGoMarketScan();
  else if (mod === 'ci')   window.spGoCustomerIntel();
  else if (mod === 'comp') window.spGoCompetition();
};

/* Re-run a module from the library (reset + go to context screen) */
window.libRerunModule = function (mod) {
  appState.libraryMode = false;
  appState.mode = 'strategic-plan';
  if (mod === 'ms')   window.msRerunScan();
  else if (mod === 'ci')   window.ciRerunScan();
  else if (mod === 'comp') window.compRerunScan();
};

/* ============================================================
   STAGED REVEAL — animates sections in 400ms apart
   ============================================================ */
window.stageRevealReport = function () {
  var sections = document.querySelectorAll('.ms-stage-section');
  var total    = sections.length;
  if (!total) return;
  var bar = document.getElementById('sp-stage-bar');

  /* Reset any previously revealed sections (re-entry case) */
  sections.forEach(function (s) { s.classList.remove('revealed'); });
  if (bar) bar.style.width = '0%';

  sections.forEach(function (s, i) {
    setTimeout(function () {
      s.classList.add('revealed');
      if (bar) bar.style.width = Math.round(((i + 1) / total) * 100) + '%';
    }, 120 + i * 380);
  });
};

/* ============================================================
   PDF DOWNLOAD — window.print() with @media print CSS
   ============================================================ */
window.downloadReportPDF = function () { window.print(); };
