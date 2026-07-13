// ---------------------------------------------
// Clarity 2.0 — Strategic Planning Reports (v2)
// ---------------------------------------------
//
// Four full-page reports opened from the Overview insight cards:
//
//   report-market       — Market Scan          (6 tabs)
//   report-customer     — Customer Intelligence (6 tabs)
//   report-competition  — Competition          (5 tabs)
//   report-plan         — Your Plan            (4 tabs)
//
// Each report has an identical shell (topbar with "← Overview" back
// link + centered title + "View all →" toggle; tab bar; content area
// capped at 860px). Tabs live inline: clicking swaps the visible panel
// with a 200ms opacity fade. "View all" hides the tabs and stacks
// every panel with a section heading between them.
//
// Data flow:
//   1. Report loads → _rpBuildData(view, concept) resolves the payload.
//   2. Payload reads concept.research.* when it exists; falls back to
//      business.type-keyed mock data otherwise. Every field is
//      guaranteed present at the leaf level so panels don't crash.
//   3. Each panel renderer takes (data, business, concept) and returns
//      the panel HTML. Numbers/percentages get wrapped in .rp-num so
//      the table CSS can color them amber.
//
// Ephemeral UI state (_rpUiState) tracks the active tab per report and
// the tabbed-vs-all view mode. Not persisted — reopening a report from
// Overview resets both, which feels right for a landing action.

// ---------------------------------------------
// UI state (in-module, not persisted)
// ---------------------------------------------

const _rpUiState = {
  // Active tab id per report view key. Populated lazily by
  // _rpDefaultTab() on first render so the tab order lives with the
  // report config below and doesn't need to be duplicated here.
  activeTab: {},
  // 'tabs' or 'all'. 'all' hides the tab bar and stacks every panel
  // vertically with 40px gaps + section headings. Also per report.
  viewMode: {}
};

// ---------------------------------------------
// Escape helper (utils.js exposes _escape too; local copy avoids a
// load-order coupling if reports.js runs before utils.js).
// ---------------------------------------------

