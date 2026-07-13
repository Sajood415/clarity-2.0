// ---------------------------------------------
// Clarity 2.0 — Q3 (ideal customer + product) enhance & suggest data
// ---------------------------------------------
//
// Two hand-authored tables that power the onboarding modal's Q3
// AI-assist UI. No external API; consistent with the rest of Clara's
// template-based pattern (see clara/tasks.js, clara/responses.js).
//
//   CL_Q3_ENHANCE_TEMPLATES  \u2014 nested map keyed by type \u2192 goal.
//     Value is a 1\u20132 sentence description of the ideal customer +
//     what they sell. Uses {name} as a placeholder for the business
//     name; _claraEnhanceCustomer() interpolates a sensible fallback
//     ("your business") when the name isn't set yet.
//
//   CL_Q3_KEYWORD_HINTS      \u2014 ordered array of { match, suggest }.
//     Scans the user's typed text (lowercase, substring) and returns
//     the first match. Suggestions are complete 1-sentence answers
//     designed to replace the user's in-progress typing when they tap
//     "Use this \u2192".
//
// Helpers:
//   _claraTypeKey(type)      \u2014 normalizes to one of the 8 canonical
//     type keys, tolerating legacy aliases ('saas', 'small_business',
//     'food') that some historical concepts may carry.
//   _claraGoalKey(rawGoal)   \u2014 normalizes raw Q2 label to one of the
//     8 canonical goal keys via substring matching. Falls back to
//     'growth' so we never miss a template lookup.
//   _claraEnhanceCustomer(b) \u2014 returns the composed enhance string
//     for a given business object.
//   _claraSuggestForCustomer(text) \u2014 returns { match, suggest } or
//     null when no keyword hit.

// ---------------------------------------------
// Enhance templates — 8 types \u00d7 8 goals = 64 combinations
// ---------------------------------------------

