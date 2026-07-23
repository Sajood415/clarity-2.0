// ---------------------------------------------
// Clarity 2.0 — Today's tasks generator
// ---------------------------------------------
//
// Given the active concept's business context, produces the 3 daily
// tasks: POST (content), OUTREACH, OFFER. Every branch is keyed on the
// specific combination of business fields the user actually gave us,
// so the copy names their business, targets their goal, and grounds
// the "why" in their real context.
//
// Fields read from business (all optional, all defended):
//   name              \u2014 the business name (from Q_name)
//   type              \u2014 'small' | 'ecommerce' | 'service' | 'tech' |
//                       'creator' | 'agency' | 'nonprofit' | 'other'
//                       ('food' is treated as an alias of 'small' per spec)
//   product           \u2014 noun phrase extracted from Q3 (Q3 free text)
//   goal              \u2014 raw Q2 label (case-insensitive match on
//                       "lead", "sale", "retention", "content"...)
//   channels          \u2014 Q4 multi-select array
//   budget            \u2014 Q5 machine key: 'zero'|'low'|'medium'|'high'|
//                       'enterprise'|'unknown'
//   location          \u2014 Q6 free text ("Lahore, Pakistan" etc.)
//   customer          \u2014 Q3 free text (used as a fallback subject)
//   generatedPersona  \u2014 { name, age, desc, traits[], trigger }
//                       (aspirational; not yet populated by any code path,
//                       but respected here so the moment it exists the
//                       outreach branch picks it up)
//
// Budget \u00d7 channels cross-check (paid-suggestion gate):
//   `effectiveBudget` downgrades medium/high/enterprise to `low` when
//   the user's channels list contains NEITHER 'Google Ads' NOR
//   'Meta Ads'. Task branches key off `effectiveBudget`, never `budget`
//   directly, so we never surface paid options against a channel mix
//   the user hasn't committed to.

// Paid channel labels from CL_OPTIONS_Q4. Kept local (not imported)
// so tasks.js has no load-order dependency on responses.js.
const TASKS_PAID_CHANNELS = ['Google Ads', 'Meta Ads'];

function _effectiveBudget(budget, channels) {
  const list = Array.isArray(channels) ? channels : [];
  const hasPaidChannel = TASKS_PAID_CHANNELS.some(function (p) { return list.indexOf(p) !== -1; });
  const raw = String(budget || 'unknown');
  if ((raw === 'medium' || raw === 'high' || raw === 'enterprise') && !hasPaidChannel) {
    return 'low';
  }
  return raw;
}

// True only when it's safe to surface a paid suggestion. Never key off
// ctx.budget directly \u2014 use this so the channels cross-check is
// honored in one place.
function _canSuggestPaid(ctx) {
  const eff = ctx && ctx.effectiveBudget;
  return eff === 'medium' || eff === 'high' || eff === 'enterprise';
}

function _todayTasks() {
  const b = getBusiness();

  const name = (b.name && b.name.trim()) ? b.name.trim() : 'your business';
  // Normalize type. 'food' is treated as an alias of 'small' per the
  // spec \u2014 our onboarding never produces 'food', so this only
  // matters if a caller sets it directly.
  const rawType = String(b.type || 'other').toLowerCase();
  const type = rawType === 'food' ? 'small' : rawType;

  // Bare product noun, no "your " prefix, so templates can read
  // naturally as "your <product>" without doubling the possessive.
  const product = (b.product && b.product.trim())
    ? b.product.trim()
    : _productFallback(type);

  const goal = String(b.goal || '').trim();
  const goalLC = goal.toLowerCase();

  const location = (b.location || '').trim();
  const channels = Array.isArray(b.channels) ? b.channels : [];

  const rawBudget = String(b.budget || 'unknown').toLowerCase();
  const effectiveBudget = _effectiveBudget(rawBudget, channels);

  const persona = b.generatedPersona || null;
  const personaName = (persona && persona.name && String(persona.name).trim())
    ? String(persona.name).trim()
    : '';

  // Case-insensitive intent flags. "understand my customer" maps to
  // retention because that goal is where retention outreach lands
  // best; explicit "retention" also fires the same branch if a future
  // goal label uses that word directly.
  const wantsLeads     = goalLC.indexOf('lead') !== -1;
  const wantsSales     = goalLC.indexOf('sale') !== -1;
  const wantsRetention = goalLC.indexOf('retention') !== -1
                      || goalLC.indexOf('understand my customer') !== -1;

  const ctx = {
    name: name,
    type: type,
    rawType: rawType,
    product: product,
    goal: goal,
    goalLC: goalLC,
    location: location,
    channels: channels,
    budget: rawBudget,
    effectiveBudget: effectiveBudget,
    persona: persona,
    personaName: personaName,
    wantsLeads: wantsLeads,
    wantsSales: wantsSales,
    wantsRetention: wantsRetention,
    hasChannel: function (label) { return channels.indexOf(label) !== -1; }
  };

  return [
    _postTask(ctx),
    _outreachTask(ctx),
    _offerTask(ctx)
  ];
}

