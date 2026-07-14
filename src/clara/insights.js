// ---------------------------------------------
// Clarity 2.0 \u2014 Daily Insights (Today screen)
// ---------------------------------------------
//
// Powers the newspaper-style insight card that lives at the top of the
// Today screen. Same template pattern as clara/tasks.js and
// clara/customerTemplates.js: no external API, all hardcoded, keyed on
// business.type with lightweight goal-tinting where it reads naturally.
//
// Data model:
//
//   CL_TODAY_INSIGHT_POOL[type] = [
//     { key, headline, stat, source, bullets: [3] },
//     \u2026 (6 per type, 48 total)
//   ]
//
// Rotation:
//   For each concept we pick 3 consecutive entries from that type's
//   pool, offset by day-of-year. Deterministic per (type, date) so the
//   same day always shows the same insights \u2014 no mid-day churn if
//   the user reloads or navigates away and back. When a new day
//   arrives we advance by 3 slots and take the next window.
//
// Persistence contract with state.js:
//   concept.today.insights                \u2014 the day's chosen 3, each
//                                            { id, headline, stat,
//                                              source, bullets, date,
//                                              seen: false }
//   concept.today.insightsDismissedDate   \u2014 'YYYY-MM-DD' string if
//                                            the user hit "Skip for
//                                            today"; null / missing
//                                            otherwise
//   concept.insights.history[YYYY-MM-DD]  \u2014 per-day archive of the
//                                            3 insights we surfaced,
//                                            for scoreboard / history
//                                            views later on
//
// Public helpers (window-exported):
//   _todayDateKey()              \u2014 stable "YYYY-MM-DD" in local time
//   _seedTodayInsightsIfMissing  \u2014 ensures today's insights exist on
//                                    the active concept, generating +
//                                    persisting when needed
//   _insightsDismissedToday      \u2014 was today's card skipped?
//   _dismissTodayInsights        \u2014 set the per-day skip flag
//   _markInsightSeen             \u2014 flip an insight's seen flag; used
//                                    when the user opens the detail
//                                    drawer

// ---------------------------------------------
// Insight pool \u2014 8 types \u00d7 6 templates each = 48 entries
// ---------------------------------------------
//
// Each row is a self-contained "newspaper card". Keep headlines punchy
// (6\u201312 words), stats specific with a real-sounding number and a
// plausible source. Bullets are 3 short actionable "what this means
// for you" points \u2014 the detail drawer shows all three. Sources are
// intentionally recognizable outlets so the card reads credible even
// though the numbers are synthetic.