const CL_Q3_ENHANCE_TEMPLATES = {
  // Small business (local, physical, handmade). Templates lean on
  // proximity, regulars, and the "made by a real person" angle.
  small: {
    leads:       "Local families and neighbors who value quality over convenience. {name} sells hand-crafted goods with a story you can't get from a chain.",
    sales:       "Regulars and passers-by who buy on trust more than on price. {name} sells everyday goods people actually come back for.",
    retention:   "The small pool of regulars who already love what {name} does. You sell to them, but also give them a reason to bring a friend next time.",
    marketing:   "People in your area who don't know {name} exists yet. You sell approachable, high-quality goods that just need a bigger stage.",
    launch:      "Early customers who love being first to try something local. {name} is launching a small-batch product shaped by real conversations, not focus groups.",
    test:        "A handful of trusted regulars whose feedback shapes what {name} sells next. You sell something worth iterating on \u2014 not something already set in stone.",
    competitors: "The same customers your competitors are chasing, ready for someone who actually knows their name. {name} sells the same category, done with more care.",
    growth:      "Loyal locals plus the wider audience {name} hasn't reached yet. You sell approachable, quality-first goods that scale by word of mouth first, ads second."
  },
  // Ecommerce / online store. Templates emphasize online discovery,
  // shipping, and browsing behavior.
  ecommerce: {
    leads:       "Online shoppers browsing for something specific who stumble onto {name}. You sell products that stand out on a phone screen and ship fast.",
    sales:       "Repeat browsers and abandoned-cart shoppers who need one more nudge. {name} sells products worth the click \u2014 clear photos, fair prices, easy checkout.",
    retention:   "Customers who bought once and could easily buy again if you reminded them. {name} sells things people re-order, not just try once.",
    marketing:   "Scrollers who fit your niche but haven't heard of {name} yet. You sell products that translate well to short-form video and honest reviews.",
    launch:      "Early adopters in your niche who love telling friends about a new find. {name} sells a debut drop \u2014 small run, clear positioning, made to be shared.",
    test:        "A first batch of buyers whose orders tell you what to double down on. {name} sells prototypes and small drops before betting on real inventory.",
    competitors: "Shoppers weighing you against the two or three big names in your category. {name} sells the same thing with a sharper voice and better service.",
    growth:      "Your existing buyers plus the audiences they overlap with. {name} sells products with room to grow across new channels, categories, and geographies."
  },
  // Service-based business. Time, expertise, and clear outcomes are
  // the through-line.
  service: {
    leads:       "Prospects who need what {name} does but haven't found the right partner yet. You sell time, expertise, and a clear outcome \u2014 not vague deliverables.",
    sales:       "Warm leads who've talked to {name} but haven't signed yet. You sell a service where trust and clarity close the deal, not price.",
    retention:   "Past clients who need you again but haven't circled back. {name} sells ongoing help \u2014 the kind that ends up on retainer once they see the value.",
    marketing:   "Decision-makers in your niche who don't know {name} exists yet. You sell a service that's easy to explain in one sentence and hard to fake.",
    launch:      "The first cohort of clients for a new service {name} is rolling out. You sell it at a discount in exchange for testimonials that make the second cohort easy.",
    test:        "A small group of ideal clients willing to try {name}'s new offer before you scale it. You sell it as a pilot with clear success metrics.",
    competitors: "Clients currently working with someone else who could work with {name}. You sell a specialized version of what the generalists are doing broadly.",
    growth:      "New clients plus the network your current clients haven't referred yet. {name} sells outcomes worth talking about \u2014 that's the growth engine."
  },
  // Tech / SaaS. Templates lean on product-market-fit language: pain
  // points, ROI, trial-to-paid funnel, expansion revenue.
  tech: {
    leads:       "Teams and founders searching for a fix to a problem {name} already solves. You sell software that removes a specific pain, not a platform of features.",
    sales:       "Trial users and mid-funnel prospects who need to see ROI before they upgrade. {name} sells a paid plan that pays for itself inside a month.",
    retention:   "Existing customers whose usage is slipping and who need re-engagement. {name} sells the ongoing value they signed up for, not just the initial demo.",
    marketing:   "Operators who already talk about the problem {name} solves. You sell software that shows up in their podcasts and newsletters, not in ad networks.",
    launch:      "Beta users and design partners for {name}'s new module or product. You sell them access, close feedback, and a discount for helping shape v1.",
    test:        "A handful of prospects willing to test whether {name} actually solves their problem. You sell a paid pilot with clear success criteria before the full rollout.",
    competitors: "Customers evaluating {name} against the incumbent or the fast-follower. You sell the same category with sharper focus and a cleaner build.",
    growth:      "New signups plus the accounts already using {name} who could expand seats or upgrade. You sell a product that grows with the team, not against them."
  },
  // Creator / personal brand. Trust, voice, and audience-first
  // language.
  creator: {
    leads:       "New followers who found {name}'s work and want more of it. You sell yourself first \u2014 products and services come after the trust is built.",
    sales:       "Existing followers ready to pay for the next thing {name} makes. You sell the thing your audience already keeps asking for in the comments.",
    retention:   "The core audience who already shows up for {name}'s work every week. You sell to them by making what you already do better, not by pushing more.",
    marketing:   "People in {name}'s adjacent niches who haven't found you yet. You sell your point of view \u2014 the actual products or services follow from there.",
    launch:      "The most engaged part of {name}'s audience who's been waiting for something to buy. You sell a first product built around a signal you already have.",
    test:        "A small paid cohort willing to try {name}'s new format before it goes wide. You sell an early version to learn what your audience actually wants.",
    competitors: "The same audience your peers are courting, ready for {name}'s distinct voice. You sell perspective and craft, not commodity content.",
    growth:      "Your existing audience plus the corners of the internet where {name} hasn't shown up yet. You sell things that only make sense coming from you."
  },
  // Agency / consultant. Scoped engagements, retainers, referrals.
  agency: {
    leads:       "Prospects with a problem your agency solves that they can't fix in-house. {name} sells specialized help \u2014 one clear service, not a menu.",
    sales:       "Late-stage prospects who've had one call with {name} and need a nudge to sign. You sell a scoped engagement with a clear price and defined outcome.",
    retention:   "Current clients whose retainers are quietly slipping toward the door. {name} sells continued value \u2014 new ideas, new metrics, new reasons to keep going.",
    marketing:   "Buyers in your niche who don't know {name} exists yet. You sell an agency that solves a specific problem, not one that does 'everything'.",
    launch:      "First clients for a new productized service {name} is packaging up. You sell a fixed-scope engagement built to be repeated, not custom every time.",
    test:        "A small set of ideal clients willing to run a pilot with {name}'s new offer. You sell it at a discount now, learn fast, then price it properly.",
    competitors: "Clients currently working with a bigger or slower agency who could switch to {name}. You sell the same category, done faster and with sharper focus.",
    growth:      "New clients plus the referrals your current clients haven't sent yet. {name} sells outcomes worth mentioning at dinner \u2014 that's how agencies really scale."
  },
  // Nonprofit. Donor-centric language, impact, storytelling.
  nonprofit: {
    leads:       "Prospective donors and supporters who care about {name}'s cause but haven't heard the pitch yet. You sell impact \u2014 a clear line from their dollar to a real outcome.",
    sales:       "Warm donors on the edge of giving who need one more reason. {name} sells trust \u2014 proof of where money goes and what it changes.",
    retention:   "Existing donors whose renewals are quietly falling off. {name} sells them the story of the impact their past gift already had.",
    marketing:   "People who care about the cause but don't know {name}. You sell a mission worth showing up for \u2014 the ask comes after the belief.",
    launch:      "First supporters for {name}'s new campaign, program, or fund. You sell them in early, publicly, so their momentum brings the second wave.",
    test:        "A small cohort of donors willing to back a new program on a pilot basis. {name} sells them access to the results before the wider rollout.",
    competitors: "Supporters currently giving to peer organizations who could give to {name}. You sell the same cause, told more clearly, with sharper outcomes.",
    growth:      "Current donors plus the peer-referrals they haven't made yet. {name} sells the kind of impact people talk about \u2014 that's the real growth engine."
  },
  // Other / catch-all. Templates read cleanly for any business shape
  // and reference {name} directly without leaning on category tropes.
  other: {
    leads:       "Prospects who fit {name}'s profile but haven't been reached yet. You sell what you make \u2014 clearly, without jargon, and with a real point of view.",
    sales:       "Warm prospects who've engaged but not bought. {name} sells something specific, priced fairly, with an easy next step.",
    retention:   "Existing customers who bought once and could easily buy again. {name} sells a reason to come back \u2014 not just a follow-up email.",
    marketing:   "The right people who don't know {name} exists yet. You sell your work through channels that make sense \u2014 where they already spend time.",
    launch:      "First customers for something {name} is putting into the world for the first time. You sell them access, gather feedback, and set the story for the wider audience.",
    test:        "A small set of ideal buyers willing to try {name}'s new offer. You sell it as a pilot to prove the shape before scaling.",
    competitors: "Buyers currently working with someone else who could work with {name}. You sell the same category with sharper focus and a distinct voice.",
    growth:      "Current customers plus audiences {name} hasn't reached yet. You sell work with room to grow \u2014 new channels, new categories, new stories."
  }
};