function _rpEscape(str) {
  if (typeof window._escape === 'function') return window._escape(str);
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Normalize a raw business.type to the mock-data key set. `saas`
// collapses to `tech`, `food` (used loosely elsewhere) collapses to
// `small`, unknowns become `other`.
function _rpNormType(type) {
  const t = String(type || 'other').toLowerCase();
  if (t === 'saas') return 'tech';
  if (t === 'food') return 'small';
  if (['small','ecommerce','service','tech','creator','agency','nonprofit','other'].indexOf(t) === -1) return 'other';
  return t;
}

// Number-cell wrapper. Anything that reads as a stat (revenue, %,
// score) gets this so the table CSS colors it amber consistently.
function _rpNum(v) {
  return '<span class="rp-num">' + _rpEscape(v) + '</span>';
}

// ---------------------------------------------
// Report config
// ---------------------------------------------
//
// Each report registers its title + tab list here. Tab.id is the
// key used everywhere (URL-ish stability + activeTab lookup). Tab.label
// is the display text on the pill. Tab.render points at the panel
// renderer below.

const RP_REPORTS = {
  'report-market': {
    title: 'Market Scan',
    tabs: [
      { id: 'the-market',       label: 'The Market',      render: _rpPanelMarketTheMarket },
      { id: 'the-opportunity',  label: 'The Opportunity', render: _rpPanelMarketOpportunity },
      { id: 'whos-buying',      label: "Who's Buying",    render: _rpPanelMarketWhosBuying },
      { id: 'competitors',      label: 'Competitors',     render: _rpPanelMarketCompetitors },
      { id: 'key-findings',     label: 'Key Findings',    render: _rpPanelMarketKeyFindings },
      { id: 'sources',          label: 'Sources',         render: _rpPanelSources }
    ]
  },
  'report-customer': {
    title: 'Customer Intelligence',
    tabs: [
      { id: 'whos-buying',       label: "Who's Buying",      render: _rpPanelCustomerWhosBuying },
      { id: 'what-they-need',    label: 'What They Need',    render: _rpPanelCustomerWhatTheyNeed },
      { id: 'how-they-decide',   label: 'How They Decide',   render: _rpPanelCustomerHowTheyDecide },
      { id: 'what-drives-them',  label: 'What Drives Them',  render: _rpPanelCustomerWhatDrivesThem },
      { id: 'segments',          label: 'Segments',          render: _rpPanelCustomerSegments },
      { id: 'sources',           label: 'Sources',           render: _rpPanelSources }
    ]
  },
  'report-competition': {
    title: 'Competition',
    tabs: [
      { id: 'the-landscape',  label: 'The Landscape',  render: _rpPanelCompetitionLandscape },
      { id: 'key-players',    label: 'Key Players',    render: _rpPanelCompetitionPlayers },
      { id: 'where-you-win',  label: 'Where You Win',  render: _rpPanelCompetitionWhereYouWin },
      { id: 'risk-factors',   label: 'Risk Factors',   render: _rpPanelCompetitionRisks },
      { id: 'sources',        label: 'Sources',        render: _rpPanelSources }
    ]
  },
  'report-plan': {
    title: 'Your Plan',
    tabs: [
      { id: 'market-summary', label: 'Market Summary', render: _rpPanelPlanMarket },
      { id: 'your-customer',  label: 'Your Customer',  render: _rpPanelPlanCustomer },
      { id: 'your-edge',      label: 'Your Edge',      render: _rpPanelPlanEdge },
      { id: 'first-moves',    label: 'First Moves',    render: _rpPanelPlanFirstMoves }
    ]
  }
};

// ---------------------------------------------
// Mock data generators (type-keyed)
// ---------------------------------------------
//
// Real `concept.research.*` fields are always null right now (see the
// audit) so these mocks drive every panel. Structured so the day
// _generateResearch() lands we can drop it in and the panels don't
// need to change.

// --- Market Scan mock ---

function _rpMockMarket(type) {
  const t = _rpNormType(type);
  const byType = {
    small: {
      gapHeadline: 'Local demand is strong but most competitors are undifferentiated.',
      gapText: 'The neighborhood segment is growing 8-12% annually while operator quality is inconsistent. Most stores compete on price rather than experience, leaving a clear opening for a business that combines local trust with a memorable brand voice.',
      marketTable: [
        { dim: 'Category size',       finding: '$1.2B annual spend in your city',        confidence: 'High' },
        { dim: 'Growth rate',         finding: '9% YoY driven by younger locals',       confidence: 'Medium' },
        { dim: 'Digital adoption',    finding: '61% of buyers discover on Instagram',   confidence: 'High' }
      ],
      opportunityBullets: [
        'Existing operators optimize for foot traffic and rarely invest in social content, so a small consistent presence stands out fast.',
        'Local customers already respond to storytelling but no one in your category is telling a story worth remembering.',
        'Reordering costs are low and repeat business rewards trust, so brand loyalty compounds faster than in most categories.'
      ],
      opportunityTable: [
        { opp: 'Behind-the-scenes content',     size: '$40K/mo reach',    difficulty: 'Low' },
        { opp: 'Loyalty micro-program',         size: '15% repeat lift',  difficulty: 'Medium' },
        { opp: 'Weekly limited drop',           size: '$8K/mo revenue',   difficulty: 'Low' }
      ],
      demographics: [
        { age: '25-34', range: '$60-90K income',   share: '38%' },
        { age: '35-44', range: '$85-140K income',  share: '31%' },
        { age: '45-54', range: '$95-160K income',  share: '18%' }
      ],
      psychographics: [
        { name: 'Quality-first',    desc: 'Pays 15-20% more for consistency and craft.' },
        { name: 'Story-driven',     desc: 'Buys from businesses whose backstory feels real.' },
        { name: 'Locally loyal',    desc: 'Actively prefers neighborhood businesses over chains.' },
        { name: 'Recommendation-led', desc: 'Discovers new places through friends and Instagram.' }
      ],
      keyFindings: [
        { head: 'The category is growing faster than operator quality.',        body: 'Demand is up nearly 10% year over year but new entrants are copying incumbents. That means differentiation compounds \u2014 the first business to look distinct will earn outsized share of voice.' },
        { head: 'Instagram is the single highest-signal discovery channel.',    body: '61% of first-time buyers report finding a local business on Instagram in the past six months. Category-adjacent hashtags remain undersaturated.' },
        { head: 'Repeat purchase drives 68% of category revenue.',              body: 'Retention isn\u2019t optional \u2014 it\u2019s the bulk of the P&L. Loyalty programs and personal recognition consistently outperform acquisition ads in this segment.' },
        { head: 'Price sensitivity is lower than most operators assume.',       body: 'Customers who ranked "quality" as their top factor were willing to pay 22% more on average. The dominant fear is inconsistency, not cost.' },
        { head: 'Weekend hours are undersupplied.',                             body: 'Foot traffic peaks Saturday 10am-2pm and again Sunday 3-6pm, but 42% of competitors reduce hours during those windows. Simple availability is a wedge.' }
      ]
    },
    ecommerce: {
      gapHeadline: 'Online buyers compare 3-5 options before purchase; most stores fail the comparison.',
      gapText: 'Category traffic is up but conversion rates are flat because product pages are interchangeable. The stores winning right now aren\u2019t cheaper \u2014 they\u2019re clearer, faster to trust, and better at social proof at the point of decision.',
      marketTable: [
        { dim: 'Category size',        finding: '$4.8B online spend in your niche', confidence: 'High' },
        { dim: 'Growth rate',          finding: '14% YoY, mobile-first',            confidence: 'High' },
        { dim: 'Cart abandonment',     finding: '68% baseline across category',     confidence: 'High' }
      ],
      opportunityBullets: [
        'Most competitors bury social proof three scrolls down; surfacing it above the fold consistently lifts conversion by 15-25%.',
        'Fast free shipping is table stakes now, but bundle offers still feel novel and increase AOV by 30% on average.',
        'Retargeting spend is fragmented \u2014 a single owned email list outperforms three ad platforms combined for the same audience.'
      ],
      opportunityTable: [
        { opp: 'Bundle offers',                size: '30% AOV lift',   difficulty: 'Low' },
        { opp: 'Above-fold social proof',      size: '15-25% CVR',     difficulty: 'Medium' },
        { opp: 'Post-purchase email flow',     size: '20% repeat',     difficulty: 'Low' }
      ],
      demographics: [
        { age: '18-24', range: '$25-45K income',   share: '22%' },
        { age: '25-34', range: '$45-85K income',   share: '46%' },
        { age: '35-44', range: '$70-120K income',  share: '24%' }
      ],
      psychographics: [
        { name: 'Comparison shopper',  desc: 'Opens 4+ tabs before buying; needs clear differentiation.' },
        { name: 'Review-driven',       desc: 'Trusts strangers on the internet more than brand copy.' },
        { name: 'Impulse buyer',       desc: 'Converts within 3 minutes when the vibe is right.' },
        { name: 'Deal-motivated',      desc: 'Waits for bundles and free shipping thresholds.' }
      ],
      keyFindings: [
        { head: 'Product pages are the make-or-break screen.',                  body: '73% of exits happen on the PDP. Copy clarity + one great video + visible reviews close more than any promo code you could offer.' },
        { head: 'Free shipping is table stakes, but bundles still surprise.',   body: 'Buyers expect shipping to be free above $50. Bundling top sellers with slower movers raises AOV without lowering margin.' },
        { head: 'Instagram + TikTok drive discovery; email drives revenue.',    body: 'Social platforms are the top of the funnel but email is where 40%+ of repeat revenue actually converts. Owning that list is non-negotiable.' },
        { head: 'Return policy language impacts conversion more than price.',   body: 'Clear, one-line return policies lifted purchase intent by 18% in category testing. Ambiguity kills the sale before price ever enters the equation.' },
        { head: 'Mobile checkout friction is your biggest silent leak.',        body: '54% of cart abandonment on mobile happens at the shipping-address step. One-tap wallets (Apple Pay / Shop Pay) meaningfully improve completion.' }
      ]
    },
    service: {
      gapHeadline: 'Service buyers win on referrals but lose on visibility.',
      gapText: 'The category is 70% word-of-mouth, which means most competitors invest almost nothing in content. That leaves a wide runway for any service business that shows up consistently online \u2014 the "why us" story travels fast when it\u2019s the only one being told.',
      marketTable: [
        { dim: 'Category size',        finding: '$860M in your service segment', confidence: 'Medium' },
        { dim: 'Growth rate',          finding: '7% YoY, referral-led',          confidence: 'Medium' },
        { dim: 'Content presence',     finding: 'Only 12% of firms post weekly', confidence: 'High' }
      ],
      opportunityBullets: [
        'A single case study post per week outperforms most competitor blogs because so few operators actually publish.',
        'Buyers Google the firm name after every referral \u2014 a strong website converts 3x more of those "warm audit" visits.',
        'Packaged fixed-price offers reduce the sales cycle from weeks to a single conversation.'
      ],
      opportunityTable: [
        { opp: 'One case study per week',      size: '2x inbound',   difficulty: 'Low' },
        { opp: 'Fixed-price packages',         size: '40% shorter cycle', difficulty: 'Medium' },
        { opp: 'Referral incentive program',   size: '25% pipeline', difficulty: 'Low' }
      ],
      demographics: [
        { age: '30-44', range: '$110-180K revenue', share: '41%' },
        { age: '45-54', range: '$180-400K revenue', share: '34%' },
        { age: '55-64', range: '$300K+ revenue',    share: '17%' }
      ],
      psychographics: [
        { name: 'Referral-first',   desc: 'Rarely buys cold; heavily weights personal introductions.' },
        { name: 'Outcome-focused',  desc: 'Wants a specific result described in specific numbers.' },
        { name: 'Risk-averse',      desc: 'Values reliability and predictability over novelty.' },
        { name: 'Time-poor',        desc: 'Chooses the fastest credible option over the cheapest.' }
      ],
      keyFindings: [
        { head: 'Referrals fill the pipeline but content fills the pause.',      body: 'Referrals are lumpy \u2014 content smooths the gaps between them. A weekly cadence prevents the feast-or-famine cycle almost every service firm experiences.' },
        { head: 'One specific outcome outperforms every generic claim.',         body: '"We helped a 12-person firm add $180K ARR in six months" pulls in more calls than "trusted growth partner". Specificity earns trust that adjectives can\u2019t.' },
        { head: 'Fixed-price packages compress sales cycles by 40%.',            body: 'Custom quotes create delay and comparison anxiety. Packaging removes the biggest reason a warm lead goes cold.' },
        { head: 'LinkedIn is your primary consideration channel.',               body: 'Not for discovery \u2014 for validation. Prospects lurk on your LinkedIn for weeks before reaching out. Post like you know they\u2019re watching, because they are.' },
        { head: 'The website is your best (and worst) salesperson.',             body: '82% of referred prospects visit the site before responding. Slow, dated, or unclear sites kill 30-40% of the intros you thought you were converting.' }
      ]
    },
    tech: {
      gapHeadline: 'The simple, highly specialized quadrant is the least contested.',
      gapText: 'Most tech products are still chasing the "platform" narrative \u2014 more features, more integrations, more scope. The buyers who actually convert quickly want the opposite: one job done exceptionally well. That quadrant is nearly empty.',
      marketTable: [
        { dim: 'Category size',        finding: '$2.4B ARR in your subsegment',  confidence: 'High' },
        { dim: 'Growth rate',          finding: '18% YoY, seat expansion-led',    confidence: 'High' },
        { dim: 'Feature overlap',      finding: '87% of tools solve 60% overlap', confidence: 'High' }
      ],
      opportunityBullets: [
        'Simple, single-purpose tools are outperforming platforms on activation and 30-day retention across almost every subsegment.',
        'Pricing pages are still dominated by "starting at $X" per seat \u2014 flat-fee alternatives feel bold and convert better than expected.',
        'The self-serve funnel is undersaturated in B2B; most competitors still insist on a demo call, which kills momentum.'
      ],
      opportunityTable: [
        { opp: 'Narrow product positioning',   size: '2x activation',  difficulty: 'Medium' },
        { opp: 'Self-serve flat pricing',      size: '3x trial-to-paid', difficulty: 'Medium' },
        { opp: 'Docs-first content strategy',  size: '$120K organic',  difficulty: 'High' }
      ],
      demographics: [
        { age: '25-34', range: '$95-160K salary',  share: '44%' },
        { age: '35-44', range: '$140-240K salary', share: '38%' },
        { age: '45-54', range: '$200K+ salary',    share: '12%' }
      ],
      psychographics: [
        { name: 'Time-poor operator',  desc: 'Signs up during work hours; needs value inside 5 minutes.' },
        { name: 'Peer-validated',      desc: 'Trusts recommendations from operators in similar roles.' },
        { name: 'Simplicity-biased',   desc: 'Chooses the product that\u2019s easiest to explain, not the deepest.' },
        { name: 'Docs-reader',         desc: 'Evaluates the docs before ever writing a line of code.' }
      ],
      keyFindings: [
        { head: 'Buyers want the one-line pitch, not the platform pitch.',        body: 'The strongest-performing landing pages in your subsegment lead with a specific job the tool does. Feature-list heros are underperforming category averages.' },
        { head: 'Time-to-first-value under 5 minutes changes everything.',        body: 'Trials that hit an "aha" moment inside 5 minutes convert 3x higher. Onboarding is where the pricing conversation actually gets won.' },
        { head: 'Docs quality is a leading indicator of product velocity.',       body: 'Buyers who read the docs before signing up convert nearly 2x higher and churn less. Investing in docs pays back on both ends of the funnel.' },
        { head: 'Communities matter more than webinars.',                         body: 'Users trust operators who already use the tool. A modest Slack/Discord community outperforms a costly webinar strategy in every metric.' },
        { head: 'Pricing transparency is a moat, not a giveaway.',                body: 'Hidden "contact us" pricing is now a negative signal in this category. Public flat pricing filters serious buyers in, not out.' }
      ]
    },
    creator: {
      gapHeadline: 'Authenticity beats production quality right now.',
      gapText: 'The creator economy has professionalized to the point where over-polished content is a red flag. Audiences increasingly reward creators who show the real, unedited process, and platforms are algorithmically boosting that content because it retains attention longer.',
      marketTable: [
        { dim: 'Attention supply',    finding: 'Down 12% YoY per creator',       confidence: 'Medium' },
        { dim: 'Retention weight',    finding: 'Now the top ranking signal',      confidence: 'High' },
        { dim: 'Owned audience gap',  finding: '71% rely on platform algorithms', confidence: 'High' }
      ],
      opportunityBullets: [
        'Behind-the-scenes formats have 2-3x the average watch time of finished content on every major platform.',
        'A modest email list of engaged followers outperforms 10x the platform following for direct monetization.',
        'Community-first launches (small paid Discord / Circle) consistently outperform mass-market product launches.'
      ],
      opportunityTable: [
        { opp: 'Behind-the-scenes reels',   size: '3x watch time',  difficulty: 'Low' },
        { opp: 'Owned email list',          size: '10x LTV',        difficulty: 'Medium' },
        { opp: 'Paid community',            size: '$25K/mo MRR',    difficulty: 'Medium' }
      ],
      demographics: [
        { age: '18-24', range: '$18-38K income',  share: '31%' },
        { age: '25-34', range: '$45-85K income',  share: '44%' },
        { age: '35-44', range: '$60-110K income', share: '17%' }
      ],
      psychographics: [
        { name: 'Parasocial-friendly',  desc: 'Feels a personal relationship with the creator.' },
        { name: 'Voice-loyal',          desc: 'Follows the person, not the topic.' },
        { name: 'Community-seeking',    desc: 'Wants access, not just content.' },
        { name: 'Impulse supporter',    desc: 'Buys quickly when the creator recommends something.' }
      ],
      keyFindings: [
        { head: 'Consistency beats brilliance.',                                  body: 'Creators who publish 3x/week for six months outperform those who publish "the perfect piece" once a month, on every audience-growth metric measured.' },
        { head: 'Owning the email list is the escape hatch.',                     body: 'Platform algorithm shifts have wiped out otherwise-healthy creator businesses overnight. An owned list is the only channel you fully control.' },
        { head: 'Vertical short-form drives discovery; long-form drives depth.',  body: 'Reels/TikTok win the top of funnel. Long-form (podcast, newsletter) is where casual followers become paying supporters.' },
        { head: 'The "why I started" story compounds.',                           body: 'Origin-story content re-shared quarterly consistently pulls in new followers and reactivates lapsed ones. It\u2019s your highest-yield evergreen post.' },
        { head: 'Direct sponsorships beat platform rev share on every axis.',     body: 'Direct brand deals typically pay 5-10x what platform monetization does for the same effort. The tradeoff is prospecting, which most creators avoid.' }
      ]
    },
    agency: {
      gapHeadline: 'Agencies win on referrals but lose on positioning.',
      gapText: 'Most agencies describe themselves the same way: "full-service", "results-driven", "growth partner". The market rewards agencies who publicly commit to one niche + one deliverable + one outcome. That level of specificity is rare and moves prospects faster.',
      marketTable: [
        { dim: 'Category size',       finding: '$1.9B in your service line',    confidence: 'High' },
        { dim: 'Growth rate',         finding: '11% YoY, niche-driven',          confidence: 'Medium' },
        { dim: 'Positioning clarity', finding: '18% of agencies clearly named',  confidence: 'High' }
      ],
      opportunityBullets: [
        'Niche specialization commands 30-50% higher fees than generalist positioning \u2014 buyers happily pay for confidence.',
        'Public case studies with real numbers outperform testimonials by an order of magnitude on lead quality.',
        'Retainer add-ons (audit, workshop, sprint) compress the sales cycle for anchor engagements.'
      ],
      opportunityTable: [
        { opp: 'Niche specialization',    size: '30-50% fee lift',  difficulty: 'Medium' },
        { opp: 'Number-led case studies', size: '3x lead quality',  difficulty: 'Low' },
        { opp: 'Sprint offering',         size: '$45K/quarter',     difficulty: 'Low' }
      ],
      demographics: [
        { age: '30-44', range: '$5-25M ARR client',  share: '46%' },
        { age: '35-49', range: '$25-100M ARR client', share: '32%' },
        { age: '40-55', range: '$100M+ ARR client',   share: '14%' }
      ],
      psychographics: [
        { name: 'Outcome-driven',   desc: 'Hires for a number, not an activity.' },
        { name: 'Reference-led',    desc: 'Won\u2019t hire without a warm intro.' },
        { name: 'Speed-obsessed',   desc: 'Chooses the agency that can start Monday.' },
        { name: 'Process-cautious', desc: 'Asks about methodology before pricing.' }
      ],
      keyFindings: [
        { head: 'Specialists win at 2x the rate of generalists.',                 body: 'Buyers responded to niche-positioned agencies 2.1x more often than "full-service" alternatives, even at higher price points. Specificity signals confidence.' },
        { head: 'Real numbers travel; adjectives don\u2019t.',                     body: 'Case studies with concrete outcomes ($X ARR, X% lift, X weeks) outperform testimonial-heavy ones by every measurable lead-quality metric.' },
        { head: 'The sales cycle is won at hello.',                               body: 'The first 15 minutes of a discovery call predict close probability more than any part of the proposal. Agencies with pre-work (audits, briefs) close faster.' },
        { head: 'LinkedIn is now the top of your funnel.',                        body: 'Not through cold outreach \u2014 through consistent publishing. Agencies that post 2-3x per week outperform ad-funded competitors on total pipeline over 12 months.' },
        { head: 'Retention beats acquisition, always.',                           body: 'A 10% retention improvement is worth 3x a 10% new-logo improvement for most agencies. Yet very few invest in expansion motion vs. new business.' }
      ]
    },
    nonprofit: {
      gapHeadline: 'Impact storytelling that feels personal beats institutional appeals.',
      gapText: 'Donor fatigue is real, but so is donor generosity when the ask feels like a specific person, not a statistic. Nonprofits that show one story at a time consistently outperform those relying on institutional metrics, especially with younger donors.',
      marketTable: [
        { dim: 'Giving pool',         finding: '$480M in your cause locally',      confidence: 'High' },
        { dim: 'Growth rate',         finding: '4% YoY, digital-shifted',           confidence: 'Medium' },
        { dim: 'Monthly giving',      finding: 'Up 22% YoY among <45 donors',       confidence: 'High' }
      ],
      opportunityBullets: [
        'Monthly recurring donors are worth 5-8x one-time gifts over the same period, and the ask is simpler.',
        'Personal impact stories on Instagram and email pull in donors that broader appeals never reach.',
        'Peer-to-peer campaigns leverage existing supporter networks and typically 2-3x major gift day results.'
      ],
      opportunityTable: [
        { opp: 'Monthly recurring giving',   size: '5-8x LTV',        difficulty: 'Medium' },
        { opp: 'Story-per-month email',      size: '30% open lift',   difficulty: 'Low' },
        { opp: 'Peer-to-peer campaign',      size: '2-3x campaign',   difficulty: 'Medium' }
      ],
      demographics: [
        { age: '25-34', range: '$45-90K income',   share: '19%' },
        { age: '35-54', range: '$90-180K income',  share: '43%' },
        { age: '55-74', range: '$150K+ income',    share: '32%' }
      ],
      psychographics: [
        { name: 'Cause-first',       desc: 'Cares about the mission, not the org chart.' },
        { name: 'Story-moved',       desc: 'Responds to individual impact more than aggregate stats.' },
        { name: 'Recurring-inclined', desc: 'Prefers small monthly commitments to one-time asks.' },
        { name: 'Community-connected', desc: 'Shares causes their network already supports.' }
      ],
      keyFindings: [
        { head: 'Monthly donors sustain the mission.',                            body: 'The average monthly donor gives 5-8x more over three years than a one-time donor. Yet most nonprofits still lead with one-time asks by default.' },
        { head: 'One face beats a thousand stats.',                               body: 'Individual impact stories drive higher click-throughs, higher conversion, and higher gift sizes than data-led appeals. The math is the argument, but the person is the ask.' },
        { head: 'Younger donors give differently, not less.',                     body: 'Under-45 donors give smaller, more frequent, and via social channels. Meet them where they are or leave that pool untapped.' },
        { head: 'Peer-to-peer beats top-down.',                                   body: 'Existing supporters recruiting their networks consistently outperforms brand-driven acquisition on donor quality and long-term retention.' },
        { head: 'Thank you fundraising is fundraising.',                          body: 'The follow-up email after a first gift is the single highest-ROI moment in the entire donor journey. Nonprofits that invest here retain donors 2x better.' }
      ]
    },
    other: {
      gapHeadline: 'Most businesses in your space aren\u2019t communicating clearly.',
      gapText: 'Category positioning is fragmented and inconsistent. Customers who invest 15 minutes researching still can\u2019t confidently articulate the difference between the top three options. That confusion is your opportunity: the first business to explain itself clearly wins outsized attention.',
      marketTable: [
        { dim: 'Category size',      finding: 'Estimated $200-500M in your niche', confidence: 'Medium' },
        { dim: 'Growth rate',        finding: '8-12% YoY across adjacent categories', confidence: 'Medium' },
        { dim: 'Positioning clarity', finding: 'Low across all top 10 competitors',    confidence: 'High' }
      ],
      opportunityBullets: [
        'Being the clearest voice in a crowded market is itself a differentiator worth investing in.',
        'Consistency beats novelty \u2014 showing up on the same channel weekly outperforms sporadic bursts.',
        'A single, memorable one-line description compounds every touch point that follows.'
      ],
      opportunityTable: [
        { opp: 'Clarify the one-liner',      size: '30% recall lift',   difficulty: 'Low' },
        { opp: 'Weekly cadence content',     size: '2x reach in 90d',   difficulty: 'Low' },
        { opp: 'Referral incentive',         size: '25% pipeline',      difficulty: 'Medium' }
      ],
      demographics: [
        { age: '25-44', range: '$50-120K',  share: '52%' },
        { age: '45-64', range: '$80-180K',  share: '31%' },
        { age: '18-24', range: '$25-50K',   share: '14%' }
      ],
      psychographics: [
        { name: 'Value-seeking',      desc: 'Wants a clear reason to choose you over alternatives.' },
        { name: 'Trust-first',        desc: 'Buys from businesses that feel honest and consistent.' },
        { name: 'Curiosity-driven',   desc: 'Willing to try new options if the pitch is clear.' },
        { name: 'Recommendation-led', desc: 'Weighs friend recommendations heavily.' }
      ],
      keyFindings: [
        { head: 'Clarity is the highest-leverage marketing investment.',          body: 'The businesses winning in fragmented categories aren\u2019t the cheapest or fanciest \u2014 they\u2019re the ones you can describe in one sentence. That sentence is worth writing 20 times until it lands.' },
        { head: 'Consistency compounds slowly, then suddenly.',                   body: 'Weekly presence for 12 weeks looks like nothing. Weekly presence for 12 months looks like a category leader. The gap between "sometimes" and "always" is where compounding lives.' },
        { head: 'Existing customers are your acquisition engine.',                body: 'Referred customers close 3x faster, spend 25% more, and churn less. Yet most businesses have zero explicit referral motion.' },
        { head: 'The homepage is your best salesperson.',                         body: 'Every dollar spent on ads sends people back to your homepage. Fixing headline copy typically returns more than the ad optimization it enabled.' },
        { head: 'Retention math beats acquisition math.',                         body: 'A 10% retention lift is worth roughly 3x a 10% new-customer lift for most businesses. Yet ad budgets outweigh retention budgets 20:1 on average.' }
      ]
    }
  };
  return byType[t] || byType.other;
}

// --- Customer Intelligence mock ---

function _rpMockCustomer(type) {
  const t = _rpNormType(type);
  const byType = {
    small: {
      jtbd: [
        { job: 'Find a local place I can trust',                type: 'Functional', importance: 9, satisfaction: 5, opportunity: 13 },
        { job: 'Feel like a regular, not a stranger',           type: 'Emotional',  importance: 8, satisfaction: 4, opportunity: 12 },
        { job: 'Justify a small treat during a busy week',      type: 'Emotional',  importance: 7, satisfaction: 6, opportunity: 8 },
        { job: 'Support businesses I actually believe in',      type: 'Social',     importance: 8, satisfaction: 5, opportunity: 11 },
        { job: 'Get in and out without friction',               type: 'Functional', importance: 9, satisfaction: 7, opportunity: 11 }
      ],
      decisionJourney: [
        { stage: 'Awareness',     goal: 'Notice you exist',              channel: 'Instagram / word of mouth', friction: 'No presence in feed',          kpi: 'Reach + saves' },
        { stage: 'Consideration', goal: 'Feel it\u2019s "for me"',       channel: 'Website / storefront',       friction: 'Inconsistent brand voice',      kpi: 'Profile visits' },
        { stage: 'Trial',         goal: 'Try you without regret',        channel: 'In-store / first visit',     friction: 'Overwhelming menu / choice',   kpi: 'First-purchase conversion' },
        { stage: 'Purchase',      goal: 'Feel confident about the buy',  channel: 'Point of sale',              friction: 'Slow checkout / no small talk', kpi: 'Ticket size' },
        { stage: 'Loyalty',       goal: 'Come back weekly',              channel: 'Email / SMS',                friction: 'No recognition on return',      kpi: 'Repeat purchase rate' }
      ],
      drivers: [
        { factor: 'Consistent quality',      weight: 9, quote: '"When it\u2019s good every time, I\u2019m a lifer."' },
        { factor: 'Personal recognition',    weight: 8, quote: '"They remember my order \u2014 that\u2019s why I keep coming."' },
        { factor: 'Local pride',             weight: 7, quote: '"I\u2019d rather support a neighbor than a chain."' },
        { factor: 'Small everyday treats',   weight: 6, quote: '"It\u2019s a $6 pick-me-up I look forward to."' }
      ],
      barriers: [
        { factor: 'Inconsistent experience',  weight: 9, quote: '"Great one week, mediocre the next \u2014 I stop showing up."' },
        { factor: 'Feels transactional',      weight: 7, quote: '"They don\u2019t know me even though I\u2019m in every week."' },
        { factor: 'Price without value story', weight: 6, quote: '"It costs more but I don\u2019t know why."' },
        { factor: 'Hard to find online',      weight: 5, quote: '"Their hours weren\u2019t on their profile, so I gave up."' }
      ],
      segments: [
        { name: 'The Weekly Regular',  size: '46%', desc: 'Comes in 1-2x per week, high retention, moderate ticket size.', triggers: ['Recognition by name', 'Product consistency', 'Convenient hours'] },
        { name: 'The Weekend Explorer', size: '28%', desc: 'Visits new places on weekends, spends more per visit, drives referrals.', triggers: ['Instagram discovery', 'Unique menu item', 'Photogenic space'] }
      ]
    },
    ecommerce: {
      jtbd: [
        { job: 'Confirm this is the right choice',      type: 'Functional', importance: 9, satisfaction: 5, opportunity: 13 },
        { job: 'Feel smart about how I spend',          type: 'Emotional',  importance: 8, satisfaction: 6, opportunity: 10 },
        { job: 'Trust the return will be easy',         type: 'Functional', importance: 8, satisfaction: 5, opportunity: 11 },
        { job: 'Get it fast without stressing about it', type: 'Functional', importance: 8, satisfaction: 6, opportunity: 10 },
        { job: 'Signal something about myself',         type: 'Social',     importance: 6, satisfaction: 5, opportunity: 7 }
      ],
      decisionJourney: [
        { stage: 'Awareness',     goal: 'See something worth a click',   channel: 'Instagram / TikTok',        friction: 'Product looks generic',       kpi: 'CTR / saves' },
        { stage: 'Consideration', goal: 'Understand what makes you you',  channel: 'Product page',              friction: 'Weak copy, no differentiator', kpi: 'Time on PDP' },
        { stage: 'Trial',         goal: 'Test the vibe safely',           channel: 'Reviews / return policy',   friction: 'Ambiguous returns',            kpi: 'Add to cart' },
        { stage: 'Purchase',      goal: 'Complete without friction',      channel: 'Checkout',                  friction: 'Slow mobile checkout',         kpi: 'Cart-to-order rate' },
        { stage: 'Loyalty',       goal: 'Have a reason to come back',     channel: 'Email / post-purchase',     friction: 'No follow-up',                 kpi: 'Repeat purchase rate' }
      ],
      drivers: [
        { factor: 'Social proof',            weight: 9, quote: '"3,000 reviews and they all say the same thing? I\u2019m in."' },
        { factor: 'Clear return policy',     weight: 8, quote: '"If it doesn\u2019t work, I know I\u2019m not stuck with it."' },
        { factor: 'Free / fast shipping',    weight: 8, quote: '"Two days free? Take my money."' },
        { factor: 'Distinctive brand story', weight: 7, quote: '"They stand for something \u2014 that matters to me."' }
      ],
      barriers: [
        { factor: 'Weak product page',        weight: 9, quote: '"I couldn\u2019t tell why I should buy this one."' },
        { factor: 'Ambiguous returns',        weight: 8, quote: '"I don\u2019t buy from anyone who hides the return policy."' },
        { factor: 'Slow mobile checkout',     weight: 8, quote: '"Three screens to check out? I\u2019m gone."' },
        { factor: 'No urgency signal',        weight: 5, quote: '"There was nothing telling me to decide today."' }
      ],
      segments: [
        { name: 'Comparison Shoppers',  size: '54%', desc: 'Opens 3-5 tabs before buying; converts once one clearly stands out.', triggers: ['Above-fold social proof', 'Direct differentiation', 'Bundle offer'] },
        { name: 'Impulse Loyalists',    size: '31%', desc: 'Finds you via social, buys within 3 minutes when the vibe is right.', triggers: ['Vertical video', 'Clear one-liner', 'Free shipping threshold'] }
      ]
    },
    service: {
      jtbd: [
        { job: 'Hire someone I won\u2019t regret',      type: 'Emotional',  importance: 10, satisfaction: 4, opportunity: 16 },
        { job: 'Get a concrete outcome fast',           type: 'Functional', importance: 9,  satisfaction: 5, opportunity: 13 },
        { job: 'Justify the decision to my team',       type: 'Social',     importance: 8,  satisfaction: 5, opportunity: 11 },
        { job: 'Avoid the classic agency runaround',    type: 'Emotional',  importance: 9,  satisfaction: 4, opportunity: 14 },
        { job: 'Feel like I\u2019m in expert hands',    type: 'Emotional',  importance: 8,  satisfaction: 6, opportunity: 10 }
      ],
      decisionJourney: [
        { stage: 'Awareness',     goal: 'Hear your name from someone I trust', channel: 'Referral / LinkedIn',    friction: 'You\u2019re not top-of-mind',    kpi: 'Referral mentions' },
        { stage: 'Consideration', goal: 'Confirm you\u2019re the specialist',  channel: 'Website / case studies',  friction: 'Generic positioning',            kpi: 'Case study reads' },
        { stage: 'Trial',         goal: 'Test fit without committing',         channel: 'Discovery call / audit',  friction: 'Long sales cycle',               kpi: 'Call \u2192 proposal rate' },
        { stage: 'Purchase',      goal: 'Sign fast, start faster',             channel: 'Proposal',                friction: 'Confusing scope / pricing',       kpi: 'Proposal \u2192 close rate' },
        { stage: 'Loyalty',       goal: 'Renew and expand',                    channel: 'QBR / expansion pitch',   friction: 'No expansion motion',             kpi: 'Retention + expansion' }
      ],
      drivers: [
        { factor: 'Specific past outcomes',   weight: 9, quote: '"They already did this exact thing for someone like us."' },
        { factor: 'Warm referral',            weight: 9, quote: '"My friend swears by them \u2014 that\u2019s all I needed."' },
        { factor: 'Fixed-price offer',        weight: 7, quote: '"I could see exactly what I was buying."' },
        { factor: 'Fast, credible first call', weight: 7, quote: '"They knew our situation in five minutes."' }
      ],
      barriers: [
        { factor: 'Generic positioning',      weight: 9, quote: '"They looked like everyone else."' },
        { factor: 'Long, opaque sales cycle', weight: 8, quote: '"Three calls and I still didn\u2019t have a price."' },
        { factor: 'No case studies with numbers', weight: 7, quote: '"They wouldn\u2019t share results \u2014 that told me enough."' },
        { factor: 'Weak online presence',     weight: 6, quote: '"I Googled them and found nothing."' }
      ],
      segments: [
        { name: 'Referral-First Buyers',   size: '61%', desc: 'Almost always hires through introductions; short evaluation window.', triggers: ['Warm intro', 'One credible case study', 'Fast turnaround'] },
        { name: 'Research-First Buyers',   size: '27%', desc: 'Does 20+ hours of research; wants specificity and depth.', triggers: ['Deep case studies', 'Publicly stated methodology', 'Concrete pricing'] }
      ]
    },
    tech: {
      jtbd: [
        { job: 'Solve one specific problem fast',         type: 'Functional', importance: 10, satisfaction: 5, opportunity: 15 },
        { job: 'Look good bringing this into my team',    type: 'Social',     importance: 8,  satisfaction: 5, opportunity: 11 },
        { job: 'Avoid another vendor evaluation',         type: 'Emotional',  importance: 9,  satisfaction: 6, opportunity: 12 },
        { job: 'Trust the tool won\u2019t explode later',  type: 'Emotional',  importance: 8,  satisfaction: 6, opportunity: 10 },
        { job: 'Get started without a demo call',         type: 'Functional', importance: 8,  satisfaction: 5, opportunity: 11 }
      ],
      decisionJourney: [
        { stage: 'Awareness',     goal: 'Understand what this does',          channel: 'Homepage / LinkedIn',      friction: 'Feature-list hero',           kpi: 'Trial signups' },
        { stage: 'Consideration', goal: 'See it works for my case',           channel: 'Docs / product tour',       friction: 'Bad docs',                    kpi: 'Docs engagement' },
        { stage: 'Trial',         goal: 'Hit an "aha" fast',                   channel: 'Product',                   friction: 'Onboarding drag',             kpi: 'Activation rate' },
        { stage: 'Purchase',      goal: 'Convert without paperwork',           channel: 'Pricing page / self-serve', friction: 'Hidden pricing',              kpi: 'Trial \u2192 paid rate' },
        { stage: 'Loyalty',       goal: 'Expand to the rest of my team',       channel: 'In-app / CS',               friction: 'No expansion motion',         kpi: 'Seat expansion' }
      ],
      drivers: [
        { factor: 'Time-to-first-value',       weight: 9, quote: '"I got value in five minutes \u2014 I paid the next day."' },
        { factor: 'Peer recommendation',       weight: 8, quote: '"Three ops leaders I trust use this."' },
        { factor: 'Clear public pricing',      weight: 8, quote: '"I hate ‘contact us for pricing\u2019 \u2014 this doesn\u2019t do that."' },
        { factor: 'Strong docs',               weight: 7, quote: '"The docs were so good I bought before I even tried it."' }
      ],
      barriers: [
        { factor: 'Long onboarding',           weight: 9, quote: '"I abandoned when it wanted to schedule a demo."' },
        { factor: 'Feature-list positioning',  weight: 8, quote: '"I couldn\u2019t tell what it actually did."' },
        { factor: 'Hidden pricing',            weight: 8, quote: '"If I can\u2019t see the price, I move on."' },
        { factor: 'Weak community',            weight: 5, quote: '"Nobody in my Slack groups had heard of it."' }
      ],
      segments: [
        { name: 'Time-Poor Operators',   size: '52%', desc: 'Signs up during work; needs value inside 5 minutes.', triggers: ['Fast onboarding', 'Templates library', 'Peer social proof'] },
        { name: 'Team Champions',        size: '33%', desc: 'Buys for their team; needs to sell it internally after.', triggers: ['Case studies from similar teams', 'Free tier for peers', 'ROI calculator'] }
      ]
    },
    creator: {
      jtbd: [
        { job: 'Feel connected to the creator',    type: 'Emotional',  importance: 10, satisfaction: 6, opportunity: 14 },
        { job: 'Learn something I can actually use', type: 'Functional', importance: 8,  satisfaction: 5, opportunity: 11 },
        { job: 'Support someone I believe in',      type: 'Social',     importance: 8,  satisfaction: 6, opportunity: 10 },
        { job: 'Be entertained without ads',        type: 'Emotional',  importance: 7,  satisfaction: 5, opportunity: 9 },
        { job: 'Access the creator directly',       type: 'Social',     importance: 7,  satisfaction: 4, opportunity: 10 }
      ],
      decisionJourney: [
        { stage: 'Awareness',     goal: 'See something that stops the scroll', channel: 'Reels / TikTok',           friction: 'Blend-in content',            kpi: 'Reach + saves' },
        { stage: 'Consideration', goal: 'Feel the voice is worth following',   channel: 'Profile / recent posts',   friction: 'Inconsistent voice',          kpi: 'Follows' },
        { stage: 'Trial',         goal: 'Watch a full long-form piece',        channel: 'YouTube / podcast',        friction: 'Weak hook',                   kpi: 'Long-form retention' },
        { stage: 'Purchase',      goal: 'Buy the product / join the community', channel: 'Landing page',             friction: 'Unclear offer',               kpi: 'Signup rate' },
        { stage: 'Loyalty',       goal: 'Stay in the inner circle',            channel: 'Email / community',        friction: 'No cadence',                  kpi: 'Retention' }
      ],
      drivers: [
        { factor: 'Authentic voice',           weight: 10, quote: '"They sound like a friend, not a brand."' },
        { factor: 'Consistent cadence',        weight: 8,  quote: '"I know something\u2019s coming every Tuesday."' },
        { factor: 'Personal access',           weight: 7,  quote: '"I got a reply and it made my week."' },
        { factor: 'Actually useful content',   weight: 8,  quote: '"I use their advice every week."' }
      ],
      barriers: [
        { factor: 'Over-polished content',     weight: 8, quote: '"It feels like an ad now, I stopped watching."' },
        { factor: 'Sporadic posting',          weight: 8, quote: '"I never know when they\u2019re going to show up."' },
        { factor: 'No community access',       weight: 6, quote: '"I want to be part of it, not just watch it."' },
        { factor: 'Weak call to action',       weight: 6, quote: '"I love them but I don\u2019t know what to actually buy."' }
      ],
      segments: [
        { name: 'True Fans',       size: '18%', desc: 'Will buy almost anything you make; drives the majority of revenue.', triggers: ['Community access', 'First-look drops', 'Personal replies'] },
        { name: 'Casual Followers', size: '68%', desc: 'Watches often, buys rarely; converts on story-driven launches.', triggers: ['Origin story reposts', 'Free lead magnets', 'Limited-time offers'] }
      ]
    },
    agency: {
      jtbd: [
        { job: 'Solve a very specific business problem', type: 'Functional', importance: 10, satisfaction: 5, opportunity: 15 },
        { job: 'Make the case to my board / CEO',        type: 'Social',     importance: 9,  satisfaction: 5, opportunity: 13 },
        { job: 'Avoid another agency disaster',          type: 'Emotional',  importance: 9,  satisfaction: 4, opportunity: 14 },
        { job: 'Move faster than we can internally',     type: 'Functional', importance: 8,  satisfaction: 6, opportunity: 10 },
        { job: 'Learn from operators, not textbooks',    type: 'Emotional',  importance: 7,  satisfaction: 6, opportunity: 8 }
      ],
      decisionJourney: [
        { stage: 'Awareness',     goal: 'Hear about you from someone senior',   channel: 'LinkedIn / referral',       friction: 'Weak presence',            kpi: 'Warm intros' },
        { stage: 'Consideration', goal: 'Confirm you\u2019ve done this before',  channel: 'Case studies',              friction: 'Vague past work',          kpi: 'Case study reads' },
        { stage: 'Trial',         goal: 'Sample how you think',                  channel: 'Discovery / audit',         friction: 'Weak first meeting',       kpi: 'Call \u2192 proposal' },
        { stage: 'Purchase',      goal: 'Sign on scope you understand',          channel: 'Proposal',                  friction: 'Complex scope docs',       kpi: 'Proposal close rate' },
        { stage: 'Loyalty',       goal: 'Renew and expand engagement',           channel: 'QBR',                       friction: 'No expansion motion',      kpi: 'Retention + expansion' }
      ],
      drivers: [
        { factor: 'Numbers-based case studies', weight: 9, quote: '"They said ‘we did X and got Y.\u2019 Everyone else just said ‘growth.\u2019"' },
        { factor: 'Warm referral from peer',    weight: 9, quote: '"A CMO I trust told me to talk to them."' },
        { factor: 'Fast, credible first call',  weight: 8, quote: '"They asked three questions and nailed our situation."' },
        { factor: 'Sprint / trial offer',       weight: 7, quote: '"They gave me a way to try them without a six-figure commitment."' }
      ],
      barriers: [
        { factor: 'Generic full-service pitch', weight: 9, quote: '"They said they do everything \u2014 which means nothing."' },
        { factor: 'No public track record',     weight: 8, quote: '"I couldn\u2019t verify their claims anywhere."' },
        { factor: 'Slow follow-up',             weight: 7, quote: '"They took four days to send the proposal. We moved on."' },
        { factor: 'Weak thought leadership',    weight: 6, quote: '"Nothing on their blog since 2022."' }
      ],
      segments: [
        { name: 'Series A/B Leaders',   size: '48%', desc: 'Growing fast, needs specialist help, willing to pay a premium.', triggers: ['Case studies from similar stage', 'Sprint offer', 'Warm intro'] },
        { name: 'Mid-Market Operators', size: '34%', desc: 'Established, cautious, referral-driven, values reliability.', triggers: ['Long client tenure signals', 'Board-friendly deliverables', 'Retainer pricing'] }
      ]
    },
    nonprofit: {
      jtbd: [
        { job: 'Feel my gift actually mattered',        type: 'Emotional',  importance: 10, satisfaction: 5, opportunity: 15 },
        { job: 'Share this cause with my network',      type: 'Social',     importance: 7,  satisfaction: 5, opportunity: 9 },
        { job: 'Trust the money reaches the mission',   type: 'Functional', importance: 9,  satisfaction: 5, opportunity: 13 },
        { job: 'Live my values through my spending',    type: 'Emotional',  importance: 8,  satisfaction: 6, opportunity: 10 },
        { job: 'Stay connected without being spammed',  type: 'Emotional',  importance: 7,  satisfaction: 4, opportunity: 10 }
      ],
      decisionJourney: [
        { stage: 'Awareness',     goal: 'Encounter a story that moves me',      channel: 'Social / friend share',    friction: 'Story feels institutional', kpi: 'Story shares' },
        { stage: 'Consideration', goal: 'Believe you can actually deliver',      channel: 'Website / annual report',  friction: 'Buried impact data',        kpi: 'Landing page CVR' },
        { stage: 'Trial',         goal: 'Give a small first gift',                channel: 'Donation page',            friction: 'Clunky checkout',           kpi: 'First-gift conversion' },
        { stage: 'Purchase',      goal: 'Feel this was well spent',              channel: 'Thank you flow',           friction: 'Generic follow-up',         kpi: 'Repeat gift rate' },
        { stage: 'Loyalty',       goal: 'Become a monthly supporter',             channel: 'Email / community',        friction: 'No monthly ask',            kpi: 'Monthly donor conversion' }
      ],
      drivers: [
        { factor: 'Specific impact story',      weight: 10, quote: '"One kid, one story \u2014 that\u2019s what got me."' },
        { factor: 'Peer recommendation',        weight: 8,  quote: '"My cousin runs the local chapter. That\u2019s enough for me."' },
        { factor: 'Values alignment',           weight: 8,  quote: '"They care about the same things I do."' },
        { factor: 'Thoughtful thank-you',       weight: 7,  quote: '"They sent a real update, not a template."' }
      ],
      barriers: [
        { factor: 'Statistics-heavy appeals',   weight: 8, quote: '"Numbers don\u2019t move me. People do."' },
        { factor: 'Opaque financials',          weight: 8, quote: '"I couldn\u2019t tell where my money actually went."' },
        { factor: 'Constant asks, no updates',  weight: 7, quote: '"Every email was another request. I unsubscribed."' },
        { factor: 'Confusing donation page',    weight: 6, quote: '"I got frustrated and gave up mid-donation."' }
      ],
      segments: [
        { name: 'Monthly Sustainers',     size: '34%', desc: 'Smaller monthly gifts, high lifetime value, easy to nurture.', triggers: ['Story-per-month email', 'Monthly-giving ask', 'Named recognition'] },
        { name: 'Major Gift Donors',      size: '18%', desc: 'Fewer, larger gifts; wants deeper access and accountability.', triggers: ['Direct outreach from leadership', 'Site visit invitations', 'Annual impact briefing'] }
      ]
    },
    other: {
      jtbd: [
        { job: 'Understand what makes you different',   type: 'Functional', importance: 9, satisfaction: 5, opportunity: 13 },
        { job: 'Feel confident in the choice',          type: 'Emotional',  importance: 8, satisfaction: 5, opportunity: 11 },
        { job: 'Justify the price to myself',           type: 'Functional', importance: 8, satisfaction: 6, opportunity: 10 },
        { job: 'Have a story I can tell others',        type: 'Social',     importance: 6, satisfaction: 5, opportunity: 7 },
        { job: 'Come back without thinking twice',      type: 'Functional', importance: 8, satisfaction: 6, opportunity: 10 }
      ],
      decisionJourney: [
        { stage: 'Awareness',     goal: 'Notice you',                          channel: 'Social / referral',        friction: 'No consistent presence',     kpi: 'Reach' },
        { stage: 'Consideration', goal: 'Understand the offer',                 channel: 'Website / social bio',     friction: 'Weak one-liner',             kpi: 'Landing page CVR' },
        { stage: 'Trial',         goal: 'Try without over-committing',          channel: 'Free / first offer',       friction: 'No low-friction entry',      kpi: 'Trial conversion' },
        { stage: 'Purchase',      goal: 'Buy confidently',                      channel: 'Purchase flow',            friction: 'Slow / confusing checkout',  kpi: 'Purchase conversion' },
        { stage: 'Loyalty',       goal: 'Come back regularly',                  channel: 'Email / community',        friction: 'No follow-up',               kpi: 'Repeat rate' }
      ],
      drivers: [
        { factor: 'Clear value promise',       weight: 8, quote: '"I understood exactly what I was getting."' },
        { factor: 'Trust signals',             weight: 8, quote: '"The reviews and stories matched what they said."' },
        { factor: 'Ease of first step',        weight: 7, quote: '"They made it easy to try before committing."' },
        { factor: 'Recognition on return',     weight: 6, quote: '"They remembered me and I remembered them."' }
      ],
      barriers: [
        { factor: 'Confusing positioning',     weight: 8, quote: '"I still can\u2019t tell what they do."' },
        { factor: 'No social proof',           weight: 7, quote: '"I couldn\u2019t find anyone talking about them."' },
        { factor: 'Slow to respond',           weight: 6, quote: '"They took two days to reply. I found someone else."' },
        { factor: 'Weak follow-up',            weight: 5, quote: '"I bought once and never heard from them again."' }
      ],
      segments: [
        { name: 'Value-seekers',      size: '58%', desc: 'Wants a clear reason to choose you over alternatives.', triggers: ['One-line differentiator', 'Social proof', 'Clear pricing'] },
        { name: 'Loyalty-drivers',    size: '27%', desc: 'Fewer buyers but high repeat rate; drives referrals.', triggers: ['Personal recognition', 'Consistent quality', 'Recognition on return'] }
      ]
    }
  };
  return byType[t] || byType.other;
}

// --- Competition mock ---

function _rpMockCompetition(type) {
  const t = _rpNormType(type);
  const byType = {
    small: {
      whitespace: 'Most local competitors chase foot traffic and never build a memorable brand voice.',
      whitespaceText: 'Your category is defined by heads-down operators who compete on price and location. There\u2019s no meaningful brand storytelling happening in your city. That means a small consistent presence with a distinct voice can own more mindshare than businesses 5x your size.',
      summaryTable: [
        { player: 'Chain / franchise',      position: 'Convenience-led',   threat: 'High' },
        { player: 'Established local shop', position: 'Reputation-led',    threat: 'Medium' },
        { player: 'New indie operator',     position: 'Novelty-led',       threat: 'Low' }
      ],
      players: [
        {
          name: 'Category chain',
          desc: 'The big-brand option most locals default to when they don\u2019t know better.',
          strengths: ['Broad awareness', 'Consistent product', 'Convenient locations'],
          weaknesses: ['Zero personality', 'Weak community ties', 'Generic experience'],
          price: '$-$$'
        },
        {
          name: 'The neighborhood incumbent',
          desc: '10+ years in business, referral-driven, doesn\u2019t market at all.',
          strengths: ['Deep trust', 'Loyal regulars', 'Word-of-mouth engine'],
          weaknesses: ['No online presence', 'Dated brand', 'Not reaching younger locals'],
          price: '$$'
        },
        {
          name: 'The new indie',
          desc: 'Recently opened, active on Instagram, still finding their audience.',
          strengths: ['Fresh brand', 'Active social', 'Novel product angle'],
          weaknesses: ['Inconsistent quality', 'Small following', 'Untested at scale'],
          price: '$$-$$$'
        }
      ],
      advantageTable: [
        { adv: 'Distinct brand voice',        why: 'No one else in the category has one.',           how: 'Post 3x/week with a consistent voice for 90 days.' },
        { adv: 'Named regulars program',      why: 'Recognition drives outsized loyalty in this category.', how: 'Track top 20 customers by name and treat them accordingly.' },
        { adv: 'Weekly limited drop',         why: 'Creates urgency incumbents can\u2019t match.',   how: 'Announce a "this week only" special every Monday.' }
      ],
      riskTable: [
        { risk: 'Chain opens nearby',         likelihood: 3, impact: 4, mitigation: 'Build community fast so loyalty stays with you when a chain moves in.' },
        { risk: 'Copycat picks up your angle', likelihood: 4, impact: 3, mitigation: 'Compound content library and named regulars \u2014 both hard to copy.' },
        { risk: 'Category cools',              likelihood: 2, impact: 3, mitigation: 'Diversify offerings and revenue channels early (e.g., wholesale, subscription).' },
        { risk: 'Key operator leaves',         likelihood: 2, impact: 4, mitigation: 'Document processes; cross-train so the business isn\u2019t one-person dependent.' }
      ]
    },
    ecommerce: {
      whitespace: 'Everyone competes on price and shipping. Nobody competes on clarity.',
      whitespaceText: 'The category is saturated on the surface but shallow underneath. Every store looks the same because they all learned from the same playbook. A store with a distinct point of view + clear positioning cuts through immediately, and the compounding effect is enormous.',
      summaryTable: [
        { player: 'Major marketplace',      position: 'Convenience + selection',  threat: 'High' },
        { player: 'DTC incumbent',          position: 'Brand + distribution',     threat: 'High' },
        { player: 'Small DTC challenger',   position: 'Niche positioning',        threat: 'Medium' }
      ],
      players: [
        {
          name: 'Marketplace giants',
          desc: 'Where the mass-market default buyer starts and often ends.',
          strengths: ['Speed to delivery', 'Reviews at scale', 'Cheap logistics'],
          weaknesses: ['No brand feel', 'Race to the bottom', 'Copycat products'],
          price: '$-$$'
        },
        {
          name: 'DTC incumbent',
          desc: 'Well-funded, well-designed, has established brand awareness.',
          strengths: ['Polished brand', 'Strong CAC', 'Full-funnel infrastructure'],
          weaknesses: ['Predictable positioning', 'Getting expensive to run', 'Innovation slowing'],
          price: '$$-$$$'
        },
        {
          name: 'Small DTC challenger',
          desc: 'Newer, sharper, niche-specialized. Growing on TikTok and community.',
          strengths: ['Sharp positioning', 'Founder-led voice', 'Community engine'],
          weaknesses: ['Fragile supply chain', 'Small team', 'Untested at scale'],
          price: '$$-$$$'
        }
      ],
      advantageTable: [
        { adv: 'Above-fold social proof',   why: 'Every competitor buries it three scrolls down.',    how: 'Rewrite PDP hero with reviews and press logos in the first viewport.' },
        { adv: 'Owned email list',          why: 'Everyone rents attention on Meta/Google.',           how: 'Post-purchase flow + lead magnet to build 5K subscribers in 90 days.' },
        { adv: 'Distinct founder voice',    why: 'Founder-led brands convert 30% higher on average.',  how: 'Post founder POV weekly on the newsletter + Instagram.' }
      ],
      riskTable: [
        { risk: 'Marketplace launches a competitor SKU', likelihood: 3, impact: 5, mitigation: 'Build brand loyalty and owned channels before you\u2019re commoditized.' },
        { risk: 'Ad costs spike again',                  likelihood: 4, impact: 4, mitigation: 'Reduce dependence on paid CAC \u2014 email and community first.' },
        { risk: 'Supplier disruption',                   likelihood: 2, impact: 4, mitigation: 'Diversify suppliers and hold safety stock for the top 20% of SKUs.' },
        { risk: 'Cheap knockoff appears',                likelihood: 4, impact: 3, mitigation: 'Deepen brand story so buyers don\u2019t optimize purely on price.' }
      ]
    },
    service: {
      whitespace: 'Most competitors position as "full-service"; nobody wins by being everything to everyone.',
      whitespaceText: 'Your category is stuffed with firms that describe themselves in identical language. Prospects can\u2019t tell them apart, and the ones that do stand out do so with narrow positioning + a public track record. That level of specificity is genuinely rare.',
      summaryTable: [
        { player: 'Large incumbent firm',     position: 'Reputation + scale',    threat: 'Medium' },
        { player: 'Mid-size generalist',      position: 'Full-service',          threat: 'Medium' },
        { player: 'Niche specialist',         position: 'One deliverable',       threat: 'Low' }
      ],
      players: [
        {
          name: 'Large incumbent',
          desc: 'The safe default. Bigger firm, deeper bench, higher prices.',
          strengths: ['Established brand', 'Broad expertise', 'Board-friendly'],
          weaknesses: ['Slow', 'Junior team on projects', 'Expensive'],
          price: '$$$-$$$$'
        },
        {
          name: 'Mid-size generalist',
          desc: 'Full-service, referral-driven, mostly indistinguishable in positioning.',
          strengths: ['Reasonably priced', 'Flexible scope', 'Real senior involvement'],
          weaknesses: ['Generic pitch', 'No public track record', 'Slow follow-up'],
          price: '$$-$$$'
        },
        {
          name: 'Niche specialist',
          desc: 'Narrow-and-deep positioning. Wins on being obviously the right fit.',
          strengths: ['Clear specialization', 'Public results', 'Faster sales cycle'],
          weaknesses: ['Limited scope', 'Small team', 'No fallback for adjacent needs'],
          price: '$$$-$$$$'
        }
      ],
      advantageTable: [
        { adv: 'Public numbers-based case studies', why: 'Almost no one in your space publishes real outcomes.',   how: 'Ship one case study per month with a specific result.' },
        { adv: 'Fixed-price sprint offer',           why: 'Custom quotes create decision drag your peers can\u2019t fix.', how: 'Package one deliverable as a 2-week fixed sprint at a public price.' },
        { adv: 'LinkedIn thought leadership',        why: 'Category rewards consistency; almost nobody is doing it.', how: 'Post 2-3x weekly on a narrow expertise thread for 90 days.' }
      ],
      riskTable: [
        { risk: 'Key client leaves',            likelihood: 3, impact: 5, mitigation: 'Diversify revenue \u2014 no client >25% of book.' },
        { risk: 'In-house team replaces you',   likelihood: 3, impact: 4, mitigation: 'Move into strategic advisory + expansion services vs. pure execution.' },
        { risk: 'Category commoditization',     likelihood: 3, impact: 4, mitigation: 'Deepen niche positioning; publish specific results other firms can\u2019t match.' },
        { risk: 'Senior operator turnover',     likelihood: 2, impact: 5, mitigation: 'Cross-train, document methodology, promote a #2 who can own client relationships.' }
      ]
    },
    tech: {
      whitespace: 'Everyone chases the platform pitch. The narrow, well-executed tool has no real competition.',
      whitespaceText: 'Your subsegment is loaded with tools trying to become platforms. That leaves the "solves one job exceptionally well" position almost empty. Buyers who convert quickly want exactly that, and they\u2019ll happily pay for clarity.',
      summaryTable: [
        { player: 'Enterprise platform',   position: 'Broad + expensive',       threat: 'Medium' },
        { player: 'SMB all-in-one',        position: 'Bundle + convenience',    threat: 'High' },
        { player: 'Adjacent niche tool',   position: 'Specialty + focus',       threat: 'Medium' }
      ],
      players: [
        {
          name: 'Enterprise platform',
          desc: 'Established, expensive, sold via sales-led motion.',
          strengths: ['Deep features', 'Enterprise trust', 'Big brand'],
          weaknesses: ['Slow', 'Complex to adopt', 'Overkill for most teams'],
          price: '$$$-$$$$'
        },
        {
          name: 'SMB all-in-one',
          desc: 'Bundles many mediocre tools into one product; wins on convenience.',
          strengths: ['Bundled pricing', 'One vendor', 'Great sales motion'],
          weaknesses: ['Each module is average', 'Feature bloat', 'Poor DX'],
          price: '$$-$$$'
        },
        {
          name: 'Adjacent niche tool',
          desc: 'Serves a slightly different but overlapping need; often confused for a competitor.',
          strengths: ['Sharp positioning', 'Loyal community', 'Fast product velocity'],
          weaknesses: ['Small team', 'Limited integrations', 'Untested at enterprise scale'],
          price: '$$-$$$'
        }
      ],
      advantageTable: [
        { adv: 'Do one job better than anyone', why: 'The rest of the market is broadening while depth compounds.', how: 'Cut the roadmap ruthlessly. Ship depth in the top 3 use cases only.' },
        { adv: 'Time-to-first-value <5 minutes', why: 'Onboarding drag kills more deals than pricing does.',         how: 'Redesign the trial for a specific "aha" hit within 5 minutes.' },
        { adv: 'Docs as marketing',              why: 'Great docs convert docs-readers 2x higher than average.',      how: 'Invest in interactive docs + real code examples across top 20 flows.' }
      ],
      riskTable: [
        { risk: 'Platform ships your feature',   likelihood: 4, impact: 4, mitigation: 'Move faster than they can; deepen niche the platform can\u2019t justify.' },
        { risk: 'Category consolidation',        likelihood: 3, impact: 3, mitigation: 'Build for the segment consolidation misses; own that beachhead.' },
        { risk: 'Key engineer leaves',           likelihood: 2, impact: 5, mitigation: 'Document architecture; cross-train; strong hiring pipeline.' },
        { risk: 'Ad economics deteriorate',      likelihood: 4, impact: 3, mitigation: 'Reduce paid dependency \u2014 docs, community, and product-led growth.' }
      ]
    },
    creator: {
      whitespace: 'Most creators optimize for platform algorithms; few build for owned audiences.',
      whitespaceText: 'Every creator you\u2019re compared to is playing the same platform game. That means one algorithm change can wipe them out. Creators who build owned channels (email, community, product) compound differently and are almost impossible to unseat once established.',
      summaryTable: [
        { player: 'Mega-creator',        position: 'Scale + brand',           threat: 'High' },
        { player: 'Adjacent-niche creator', position: 'Overlapping audience',   threat: 'Medium' },
        { player: 'New creator in niche',   position: 'Rising, hungry',         threat: 'Low' }
      ],
      players: [
        {
          name: 'Mega-creator',
          desc: 'Massive audience but generalist; not a direct competitor but sets attention bar.',
          strengths: ['Reach', 'Brand deals', 'Established production'],
          weaknesses: ['Losing intimacy', 'Ad-heavy', 'Depth over breadth'],
          price: '—'
        },
        {
          name: 'Adjacent-niche creator',
          desc: 'Similar audience overlap. Sometimes collaborators, sometimes rivals.',
          strengths: ['Deep audience trust', 'Established voice', 'Community engine'],
          weaknesses: ['Narrower reach', 'Slower cadence', 'Fewer commercial partners'],
          price: '—'
        },
        {
          name: 'Rising creator',
          desc: 'New, hungry, moving fast. Often takes attention from established creators.',
          strengths: ['High cadence', 'Fresh formats', 'Algorithm-savvy'],
          weaknesses: ['Unproven brand', 'Fragile monetization', 'Small community'],
          price: '—'
        }
      ],
      advantageTable: [
        { adv: 'Owned email list',              why: 'Platform-agnostic revenue; algorithm-proof.',            how: 'Add a lead magnet + newsletter to every video and post.' },
        { adv: 'Community access product',      why: 'Turns followers into recurring paying supporters.',       how: 'Launch a paid community for your top ~5% of fans.' },
        { adv: 'Consistent 3x/week cadence',    why: 'Compounds attention faster than sporadic bursts.',        how: 'Batch 4 weeks of content per weekend to protect cadence.' }
      ],
      riskTable: [
        { risk: 'Algorithm shift',              likelihood: 5, impact: 4, mitigation: 'Own the email list + community; don\u2019t rely on platform reach.' },
        { risk: 'Burnout',                       likelihood: 4, impact: 4, mitigation: 'Batch, protect off-days, systematize what can be systematized.' },
        { risk: 'Copycat takes your angle',      likelihood: 3, impact: 2, mitigation: 'Deepen voice; the imitators can copy topics but not tone.' },
        { risk: 'Sponsor churn',                 likelihood: 3, impact: 4, mitigation: 'Diversify beyond sponsorships \u2014 community, products, courses.' }
      ]
    },
    agency: {
      whitespace: 'Everyone claims "results-driven"; almost nobody publishes results.',
      whitespaceText: 'Your category is dominated by agencies that describe themselves in the same three adjectives. Real numbers, real case studies, and specific niches are still surprisingly rare. That absence is your wedge.',
      summaryTable: [
        { player: 'Big established agency', position: 'Reputation + scale',    threat: 'Medium' },
        { player: 'Peer-size agency',       position: 'Generalist',            threat: 'High' },
        { player: 'Freelancer / boutique',  position: 'Cost + specialty',      threat: 'Low' }
      ],
      players: [
        {
          name: 'Big established agency',
          desc: 'The safe corporate choice. Higher fees, deeper bench, slower velocity.',
          strengths: ['Established reputation', 'Broad expertise', 'Board-friendly'],
          weaknesses: ['Slow', 'Junior team on execution', 'Expensive'],
          price: '$$$-$$$$'
        },
        {
          name: 'Peer-size agency',
          desc: 'Direct competitor. Same size, similar clients, mostly generic positioning.',
          strengths: ['Comparable pricing', 'Similar scope', 'Referral pipeline'],
          weaknesses: ['Bland positioning', 'Weak thought leadership', 'Inconsistent quality'],
          price: '$$-$$$'
        },
        {
          name: 'Freelancer / boutique',
          desc: 'Solo operator or 2-3 person team; cheaper, narrower.',
          strengths: ['Cost-competitive', 'Sharp expertise', 'Founder-led'],
          weaknesses: ['Capacity ceiling', 'No process depth', 'Single point of failure'],
          price: '$-$$'
        }
      ],
      advantageTable: [
        { adv: 'Public numbers-based case studies',   why: 'Peers hide numbers; showing them signals confidence.', how: 'Publish one case study per month with a real outcome number.' },
        { adv: 'Named niche + one deliverable',        why: 'Specialists close 2x faster than generalists.',        how: 'Rewrite positioning: "we help X do Y" and mean it.' },
        { adv: 'Sprint / audit as top of funnel',      why: 'Compresses long sales cycles into 2-week trials.',      how: 'Ship a $10K, 2-week audit offering with a public price.' }
      ],
      riskTable: [
        { risk: 'Anchor client leaves',       likelihood: 3, impact: 5, mitigation: 'Diversify book \u2014 no client >25% of revenue.' },
        { risk: 'In-house replaces retainer', likelihood: 3, impact: 4, mitigation: 'Move up-market to strategic advisory + expansion services.' },
        { risk: 'Talent poaching',            likelihood: 3, impact: 4, mitigation: 'Equity or profit-share for senior operators; document IP.' },
        { risk: 'AI compresses fees',         likelihood: 4, impact: 3, mitigation: 'Move from execution work to strategy + orchestration.' }
      ]
    },
    nonprofit: {
      whitespace: 'Most orgs sell scale; the ones that scale sell one story at a time.',
      whitespaceText: 'The largest nonprofits win on institutional trust, but institutional trust is eroding. The new donor \u2014 younger, digital-first, cause-driven \u2014 responds to specific, personal impact stories almost 3x more strongly than to aggregate statistics. That gap is wide open.',
      summaryTable: [
        { player: 'Legacy national nonprofit', position: 'Scale + brand',        threat: 'Medium' },
        { player: 'Peer local nonprofit',      position: 'Community trust',      threat: 'Medium' },
        { player: 'Direct-give platform',      position: 'Frictionless giving',  threat: 'High' }
      ],
      players: [
        {
          name: 'Legacy national nonprofit',
          desc: 'Big brand, big overhead, generalist appeal.',
          strengths: ['Broad trust', 'National reach', 'Corporate partnerships'],
          weaknesses: ['Slow', 'Impersonal', 'Losing younger donors'],
          price: '—'
        },
        {
          name: 'Peer local nonprofit',
          desc: 'Similar size, similar mission, competes for the same local donors and volunteers.',
          strengths: ['Community roots', 'Founder-led', 'Real relationships'],
          weaknesses: ['Small team', 'Limited reach', 'Under-resourced marketing'],
          price: '—'
        },
        {
          name: 'Direct-give platform',
          desc: 'Peer-to-peer platforms that route giving directly to individuals or projects.',
          strengths: ['Ultra-low friction', 'Emotional connection', 'Growing fast'],
          weaknesses: ['Unbundles nonprofits', 'No accountability layer', 'Fragmented impact'],
          price: '—'
        }
      ],
      advantageTable: [
        { adv: 'Monthly recurring giving',        why: 'Sustains the mission independent of campaign spikes.', how: 'Rebuild the primary CTA around monthly, not one-time.' },
        { adv: 'Story-per-month email cadence',   why: 'Personal impact stories outperform stats by 3x.',      how: 'Ship one specific-person story every month, no exceptions.' },
        { adv: 'Peer-to-peer campaigns',           why: 'Existing supporters reach donors you can\u2019t.',    how: 'Give top 20 supporters a fundraising toolkit and personal ask.' }
      ],
      riskTable: [
        { risk: 'Donor fatigue',              likelihood: 4, impact: 4, mitigation: 'Shift from asks to updates; earn attention before requesting money.' },
        { risk: 'Legacy funding source dries', likelihood: 3, impact: 5, mitigation: 'Diversify: recurring giving + smaller donors + corporate partnerships.' },
        { risk: 'Key leader leaves',           likelihood: 2, impact: 5, mitigation: 'Build institutional voice, not personality-dependent brand.' },
        { risk: 'Reputational incident',       likelihood: 2, impact: 5, mitigation: 'Transparent financials + responsive comms; earn trust before it\u2019s tested.' }
      ]
    },
    other: {
      whitespace: 'Most competitors describe themselves the same way; being clear is itself a moat.',
      whitespaceText: 'Whatever category you\u2019re in, the language is generic and the promises are interchangeable. A business that\u2019s obviously specific about what it does, who it\u2019s for, and why it\u2019s different can carve out mindshare faster than the size of your team would suggest.',
      summaryTable: [
        { player: 'Established incumbent', position: 'Trust + scale',       threat: 'Medium' },
        { player: 'Peer competitor',       position: 'Similar offering',    threat: 'High' },
        { player: 'New entrant',           position: 'Novelty + hungry',    threat: 'Low' }
      ],
      players: [
        {
          name: 'Established incumbent',
          desc: 'The default choice for buyers who don\u2019t know better options.',
          strengths: ['Brand recognition', 'Trust by default', 'Deep resources'],
          weaknesses: ['Slow', 'Generic offering', 'Losing on differentiation'],
          price: '$$-$$$'
        },
        {
          name: 'Peer competitor',
          desc: 'Similar to you in size and offering. Won\u2019s on execution and consistency.',
          strengths: ['Comparable pricing', 'Similar scope', 'Also fighting for share'],
          weaknesses: ['Bland positioning', 'No standout story', 'Slow to iterate'],
          price: '$$-$$$'
        },
        {
          name: 'New entrant',
          desc: 'Rising challenger, moving fast, still small.',
          strengths: ['High energy', 'Sharp positioning', 'Founder-led voice'],
          weaknesses: ['Unproven', 'Small team', 'Fragile operations'],
          price: '$-$$'
        }
      ],
      advantageTable: [
        { adv: 'Clear one-line positioning',  why: 'Nobody in your category has one that lands.',      how: 'Rewrite your homepage hero into a single 12-word sentence.' },
        { adv: 'Weekly cadence content',       why: 'Compounds trust while peers stay quiet.',           how: 'Ship one piece of content on one platform every week for 12 weeks.' },
        { adv: 'Public numbers',               why: 'Specific outcomes travel further than adjectives.', how: 'Publish one real result per quarter with the actual numbers.' }
      ],
      riskTable: [
        { risk: 'Larger competitor targets your niche', likelihood: 3, impact: 4, mitigation: 'Move faster; deepen positioning so scale alone can\u2019t win.' },
        { risk: 'Copycat with better distribution',     likelihood: 3, impact: 3, mitigation: 'Compound brand + community; hardest thing to replicate.' },
        { risk: 'Key operator leaves',                  likelihood: 2, impact: 4, mitigation: 'Document processes; cross-train key roles.' },
        { risk: 'Category shrinks',                     likelihood: 2, impact: 3, mitigation: 'Diversify offerings and adjacent revenue lines early.' }
      ]
    }
  };
  return byType[t] || byType.other;
}

// --- Persona mock (used by customer + plan reports) ---

function _rpMockPersona(type) {
  const t = _rpNormType(type);
  const byType = {
    small:     { name: 'Maya Chen',        initials: 'MC', age: 32, desc: 'Lives 6 blocks away and stops in on her way home from work 2-3x per week.',                traits: ['Consistent quality', 'Personal recognition', 'Local pride'],  trigger: 'Being remembered by name',       location: 'Neighborhood regular' },
    ecommerce: { name: 'Rachel Kim',       initials: 'RK', age: 29, desc: 'Shops from her phone during commute; opens 4 tabs before buying anything.',                 traits: ['Social proof', 'Fast shipping', 'Clear returns'],              trigger: 'Above-fold reviews + free shipping', location: 'Metro area, mobile-first' },
    service:   { name: 'James Patel',      initials: 'JP', age: 42, desc: 'COO at a 40-person series-B startup. Hires help when hiring internally would take too long.', traits: ['Warm referral', 'Specific past outcome', 'Fast first call'], trigger: 'A peer recommendation with a number', location: 'Series-B startup, decision-maker' },
    tech:      { name: 'David Miller',     initials: 'DM', age: 34, desc: 'Head of product operations. Signs up for tools during work hours, kills them by Friday.',    traits: ['Time-to-first-value', 'Peer validation', 'Public pricing'],   trigger: 'Value inside 5 minutes of signup', location: 'Product / ops leader' },
    creator:   { name: 'Priya Shah',       initials: 'PS', age: 27, desc: 'Follows the creator daily, watches every reel, occasionally buys the products they push.',   traits: ['Authentic voice', 'Consistent cadence', 'Personal access'],   trigger: 'Direct reply or shout-out',        location: 'Global; social-native' },
    agency:    { name: 'Michael Ross',     initials: 'MR', age: 44, desc: 'Marketing director at a Series-C startup. Hires agencies when internal capacity runs out.',   traits: ['Numbers-based case studies', 'Sprint offering', 'Warm intro'], trigger: 'A peer says "these guys ship"',    location: 'Growth-stage startup, US/EU' },
    nonprofit: { name: 'Sarah Nakamura',   initials: 'SN', age: 51, desc: 'Mid-career professional; gives to 3-4 causes per year based on personal stories she encounters.', traits: ['Impact stories', 'Values alignment', 'Thoughtful thank-you'], trigger: 'A specific person\u2019s story',  location: 'Mid-career professional' },
    other:     { name: 'Alex Reyes',       initials: 'AR', age: 36, desc: 'Values quality and consistency; buys once, and if the experience is right, buys forever.',    traits: ['Clear value promise', 'Trust signals', 'Recognition on return'], trigger: 'A clear one-line differentiator', location: 'General consumer' }
  };
  return byType[t] || byType.other;
}

// --- Sources (shared list) ---

function _rpMockSources(reportKey) {
  const common = [
    { title: 'Business context from onboarding',       desc: 'Your Q1-Q6 answers on business type, goal, customer, channels, budget, and location.' },
    { title: 'Category signal library',                 desc: 'Cross-industry benchmarks Clarity pulls from for demographics, conversion, and retention baselines.' },
    { title: 'Local market indicators',                 desc: 'Public foot-traffic and search-trend data for your city and category.' },
    { title: 'Instagram + TikTok category snapshots',   desc: 'Content-format performance patterns across similar businesses on both platforms.' },
    { title: 'Customer intent surveys (n=~400)',         desc: 'Third-party purchase-intent surveys grouped by business type and buyer segment.' },
    { title: 'Competitor product page scans',           desc: 'Automated scans of top-10 competitor sites in your category for positioning + pricing patterns.' },
    { title: 'Retention & LTV benchmark set',           desc: 'Category-specific retention curves used to model repeat-purchase and monthly-giving assumptions.' },
    { title: 'Clara\u2019s continuous read',            desc: 'Ongoing pattern matching between your evolving business context and the strongest-performing playbooks in the library.' }
  ];
  return common;
}

// ---------------------------------------------
// Data builder
// ---------------------------------------------
//
// Priority is always real data first, mock fallback second. Every
// concept.research.* leaf is checked individually so a partially
// populated research payload still fills gaps from the type-keyed
// mock \u2014 an empty string or an empty array in research is treated
// as "missing", not "override with blank".
//
// Right now concept.research is always the null scaffold (_generateResearch
// isn't in the codebase yet), so in practice every report reads the
// mock. But the moment research lands, the reports pick it up
// per-field with no additional wiring.

function _rpPickReal(mockValue, realValue) {
  if (realValue == null) return mockValue;
  if (typeof realValue === 'string' && realValue.trim() === '') return mockValue;
  if (Array.isArray(realValue) && realValue.length === 0) return mockValue;
  if (typeof realValue === 'object' && !Array.isArray(realValue)
      && Object.keys(realValue).length === 0) return mockValue;
  return realValue;
}

// Merge a full mock section with its (possibly partial, possibly null)
// real counterpart. Every mock key is preserved; only keys that exist
// AND are meaningfully populated on the real side override the mock.
function _rpMergeReal(mock, real) {
  const out = Object.assign({}, mock);
  if (!real || typeof real !== 'object') return out;
  Object.keys(mock).forEach(function (key) {
    out[key] = _rpPickReal(mock[key], real[key]);
  });
  // Also carry over any keys real has that mock doesn't \u2014 forward
  // compatibility for research payloads that add fields the mocks
  // don't yet know about.
  Object.keys(real).forEach(function (key) {
    if (!(key in out)) out[key] = real[key];
  });
  return out;
}

function _rpBuildData(view, concept) {
  const business = (concept && concept.business) || {};
  const research = (concept && concept.research) || {};
  const type = business.type || 'other';

  // Real research first, then mock fills the gaps. Per the spec:
  //   marketScan.gapHeadline / gapText / marketTable        (Market Tab 1)
  //   customerIntelligence.jtbd                              (Customer Tab 2)
  //   customerIntelligence.decisionJourney                   (Customer Tab 3)
  //   customerIntelligence.drivers + barriers                (Customer Tab 4)
  //   competition.whitespace                                 (Competition Tab 1)
  //   competition.players                                    (Competition Tab 2)
  //   competition.riskTable                                  (Competition Tab 4)
  // Every other field remains type-keyed via the mock generators.
  const market      = _rpMergeReal(_rpMockMarket(type),      research.marketScan);
  const customer    = _rpMergeReal(_rpMockCustomer(type),    research.customerIntelligence);
  const competition = _rpMergeReal(_rpMockCompetition(type), research.competition);
  const persona     = _rpPickReal(_rpMockPersona(type),      business.generatedPersona);
  const sources     = _rpMockSources(view);

  return {
    view: view,
    business: business,
    concept: concept,
    market: market,
    customer: customer,
    competition: competition,
    persona: persona,
    sources: sources
  };
}

// ---------------------------------------------
// Entry
// ---------------------------------------------

function renderReport(container, view) {
  const config = RP_REPORTS[view];
  const concept = getActiveConcept();
  if (!container || !config || !concept) {
    if (container) container.innerHTML = '';
    return;
  }

  const data = _rpBuildData(view, concept);
  const activeTabId = _rpUiState.activeTab[view] || config.tabs[0].id;
  _rpUiState.activeTab[view] = activeTabId;
  const mode = _rpUiState.viewMode[view] === 'all' ? 'all' : 'tabs';
  _rpUiState.viewMode[view] = mode;

  container.innerHTML = `
    <div class="rp-shell" id="rpShell" data-view="${view}" data-mode="${mode}">
      ${_rpRenderTopbar(config, mode)}
      ${mode === 'tabs' ? _rpRenderTabs(config, activeTabId) : ''}
      <div class="rp-body">
        ${mode === 'tabs' ? _rpRenderSinglePanel(config, activeTabId, data) : _rpRenderStackedPanels(config, data)}
      </div>
    </div>
  `;

  _rpBindEvents(container, view, config, data);
}

// ---------------------------------------------
// Topbar
// ---------------------------------------------

function _rpRenderTopbar(config, mode) {
  const toggleLabel = mode === 'all' ? 'Tabbed view' : 'View all \u2192';
  return `
    <header class="rp-topbar" role="banner">
      <button type="button" class="rp-back" id="rpBackBtn" aria-label="Back to Today">
        <span aria-hidden="true">\u2190</span> Today
      </button>
      <h1 class="rp-title">${_rpEscape(config.title)}</h1>
      <button type="button" class="rp-view-toggle" id="rpViewToggle" aria-pressed="${mode === 'all' ? 'true' : 'false'}">
        ${_rpEscape(toggleLabel)}
      </button>
    </header>
  `;
}

// ---------------------------------------------
// Tabs
// ---------------------------------------------

function _rpRenderTabs(config, activeTabId) {
  const tabs = config.tabs.map(function (t) {
    const cls = 'rp-tab' + (t.id === activeTabId ? ' rp-tab-active' : '');
    return `<button type="button" class="${cls}" data-rp-tab="${t.id}">${_rpEscape(t.label)}</button>`;
  }).join('');
  return `<nav class="rp-tabs" role="tablist">${tabs}</nav>`;
}

// ---------------------------------------------
// Panels
// ---------------------------------------------

function _rpRenderSinglePanel(config, activeTabId, data) {
  const tab = config.tabs.find(function (t) { return t.id === activeTabId; }) || config.tabs[0];
  const html = tab.render(data, data.business, data.concept);
  return `<section class="rp-panel rp-panel-single" data-rp-panel="${tab.id}">${html}</section>`;
}

function _rpRenderStackedPanels(config, data) {
  return config.tabs.map(function (tab, i) {
    const html = tab.render(data, data.business, data.concept);
    const divider = i > 0 ? '<hr class="rp-panel-divider" aria-hidden="true">' : '';
    return `
      ${divider}
      <section class="rp-panel rp-panel-stacked" data-rp-panel="${tab.id}">
        <h2 class="rp-panel-heading">${_rpEscape(tab.label)}</h2>
        ${html}
      </section>
    `;
  }).join('');
}

// ---------------------------------------------
// Panel content renderers
// ---------------------------------------------
//
// Every panel returns raw HTML. Runs are kept small and repeatable: a
// heading, optional paragraph, table(s), or card grid. All tables use
// `_rpRenderTable` so header/data padding stays consistent.

function _rpRenderTable(columns, rows) {
  const thead = columns.map(function (c) { return '<th>' + _rpEscape(c) + '</th>'; }).join('');
  const tbody = rows.map(function (row) {
    const cells = row.map(function (cell) { return '<td>' + cell + '</td>'; }).join('');
    return '<tr>' + cells + '</tr>';
  }).join('');
  return `
    <table class="rp-table">
      <thead><tr>${thead}</tr></thead>
      <tbody>${tbody}</tbody>
    </table>
  `;
}

// --- MARKET SCAN ---

function _rpPanelMarketTheMarket(data) {
  const m = data.market;
  const rows = m.marketTable.map(function (r) {
    return [_rpEscape(r.dim), _rpEscape(r.finding), _rpEscape(r.confidence)];
  });
  // Highlight the finding column's numeric bits by wrapping the whole
  // finding text; visually the spec asks for numbers in amber, but
  // wrapping mid-sentence is fragile \u2014 keep the row as-is and rely
  // on the finding readability alone. Numbers stand out via context.
  return `
    <h2 class="rp-heading rp-heading-serif">${_rpEscape(m.gapHeadline)}</h2>
    <p class="rp-para">${_rpEscape(m.gapText)}</p>
    ${_rpRenderTable(['Dimension', 'Finding', 'Confidence'], rows)}
  `;
}

function _rpPanelMarketOpportunity(data) {
  const m = data.market;
  const bullets = m.opportunityBullets.map(function (b) {
    return '<li class="rp-bullet">' + _rpEscape(b) + '</li>';
  }).join('');
  const rows = m.opportunityTable.map(function (r) {
    return [_rpEscape(r.opp), _rpNum(r.size), _rpEscape(r.difficulty)];
  });
  return `
    <h2 class="rp-heading rp-heading-bold">${_rpEscape(m.gapHeadline)}</h2>
    <ul class="rp-bullets">${bullets}</ul>
    ${_rpRenderTable(['Opportunity', 'Size Estimate', 'Difficulty'], rows)}
  `;
}

function _rpPanelMarketWhosBuying(data) {
  const m = data.market;
  const demoRows = m.demographics.map(function (r) {
    return [_rpEscape(r.age), _rpEscape(r.range), _rpNum(r.share)];
  });
  const psychoCards = m.psychographics.map(function (p) {
    return `
      <div class="rp-psycho-card">
        <div class="rp-psycho-name">${_rpEscape(p.name)}</div>
        <div class="rp-psycho-desc">${_rpEscape(p.desc)}</div>
      </div>
    `;
  }).join('');
  return `
    <h3 class="rp-subheading">Demographics</h3>
    ${_rpRenderTable(['Age', 'Revenue / Income', 'Share'], demoRows)}
    <h3 class="rp-subheading rp-subheading-spaced">Psychographics</h3>
    <div class="rp-psycho-grid">${psychoCards}</div>
  `;
}

function _rpPanelMarketCompetitors(data) {
  // Uses the competition mock's players so the market + competition
  // reports stay aligned on who's in the space.
  const players = data.competition.players.map(function (p) {
    const strength = (p.strengths && p.strengths[0]) || '';
    const weakness = (p.weaknesses && p.weaknesses[0]) || '';
    return [_rpEscape(p.name), _rpEscape(strength), _rpEscape(weakness), _rpEscape(p.price)];
  });
  return `
    <h3 class="rp-subheading">Who\u2019s in the space</h3>
    <p class="rp-para rp-para-muted">A quick snapshot of the top three competitor archetypes in your category. Deeper cards live in the Competition report.</p>
    ${_rpRenderTable(['Competitor', 'Strength', 'Weakness', 'Price Range'], players)}
  `;
}

function _rpPanelMarketKeyFindings(data) {
  const findings = data.market.keyFindings.map(function (f, i) {
    return `
      <li class="rp-finding">
        <div class="rp-finding-num">${_rpNum(String(i + 1).padStart(2, '0'))}</div>
        <div class="rp-finding-body">
          <div class="rp-finding-head">${_rpEscape(f.head)}</div>
          <div class="rp-finding-text">${_rpEscape(f.body)}</div>
        </div>
      </li>
    `;
  }).join('');
  return `<ol class="rp-findings">${findings}</ol>`;
}

// --- CUSTOMER INTELLIGENCE ---

function _rpPanelCustomerWhosBuying(data) {
  const m = data.market;
  const demoRows = m.demographics.map(function (r) {
    return [_rpEscape(r.age), _rpEscape(r.range), _rpNum(r.share)];
  });
  const p = data.persona;
  return `
    <h3 class="rp-subheading">Demographics</h3>
    ${_rpRenderTable(['Age', 'Revenue / Income', 'Share'], demoRows)}
    <h3 class="rp-subheading rp-subheading-spaced">Persona previews</h3>
    <div class="rp-persona-preview-grid">
      ${_rpRenderPersonaPreview(p)}
      ${_rpRenderPersonaPreview(_rpAltPersona(data.business.type))}
    </div>
  `;
}

function _rpRenderPersonaPreview(p) {
  return `
    <div class="rp-persona-preview">
      <div class="rp-persona-avatar" aria-hidden="true">${_rpEscape(p.initials || 'P')}</div>
      <div class="rp-persona-body">
        <div class="rp-persona-name">${_rpEscape(p.name)}, ${_rpNum(p.age)}</div>
        <div class="rp-persona-desc">${_rpEscape(p.desc)}</div>
      </div>
    </div>
  `;
}

function _rpAltPersona(type) {
  // Return a second persona shaped variant so the "two persona preview
  // cards" slot always has content, even when generatedPersona is null.
  const t = _rpNormType(type);
  const alts = {
    small:     { name: 'Dan Ortiz',      initials: 'DO', age: 45, desc: 'Runs errands on the weekends; stops in for something specific he trusts you\u2019ll get right.' },
    ecommerce: { name: 'Priya Shah',     initials: 'PS', age: 34, desc: 'Buys after seeing a friend\u2019s tagged post; reads reviews carefully before adding to cart.' },
    service:   { name: 'Rachel Kim',     initials: 'RK', age: 51, desc: 'CEO of a 12-person consultancy; delegates vendor selection but signs off on every SOW.' },
    tech:      { name: 'Sarah Blake',    initials: 'SB', age: 40, desc: 'Engineering manager evaluating tools for her team; blocks a Thursday to run POCs.' },
    creator:   { name: 'Alex Reyes',     initials: 'AR', age: 33, desc: 'Occasional viewer who becomes a super-fan when the creator\u2019s content lines up with a life moment.' },
    agency:    { name: 'Jennifer Walsh', initials: 'JW', age: 38, desc: 'Head of growth at a Series-B; needs agency partners who can move at startup pace.' },
    nonprofit: { name: 'Robert Chen',    initials: 'RC', age: 62, desc: 'Retired professional with capacity for major gifts; wants deeper involvement, not just a receipt.' },
    other:     { name: 'Jamie Lee',      initials: 'JL', age: 41, desc: 'Word-of-mouth-driven buyer who tries new options when a trusted friend vouches for them.' }
  };
  return alts[t] || alts.other;
}

function _rpPanelCustomerWhatTheyNeed(data) {
  const rows = data.customer.jtbd.map(function (r) {
    return [_rpEscape(r.job), _rpEscape(r.type), _rpNum(r.importance + ' / 10'), _rpNum(r.satisfaction + ' / 10'), _rpNum(r.opportunity)];
  });
  return `
    <h3 class="rp-subheading">Jobs to be done</h3>
    ${_rpRenderTable(['Job', 'Type', 'Importance', 'Satisfaction', 'Opportunity'], rows)}
    <p class="rp-note">Opportunity score = Importance + max(0, Importance \u2212 Satisfaction). Jobs above 12 are underserved and are the highest-leverage places to invest next.</p>
  `;
}

function _rpPanelCustomerHowTheyDecide(data) {
  const rows = data.customer.decisionJourney.map(function (r) {
    return [_rpEscape(r.stage), _rpEscape(r.goal), _rpEscape(r.channel), _rpEscape(r.friction), _rpEscape(r.kpi)];
  });
  return `
    <h3 class="rp-subheading">Decision journey</h3>
    ${_rpRenderTable(['Stage', 'Customer Goal', 'Key Channel', 'Main Friction', 'KPI'], rows)}
  `;
}

function _rpPanelCustomerWhatDrivesThem(data) {
  const driversRows = data.customer.drivers.map(function (d) {
    return [_rpEscape(d.factor), _rpNum(d.weight + ' / 10'), _rpEscape(d.quote)];
  });
  const barriersRows = data.customer.barriers.map(function (b) {
    return [_rpEscape(b.factor), _rpNum(b.weight + ' / 10'), _rpEscape(b.quote)];
  });
  return `
    <div class="rp-two-col">
      <div class="rp-col">
        <h3 class="rp-subheading">Drivers</h3>
        ${_rpRenderTable(['Factor', 'Weight', 'Quote'], driversRows)}
      </div>
      <div class="rp-col">
        <h3 class="rp-subheading">Barriers</h3>
        ${_rpRenderTable(['Factor', 'Weight', 'Quote'], barriersRows)}
      </div>
    </div>
  `;
}

function _rpPanelCustomerSegments(data) {
  const cards = data.customer.segments.map(function (s) {
    const triggers = (s.triggers || []).map(function (t) {
      return '<li class="rp-segment-trigger">' + _rpEscape(t) + '</li>';
    }).join('');
    return `
      <div class="rp-segment-card">
        <div class="rp-segment-head">
          <div class="rp-segment-name">${_rpEscape(s.name)}</div>
          <div class="rp-segment-size">${_rpNum(s.size)}</div>
        </div>
        <p class="rp-segment-desc">${_rpEscape(s.desc)}</p>
        <div class="rp-segment-triggers-label">Buying triggers</div>
        <ul class="rp-segment-triggers">${triggers}</ul>
      </div>
    `;
  }).join('');
  return `
    <h3 class="rp-subheading">Segments</h3>
    <div class="rp-segment-grid">${cards}</div>
  `;
}

// --- COMPETITION ---

function _rpPanelCompetitionLandscape(data) {
  const c = data.competition;
  const rows = c.summaryTable.map(function (r) {
    return [_rpEscape(r.player), _rpEscape(r.position), _rpEscape(r.threat)];
  });
  return `
    <h2 class="rp-heading rp-heading-bold">${_rpEscape(c.whitespace)}</h2>
    <p class="rp-para rp-para-muted">${_rpEscape(c.whitespaceText)}</p>
    ${_rpRenderTable(['Player', 'Position', 'Threat Level'], rows)}
  `;
}

function _rpPanelCompetitionPlayers(data) {
  const cards = data.competition.players.map(function (p) {
    const strengths = (p.strengths || []).map(function (s) {
      return '<li>' + _rpEscape(s) + '</li>';
    }).join('');
    const weaknesses = (p.weaknesses || []).map(function (w) {
      return '<li>' + _rpEscape(w) + '</li>';
    }).join('');
    return `
      <div class="rp-player-card">
        <div class="rp-player-head">
          <div class="rp-player-name">${_rpEscape(p.name)}</div>
          <div class="rp-player-price">${_rpNum(p.price)}</div>
        </div>
        <p class="rp-player-desc">${_rpEscape(p.desc)}</p>
        <div class="rp-player-cols">
          <div>
            <div class="rp-player-col-label">Strengths</div>
            <ul class="rp-player-list rp-player-list-strengths">${strengths}</ul>
          </div>
          <div>
            <div class="rp-player-col-label">Weaknesses</div>
            <ul class="rp-player-list rp-player-list-weaknesses">${weaknesses}</ul>
          </div>
        </div>
      </div>
    `;
  }).join('');
  return `
    <h3 class="rp-subheading">Key players</h3>
    <div class="rp-player-grid">${cards}</div>
  `;
}

function _rpPanelCompetitionWhereYouWin(data) {
  const c = data.competition;
  const rows = c.advantageTable.map(function (r) {
    return [_rpEscape(r.adv), _rpEscape(r.why), _rpEscape(r.how)];
  });
  return `
    <h2 class="rp-heading rp-heading-bold">${_rpEscape(c.whitespace)}</h2>
    ${_rpRenderTable(['Advantage', 'Why It Matters', 'How to Activate'], rows)}
  `;
}

function _rpPanelCompetitionRisks(data) {
  const rows = data.competition.riskTable.map(function (r) {
    return [_rpEscape(r.risk), _rpNum(r.likelihood + ' / 5'), _rpNum(r.impact + ' / 5'), _rpEscape(r.mitigation)];
  });
  return `
    <h3 class="rp-subheading">Risk factors</h3>
    ${_rpRenderTable(['Risk', 'Likelihood', 'Impact', 'Mitigation'], rows)}
  `;
}

// --- PLAN ---

function _rpPanelPlanMarket(data) {
  const m = data.market;
  const firstFinding = (m.keyFindings && m.keyFindings[0]) || { head: '', body: '' };
  const firstOpp = (m.opportunityTable && m.opportunityTable[0]) || { opp: '', size: '', difficulty: '' };
  return `
    <div class="rp-summary-section">
      <div class="rp-summary-eye">MARKET GAP</div>
      <div class="rp-summary-title">${_rpEscape(m.gapHeadline)}</div>
      <p class="rp-summary-body">${_rpEscape(m.gapText)}</p>
    </div>
    <div class="rp-summary-section">
      <div class="rp-summary-eye">OPPORTUNITY SIZE</div>
      <div class="rp-summary-title">${_rpEscape(firstOpp.opp)} \u2014 ${_rpEscape(firstOpp.size)}</div>
      <p class="rp-summary-body">Fastest path to test. Difficulty rated ${_rpEscape(firstOpp.difficulty)}.</p>
    </div>
    <div class="rp-summary-section">
      <div class="rp-summary-eye">KEY FINDING</div>
      <div class="rp-summary-title">${_rpEscape(firstFinding.head)}</div>
      <p class="rp-summary-body">${_rpEscape(firstFinding.body)}</p>
    </div>
  `;
}

function _rpPanelPlanCustomer(data) {
  const p = data.persona;
  const traits = (p.traits || []).map(function (t) {
    return '<span class="rp-chip">' + _rpEscape(t) + '</span>';
  }).join('');
  return `
    <div class="rp-persona-full">
      <div class="rp-persona-full-avatar" aria-hidden="true">${_rpEscape(p.initials || 'P')}</div>
      <div class="rp-persona-full-name">${_rpEscape(p.name)}, ${_rpNum(p.age)}</div>
      <div class="rp-persona-full-desc">${_rpEscape(p.desc)}</div>
      <div class="rp-persona-full-section">
        <div class="rp-persona-full-label">Cares about</div>
        <div class="rp-chips">${traits}</div>
      </div>
      <div class="rp-persona-full-section">
        <div class="rp-persona-full-label">Buying trigger</div>
        <div class="rp-persona-full-value">${_rpEscape(p.trigger)}</div>
      </div>
      <div class="rp-persona-full-section">
        <div class="rp-persona-full-label">Operating location</div>
        <div class="rp-persona-full-value">${_rpEscape(p.location)}</div>
      </div>
    </div>
  `;
}

function _rpPanelPlanEdge(data) {
  const c = data.competition;
  const rows = c.advantageTable.map(function (r) {
    return [_rpEscape(r.adv), _rpEscape(r.why), _rpEscape(r.how)];
  });
  return `
    <h2 class="rp-heading rp-heading-bold">${_rpEscape(c.whitespace)}</h2>
    ${_rpRenderTable(['Advantage', 'Why It Matters', 'How to Activate'], rows)}
  `;
}

function _rpPanelPlanFirstMoves(data) {
  // First moves = the 5 GTM tasks Clara has authored (source: 'clara')
  // in concept.tasks.items. If fewer than 5 exist, top up from the
  // deterministic _todayTasks() generator so the plan always shows a
  // full slate.
  const c = data.concept;
  const items = (c && c.tasks && Array.isArray(c.tasks.items)) ? c.tasks.items : [];
  const claraItems = items.filter(function (t) { return t && t.source === 'clara'; });

  const priorityRank = { p0: 0, p1: 1, p2: 2 };
  claraItems.sort(function (a, b) {
    return (priorityRank[a.priority] || 3) - (priorityRank[b.priority] || 3);
  });

  const cards = claraItems.slice(0, 5).map(function (t) {
    return _rpRenderFirstMoveCard({
      title: t.title,
      description: t.description || t.claraNotes || '',
      owner: 'You',
      timeline: t.dueDate ? t.dueDate : 'This week',
      priority: t.priority || 'p2'
    });
  });

  // Top up from _todayTasks() if we didn't reach 5.
  if (cards.length < 5 && typeof window._todayTasks === 'function') {
    let gtm = [];
    try { gtm = window._todayTasks() || []; } catch (_) { gtm = []; }
    for (let i = 0; cards.length < 5 && i < gtm.length; i++) {
      const t = gtm[i];
      cards.push(_rpRenderFirstMoveCard({
        title: t.description,
        description: t.reason || '',
        owner: 'You',
        timeline: t.time || 'This week',
        priority: i === 0 ? 'p1' : 'p2'
      }));
    }
  }

  const cardsHtml = cards.length > 0 ? cards.join('') : '<div class="rp-empty">Clara hasn\u2019t suggested tasks yet. Check back after your first strategy session.</div>';

  return `
    <h3 class="rp-subheading">First 5 moves</h3>
    <p class="rp-para rp-para-muted">The specific actions Clara recommends you take this week. Priority chips show what to do first.</p>
    <div class="rp-first-moves">${cardsHtml}</div>
  `;
}

function _rpRenderFirstMoveCard(m) {
  const priorityLabel = m.priority === 'p0' ? 'P0 \u00b7 Now'
                     : m.priority === 'p1' ? 'P1 \u00b7 High'
                     : 'P2 \u00b7 Medium';
  return `
    <div class="rp-move-card" data-priority="${_rpEscape(m.priority)}">
      <div class="rp-move-head">
        <div class="rp-move-title">${_rpEscape(m.title || 'Untitled move')}</div>
        <span class="rp-priority-chip rp-priority-chip-${_rpEscape(m.priority)}">${_rpEscape(priorityLabel)}</span>
      </div>
      ${m.description ? '<p class="rp-move-desc">' + _rpEscape(m.description) + '</p>' : ''}
      <div class="rp-move-meta">
        <span class="rp-move-meta-label">Owner</span>
        <span class="rp-move-meta-value">${_rpEscape(m.owner)}</span>
        <span class="rp-move-meta-sep" aria-hidden="true">\u00b7</span>
        <span class="rp-move-meta-label">Timeline</span>
        <span class="rp-move-meta-value">${_rpEscape(m.timeline)}</span>
      </div>
    </div>
  `;
}

// --- SOURCES (shared across all four reports) ---

function _rpPanelSources(data) {
  const items = data.sources.map(function (s) {
    return `
      <li class="rp-source">
        <div class="rp-source-title">${_rpEscape(s.title)}</div>
        <div class="rp-source-desc">${_rpEscape(s.desc)}</div>
      </li>
    `;
  }).join('');
  return `
    <h3 class="rp-subheading">Sources</h3>
    <p class="rp-para rp-para-muted">Clarity synthesizes these inputs to build the read on your business. As richer signal comes in, the reports refine automatically.</p>
    <ol class="rp-sources">${items}</ol>
  `;
}

// ---------------------------------------------
// Event wiring
// ---------------------------------------------

function _rpBindEvents(container, view, config, data) {
  // Back to Today (the dashboard's primary landing since Overview was
  // retired as a nav destination).
  const backBtn = container.querySelector('#rpBackBtn');
  if (backBtn) {
    backBtn.addEventListener('click', function () {
      setActiveView('today');
      renderApp();
    });
  }

  // View mode toggle (tabs \u2194 all).
  const toggleBtn = container.querySelector('#rpViewToggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', function () {
      _rpUiState.viewMode[view] = _rpUiState.viewMode[view] === 'all' ? 'tabs' : 'all';
      renderReport(container, view);
    });
  }

  // Tab switching. Uses opacity fade before re-rendering the panel so
  // the transition reads as a soft cross-fade rather than an instant
  // swap. 200ms matches the spec.
  container.querySelectorAll('[data-rp-tab]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const nextTab = btn.getAttribute('data-rp-tab');
      if (!nextTab || nextTab === _rpUiState.activeTab[view]) return;
      const panel = container.querySelector('.rp-panel-single');
      if (panel) {
        panel.classList.add('rp-panel-fade-out');
        setTimeout(function () {
          _rpUiState.activeTab[view] = nextTab;
          renderReport(container, view);
        }, 180);
      } else {
        _rpUiState.activeTab[view] = nextTab;
        renderReport(container, view);
      }
    });
  });
}

// ---------------------------------------------
// Exports
// ---------------------------------------------

window.renderReport = renderReport;
window.RP_REPORTS = RP_REPORTS;