const CL_TODAY_INSIGHT_POOL = {
  // ---- Small / local business ---------------------------------------
  small: [
    {
      key: 'small_local_search',
      headline: 'Local search decides who wins {location}',
      stat: '78% of local mobile searches lead to an offline purchase within 24 hours.',
      source: 'Google Consumer Insights, 2024',
      goalWeight: { leads: 3, sales: 2, retention: 1, growth: 2 },
      bullets: [
        'Verify {name}\u2019s Google Business Profile and add at least 5 recent photos this week.',
        'Ask three regulars to leave a review \u2014 most locals decide from the top three results.',
        'Post your hours, address, and one signature product on every social profile.'
      ]
    },
    {
      key: 'small_quiet_churn',
      headline: '{name}\u2019s regulars are worth more than you think',
      stat: 'Small businesses lose 23% of loyal customers a year \u2014 mostly to indifference, not competition.',
      source: 'US Chamber of Commerce, 2024',
      goalWeight: { leads: 1, sales: 1, retention: 3, growth: 2 },
      bullets: [
        'Send a personal thank-you to your top 10 buyers from the last 90 days.',
        'Add a "regulars only" perk that costs nothing but signals status.',
        'Track who has not visited {name} in 60 days and send a two-line check-in.'
      ]
    },
    {
      key: 'small_reviews_signage',
      headline: 'Foot traffic is falling \u2014 reviews are how {location} finds {name}',
      stat: '9 out of 10 consumers read reviews before choosing a local business.',
      source: 'BrightLocal Local Consumer Review Survey',
      goalWeight: { leads: 2, sales: 3, retention: 1, growth: 2 },
      bullets: [
        'Aim for 30+ Google reviews with a 4.5 average \u2014 the threshold buyers filter by.',
        'Respond publicly to every review under 4 stars within 48 hours.',
        'Photograph {product} weekly; images in reviews outperform text 3:1.'
      ]
    },
    {
      key: 'small_offpeak_margin',
      headline: 'Weekday quiet hours at {name} are underpriced',
      stat: '60% of small businesses see their strongest margins on off-peak days.',
      source: 'Square Small Business Trends, 2024',
      goalWeight: { leads: 1, sales: 3, retention: 2, growth: 2 },
      bullets: [
        'Introduce a Tuesday or Wednesday exclusive to reward off-peak visits.',
        'Track your slowest hour by day and build one campaign around it.',
        'Regulars respond to small consistent perks better than large one-off discounts.'
      ]
    },
    {
      key: 'small_wom_moat',
      headline: 'The best marketing at {name} is invisible \u2014 it is {product}',
      stat: '70% of consumers say word-of-mouth is their most trusted source of local recommendations.',
      source: 'Nielsen Trust in Advertising Report',
      goalWeight: { leads: 2, sales: 1, retention: 2, growth: 3 },
      bullets: [
        'Make one thing about {product} remarkable enough to describe in a text message.',
        'Give your best customers something to share \u2014 a limited edition, a story, a photo.',
        'Reward referrals visibly; even a small acknowledgement triples repeat referrals.'
      ]
    },
    {
      key: 'small_story_engagement',
      headline: '{location} is searching for stories, not shops',
      stat: 'Businesses that share their founder story see 44% higher engagement than product-only accounts.',
      source: 'Small Biz Trends, 2024',
      goalWeight: { leads: 2, sales: 1, retention: 2, growth: 3 },
      bullets: [
        'Write one paragraph about why you started {name} \u2014 post it, pin it, print it.',
        'Reintroduce yourself on social every 4\u20136 weeks; new followers need context.',
        'Feature one team member per month if you have staff \u2014 humans sell better than logos.'
      ]
    },
    {
      key: 'small_hyperlocal_rival',
      headline: 'The three shops within 500m of {name} are your real competition',
      stat: '82% of local customers compare only 2\u20133 nearby options before choosing.',
      source: 'GoDaddy Small Business Insights, 2024',
      goalWeight: { leads: 3, sales: 2, retention: 1, growth: 2 },
      bullets: [
        'Walk into your three closest competitors in {location} this week and note what they do better.',
        'Pick one thing they miss and make it obvious on your storefront and social.',
        'Being second-best in a category people already search for beats being unique in a category nobody looks up.'
      ]
    },
    {
      key: 'small_seasonal_swing',
      headline: '{location} shoppers change their habits four times a year',
      stat: 'Local businesses that align promotions to seasonal shifts see 34% higher off-peak revenue.',
      source: 'Yelp Local Trends Report, 2024',
      goalWeight: { leads: 2, sales: 3, retention: 2, growth: 2 },
      bullets: [
        'Pick one {product} tied to the coming season and start promoting it 3 weeks ahead.',
        'Look at last year\u2019s slowest 30 days \u2014 that is where the campaign belongs.',
        'Seasonal specials feel local; year-round deals feel generic.'
      ]
    },
    {
      key: 'small_community_event',
      headline: 'One community event in {location} outperforms a month of ads',
      stat: 'Small businesses hosting monthly local events grow revenue 27% faster than ad-only peers.',
      source: 'Chamber of Commerce Small Biz Study, 2024',
      goalWeight: { leads: 3, sales: 1, retention: 2, growth: 3 },
      bullets: [
        'Host or sponsor one small event a month at {name} \u2014 even ten people is enough.',
        'Invite your best customers and one local journalist or blogger by name.',
        'Community becomes memory; memory becomes referrals.'
      ]
    }
  ],

  // ---- Ecommerce ----------------------------------------------------
  ecommerce: [
    {
      key: 'ecom_first_frame',
      headline: 'The scroll war for {product} is won on the first frame',
      stat: 'Product videos with a face in the first 1.5 seconds see 2.3x higher completion rates.',
      source: 'Meta Ad Insights, 2024',
      goalWeight: { leads: 3, sales: 2, retention: 1, growth: 2 },
      bullets: [
        'Every {product} video should open with a person, not the product.',
        'Test 3 opening frames per hero product this month.',
        'Filming yourself outperforms polished shoots for small ecommerce brands.'
      ]
    },
    {
      key: 'ecom_return_trust',
      headline: 'Free returns are not free \u2014 trust is what sells {product}',
      stat: '68% of online shoppers abandon carts when the return policy is unclear.',
      source: 'Baymard Institute, 2024',
      goalWeight: { leads: 1, sales: 3, retention: 1, growth: 1 },
      bullets: [
        'State {name}\u2019s return policy above the fold on every product page.',
        'Include one clear photo of the actual packaging on the product page.',
        'Add a customer-photo section \u2014 buyer photos convert 2x better than studio shots.'
      ]
    },
    {
      key: 'ecom_abandoned',
      headline: '{name} has carts waiting to be rescued',
      stat: 'Cart abandonment emails recover 10\u201315% of lost revenue on average.',
      source: 'Klaviyo Ecommerce Benchmarks 2024',
      goalWeight: { leads: 1, sales: 3, retention: 2, growth: 1 },
      bullets: [
        'Send the first abandonment email within 1 hour, not 24.',
        'Show a photo of the exact {product} they left behind, not a category.',
        'The third email in the sequence converts best when it offers help, not a discount.'
      ]
    },
    {
      key: 'ecom_review_trust',
      headline: 'Reviews now outrank ads in buyer trust for {product}',
      stat: '88% of shoppers trust customer reviews as much as personal recommendations.',
      source: 'BrightLocal, 2024',
      goalWeight: { leads: 2, sales: 3, retention: 1, growth: 2 },
      bullets: [
        'Aim for 50+ reviews with photos on {name}\u2019s top 5 products.',
        'Send review requests 5\u20137 days after delivery, not on ship.',
        'Ask specifically for photos \u2014 word-only reviews convert 40% less.'
      ]
    },
    {
      key: 'ecom_bundle_aov',
      headline: '{name}\u2019s best seller is not its most profitable product',
      stat: 'Ecommerce brands with a bundling strategy see 20\u201330% higher average order value.',
      source: 'Shopify Ecommerce Trends, 2024',
      goalWeight: { leads: 1, sales: 3, retention: 2, growth: 2 },
      bullets: [
        'Bundle {product} with your highest-margin item, not another top seller.',
        'Test a bundle for two weeks before committing to a permanent SKU.',
        'Great bundles solve a use case, not just save a percentage.'
      ]
    },
    {
      key: 'ecom_mobile_checkout',
      headline: 'Mobile checkout is where {product} sales die quietly',
      stat: 'Mobile checkout abandonment is 85% \u2014 twice as high as desktop.',
      source: 'Baymard Institute, 2024',
      goalWeight: { leads: 1, sales: 3, retention: 1, growth: 1 },
      bullets: [
        'Test {name}\u2019s checkout on a phone with a slow connection weekly.',
        'Apple Pay / Google Pay lift mobile conversion by 15\u201325% on average.',
        'Remove any field that is not legally required \u2014 each extra field costs \u22484% conversion.'
      ]
    },
    {
      key: 'ecom_unboxing_moat',
      headline: 'The unboxing of {product} is the second sale',
      stat: '78% of shoppers post about their unboxing when the packaging feels intentional.',
      source: 'Dotcom Distribution Consumer Study, 2024',
      goalWeight: { leads: 2, sales: 2, retention: 3, growth: 3 },
      bullets: [
        'Add one unexpected element to {name}\u2019s packaging \u2014 a handwritten note, a card, a small extra.',
        'Include the founder\u2019s name and a way to reply directly.',
        'A photograph-worthy unboxing turns customers into your best channel.'
      ]
    },
    {
      key: 'ecom_second_buy_trigger',
      headline: 'The second purchase decides if {name} has a business',
      stat: 'Ecommerce brands with a 40%+ repeat purchase rate reach profitability 3x faster.',
      source: 'Shopify Plus Benchmarks, 2024',
      goalWeight: { leads: 1, sales: 2, retention: 3, growth: 3 },
      bullets: [
        'Email the customer 14 days after delivery with a use tip for {product}, not a coupon.',
        'Segment your list by first-purchase category and recommend a complement.',
        'A repeat customer costs 5\u201325x less than a new one.'
      ]
    },
    {
      key: 'ecom_post_purchase_email',
      headline: 'The thank-you page is {name}\u2019s highest-attention real estate',
      stat: 'Post-purchase upsells convert at 4x the rate of pre-purchase upsells.',
      source: 'Rebuy Ecommerce Report, 2024',
      goalWeight: { leads: 1, sales: 3, retention: 3, growth: 2 },
      bullets: [
        'Add one relevant add-on to the thank-you page \u2014 not a discount.',
        'Ask for a review at day 7, not day 1 \u2014 wait for the product to arrive and be used.',
        'A great post-purchase flow rescues 15\u201320% of the margin left on the table.'
      ]
    }
  ],

  // ---- Service-based businesses -------------------------------------
  service: [
    {
      key: 'svc_24hr_decide',
      headline: 'Someone in {location} is searching for {product} right now',
      stat: '73% of service-based buyers hire within 24 hours of their first search.',
      source: 'HubSpot Sales Report 2024',
      goalWeight: { leads: 3, sales: 2, retention: 1, growth: 1 },
      bullets: [
        'Reply to inquiries within the first hour to double your close rate.',
        'Publish clear pricing tiers for {product} \u2014 hesitation kills service sales.',
        'Follow up on quiet leads at day 3, not day 7.'
      ]
    },
    {
      key: 'svc_case_studies',
      headline: '{name}\u2019s website is your third-best salesperson',
      stat: 'Service businesses with case studies convert leads at 2.4x the rate of those without.',
      source: 'MarketingProfs, 2024',
      goalWeight: { leads: 2, sales: 3, retention: 1, growth: 2 },
      bullets: [
        'Publish one detailed client result each month with numbers, not adjectives.',
        'Include specific timelines \u2014 "in 6 weeks" out-converts "in weeks".',
        'Ask permission to name clients; anonymised case studies convert 40% worse.'
      ]
    },
    {
      key: 'svc_niche_premium',
      headline: 'The niche {name} avoids is the one you should own',
      stat: 'Specialist service firms charge 40\u201360% more than generalists in the same market.',
      source: 'MBO Partners Consultant Survey 2024',
      goalWeight: { leads: 2, sales: 2, retention: 1, growth: 3 },
      bullets: [
        'Pick the client type that referred {name} the most last year \u2014 that is your niche.',
        'Rewrite your homepage for that one client type.',
        'Say no to work outside your niche for 90 days and measure the difference.'
      ]
    },
    {
      key: 'svc_retainers',
      headline: 'Retainers grow {name}; projects shrink you',
      stat: '80% of high-margin service firms derive 60%+ of revenue from retainers.',
      source: 'Consulting Success Benchmarks 2024',
      goalWeight: { leads: 1, sales: 2, retention: 3, growth: 3 },
      bullets: [
        'Convert your top 3 project clients to a monthly retainer this quarter.',
        'Retainers should cost the client less per unit but bill you more per month.',
        'A retainer sold on outcomes outperforms one sold on hours 3:1.'
      ]
    },
    {
      key: 'svc_followup',
      headline: 'The follow-up wins the {product} sale, not the pitch',
      stat: '60% of service sales close between the 5th and 12th touchpoint.',
      source: 'Salesforce State of Sales 2024',
      goalWeight: { leads: 3, sales: 3, retention: 1, growth: 1 },
      bullets: [
        'Build a 6-touch follow-up sequence for every serious inquiry.',
        'Each touch should add value; only the last should ask for the sale.',
        'Track which touchpoint most warm leads convert on \u2014 that is your money touch.'
      ]
    },
    {
      key: 'svc_referrals',
      headline: 'Referrals are the only channel that scales for {name}',
      stat: 'Service businesses that ask for referrals systematically see 2x the growth rate.',
      source: 'Bain & Company, 2024',
      goalWeight: { leads: 2, sales: 1, retention: 2, growth: 3 },
      bullets: [
        'Ask every satisfied client for one referral at the point of maximum happiness.',
        'Make it easy \u2014 provide the language, the person, and the intro template.',
        'Track referrals as a separate revenue line so the pattern stays visible.'
      ]
    },
    {
      key: 'svc_price_anchor',
      headline: 'How {name} prices {product} decides the client, not the money',
      stat: 'Service firms that anchor with a premium tier see 32% higher average deal size.',
      source: 'PriceIntelligently Service Pricing Study 2024',
      goalWeight: { leads: 1, sales: 3, retention: 2, growth: 2 },
      bullets: [
        'Publish 3 tiers \u2014 the top one is not for buyers, it makes the middle look reasonable.',
        'Price the middle tier at what you actually want to sell.',
        'Never quote a range in the first email \u2014 that is where leverage evaporates.'
      ]
    },
    {
      key: 'svc_proposal_win',
      headline: 'The proposal for {product} decides more than the pitch',
      stat: 'Service proposals under 5 pages win 42% more often than long decks.',
      source: 'Proposify Win Rate Report, 2024',
      goalWeight: { leads: 2, sales: 3, retention: 1, growth: 2 },
      bullets: [
        'Keep the proposal under 5 pages, one page for outcomes, one for price.',
        'Send within 24 hours of the sales call \u2014 win rates halve after 72 hours.',
        'Include an explicit "yes, let\u2019s start" link, not a countersign form.'
      ]
    },
    {
      key: 'svc_client_ltv',
      headline: '{name}\u2019s best clients are worth 6x what you\u2019re billing them',
      stat: 'Service firms that formally measure client lifetime value grow 2.1x faster.',
      source: 'Hinge Research High-Growth Study 2024',
      goalWeight: { leads: 1, sales: 2, retention: 3, growth: 3 },
      bullets: [
        'List your top 5 clients by lifetime revenue \u2014 not by this-year revenue.',
        'Send each one a personal quarterly check-in with no pitch attached.',
        'A single retained client is cheaper to keep than 3 new ones are to win.'
      ]
    }
  ],

  // ---- Tech / SaaS --------------------------------------------------
  tech: [
    {
      key: 'tech_plg',
      headline: 'Product-led growth is how {name} lands enterprise',
      stat: 'Bottom-up SaaS adoption now drives 74% of enterprise software purchases.',
      source: 'Bessemer Cloud Report 2024',
      goalWeight: { leads: 3, sales: 2, retention: 2, growth: 2 },
      bullets: [
        'Make {product} usable in the first 3 minutes without a signup wall.',
        'The free tier should solve a real problem, not tease.',
        'Track "aha moment" completion \u2014 the only funnel metric that matters.'
      ]
    },
    {
      key: 'tech_onboarding_churn',
      headline: 'Churn on {product} is a symptom; onboarding is the disease',
      stat: 'Users who do not complete setup within 24 hours churn at 70% by month 3.',
      source: 'OpenView Product Benchmarks 2024',
      goalWeight: { leads: 1, sales: 1, retention: 3, growth: 1 },
      bullets: [
        'Send a personal welcome email from a real founder at {name} within 30 minutes of signup.',
        'Guide the first 3 core actions with a checklist, not a tour.',
        'Reach out personally to any account that stalls on setup.'
      ]
    },
    {
      key: 'tech_activation',
      headline: '{name}\u2019s trial-to-paid ratio hides your real problem',
      stat: 'SaaS companies with under 15% trial-to-paid have activation issues, not pricing issues.',
      source: 'OpenView 2024 SaaS Benchmarks',
      goalWeight: { leads: 1, sales: 3, retention: 2, growth: 1 },
      bullets: [
        'Track activation, not signups \u2014 activation is what predicts revenue.',
        'Interview the last 5 users who cancelled during trial; the answer is rarely price.',
        'Fix your first-value experience for {product} before you touch your pricing.'
      ]
    },
    {
      key: 'tech_focus',
      headline: 'The market rewards focus, not features',
      stat: 'SaaS products that solve one job well grow 3x faster than horizontal platforms.',
      source: 'First Round Review, 2024',
      goalWeight: { leads: 1, sales: 2, retention: 1, growth: 3 },
      bullets: [
        'Cut {name}\u2019s homepage messaging to one job and one customer.',
        'Say no to two new feature requests this week.',
        'The features you do not ship are as important as the ones you do.'
      ]
    },
    {
      key: 'tech_content',
      headline: 'Content still beats ads for {product} acquisition',
      stat: 'SaaS companies that publish weekly see 4x the organic pipeline of those that do not.',
      source: 'HubSpot State of Marketing 2024',
      goalWeight: { leads: 3, sales: 1, retention: 1, growth: 2 },
      bullets: [
        'Publish one deep post per week that solves a specific pain.',
        'Repurpose that post into 3 short-form pieces across LinkedIn, X, and YouTube Shorts.',
        'Depth beats frequency \u2014 one great post outperforms five okay ones.'
      ]
    },
    {
      key: 'tech_expansion',
      headline: 'Expansion revenue is the metric that compounds at {name}',
      stat: 'SaaS companies with 120%+ net revenue retention grow 2.5x faster than the market.',
      source: 'OpenView 2024 SaaS Benchmarks',
      goalWeight: { leads: 1, sales: 2, retention: 3, growth: 3 },
      bullets: [
        'Every quarter, review each account for expansion opportunity.',
        'Design your pricing so growing customers naturally pay you more.',
        'The best time to upsell is 60 days after they see first real value.'
      ]
    },
    {
      key: 'tech_pricing_page',
      headline: '{name}\u2019s pricing page converts more than its homepage',
      stat: 'Pricing pages are the 2nd-most-visited page for 90% of SaaS visitors before signup.',
      source: 'ProfitWell SaaS Pricing Study 2024',
      goalWeight: { leads: 2, sales: 3, retention: 1, growth: 2 },
      bullets: [
        'Add clear feature comparisons \u2014 tables convert 27% better than paragraphs.',
        'Show the middle tier as "most popular" with a visual anchor.',
        'Never hide the price behind "contact us" unless the deal is >$50k.'
      ]
    },
    {
      key: 'tech_free_to_paid_signal',
      headline: 'The moment {product} becomes worth paying for is a single feature',
      stat: '68% of free-to-paid conversions happen in the first 72 hours of using ONE key feature.',
      source: 'Amplitude Product Benchmarks 2024',
      goalWeight: { leads: 1, sales: 3, retention: 2, growth: 2 },
      bullets: [
        'Identify the single feature your paying users all discovered first.',
        'Route new signups toward that feature with a guided flow.',
        'Everything else in the product can wait \u2014 that one feature is your paywall.'
      ]
    },
    {
      key: 'tech_churn_predict',
      headline: 'Churn on {product} shows up in the logs 30 days before cancellation',
      stat: '82% of churn signals appear in usage data a full month before the account cancels.',
      source: 'Gainsight Customer Success Report 2024',
      goalWeight: { leads: 1, sales: 1, retention: 3, growth: 2 },
      bullets: [
        'Track weekly active seats per account \u2014 a 20% drop is a red flag.',
        'Reach out personally to any account trending down for 3 weeks running.',
        'Save-the-account calls close 40% of at-risk churn if made within a week of the drop.'
      ]
    }
  ],

  // ---- Creator / personal brand -------------------------------------
  creator: [
    {
      key: 'creator_small_audience',
      headline: '{name}\u2019s smallest audience is worth the most',
      stat: 'Micro-audiences under 10k convert at 3\u20135x the rate of macro accounts.',
      source: 'Kajabi Creator Report 2024',
      goalWeight: { leads: 1, sales: 2, retention: 3, growth: 2 },
      bullets: [
        'Focus on your 100 most-engaged followers; they are worth more than the next 10,000.',
        'Reply personally to every comment for a week and note the change.',
        'Trust compounds slower than growth but pays for years.'
      ]
    },
    {
      key: 'creator_consistency',
      headline: 'Consistency beats virality for {name}\u2019s income',
      stat: 'Creators posting 3x/week for a year outperform viral one-hit accounts in revenue by 6x.',
      source: 'Patreon Creator Census 2024',
      goalWeight: { leads: 1, sales: 2, retention: 2, growth: 3 },
      bullets: [
        'Show up 3 times a week for a year with work you would read yourself.',
        'Do not chase the algorithm; your regulars are why anyone stays.',
        'Track paid supporters, not follower count.'
      ]
    },
    {
      key: 'creator_email',
      headline: 'Email is the only platform {name} actually owns',
      stat: 'Creators with an email list monetise at 5\u201310x the rate of platform-only creators.',
      source: 'ConvertKit Creator Report 2024',
      goalWeight: { leads: 2, sales: 3, retention: 3, growth: 2 },
      bullets: [
        'Every piece of content should invite the reader to your email list.',
        'Publish one deep newsletter weekly; short posts drive social, long posts drive trust.',
        'An email open is worth roughly 20x a social impression at the point of sale.'
      ]
    },
    {
      key: 'creator_identity',
      headline: 'Paid tiers on {product} live on identity, not features',
      stat: 'Membership creators who tie payment to identity retain members 2.4x longer.',
      source: 'Substack Creator Analytics 2024',
      goalWeight: { leads: 1, sales: 2, retention: 3, growth: 1 },
      bullets: [
        'Give your paid audience a name they would wear on a t-shirt.',
        'The benefit is not more content \u2014 it is belonging.',
        'Introduce paid members to each other; community retains where content does not.'
      ]
    },
    {
      key: 'creator_voice',
      headline: '{name}\u2019s voice is your only real moat',
      stat: 'Creators with a distinct point of view see 4x higher premium conversion than generalists.',
      source: 'Kajabi Report 2024',
      goalWeight: { leads: 2, sales: 1, retention: 1, growth: 3 },
      bullets: [
        'Take a position \u2014 the people who disagree are how the right people find you.',
        'Cut phrases you have heard elsewhere; your voice is what is left.',
        'Say the specific thing you are afraid to say once a week.'
      ]
    },
    {
      key: 'creator_platforms',
      headline: 'The next platform is not where {name}\u2019s audience is',
      stat: 'Creators who diversify across 2\u20133 platforms see 47% higher year-over-year income growth.',
      source: 'Passionfroot Creator Data 2024',
      goalWeight: { leads: 2, sales: 1, retention: 1, growth: 3 },
      bullets: [
        'Pick one platform to grow, one to nurture, one to monetise.',
        'Never make everything for one platform\u2019s algorithm.',
        'Own the audience-to-inbox handoff \u2014 that is your business.'
      ]
    },
    {
      key: 'creator_newsletter_money',
      headline: 'A newsletter of 1,000 real readers beats 100,000 lurkers',
      stat: 'Newsletter creators monetise 12x higher per subscriber than social-only creators.',
      source: 'Beehiiv Creator Economy Report 2024',
      goalWeight: { leads: 2, sales: 3, retention: 3, growth: 2 },
      bullets: [
        'Charge for {product} directly through the newsletter, not through a separate site.',
        'Segment subscribers by open frequency \u2014 top-quartile readers convert 8x better.',
        'One paid newsletter tier can equal a year of ad revenue.'
      ]
    },
    {
      key: 'creator_live_revenue',
      headline: 'Live outsells recorded 4:1 for creator income',
      stat: 'Live cohort-based courses and workshops convert 4x higher than pre-recorded ones.',
      source: 'Maven Creator Course Data 2024',
      goalWeight: { leads: 1, sales: 3, retention: 2, growth: 2 },
      bullets: [
        'Run one live workshop on {product} this quarter, priced 3x higher than recorded.',
        'Cap attendance so it feels intimate \u2014 20 to 50 is the sweet spot.',
        'Live audiences buy from you again 5x more than one-time buyers.'
      ]
    },
    {
      key: 'creator_dm_conversion',
      headline: 'The DM is where {name} actually closes the sale',
      stat: '61% of high-ticket creator sales close in DMs, not on landing pages.',
      source: 'Circle Creator Sales Report 2024',
      goalWeight: { leads: 2, sales: 3, retention: 2, growth: 1 },
      bullets: [
        'Respond to every DM within 4 hours during business days.',
        'Ask one qualifying question in the first reply, not a link.',
        'Voice notes convert 3x higher than text for premium offers.'
      ]
    }
  ],

  // ---- Agency / consultancy ----------------------------------------
  agency: [
    {
      key: 'agency_niche',
      headline: 'The best agencies say no more than yes \u2014 including {name}',
      stat: 'Agencies with a narrow niche charge 60% more per hour than generalists.',
      source: 'Ad Age Agency Report 2024',
      goalWeight: { leads: 2, sales: 3, retention: 1, growth: 2 },
      bullets: [
        'Publish the type of client {name} does NOT work with as clearly as the one you do.',
        'Turn away one project this month that does not fit.',
        'Referrals rise when your positioning is unmistakable.'
      ]
    },
    {
      key: 'agency_retainers',
      headline: 'Retainers are the only real model for {name}',
      stat: 'Top-10% agencies derive 70%+ of revenue from retainer clients.',
      source: 'SoDA Global Digital Outlook 2024',
      goalWeight: { leads: 1, sales: 2, retention: 3, growth: 3 },
      bullets: [
        'Convert one project client to a monthly retainer this quarter.',
        'Sell retainers on outcomes, not hours or deliverables.',
        'A three-client retainer base is where agencies escape project chaos.'
      ]
    },
    {
      key: 'agency_outbound',
      headline: 'Cold outbound still works for {name} \u2014 if positioning is tight',
      stat: 'Positioned agencies see 3\u20135% reply rates on well-targeted cold outreach.',
      source: 'RevGenius Outbound Benchmarks 2024',
      goalWeight: { leads: 3, sales: 2, retention: 1, growth: 2 },
      bullets: [
        'Personalise the first sentence, keep the ask short and specific.',
        'Follow up 4 times; most agencies stop at 1.',
        'Track reply rate weekly; adjust the opening line first, then the target list.'
      ]
    },
    {
      key: 'agency_case_studies',
      headline: 'Case studies are the agency currency that keeps buying',
      stat: 'Agencies with 10+ detailed case studies see 2x higher inbound close rates.',
      source: 'HubSpot Agency Growth Report 2024',
      goalWeight: { leads: 2, sales: 3, retention: 1, growth: 2 },
      bullets: [
        'Publish one detailed case study per month with real numbers from {name}\u2019s book.',
        'Include the specific business context, not just the tactic.',
        'A case study told in the client\u2019s voice beats a decked-out portfolio.'
      ]
    },
    {
      key: 'agency_referrals',
      headline: 'Referrals are the growth engine {name} probably ignores',
      stat: 'Referred agency clients close 40% faster and pay 15% more than cold leads.',
      source: 'SPI Insights Agency Report 2024',
      goalWeight: { leads: 2, sales: 1, retention: 2, growth: 3 },
      bullets: [
        'Ask every happy client for one intro while the project is going well, not when it ends.',
        'Make it easy: name the person, offer to draft the intro.',
        'Reward referrers publicly \u2014 recognition drives more referrals than cash.'
      ]
    },
    {
      key: 'agency_productised',
      headline: '{product} as a package compounds where custom work drains {name}',
      stat: 'Productised service agencies grow 2.5x faster than hourly-billing ones.',
      source: 'MicroConf 2024 Report',
      goalWeight: { leads: 1, sales: 2, retention: 2, growth: 3 },
      bullets: [
        'Package your most-repeated deliverable at a fixed price.',
        'Sell the package on outcomes, not hours or team size.',
        'Track how many packages you sell \u2014 that is your real growth metric.'
      ]
    },
    {
      key: 'agency_utilisation',
      headline: 'Utilisation above 75% at {name} is a signal to raise prices',
      stat: 'Agencies over 75% utilisation for two quarters running have systemic underpricing.',
      source: 'Parakeeto Agency Benchmarks 2024',
      goalWeight: { leads: 1, sales: 3, retention: 2, growth: 3 },
      bullets: [
        'Track hours per client monthly \u2014 anyone over 40 is bleeding you.',
        'Raise prices before you hire; hiring at low margins compounds the problem.',
        'The 90th-percentile client should pay 3x the 10th-percentile client, not 1.3x.'
      ]
    },
    {
      key: 'agency_scope_creep',
      headline: 'Scope creep is 25% of {name}\u2019s margin',
      stat: 'The average agency loses 20\u201325% of project margin to unbilled scope changes.',
      source: 'Deltek Clarity Agency Study 2024',
      goalWeight: { leads: 1, sales: 2, retention: 3, growth: 2 },
      bullets: [
        'Write scope in outcomes, not deliverables; deliverables invite requests.',
        'Add a "change request" clause with a per-hour rate 50% above your base.',
        'Say the awkward "that\u2019s a new scope" out loud once per project \u2014 it saves the relationship, not damages it.'
      ]
    },
    {
      key: 'agency_health_score',
      headline: 'The client who stops replying on Slack has already left {name}',
      stat: '78% of agency churn is preceded by a 3-week drop in client communication.',
      source: 'Bonsai Agency Retention Report 2024',
      goalWeight: { leads: 1, sales: 1, retention: 3, growth: 1 },
      bullets: [
        'Track messages-per-week per account \u2014 a 40% drop is a red flag.',
        'Reach out personally to any account trending down for 2 weeks running.',
        'A save-the-account call within 7 days retains 55% of at-risk clients.'
      ]
    }
  ],

  // ---- Nonprofit ----------------------------------------------------
  //
  // For nonprofits we alias the four goal buckets to their funding
  // analogues: leads == donor acquisition, sales == first-gift
  // conversion, retention == donor retention, growth == programme
  // expansion. Keeps the goalWeight map interpretable without
  // introducing a nonprofit-specific taxonomy.
  nonprofit: [
    {
      key: 'np_recurring',
      headline: 'Small donors give more to {name} than big ones do',
      stat: 'Monthly recurring donors give 42% more per year than single-gift donors.',
      source: 'Classy Recurring Giving Report 2024',
      goalWeight: { leads: 1, sales: 2, retention: 3, growth: 2 },
      bullets: [
        'Convert {name}\u2019s top 20 one-time donors into a monthly programme this quarter.',
        'Frame recurring gifts in dollars-per-day, not per-month.',
        'Recurring givers stay 5x longer than one-time donors.'
      ]
    },
    {
      key: 'np_story',
      headline: 'One story from {location} outperforms every stat {name} publishes',
      stat: 'Personal impact stories see 2.3x higher click-through than aggregate statistics.',
      source: 'M+R Benchmarks 2024',
      goalWeight: { leads: 2, sales: 3, retention: 1, growth: 1 },
      bullets: [
        'Lead with one person, one story; the number is the second sentence.',
        'Show a real photo and use their real name (with permission).',
        'Show what a gift makes possible tomorrow, not what it did last year.'
      ]
    },
    {
      key: 'np_retention',
      headline: 'Donor retention is the metric that funds {name}\u2019s tomorrow',
      stat: 'The average nonprofit loses 45% of donors year over year.',
      source: 'Fundraising Effectiveness Project 2024',
      goalWeight: { leads: 1, sales: 1, retention: 3, growth: 2 },
      bullets: [
        'Send a personal thank-you within 48 hours of every gift over $100.',
        'Report back specifically what a donor\u2019s money did \u2014 not what the org did overall.',
        'Small consistent touches beat big annual appeals.'
      ]
    },
    {
      key: 'np_board',
      headline: '{name}\u2019s board should drive 30% of your fundraising',
      stat: 'Nonprofits with active fundraising boards raise 50% more than those with passive boards.',
      source: 'BoardSource Nonprofit Study 2024',
      goalWeight: { leads: 3, sales: 2, retention: 1, growth: 2 },
      bullets: [
        'Ask each board member to introduce {name} to 3 people this quarter.',
        'Give them a script \u2014 most don\u2019t ask because they don\u2019t know how.',
        'Track board-driven revenue as a separate line so the pattern stays visible.'
      ]
    },
    {
      key: 'np_p2p',
      headline: 'Peer-to-peer fundraising is quietly outgrowing everything',
      stat: 'Peer-to-peer campaigns raise 42% more than direct appeals in the same time window.',
      source: 'OneCause Giving Report 2024',
      goalWeight: { leads: 3, sales: 2, retention: 1, growth: 3 },
      bullets: [
        'Give {name}\u2019s top supporters a way to fundraise on your behalf.',
        'Provide templates \u2014 social copy, email drafts, ask language.',
        'The peer campaign should feel like the supporter\u2019s project, not yours.'
      ]
    },
    {
      key: 'np_individual',
      headline: 'Grants are declining; individual giving in {location} is rising',
      stat: 'Individual giving grew 4.5% in 2024 while foundation grants fell 3%.',
      source: 'Giving USA Report 2024',
      goalWeight: { leads: 2, sales: 1, retention: 2, growth: 3 },
      bullets: [
        'Rebalance {name}\u2019s fundraising mix toward individual donors this year.',
        'Build a monthly giving base \u2014 it is the most reliable revenue in the sector.',
        'Diversify beyond grants; foundations are consolidating.'
      ]
    },
    {
      key: 'np_midyear',
      headline: 'Mid-year giving now outstrips year-end for {name}\u2019s peers',
      stat: 'Nonprofits running mid-year appeals raise 28% more annually than year-end-only programmes.',
      source: 'Blackbaud Nonprofit Benchmarks 2024',
      goalWeight: { leads: 2, sales: 3, retention: 2, growth: 2 },
      bullets: [
        'Send a June or July appeal tied to a specific programme milestone.',
        'Mid-year donors are 3x more likely to give again in December than cold acquisition.',
        'Match the appeal to a named campaign; open giving loops close 40% better.'
      ]
    },
    {
      key: 'np_volunteer_donor',
      headline: 'Volunteers give twice as much as strangers, when {name} asks',
      stat: 'Volunteers convert to donors at 66%; general public converts at less than 3%.',
      source: 'VolunteerHub Volunteer Trends 2024',
      goalWeight: { leads: 2, sales: 3, retention: 2, growth: 2 },
      bullets: [
        'Ask every active volunteer for a first-time gift within their first 90 days.',
        'The ask should acknowledge what they\u2019ve already contributed \u2014 not start from scratch.',
        'A volunteer who gives becomes a lifetime supporter 5x more often.'
      ]
    },
    {
      key: 'np_legacy_giving',
      headline: 'One legacy gift is worth a decade of monthly donors',
      stat: 'The average bequest gift to a nonprofit is $37,000 \u2014 100x a typical annual gift.',
      source: 'FreeWill Legacy Giving Report 2024',
      goalWeight: { leads: 1, sales: 2, retention: 3, growth: 3 },
      bullets: [
        'Add a "planned giving" or "legacy" section to {name}\u2019s website this month.',
        'Mail your top 100 longest-tenure donors with a personal letter, not an email.',
        'One legacy commitment a year outfunds most annual fundraising campaigns.'
      ]
    }
  ],

  // ---- Other / generic ----------------------------------------------
  other: [
    {
      key: 'other_focus',
      headline: 'Focus beats effort at every stage of {name}',
      stat: 'Companies that limit their initial market to a single niche grow 4x faster in year one.',
      source: 'Harvard Business Review, 2024',
      goalWeight: { leads: 1, sales: 1, retention: 1, growth: 3 },
      bullets: [
        'Pick one customer type and say no to everyone else for 90 days.',
        'Every no protects the yes that grows you.',
        'The niche you pick is not permanent \u2014 it is a starting position.'
      ]
    },
    {
      key: 'other_consistency',
      headline: 'Consistency compounds faster than talent',
      stat: 'Businesses that ship weekly for a year outperform brilliant sporadic ones 8:1 in revenue.',
      source: 'First Round Review, 2024',
      goalWeight: { leads: 1, sales: 1, retention: 2, growth: 3 },
      bullets: [
        'Ship something small every week for 90 days at {name}.',
        'Track output, not output quality \u2014 you get better while shipping.',
        'Compounding kicks in around week 12, not week 1.'
      ]
    },
    {
      key: 'other_existing',
      headline: '{name}\u2019s fastest growth is with people who already know you',
      stat: 'Existing customers are 3x more likely to buy a new product than any lookalike audience.',
      source: 'Bain & Company, 2024',
      goalWeight: { leads: 1, sales: 2, retention: 3, growth: 2 },
      bullets: [
        'Sell your next {product} to your existing customers first.',
        'Ask them what they would buy from you next \u2014 you probably haven\u2019t asked.',
        'A second sale is the cheapest revenue you will ever earn.'
      ]
    },
    {
      key: 'other_pricing',
      headline: 'Pricing {product} is a marketing decision, not a math decision',
      stat: 'Companies that raise prices deliberately once a year grow margins 15\u201320% faster.',
      source: 'Simon-Kucher Global Pricing Study 2024',
      goalWeight: { leads: 1, sales: 3, retention: 1, growth: 2 },
      bullets: [
        'Raise {name}\u2019s prices 10% and see if anyone actually leaves.',
        'Price on outcomes, not on costs or competitor benchmarks.',
        'The right price is the one your best 20% of customers accept eagerly.'
      ]
    },
    {
      key: 'other_followup',
      headline: '{name} runs on systematic follow-up, or it doesn\u2019t',
      stat: '60% of sales close between the 5th and 12th touchpoint \u2014 most companies stop at 2.',
      source: 'Salesforce State of Sales 2024',
      goalWeight: { leads: 3, sales: 3, retention: 1, growth: 1 },
      bullets: [
        'Build a 6-touch sequence for every real inquiry.',
        'Each touch adds value; only the last asks for the sale.',
        'Track which touchpoint most conversions happen on \u2014 that is your money touch.'
      ]
    },
    {
      key: 'other_feedback',
      headline: 'Feedback loops beat feature roadmaps',
      stat: 'Businesses that talk to 5+ customers per week grow 2.4x faster than those that do not.',
      source: 'First Round Review Founder Survey 2024',
      goalWeight: { leads: 1, sales: 2, retention: 3, growth: 2 },
      bullets: [
        'Have one real customer conversation per week.',
        'Ask what they would change about {product}, not what they like.',
        'The feedback you avoid is where the growth is.'
      ]
    },
    {
      key: 'other_market_timing',
      headline: 'The company that wins the market is rarely the first',
      stat: 'Second-mover companies capture 55% more market share than pioneers over 10 years.',
      source: 'MIT Sloan Timing-of-Entry Study 2024',
      goalWeight: { leads: 2, sales: 2, retention: 1, growth: 3 },
      bullets: [
        'Look at what a competitor just tried and shipped \u2014 they paid your tuition.',
        'Adopt what worked for them faster than they can iterate.',
        'Being on time beats being first every time.'
      ]
    },
    {
      key: 'other_moat',
      headline: 'The moat {name} is building is not the one you notice',
      stat: 'Founders can name their real moat correctly only 22% of the time.',
      source: 'a16z Company-Building Report 2024',
      goalWeight: { leads: 1, sales: 2, retention: 3, growth: 3 },
      bullets: [
        'Ask your best customer why they picked {name} over the alternative \u2014 that is your moat.',
        'It is usually a boring detail, not the shiny feature you talk about.',
        'Double down on the boring detail; that\u2019s where compound growth lives.'
      ]
    },
    {
      key: 'other_distribution',
      headline: 'Distribution eats {product} for breakfast',
      stat: 'Companies with a dedicated distribution advantage grow 3.6x faster than product-only peers.',
      source: 'First Round State of Startups 2024',
      goalWeight: { leads: 3, sales: 2, retention: 1, growth: 3 },
      bullets: [
        'Pick one distribution channel and make it 10x better than anyone else\u2019s in {location}.',
        'Every hour spent improving {product} without a distribution plan is a wasted hour.',
        'The best distribution channel is the one your competitors ignore.'
      ]
    }
  ]
};