// ---------------------------------------------
// Keyword suggestion table
// ---------------------------------------------
//
// Order matters: more specific keywords first so "coffee shop" wins
// over "coffee". Each entry's `match` is a lowercased substring; we
// scan the user's typed text (also lowercased) and return the first
// entry whose match is present. Suggestions are complete 1-line
// answers designed to REPLACE the user's in-progress text when they
// tap "Use this \u2192".

const CL_Q3_KEYWORD_HINTS = [
  // More specific matches first
  { match: 'coffee shop',   suggest: "Locals who want a real neighbourhood coffee shop \u2014 not another chain \u2014 and I sell hand-pulled coffee, pastries, and a place to sit." },
  { match: 'yoga studio',   suggest: "Beginner and intermediate students looking for a welcoming yoga studio \u2014 I sell drop-in classes and unlimited monthly memberships." },
  { match: 'law firm',      suggest: "Small business owners and families in my area who need approachable legal help \u2014 I sell clear, fixed-fee legal services." },
  { match: 'design agency', suggest: "Founders launching new products who need a design partner, not just a vendor \u2014 I sell brand identity and product design engagements." },
  { match: 'digital agency',suggest: "Growth-stage teams that need marketing execution but don't want a full in-house team yet \u2014 I sell scoped monthly retainers." },
  { match: 'marketing agency', suggest: "Founders who need marketing done right without hiring in-house \u2014 I sell scoped campaigns and monthly retainers." },
  { match: 'personal trainer', suggest: "Busy adults who want real results without gym intimidation \u2014 I sell 1:1 coaching, custom plans, and honest accountability." },
  { match: 'life coach',    suggest: "Professionals stuck at a decision point who need honest guidance \u2014 I sell 1:1 coaching packages and structured programs." },
  { match: 'online course', suggest: "Learners who want a clear path from zero to competent \u2014 I sell a self-paced online course with real feedback." },
  { match: 'subscription box', suggest: "Curious buyers who love discovering things they wouldn't have found alone \u2014 I sell a monthly subscription box in my niche." },
  { match: 'meal prep',     suggest: "Busy professionals who care about eating well but hate cooking every night \u2014 I sell weekly meal prep, delivered." },
  { match: 'meal plan',     suggest: "Busy professionals who want to eat better without spending hours planning \u2014 I sell custom meal plans and grocery lists." },
  { match: 'clothing brand',suggest: "Style-first shoppers who want something more thoughtful than fast fashion \u2014 I sell small-batch clothing with a clear point of view." },
  { match: 'skincare',      suggest: "People frustrated with drugstore skincare who want cleaner, simpler ingredients \u2014 I sell a focused skincare line built around one routine." },
  { match: 'wedding',       suggest: "Engaged couples planning a wedding who want ease, not overwhelm \u2014 I sell photography, planning, or coordination for their day." },
  { match: 'photography',   suggest: "Individuals and small brands who need photos that don't look stock \u2014 I sell portrait, product, or event photography sessions." },
  { match: 'photographer',  suggest: "Couples, families, and small businesses who need real photos that mean something \u2014 I sell tailored photography sessions and packages." },
  { match: 'saas',          suggest: "Small teams tired of a specific painpoint that no one has fixed properly \u2014 I sell a focused SaaS product that solves exactly that." },
  { match: 'app ',          suggest: "Everyday users who want a simpler tool for a specific thing they do often \u2014 I sell a mobile app that does one thing really well." },
  { match: 'newsletter',    suggest: "Curious readers in a specific niche who want signal, not noise \u2014 I sell a paid newsletter with sharp weekly insights." },
  { match: 'podcast',       suggest: "Listeners passionate about my niche who want thoughtful long-form conversations \u2014 I sell sponsorships, memberships, and premium episodes." },
  { match: 'ecommerce',     suggest: "Online shoppers looking for something specific they can't find in-store \u2014 I sell curated products with fast shipping and easy returns." },
  { match: 'consultant',    suggest: "Founders and operators who need senior expertise without a full-time hire \u2014 I sell scoped consulting engagements with clear outcomes." },
  { match: 'consulting',    suggest: "Founders and operators who need senior expertise without hiring in-house \u2014 I sell scoped consulting engagements with clear outcomes." },
  { match: 'freelancer',    suggest: "Freelancers and solo consultants who need a steady stream of clients without cold-emailing \u2014 I sell tools or services that make them look professional." },
  { match: 'freelance',     suggest: "Solo operators who need to look and feel more established \u2014 I sell tools and services that make freelancing more sustainable." },
  { match: 'restaurant',    suggest: "Restaurant owners looking to fill quiet weekday tables with repeat regulars \u2014 I sell what solves that specific gap for them." },
  { match: 'bakery',        suggest: "Locals who value fresh, small-batch baking over supermarket bread \u2014 I sell hand-made bread, pastries, and custom orders." },
  { match: 'cafe',          suggest: "Neighbours and remote workers who want a warmer alternative to the chains \u2014 I sell coffee, food, and a great place to spend an hour." },
  { match: 'coffee',        suggest: "Regulars who care where their beans come from and how they're brewed \u2014 I sell speciality coffee, whole bean, brewed, and by subscription." },
  { match: 'salon',         suggest: "Locals who want a consistent, high-quality salon experience \u2014 I sell haircuts, colour, and treatments people book weeks ahead for." },
  { match: 'barber',        suggest: "Guys who want a proper barbershop, not a chain \u2014 I sell cuts, shaves, and the kind of place people come back to for years." },
  { match: 'gym',           suggest: "People who want to actually stick to a routine, not just sign up \u2014 I sell memberships, small-group classes, and personal training." },
  { match: 'fitness',       suggest: "Adults who want structured fitness without gym anxiety \u2014 I sell classes, programs, and coaching that meet them where they are." },
  { match: 'dentist',       suggest: "Families and adults who put off the dentist because it feels stressful \u2014 I sell modern, gentle dental care they can trust." },
  { match: 'therapist',     suggest: "Adults ready to take mental health seriously and looking for the right fit \u2014 I sell weekly therapy sessions and structured programs." },
  { match: 'landscaping',   suggest: "Homeowners who want their outdoor space to actually feel done \u2014 I sell design, install, and ongoing landscape maintenance." },
  { match: 'cleaning',      suggest: "Busy homes and small offices that value reliability over the cheapest quote \u2014 I sell recurring cleaning on a schedule that works for them." },
  { match: 'plumber',       suggest: "Homeowners in a bind who need someone dependable \u2014 I sell same-day plumbing repairs and honest, up-front pricing." },
  { match: 'electrician',   suggest: "Homeowners and small businesses who need work done right the first time \u2014 I sell licensed electrical work with clear quotes." },
  { match: 'jewelry',       suggest: "People marking a moment \u2014 engagement, anniversary, milestone \u2014 who want something meaningful \u2014 I sell handcrafted jewellery, made to last." },
  { match: 'candle',        suggest: "Home lovers who care about scent and story \u2014 I sell hand-poured candles with unique fragrance blends." },
  { match: 'artist',        suggest: "Collectors and everyday people who want art that means something to them \u2014 I sell original pieces, prints, and commissions." },
  { match: 'writer',        suggest: "Readers who care about my voice and topic \u2014 I sell essays, a newsletter, and my books and workshops." },
  { match: 'teacher',       suggest: "Motivated learners who want a real teacher, not just a course library \u2014 I sell live cohorts and 1:1 coaching in my subject." },
  { match: 'tutor',         suggest: "Parents whose kids need targeted help outside of school \u2014 I sell 1:1 tutoring in specific subjects and test prep." },
  { match: 'nonprofit',     suggest: "Supporters who care about the cause and want their giving to actually change something \u2014 I sell impact backed by transparent reporting." },
  { match: 'charity',       suggest: "Donors who want to know where every dollar goes \u2014 I sell impact through clear reporting and stories from the ground." },
  { match: 'small business',suggest: "Local families and neighbours who value quality over convenience \u2014 I sell hand-made goods with a story you can't get from a chain." },
  { match: 'startup',       suggest: "Early-stage founders who need what I sell to move faster \u2014 they're my earliest and most engaged customers." },
  { match: 'founder',       suggest: "Founders and operators facing a specific problem I've already solved \u2014 I sell the tool or service that gets them past it." },
  { match: 'b2b',           suggest: "Small and mid-sized business teams with a specific painpoint \u2014 I sell to the person feeling that pain, not the CFO." },
  { match: 'b2c',           suggest: "Everyday consumers in a niche I understand deeply \u2014 I sell products they want to tell friends about." }
];