// ---------------------------------------------
// Task 1: POST / content
// ---------------------------------------------
//
// Priority order (highest signal first):
//   food/small + leads      \u2192 BTS video, tag location
//   food/small + sales      \u2192 limited-batch announcement
//   tech + leads            \u2192 pain-first post
//   tech + sales            \u2192 user metric
//   service + leads         \u2192 client result
//   service + retention     \u2192 check-in 5 clients
//   creator (any goal)      \u2192 origin story
//   ecommerce + sales       \u2192 best seller + real customer photo
//   agency + leads          \u2192 numbered case study
//   default                 \u2192 one-line differentiator on top platform

function _postTask(ctx) {
  const name = ctx.name;
  const type = ctx.type;
  const product = ctx.product;
  const location = ctx.location;
  const goal = ctx.goal;
  const personaName = ctx.personaName;

  let description, reason;

  if (type === 'small' && ctx.wantsLeads) {
    const loc = location || 'your city';
    description = 'Post a behind the scenes video of making your ' + product + ' today. Tag your location in ' + loc + ' so locals can find you.';
    reason = (location ? 'People in ' + location + ' ' : 'Local audiences ')
           + 'reward the makers they can watch working. Location-tagged posts also surface for anyone actively searching nearby.';
  } else if (type === 'small' && ctx.wantsSales) {
    description = 'Share a limited batch announcement for ' + name + '. Scarcity drives decisions faster than any discount.';
    reason = 'Your regulars need a reason to act this week, not next month. A "this week only" hook converts the on-the-fence '
           + (location ? 'audience around ' + location + '.' : 'audience without eroding your margins.');
  } else if (type === 'tech' && ctx.wantsLeads) {
    description = 'Write one post about the exact problem ' + name + ' solves. Lead with the pain not the solution.';
    reason = 'Buyers search for the pain, not the product. Naming the problem qualifies the right prospects for ' + name + ' instantly and filters out everyone else.';
  } else if (type === 'tech' && ctx.wantsSales) {
    description = 'Share a specific metric a user achieved with ' + name + '. Numbers convert better than claims.';
    reason = 'One real number ("cut onboarding time by 62%") outperforms a page of copy about "faster onboarding". Sales-stage buyers want proof, not promises.';
  } else if (type === 'service' && ctx.wantsLeads) {
    description = 'Post one client result from ' + name + ' this week. Use their words if possible.';
    reason = 'For service work, one concrete outcome earns more calls than any amount of "we help you grow" copy. Real results travel; adjectives don\u2019t.';
  } else if (type === 'service' && ctx.wantsRetention) {
    description = 'Send a personal check-in to your last 5 clients from ' + name + '. One message can rebook a customer.';
    reason = 'Existing clients cost nothing to reactivate. A single "how\u2019s it going" pulls back more revenue than a week of cold-lead content.';
  } else if (type === 'creator') {
    description = 'Share something personal about why you started ' + name + '. Authenticity beats production every time.';
    reason = 'Creator brands are built on the "why", not the "what". Reintroducing yourself compounds every post that comes after it.';
  } else if (type === 'ecommerce' && ctx.wantsSales) {
    description = 'Feature your best seller from ' + name + ' with a real customer photo. Social proof at the point of sale.';
    reason = 'Buyers trust other buyers more than any brand copy. One real photo lifts conversion where a polished shoot won\u2019t.';
  } else if (type === 'agency' && ctx.wantsLeads) {
    description = 'Post a case study result from ' + name + '. Be specific about the outcome and the timeline.';
    reason = 'Agency prospects hire outcomes, not process. "Grew X from Y to Z in 90 days" earns the call \u2014 decks and testimonials don\u2019t.';
  } else {
    description = 'Share one specific thing that makes ' + name + ' different. One sentence, your best platform, today.';
    // Reach for the most specific "why" available in this order:
    // persona name > explicit goal > business name only.
    if (personaName) {
      reason = 'If ' + personaName + ' can\u2019t explain ' + name + ' in one line, they won\u2019t remember you tomorrow. Clarity of message beats volume of posts.';
    } else if (goal) {
      reason = 'To ' + goal.toLowerCase() + ', your prospects need to understand ' + name + ' in one sentence. Clarity of message beats volume of posts.';
    } else {
      reason = 'If people can\u2019t explain ' + name + ' in one line, they won\u2019t refer you. Clarity of message beats volume of posts.';
    }
  }

  return {
    id: 'post-1',
    type: 'POST',
    description: description,
    time: '5 min',
    reason: reason,
    personaId: (typeof getDefaultPersonaId === 'function') ? getDefaultPersonaId() : undefined
  };
}

// ---------------------------------------------
// Task 2: OUTREACH
// ---------------------------------------------
//
// Priority order:
//   generatedPersona present  \u2192 reach out to 3 matching that persona
//   goal wants retention      \u2192 message top 5 existing customers
//   default                   \u2192 talk to 3 potential customers directly