// ---------------------------------------------
// Date helpers
// ---------------------------------------------

// Local-time YYYY-MM-DD. Kept in local time (not UTC) so a user in
// e.g. Karachi doesn't see yesterday's insights when they open the app
// at 2am their local time.
function _todayDateKey(d) {
  const dt = d instanceof Date ? d : new Date();
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

// 1..366 day-of-year in local time. Drives the rotation offset so the
// same concept + same type sees stable-but-progressing insights across
// the year. Using DoY (rather than an epoch-day count) keeps the
// rotation aligned with human calendar intuition ("Monday's insight is
// the same as the one from Monday last week if the pool didn't grow").
function _todayDayOfYear(d) {
  const dt = d instanceof Date ? d : new Date();
  const start = new Date(dt.getFullYear(), 0, 1);
  const diffMs = dt - start;
  // 86400000 = 24 * 60 * 60 * 1000. Floor after the divide to avoid
  // DST-boundary rounding weirdness pushing us into an off-by-one day.
  return Math.floor(diffMs / 86400000) + 1;
}

// ---------------------------------------------
// Business context helpers
// ---------------------------------------------

// Normalizes business.type to one of the 8 pool keys. Mirrors the
// aliasing rules used by clara/tasks.js and clara/customerTemplates.js
// so a legacy concept saved with 'food' or 'saas' or 'small_business'
// still lands on a valid pool.
function _insightsTypeKey(type) {
  const raw = String(type || '').trim().toLowerCase();
  if (raw === 'food' || raw === 'small_business') return 'small';
  if (raw === 'saas') return 'tech';
  if (CL_TODAY_INSIGHT_POOL[raw]) return raw;
  return 'other';
}

// Reduces the concept's Q2 goal string down to one of four buckets
// used to weight the insight pool: 'leads' | 'sales' | 'retention' |
// 'growth'. Mirrors the substring-match pattern used by
// clara/tasks.js and clara/customerTemplates._claraGoalKey so a
// user who selected several Q2 goals still lands on the right bucket
// (the first matching keyword wins on the joined string). Empty /
// unknown goals fall through to 'growth' which is the neutral
// default weighting.
function _insDeriveGoalKey(business) {
  const g = String((business && business.goal) || '').trim().toLowerCase();
  if (!g) return 'growth';
  if (g.indexOf('lead') !== -1) return 'leads';
  if (g.indexOf('sale') !== -1) return 'sales';
  if (g.indexOf('retention') !== -1 || g.indexOf('customer') !== -1) return 'retention';
  return 'growth';
}

// Human-readable phrase for the {goal} token in template copy. Uses
// the same substring probes as _insDeriveGoalKey but returns natural
// language ready to drop into a sentence ("\u2026focused on
// {goal}\u2026" \u2192 "\u2026focused on closing more sales\u2026").
function _insGoalPhrase(business) {
  const key = _insDeriveGoalKey(business);
  if (key === 'leads')     return 'growing your leads';
  if (key === 'sales')     return 'closing more sales';
  if (key === 'retention') return 'keeping your best customers';
  return 'growing your business';
}

// Token-substitution pass. Runs after a template is picked so every
// headline / stat / bullet feels like it was written for THIS
// business. Supported tokens:
//
//   {name}      \u2192 business.name    (fallback: "your business")
//   {product}   \u2192 business.product (fallback: "your product")
//   {location}  \u2192 business.location (fallback: "your area")
//   {goal}      \u2192 short goal phrase from _insGoalPhrase()
//
// Fallbacks matter: if a user hasn't filled in Q4 (product), any
// template that references {product} still reads naturally instead
// of showing a literal "{product}" placeholder in the UI.
function _insPersonalise(text, business) {
  if (text === null || text === undefined) return '';
  const s = String(text);
  const b = business || {};
  const name     = (b.name     && String(b.name).trim())     || 'your business';
  const product  = (b.product  && String(b.product).trim())  || 'your product';
  const location = (b.location && String(b.location).trim()) || 'your area';
  const goal     = _insGoalPhrase(b);
  return s
    .replace(/\{name\}/g,     name)
    .replace(/\{product\}/g,  product)
    .replace(/\{location\}/g, location)
    .replace(/\{goal\}/g,     goal);
}

// ---------------------------------------------
// Rotation
// ---------------------------------------------

// Picks 3 consecutive entries from a goal-weighted view of the pool.
// The pool is first re-ordered by each template's goalWeight for the
// user's current goal bucket (leads / sales / retention / growth) so
// the templates that best fit the concept's stated goal float to the
// top of the rotation window. Ties preserve original pool order via
// a stable secondary sort on originalIndex \u2014 that keeps the
// rotation predictable when a user hasn't stated a goal (all
// weights fall back to the neutral 2).
//
// The window itself is still (dayOfYear % size) with 3 consecutive
// wraps, so the same (type, goal, date) triple deterministically
// picks the same three templates. Different concepts on the same
// day therefore see different content whenever their goals diverge.
//
// Returns [{ template, poolIndex }, \u2026] where poolIndex points
// at the template's position in the ORIGINAL pool array, not the
// weighted view \u2014 preserves the migration-friendly id
// scheme from before (see _materialiseInsightsForDate).
function _pickInsightTemplates(typeKey, date, business) {
  const pool = CL_TODAY_INSIGHT_POOL[typeKey] || CL_TODAY_INSIGHT_POOL.other;
  const size = pool.length;
  if (size === 0) return [];

  const goalKey = _insDeriveGoalKey(business);
  // Sort a lightweight (template, originalIndex, weight) view so
  // we don't mutate the source pool. Neutral weight 2 is used
  // whenever a template omits `goalWeight` (defensive default \u2014
  // every template in this file declares one, but a future add
  // shouldn't crash the picker).
  const weighted = pool.map(function (t, i) {
    const w = (t && t.goalWeight && typeof t.goalWeight[goalKey] === 'number')
      ? t.goalWeight[goalKey]
      : 2;
    return { template: t, originalIndex: i, weight: w };
  });
  weighted.sort(function (a, b) {
    if (b.weight !== a.weight) return b.weight - a.weight;
    return a.originalIndex - b.originalIndex;
  });

  const dayOffset = _todayDayOfYear(date) % size;
  const pick = [];
  for (let i = 0; i < Math.min(3, size); i++) {
    const idx = (dayOffset + i) % size;
    pick.push({ template: weighted[idx].template, poolIndex: weighted[idx].originalIndex });
  }
  return pick;
}

// Materialises the day's 3 insights from templates. Each insight
// carries its own id (stable per date + template key), the date it
// was generated for, and a seen flag defaulted to false. Runs the
// {name}/{product}/{location}/{goal} substitution pass here so the
// stored insight objects are already personalised \u2014 downstream
// renderers (today.js card + detail page) just render strings, they
// don't have to know about tokens or business context. The source
// string is intentionally left untouched: it's an outlet name, not
// something to personalise.
function _materialiseInsightsForDate(business, dateKey) {
  const typeKey = _insightsTypeKey(business && business.type);
  const picks = _pickInsightTemplates(typeKey, _parseDateKey(dateKey), business);
  return picks.map(function (p) {
    return {
      id: 'ins_' + dateKey + '_' + p.template.key,
      headline: _insPersonalise(p.template.headline, business),
      stat:     _insPersonalise(p.template.stat,     business),
      source:   p.template.source,
      bullets:  p.template.bullets.map(function (b) {
        return _insPersonalise(b, business);
      }),
      date: dateKey,
      seen: false
    };
  });
}

// Reverses _todayDateKey \u2014 accepts either a Date or a "YYYY-MM-DD"
// string. Robust to being handed a Date already (identity).
function _parseDateKey(dateKey) {
  if (dateKey instanceof Date) return dateKey;
  const parts = String(dateKey || '').split('-');
  if (parts.length !== 3) return new Date();
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  const dt = new Date(y, m, d);
  return isFinite(dt.getTime()) ? dt : new Date();
}

// ---------------------------------------------
// Seed / read / mutate on a concept
// ---------------------------------------------
//
// Idempotent. Called from:
//   \u2022 onboardingModal._obCompleteFlow      \u2014 first-day seed
//   \u2022 today.js renderToday                  \u2014 lazy new-day seed
// so we never render a Today screen without a fresh set of insights
// present. Also refreshes any state.js-normaliser-inflicted defaults
// (empty insights.history, missing today.insights, etc.) in place.

function _seedTodayInsightsIfMissing(concept) {
  if (!concept || typeof concept !== 'object') return false;
  if (!concept.business) return false;
  if (!concept.chat || !concept.chat.onboardingComplete) return false;

  if (!concept.insights || typeof concept.insights !== 'object') {
    concept.insights = { history: {} };
  }
  if (!concept.insights.history || typeof concept.insights.history !== 'object') {
    concept.insights.history = {};
  }
  if (!concept.today || typeof concept.today !== 'object') {
    concept.today = { tasks: [], viewingTaskId: null, viewingInsightId: null };
  }

  const dateKey = _todayDateKey();
  const existingHistory = concept.insights.history[dateKey];

  // Fast path \u2014 today already has an entry AND today.insights points
  // at the same set. Reuse without mutation.
  if (Array.isArray(existingHistory) && existingHistory.length > 0
      && Array.isArray(concept.today.insights) && concept.today.insights.length > 0
      && concept.today.insights[0] && concept.today.insights[0].date === dateKey) {
    return false;
  }

  let dayInsights;
  if (Array.isArray(existingHistory) && existingHistory.length > 0) {
    // History has the day's insights (e.g. dev reloaded, or state was
    // rehydrated from disk). Reuse them so seen flags don't reset.
    dayInsights = existingHistory;
  } else {
    dayInsights = _materialiseInsightsForDate(concept.business, dateKey);
    concept.insights.history[dateKey] = dayInsights;
  }

  concept.today.insights = dayInsights;

  // If a stale dismiss flag from a previous day is still hanging around,
  // clear it so the fresh card actually renders. _insightsDismissedToday
  // already treats mismatched dates as expired, so this is state hygiene
  // rather than a correctness fix \u2014 keeps persisted state clean and
  // guards against any consumer that reads the raw string directly.
  if (concept.today.insightsDismissedDate
      && concept.today.insightsDismissedDate !== dateKey) {
    concept.today.insightsDismissedDate = null;
  }
  return true;
}

// True if the user has hit "Hide for today" on the current calendar
// day. Any earlier dismiss date is treated as expired.
function _insightsDismissedToday(concept) {
  if (!concept || !concept.today) return false;
  const dismissed = concept.today.insightsDismissedDate;
  if (!dismissed || typeof dismissed !== 'string') return false;
  return dismissed === _todayDateKey();
}

// Sets the per-day skip flag. Persists via _saveState so a reload
// preserves the dismissed state through the rest of the day.
function _dismissTodayInsights(concept) {
  if (!concept) return false;
  if (!concept.today || typeof concept.today !== 'object') {
    concept.today = { tasks: [], viewingTaskId: null, viewingInsightId: null };
  }
  concept.today.insightsDismissedDate = _todayDateKey();
  if (typeof window._saveState === 'function') window._saveState();
  return true;
}

// Flips seen=true on the matching insight (by id) in both today.insights
// and insights.history so future dashboards / recap views stay in sync.
// Returns true if any flag was actually flipped.
function _markInsightSeen(concept, insightId) {
  if (!concept || !insightId) return false;
  let changed = false;

  if (concept.today && Array.isArray(concept.today.insights)) {
    for (let i = 0; i < concept.today.insights.length; i++) {
      const it = concept.today.insights[i];
      if (it && it.id === insightId && !it.seen) {
        it.seen = true;
        changed = true;
      }
    }
  }
  if (concept.insights && concept.insights.history) {
    const keys = Object.keys(concept.insights.history);
    for (let k = 0; k < keys.length; k++) {
      const arr = concept.insights.history[keys[k]];
      if (!Array.isArray(arr)) continue;
      for (let i = 0; i < arr.length; i++) {
        const it = arr[i];
        if (it && it.id === insightId && !it.seen) {
          it.seen = true;
          changed = true;
        }
      }
    }
  }
  if (changed && typeof window._saveState === 'function') window._saveState();
  return changed;
}

// ---------------------------------------------
// Exports
// ---------------------------------------------

window.CL_TODAY_INSIGHT_POOL = CL_TODAY_INSIGHT_POOL;
window._todayDateKey = _todayDateKey;
window._todayDayOfYear = _todayDayOfYear;
window._insightsTypeKey = _insightsTypeKey;
window._insDeriveGoalKey = _insDeriveGoalKey;
window._insGoalPhrase = _insGoalPhrase;
window._insPersonalise = _insPersonalise;
window._seedTodayInsightsIfMissing = _seedTodayInsightsIfMissing;
window._insightsDismissedToday = _insightsDismissedToday;
window._dismissTodayInsights = _dismissTodayInsights;
window._markInsightSeen = _markInsightSeen;