// ---------------------------------------------
// Helpers
// ---------------------------------------------

// Normalizes a business.type value to one of the 8 canonical keys
// used by CL_Q3_ENHANCE_TEMPLATES. Tolerates legacy aliases that a
// pre-restructure concept might carry.
function _claraTypeKey(type) {
  const raw = String(type || '').trim().toLowerCase();
  if (raw === 'small_business' || raw === 'food') return 'small';
  if (raw === 'saas') return 'tech';
  if (raw === 'small' || raw === 'ecommerce' || raw === 'service'
   || raw === 'tech'  || raw === 'creator'    || raw === 'agency'
   || raw === 'nonprofit' || raw === 'other') return raw;
  return 'other';
}

// Normalizes the raw Q2 goal label to one of the 8 canonical goal
// keys via substring matching (same pattern _todayTasks uses in
// clara/tasks.js). Empty / unrecognized falls back to 'growth' so we
// always land on a real template rather than returning null.
function _claraGoalKey(rawGoal) {
  const g = String(rawGoal || '').trim().toLowerCase();
  if (!g) return 'growth';
  // Order matters when a label contains multiple candidate substrings.
  // "Test ideas before I spend money" \u2014 catches 'test' first so
  // the 'idea'/'growth' fallbacks never fire.
  if (g.indexOf('lead') !== -1)                                   return 'leads';
  if (g.indexOf('sale') !== -1)                                   return 'sales';
  if (g.indexOf('customer') !== -1 || g.indexOf('retention') !== -1) return 'retention';
  if (g.indexOf('content') !== -1 || g.indexOf('marketing') !== -1)  return 'marketing';
  if (g.indexOf('launch') !== -1)                                 return 'launch';
  if (g.indexOf('test')  !== -1 || g.indexOf('idea') !== -1)      return 'test';
  if (g.indexOf('competitor') !== -1)                             return 'competitors';
  return 'growth';
}