function _outreachTask(ctx) {
  const name = ctx.name;
  const personaName = ctx.personaName;
  const location = ctx.location;

  let description, reason;

  if (personaName) {
    description = 'Reach out to 3 people who match the profile of ' + personaName + ' but haven\u2019t bought from ' + name + ' yet. A direct personal message converts better than any ad.';
    reason = 'You already know exactly who ' + personaName + ' is. Reaching out beats waiting for the algorithm to introduce you \u2014 and personal messages get read where ads get scrolled past.';
  } else if (ctx.wantsRetention) {
    description = 'Message your top 5 customers from ' + name + ' this week. A thank you or exclusive offer goes a long way.';
    reason = 'Your best customers cost the least to grow. One personal note reactivates revenue in days and often generates the referral you weren\u2019t asking for.';
  } else {
    description = 'Reach out to 3 potential customers for ' + name + ' directly. No pitch, just start a conversation.';
    reason = (location ? 'In ' + location + ', direct outreach ' : 'Direct outreach ')
           + 'beats waiting for an algorithm to bring you customers. You control who you talk to and when.';
  }

  return {
    id: 'outreach-1',
    type: 'OUTREACH',
    description: description,
    time: '10 min',
    reason: reason,
    personaId: (typeof getDefaultPersonaId === 'function') ? getDefaultPersonaId() : undefined
  };
}

// ---------------------------------------------
// Task 3: OFFER / action
// ---------------------------------------------
//
// Priority order:
//   effBudget low/zero/unknown + food/small  \u2192 this-week-only special
//   effBudget medium/high + tech             \u2192 free trial / demo
//   service/agency                           \u2192 fixed-price package
//   ecommerce                                \u2192 bundle best sellers
//   default                                  \u2192 first-time buyer offer
//
// Note: budget branches key off effectiveBudget so paid-only options
// (like "run ads") never fire without a committed paid channel.

function _offerTask(ctx) {
  const name = ctx.name;
  const type = ctx.type;
  const effBudget = ctx.effectiveBudget;
  const personaName = ctx.personaName;
  const location = ctx.location;

  const isLowBudget = effBudget === 'zero' || effBudget === 'low' || effBudget === 'unknown';
  const isHighBudget = effBudget === 'medium' || effBudget === 'high' || effBudget === 'enterprise';

  let description, reason;

  if (isLowBudget && type === 'small') {
    description = 'Create a this week only special at ' + name + '. Limited offers create urgency without discounting your core menu.';
    reason = 'Regulars '
           + (location ? 'in ' + location + ' ' : '')
           + 'need a reason to come back this week, not just this month. A rotating hook gives them one without eroding your margins.';
  } else if (isHighBudget && type === 'tech') {
    description = 'Set up a free trial or demo for ' + name + '. Letting people experience the product removes the biggest buying barrier.';
    reason = 'You have the budget to remove the biggest tech buying friction: "will this actually work for me?" A trial answers that in a way no ad or landing page can.';
  } else if (type === 'service' || type === 'agency') {
    description = 'Package one service from ' + name + ' into a fixed price offer. Clarity on price removes hesitation.';
    reason = personaName
      ? personaName + ' fears the price more than the work. A packaged, publicly priced offer compresses the ' + name + ' sales cycle by weeks.'
      : 'Buyers don\u2019t fear the work, they fear the price. A packaged, publicly priced offer compresses the ' + name + ' sales cycle by weeks.';
  } else if (type === 'ecommerce') {
    description = 'Bundle your two best sellers from ' + name + ' into one deal. Bundles increase order value without cutting margin.';
    reason = 'Bundling raises ticket size without lowering perceived value. Your top sellers can carry a slower mover along for the ride.';
  } else {
    description = 'Create a simple first time offer for ' + name + '. Even a small incentive changes the decision for someone on the fence.';
    reason = 'The first purchase is the hardest. Lowering the barrier once is cheaper than convincing someone forever.';
  }

  return {
    id: 'offer-1',
    type: 'OFFER',
    description: description,
    time: '15 min',
    reason: reason,
    personaId: (typeof getDefaultPersonaId === 'function') ? getDefaultPersonaId() : undefined
  };
}

// ---------------------------------------------
// Helpers
// ---------------------------------------------

function _productFallback(type) {
  // Bare noun (no "your " prefix) so templates can read "your <product>"
  // without doubling up on the possessive.
  switch (type) {
    case 'ecommerce': return 'products';
    case 'service':   return 'services';
    case 'agency':    return 'services';
    case 'tech':      return 'product';
    case 'creator':   return 'work';
    case 'nonprofit': return 'programs';
    case 'small':     return 'products';
    default:          return 'services';
  }
}

window._todayTasks = _todayTasks;
window._effectiveBudget = _effectiveBudget;
window._canSuggestPaid = _canSuggestPaid;
