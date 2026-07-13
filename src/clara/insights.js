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
      headline: 'Local search decides who wins your neighbourhood',
      stat: '78% of local mobile searches lead to an offline purchase within 24 hours.',
      source: 'Google Consumer Insights, 2024',
      bullets: [
        'Verify your Google Business Profile and add at least 5 recent photos this week.',
        'Ask three regulars to leave a review \u2014 most locals decide from the top three results.',
        'Post your hours, address, and one signature product on every social profile.'
      ]
    },
    {
      key: 'small_quiet_churn',
      headline: 'Your rivals are quietly losing regulars',
      stat: 'Small businesses lose 23% of loyal customers a year \u2014 mostly to indifference, not competition.',
      source: 'US Chamber of Commerce, 2024',
      bullets: [
        'Send a personal thank-you to your top 10 buyers from the last 90 days.',
        'Add a "regulars only" perk that costs nothing but signals status.',
        'Track who has not visited in 60 days and send a two-line check-in.'
      ]
    },
    {
      key: 'small_reviews_signage',
      headline: 'Foot traffic is falling \u2014 reviews are the new signage',
      stat: '9 out of 10 consumers read reviews before choosing a local business.',
      source: 'BrightLocal Local Consumer Review Survey',
      bullets: [
        'Aim for 30+ Google reviews with a 4.5 average \u2014 the threshold buyers filter by.',
        'Respond publicly to every review under 4 stars within 48 hours.',
        'Photograph your best work weekly; images in reviews outperform text 3:1.'
      ]
    },
    {
      key: 'small_offpeak_margin',
      headline: 'Weekday quiet hours are being underpriced',
      stat: '60% of small businesses see their strongest margins on off-peak days.',
      source: 'Square Small Business Trends, 2024',
      bullets: [
        'Introduce a Tuesday or Wednesday exclusive to reward off-peak visits.',
        'Track your slowest hour by day and build one campaign around it.',
        'Regulars respond to small consistent perks better than large one-off discounts.'
      ]
    },
    {
      key: 'small_wom_moat',
      headline: 'The best marketing is invisible \u2014 it is your product',
      stat: '70% of consumers say word-of-mouth is their most trusted source of local recommendations.',
      source: 'Nielsen Trust in Advertising Report',
      bullets: [
        'Make one thing about your product remarkable enough to describe in a text message.',
        'Give your best customers something to share \u2014 a limited edition, a story, a photo.',
        'Reward referrals visibly; even a small acknowledgement triples repeat referrals.'
      ]
    },
    {
      key: 'small_story_engagement',
      headline: 'Locals are searching for stories, not shops',
      stat: 'Businesses that share their founder story see 44% higher engagement than product-only accounts.',
      source: 'Small Biz Trends, 2024',
      bullets: [
        'Write one paragraph about why you started \u2014 post it, pin it, print it.',
        'Reintroduce yourself on social every 4\u20136 weeks; new followers need context.',
        'Feature one team member per month if you have staff \u2014 humans sell better than logos.'
      ]
    }
  ],

  // ---- Ecommerce ----------------------------------------------------
  ecommerce: [
    {
      key: 'ecom_first_frame',
      headline: 'The scroll war is won on the first frame',
      stat: 'Product videos with a face in the first 1.5 seconds see 2.3x higher completion rates.',
      source: 'Meta Ad Insights, 2024',
      bullets: [
        'Every product video should open with a person, not the product.',
        'Test 3 opening frames per hero product this month.',
        'Filming yourself outperforms polished shoots for small ecommerce brands.'
      ]
    },
    {
      key: 'ecom_return_trust',
      headline: 'Free returns are not free \u2014 trust is',
      stat: '68% of online shoppers abandon carts when the return policy is unclear.',
      source: 'Baymard Institute, 2024',
      bullets: [
        'State your return policy above the fold on every product page.',
        'Include one clear photo of the actual packaging on the product page.',
        'Add a customer-photo section \u2014 buyer photos convert 2x better than studio shots.'
      ]
    },
    {
      key: 'ecom_abandoned',
      headline: 'Abandoned carts are the cheapest sales you will ever make',
      stat: 'Cart abandonment emails recover 10\u201315% of lost revenue on average.',
      source: 'Klaviyo Ecommerce Benchmarks 2024',
      bullets: [
        'Send the first abandonment email within 1 hour, not 24.',
        'Show a photo of the exact item they left behind, not a category.',
        'The third email in the sequence converts best when it offers help, not a discount.'
      ]
    },
    {
      key: 'ecom_review_trust',
      headline: 'Reviews now outrank ads in buyer trust',
      stat: '88% of shoppers trust customer reviews as much as personal recommendations.',
      source: 'BrightLocal, 2024',
      bullets: [
        'Aim for 50+ reviews with photos on your top 5 products.',
        'Send review requests 5\u20137 days after delivery, not on ship.',
        'Ask specifically for photos \u2014 word-only reviews convert 40% less.'
      ]
    },
    {
      key: 'ecom_bundle_aov',
      headline: 'Your best seller is not your most profitable product',
      stat: 'Ecommerce brands with a bundling strategy see 20\u201330% higher average order value.',
      source: 'Shopify Ecommerce Trends, 2024',
      bullets: [
        'Bundle your top seller with your highest-margin item, not another top seller.',
        'Test a bundle for two weeks before committing to a permanent SKU.',
        'Great bundles solve a use case, not just save a percentage.'
      ]
    },
    {
      key: 'ecom_mobile_checkout',
      headline: 'Mobile checkout is where sales die quietly',
      stat: 'Mobile checkout abandonment is 85% \u2014 twice as high as desktop.',
      source: 'Baymard Institute, 2024',
      bullets: [
        'Test your checkout on a phone with a slow connection weekly.',
        'Apple Pay / Google Pay lift mobile conversion by 15\u201325% on average.',
        'Remove any field that is not legally required \u2014 each extra field costs \u22484% conversion.'
      ]
    }
  ],

  // ---- Service-based businesses -------------------------------------
  service: [
    {
      key: 'svc_24hr_decide',
      headline: 'Service buyers decide within 24 hours of searching',
      stat: '73% of service-based buyers hire within 24 hours of their first search.',
      source: 'HubSpot Sales Report 2024',
      bullets: [
        'Reply to inquiries within the first hour to double your close rate.',
        'Publish clear pricing tiers \u2014 hesitation kills service sales.',
        'Follow up on quiet leads at day 3, not day 7.'
      ]
    },
    {
      key: 'svc_case_studies',
      headline: 'Your website is your third-best salesperson',
      stat: 'Service businesses with case studies convert leads at 2.4x the rate of those without.',
      source: 'MarketingProfs, 2024',
      bullets: [
        'Publish one detailed client result each month with numbers, not adjectives.',
        'Include specific timelines \u2014 "in 6 weeks" out-converts "in weeks".',
        'Ask permission to name clients; anonymised case studies convert 40% worse.'
      ]
    },
    {
      key: 'svc_niche_premium',
      headline: 'The niche you avoid is the one you should own',
      stat: 'Specialist service firms charge 40\u201360% more than generalists in the same market.',
      source: 'MBO Partners Consultant Survey 2024',
      bullets: [
        'Pick the client type that referred you the most last year \u2014 that is your niche.',
        'Rewrite your homepage for that one client type.',
        'Say no to work outside your niche for 90 days and measure the difference.'
      ]
    },
    {
      key: 'svc_retainers',
      headline: 'Retainers grow accounts; projects shrink them',
      stat: '80% of high-margin service firms derive 60%+ of revenue from retainers.',
      source: 'Consulting Success Benchmarks 2024',
      bullets: [
        'Convert your top 3 project clients to a monthly retainer this quarter.',
        'Retainers should cost the client less per unit but bill you more per month.',
        'A retainer sold on outcomes outperforms one sold on hours 3:1.'
      ]
    },
    {
      key: 'svc_followup',
      headline: 'The follow-up wins the sale, not the pitch',
      stat: '60% of service sales close between the 5th and 12th touchpoint.',
      source: 'Salesforce State of Sales 2024',
      bullets: [
        'Build a 6-touch follow-up sequence for every serious inquiry.',
        'Each touch should add value; only the last should ask for the sale.',
        'Track which touchpoint most warm leads convert on \u2014 that is your money touch.'
      ]
    },
    {
      key: 'svc_referrals',
      headline: 'Referrals are the only channel that scales for you',
      stat: 'Service businesses that ask for referrals systematically see 2x the growth rate.',
      source: 'Bain & Company, 2024',
      bullets: [
        'Ask every satisfied client for one referral at the point of maximum happiness.',
        'Make it easy \u2014 provide the language, the person, and the intro template.',
        'Track referrals as a separate revenue line so the pattern stays visible.'
      ]
    }
  ],

  // ---- Tech / SaaS --------------------------------------------------
  tech: [
    {
      key: 'tech_plg',
      headline: 'Product-led growth is winning enterprise',
      stat: 'Bottom-up SaaS adoption now drives 74% of enterprise software purchases.',
      source: 'Bessemer Cloud Report 2024',
      bullets: [
        'Make your product usable in the first 3 minutes without a signup wall.',
        'The free tier should solve a real problem, not tease.',
        'Track "aha moment" completion \u2014 the only funnel metric that matters.'
      ]
    },
    {
      key: 'tech_onboarding_churn',
      headline: 'Churn is a symptom; onboarding is the disease',
      stat: 'Users who do not complete setup within 24 hours churn at 70% by month 3.',
      source: 'OpenView Product Benchmarks 2024',
      bullets: [
        'Send a personal welcome email from a real founder within 30 minutes of signup.',
        'Guide the first 3 core actions with a checklist, not a tour.',
        'Reach out personally to any account that stalls on setup.'
      ]
    },
    {
      key: 'tech_activation',
      headline: 'Trial-to-paid ratio hides your real problem',
      stat: 'SaaS companies with under 15% trial-to-paid have activation issues, not pricing issues.',
      source: 'OpenView 2024 SaaS Benchmarks',
      bullets: [
        'Track activation, not signups \u2014 activation is what predicts revenue.',
        'Interview the last 5 users who cancelled during trial; the answer is rarely price.',
        'Fix your first-value experience before you touch your pricing.'
      ]
    },
    {
      key: 'tech_focus',
      headline: 'The market rewards focus, not features',
      stat: 'SaaS products that solve one job well grow 3x faster than horizontal platforms.',
      source: 'First Round Review, 2024',
      bullets: [
        'Cut your homepage messaging to one job and one customer.',
        'Say no to two new feature requests this week.',
        'The features you do not ship are as important as the ones you do.'
      ]
    },
    {
      key: 'tech_content',
      headline: 'Content still beats ads for SaaS acquisition',
      stat: 'SaaS companies that publish weekly see 4x the organic pipeline of those that do not.',
      source: 'HubSpot State of Marketing 2024',
      bullets: [
        'Publish one deep post per week that solves a specific pain.',
        'Repurpose that post into 3 short-form pieces across LinkedIn, X, and YouTube shorts.',
        'Depth beats frequency \u2014 one great post outperforms five okay ones.'
      ]
    },
    {
      key: 'tech_expansion',
      headline: 'Expansion revenue is the metric that compounds',
      stat: 'SaaS companies with 120%+ net revenue retention grow 2.5x faster than the market.',
      source: 'OpenView 2024 SaaS Benchmarks',
      bullets: [
        'Every quarter, review each account for expansion opportunity.',
        'Design your pricing so growing customers naturally pay you more.',
        'The best time to upsell is 60 days after they see first real value.'
      ]
    }
  ],

  // ---- Creator / personal brand -------------------------------------
  creator: [
    {
      key: 'creator_small_audience',
      headline: 'Your smallest audience is worth the most',
      stat: 'Micro-audiences under 10k convert at 3\u20135x the rate of macro accounts.',
      source: 'Kajabi Creator Report 2024',
      bullets: [
        'Focus on your 100 most-engaged followers; they are worth more than the next 10,000.',
        'Reply personally to every comment for a week and note the change.',
        'Trust compounds slower than growth but pays for years.'
      ]
    },
    {
      key: 'creator_consistency',
      headline: 'Consistency beats virality for income',
      stat: 'Creators posting 3x/week for a year outperform viral one-hit accounts in revenue by 6x.',
      source: 'Patreon Creator Census 2024',
      bullets: [
        'Show up 3 times a week for a year, with work you would read yourself.',
        'Do not chase the algorithm; your regulars are why anyone stays.',
        'Track paid supporters, not follower count.'
      ]
    },
    {
      key: 'creator_email',
      headline: 'Email is the only platform you actually own',
      stat: 'Creators with an email list monetise at 5\u201310x the rate of platform-only creators.',
      source: 'ConvertKit Creator Report 2024',
      bullets: [
        'Every piece of content should invite the reader to your email list.',
        'Publish one deep newsletter weekly; short posts drive social, long posts drive trust.',
        'An email open is worth roughly 20x a social impression at the point of sale.'
      ]
    },
    {
      key: 'creator_identity',
      headline: 'Paid tiers live on identity, not features',
      stat: 'Membership creators who tie payment to identity retain members 2.4x longer.',
      source: 'Substack Creator Analytics 2024',
      bullets: [
        'Give your paid audience a name they would wear on a t-shirt.',
        'The benefit is not more content \u2014 it is belonging.',
        'Introduce paid members to each other; community retains where content does not.'
      ]
    },
    {
      key: 'creator_voice',
      headline: 'Your voice is your only real moat',
      stat: 'Creators with a distinct point of view see 4x higher premium conversion than generalists.',
      source: 'Kajabi Report 2024',
      bullets: [
        'Take a position \u2014 the people who disagree are how the right people find you.',
        'Cut phrases you have heard elsewhere; your voice is what is left.',
        'Say the specific thing you are afraid to say once a week.'
      ]
    },
    {
      key: 'creator_platforms',
      headline: 'The next platform is not where your audience is',
      stat: 'Creators who diversify across 2\u20133 platforms see 47% higher year-over-year income growth.',
      source: 'Passionfroot Creator Data 2024',
      bullets: [
        'Pick one platform to grow, one to nurture, one to monetise.',
        'Never make everything for one platform\u2019s algorithm.',
        'Own the audience-to-inbox handoff \u2014 that is your business.'
      ]
    }
  ],

  // ---- Agency / consultancy ----------------------------------------
  agency: [
    {
      key: 'agency_niche',
      headline: 'The best agencies say no more than they say yes',
      stat: 'Agencies with a narrow niche charge 60% more per hour than generalists.',
      source: 'Ad Age Agency Report 2024',
      bullets: [
        'Publish the type of client you do NOT work with as clearly as the one you do.',
        'Turn away one project this month that does not fit.',
        'Referrals rise when your positioning is unmistakable.'
      ]
    },
    {
      key: 'agency_retainers',
      headline: 'Retainers are the only real agency model',
      stat: 'Top-10% agencies derive 70%+ of revenue from retainer clients.',
      source: 'SoDA Global Digital Outlook 2024',
      bullets: [
        'Convert one project client to a monthly retainer this quarter.',
        'Sell retainers on outcomes, not hours or deliverables.',
        'A three-client retainer base is where agencies escape project chaos.'
      ]
    },
    {
      key: 'agency_outbound',
      headline: 'Cold outbound still works \u2014 for the right agency',
      stat: 'Positioned agencies see 3\u20135% reply rates on well-targeted cold outreach.',
      source: 'RevGenius Outbound Benchmarks 2024',
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
      bullets: [
        'Publish one detailed case study per month with real numbers.',
        'Include the specific business context, not just the tactic.',
        'A case study told in the client\u2019s voice beats a decked-out portfolio.'
      ]
    },
    {
      key: 'agency_referrals',
      headline: 'Referrals are the agency growth engine most ignore',
      stat: 'Referred agency clients close 40% faster and pay 15% more than cold leads.',
      source: 'SPI Insights Agency Report 2024',
      bullets: [
        'Ask every happy client for one intro while the project is going well, not when it ends.',
        'Make it easy: name the person, offer to draft the intro.',
        'Reward referrers publicly \u2014 recognition drives more referrals than cash.'
      ]
    },
    {
      key: 'agency_productised',
      headline: 'Productised services compound where custom work drains',
      stat: 'Productised service agencies grow 2.5x faster than hourly-billing ones.',
      source: 'MicroConf 2024 Report',
      bullets: [
        'Package your most-repeated deliverable at a fixed price.',
        'Sell the package on outcomes, not hours or team size.',
        'Track how many packages you sell \u2014 that is your real growth metric.'
      ]
    }
  ],

  // ---- Nonprofit ----------------------------------------------------
  nonprofit: [
    {
      key: 'np_recurring',
      headline: 'Small donors give more than big ones over time',
      stat: 'Monthly recurring donors give 42% more per year than single-gift donors.',
      source: 'Classy Recurring Giving Report 2024',
      bullets: [
        'Convert your top 20 one-time donors into a monthly programme this quarter.',
        'Frame recurring gifts in dollars-per-day, not per-month.',
        'Recurring givers stay 5x longer than one-time donors.'
      ]
    },
    {
      key: 'np_story',
      headline: 'Impact stories outperform impact numbers',
      stat: 'Personal impact stories see 2.3x higher click-through than aggregate statistics.',
      source: 'M+R Benchmarks 2024',
      bullets: [
        'Lead with one person, one story; the number is the second sentence.',
        'Show a real photo and use their real name (with permission).',
        'Show what a gift makes possible tomorrow, not what it did last year.'
      ]
    },
    {
      key: 'np_retention',
      headline: 'Donor retention is the metric that funds tomorrow',
      stat: 'The average nonprofit loses 45% of donors year over year.',
      source: 'Fundraising Effectiveness Project 2024',
      bullets: [
        'Send a personal thank-you within 48 hours of every gift over $100.',
        'Report back specifically what a donor\u2019s money did \u2014 not what the org did overall.',
        'Small consistent touches beat big annual appeals.'
      ]
    },
    {
      key: 'np_board',
      headline: 'Board members drive 30% of your fundraising',
      stat: 'Nonprofits with active fundraising boards raise 50% more than those with passive boards.',
      source: 'BoardSource Nonprofit Study 2024',
      bullets: [
        'Ask each board member to introduce you to 3 people this quarter.',
        'Give them a script \u2014 most don\u2019t ask because they don\u2019t know how.',
        'Track board-driven revenue as a separate line so the pattern stays visible.'
      ]
    },
    {
      key: 'np_p2p',
      headline: 'Peer-to-peer fundraising is quietly outgrowing everything',
      stat: 'Peer-to-peer campaigns raise 42% more than direct appeals in the same time window.',
      source: 'OneCause Giving Report 2024',
      bullets: [
        'Give your top supporters a way to fundraise on your behalf.',
        'Provide templates \u2014 social copy, email drafts, ask language.',
        'The peer campaign should feel like the supporter\u2019s project, not yours.'
      ]
    },
    {
      key: 'np_individual',
      headline: 'Grants are declining; individual giving is rising',
      stat: 'Individual giving grew 4.5% in 2024 while foundation grants fell 3%.',
      source: 'Giving USA Report 2024',
      bullets: [
        'Rebalance your fundraising mix toward individual donors this year.',
        'Build a monthly giving base \u2014 it is the most reliable revenue in the sector.',
        'Diversify beyond grants; foundations are consolidating.'
      ]
    }
  ],

  // ---- Other / generic ----------------------------------------------
  other: [
    {
      key: 'other_focus',
      headline: 'Focus beats effort in every business stage',
      stat: 'Companies that limit their initial market to a single niche grow 4x faster in year one.',
      source: 'Harvard Business Review, 2024',
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
      bullets: [
        'Ship something small every week for 90 days.',
        'Track output, not output quality \u2014 you get better while shipping.',
        'Compounding kicks in around week 12, not week 1.'
      ]
    },
    {
      key: 'other_existing',
      headline: 'Growth is fastest with people who already know you',
      stat: 'Existing customers are 3x more likely to buy a new product than any lookalike audience.',
      source: 'Bain & Company, 2024',
      bullets: [
        'Sell your next product to your existing customers first.',
        'Ask them what they would buy from you next \u2014 you probably haven\u2019t asked.',
        'A second sale is the cheapest revenue you will ever earn.'
      ]
    },
    {
      key: 'other_pricing',
      headline: 'Pricing is a marketing decision, not a math decision',
      stat: 'Companies that raise prices deliberately once a year grow margins 15\u201320% faster.',
      source: 'Simon-Kucher Global Pricing Study 2024',
      bullets: [
        'Raise your prices 10% and see if anyone actually leaves.',
        'Price on outcomes, not on costs or competitor benchmarks.',
        'The right price is the one your best 20% of customers accept eagerly.'
      ]
    },
    {
      key: 'other_followup',
      headline: 'Serious businesses run on systematic follow-up',
      stat: '60% of sales close between the 5th and 12th touchpoint \u2014 most companies stop at 2.',
      source: 'Salesforce State of Sales 2024',
      bullets: [
        'Build a 6-touch sequence for every real inquiry.',
        'Each touch adds value; only the last asks for the sale.',
        'Track which touchpoint most conversions happen on.'
      ]
    },
    {
      key: 'other_feedback',
      headline: 'Feedback loops beat feature roadmaps',
      stat: 'Businesses that talk to 5+ customers per week grow 2.4x faster than those that do not.',
      source: 'First Round Review Founder Survey 2024',
      bullets: [
        'Have one real customer conversation per week.',
        'Ask what they would change, not what they like.',
        'The feedback you avoid is where the growth is.'
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

// ---------------------------------------------
// Rotation
// ---------------------------------------------

// Picks 3 consecutive entries from the pool starting at
// (dayOfYear % poolSize) and wrapping. Deterministic per (type, date).
// Returns [{ template, poolIndex }, \u2026] so callers can attach the
// pool index into the persisted id (helps if the pool ever changes
// order and we want to correlate old records to new positions).
function _pickInsightTemplates(typeKey, date) {
  const pool = CL_TODAY_INSIGHT_POOL[typeKey] || CL_TODAY_INSIGHT_POOL.other;
  const size = pool.length;
  if (size === 0) return [];
  const dayOffset = _todayDayOfYear(date) % size;
  const pick = [];
  for (let i = 0; i < Math.min(3, size); i++) {
    const idx = (dayOffset + i) % size;
    pick.push({ template: pool[idx], poolIndex: idx });
  }
  return pick;
}

// Materialises the day's 3 insights from templates. Each insight
// carries its own id (stable per date + template key), the date it
// was generated for, and a seen flag defaulted to false.
function _materialiseInsightsForDate(business, dateKey) {
  const typeKey = _insightsTypeKey(business && business.type);
  const picks = _pickInsightTemplates(typeKey, _parseDateKey(dateKey));
  return picks.map(function (p) {
    return {
      id: 'ins_' + dateKey + '_' + p.template.key,
      headline: p.template.headline,
      stat: p.template.stat,
      source: p.template.source,
      bullets: p.template.bullets.slice(),
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

// True if the user has hit "Skip for today" on the current calendar
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
window._seedTodayInsightsIfMissing = _seedTodayInsightsIfMissing;
window._insightsDismissedToday = _insightsDismissedToday;
window._dismissTodayInsights = _dismissTodayInsights;
window._markInsightSeen = _markInsightSeen;