// Composes the enhance string for a given business. Reads type + goal
// to pick a template, then interpolates {name}. The name fallback
// ("your business") is used only when name is empty \u2014 which
// shouldn't happen in practice since Q_name comes before Q3, but the
// user could arrive here via a re-edit path with a blank name.
function _claraEnhanceCustomer(business) {
  const b = business || {};
  const typeKey = _claraTypeKey(b.type);
  const goalKey = _claraGoalKey(b.goal);
  const bucket = CL_Q3_ENHANCE_TEMPLATES[typeKey] || CL_Q3_ENHANCE_TEMPLATES.other;
  const template = bucket[goalKey] || bucket.growth || '';
  const rawName = (b.name || '').trim();
  const name = rawName || 'Your business';
  // Handle capitalization: {name} at the start of a sentence uses the
  // rawName (or 'Your business') as-is; mid-sentence uses lowercased
  // 'your business' for the fallback. Since our templates only place
  // {name} in one of those two positions consistently we just do a
  // straight replace.
  return template.replace(/\{name\}/g, name);
}

// Scans the user's typed text for the first matching keyword hint.
// Returns { match, suggest } or null. Case-insensitive substring
// match; the keyword table is ordered specific \u2192 generic so
// "coffee shop" wins over "coffee".
function _claraSuggestForCustomer(text) {
  const t = String(text || '').toLowerCase();
  if (!t.trim()) return null;
  for (let i = 0; i < CL_Q3_KEYWORD_HINTS.length; i++) {
    const hint = CL_Q3_KEYWORD_HINTS[i];
    if (t.indexOf(hint.match) !== -1) return hint;
  }
  return null;
}

// ---------------------------------------------
// Exports
// ---------------------------------------------

window.CL_Q3_ENHANCE_TEMPLATES = CL_Q3_ENHANCE_TEMPLATES;
window.CL_Q3_KEYWORD_HINTS = CL_Q3_KEYWORD_HINTS;
window._claraTypeKey = _claraTypeKey;
window._claraGoalKey = _claraGoalKey;
window._claraEnhanceCustomer = _claraEnhanceCustomer;
window._claraSuggestForCustomer = _claraSuggestForCustomer;
