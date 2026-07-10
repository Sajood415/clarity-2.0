// ---------------------------------------------
// Clarity 2.0 — Today's tasks generator
// ---------------------------------------------
//
// Given the active concept's business context, produces the 3 daily tasks:
// POST (content), OUTREACH, OFFER. Every branch references the extracted
// business fields so the copy feels specific, not generic.
//
// Reads from the post-rebuild business shape:
//   type      — 'small' | 'ecommerce' | 'service' | 'tech' | 'creator'
//              | 'agency' | 'nonprofit' | 'other'
//   goal      — one of CL_OPTIONS_Q2 labels (raw text)
//   customer  — Q3 free text (currently unused in copy; kept for future)
//   product   — extracted noun phrase from Q3
//   channels  — Q4 multi-select array
//   reach     — inferred 'local' | 'online' | 'mixed' | ''
//   location  — Q6 free text ("Lahore, Pakistan" etc.)
//
// Copy always degrades gracefully: if a field is missing we substitute
// safe fallbacks (name → "your business", product → "your services",
// etc.) so a partially-onboarded concept still gets usable tasks.

function _todayTasks() {
  const b = getBusiness();
  const name     = b.name || 'your business';
  const type     = b.type || 'other';
  const product  = b.product || 'your ' + _productFallback(type);
  const goal     = b.goal || '';
  const channels = Array.isArray(b.channels) ? b.channels : [];
  const reach    = b.reach || '';
  const location = (b.location || '').trim();

  const hasChannel = function (label) { return channels.indexOf(label) !== -1; };
  const audienceLine = location ? 'People in ' + location + ' ' : 'Your audience ';

  return [
    _postTask({ name: name, type: type, product: product, channels: channels, reach: reach, audienceLine: audienceLine, hasChannel: hasChannel }),
    _outreachTask({ name: name, product: product, goal: goal }),
    _offerTask({ name: name, type: type, product: product, goal: goal })
  ];
}

// ---------------------------------------------
// Task 1: POST / content
// ---------------------------------------------

function _postTask(ctx) {
  const name = ctx.name;
  const type = ctx.type;
  const product = ctx.product;
  const audienceLine = ctx.audienceLine;
  const hasChannel = ctx.hasChannel;

  // Prefer the highest-signal branch: type + a concrete channel the user
  // actually said they were on. Falls through to type-only branches, and
  // finally a universal "one-line differentiator" prompt.
  let post;

  if (type === 'small' && hasChannel('Instagram')) {
    post = {
      description: 'Post a behind the scenes video of making your ' + product + ' today. ' + audienceLine + 'respond to real process content.',
      reason: 'Local audiences reward the makers they can watch working. One authentic clip beats a week of polished copy.'
    };
  } else if (type === 'ecommerce' && (hasChannel('Instagram') || hasChannel('TikTok'))) {
    post = {
      description: 'Film a 15 second unboxing or product-in-use clip today. Short vertical video is where most ' + name + ' discovery is happening right now.',
      reason: 'Static product photos plateau fast. Motion + real hands using ' + product + ' still converts scrollers to buyers.'
    };
  } else if (type === 'service') {
    post = {
      description: 'Share one result you got for a client this week. Specific outcomes build trust faster than anything else.',
      reason: 'For service work, one real outcome cuts through where any amount of "we help you grow" copy does not.'
    };
  } else if (type === 'tech') {
    post = {
      description: 'Post one line about the exact problem ' + product + ' solves. Lead with the pain, not the feature list.',
      reason: 'People buy relief, not features. Naming the pain qualifies the right buyers for ' + name + ' instantly.'
    };
  } else if (type === 'creator') {
    post = {
      description: 'Share the story of why you started ' + name + '. Personal brands are built on the "why", not the "what".',
      reason: 'A creator brand is only as strong as the reason people follow it. Reintroducing yourself compounds every other post.'
    };
  } else if (type === 'agency') {
    post = {
      description: 'Post one client win with the exact numbers. Agency pipelines are built on proof, not process.',
      reason: 'Prospects hire agencies for outcomes, not methodology. Concrete numbers earn calls, decks do not.'
    };
  } else if (type === 'nonprofit') {
    post = {
      description: 'Share one specific person or moment your work impacted this month. Faces move more than stats.',
      reason: 'Missions get funded when the impact feels personal. One story does more than a dozen infographics.'
    };
  } else {
    post = {
      description: 'Share what makes ' + name + ' different in one sentence. Post it on your best platform today.',
      reason: 'If people cannot say what ' + name + ' does in one line, they will not refer you. Clarity of message beats volume.'
    };
  }

  return { id: 'post-1', type: 'POST', description: post.description, time: '5 min', reason: post.reason };
}

// ---------------------------------------------
// Task 2: OUTREACH
// ---------------------------------------------

function _outreachTask(ctx) {
  const name = ctx.name;
  const product = ctx.product;
  const goal = ctx.goal;

  let outreach;

  if (goal === 'Get more leads') {
    outreach = {
      description: 'Reach out to 3 people who have enquired about ' + product + ' but never converted. A follow up message closes more than any ad.',
      reason: 'Warm interest cools fast. The people who almost bought from ' + name + ' are your highest leverage list.'
    };
  } else if (goal === 'Increase sales') {
    outreach = {
      description: 'Message your top 5 customers and offer them something exclusive this week.',
      reason: 'Existing buyers are cheaper to grow than new ones. A personal offer to your best customers reactivates revenue in days.'
    };
  } else if (goal === 'Understand my customers better') {
    outreach = {
      description: 'Message 3 recent customers and ask one question: what almost stopped them from buying from ' + name + '?',
      reason: 'The reason people almost said no is the fastest way to fix the reasons they still do.'
    };
  } else if (goal === 'Keep up with competitors') {
    outreach = {
      description: 'Pick your 3 closest competitors and screenshot one thing each is doing this week that ' + name + ' is not.',
      reason: 'You cannot out-position a market you do not track. 10 minutes of watching beats a week of guessing.'
    };
  } else if (goal === 'Test ideas before I spend money' || goal === 'Launch a new product or service') {
    outreach = {
      description: 'DM 5 people who fit your ideal customer and pitch the idea in one paragraph. Ask if they would pre-order.',
      reason: 'Real feedback comes from real wallets. 5 direct conversations tell you more than 500 poll votes.'
    };
  } else {
    outreach = {
      description: 'Reach out to 3 potential customers for ' + name + ' directly. No pitch, just start a conversation.',
      reason: 'You control who you talk to. Direct outreach beats waiting for an algorithm to bring you customers.'
    };
  }

  return { id: 'outreach-1', type: 'OUTREACH', description: outreach.description, time: '10 min', reason: outreach.reason };
}

// ---------------------------------------------
// Task 3: OFFER / action
// ---------------------------------------------

function _offerTask(ctx) {
  const name = ctx.name;
  const type = ctx.type;
  const product = ctx.product;
  const goal = ctx.goal;

  // Goal-driven branches take priority — they're the more specific
  // signal ("Launch something new" beats "you sell products").
  let offer;

  if (goal === 'Launch a new product or service') {
    offer = {
      description: 'Create a waitlist for your upcoming launch. Even 20 signups creates momentum you can point at.',
      reason: 'Launches without pre-committed interest die on day one. A waitlist turns the launch into a delivery, not a gamble.'
    };
  } else if (goal === 'Build a growth plan from scratch') {
    offer = {
      description: 'Pick the ONE metric ' + name + ' will move this month. Write it on your wall.',
      reason: 'Growth plans fail when they optimize five things at once. A single visible number kills the wobble.'
    };
  } else if (type === 'ecommerce') {
    offer = {
      description: 'Bundle your two best products into one deal for the next 48 hours. Bundles increase order value without cutting margin.',
      reason: 'Bundles raise ticket size without lowering perceived value. Your top sellers can carry weaker items along for the ride.'
    };
  } else if (type === 'service' || type === 'agency') {
    offer = {
      description: 'Package one of your services into a fixed price offer. Clarity on price removes the biggest buying barrier.',
      reason: 'Buyers do not fear the work, they fear the price. Packaging removes their biggest reason to delay.'
    };
  } else if (type === 'tech') {
    offer = {
      description: 'Add one line to your ' + name + ' homepage about who it is for. Specific beats clever every time.',
      reason: 'The homepage is your best salesperson. One clear line about who ' + name + ' is for outperforms every other tweak.'
    };
  } else if (type === 'creator') {
    offer = {
      description: 'Create one lead magnet from your best content and put it behind an email signup this week.',
      reason: 'Attention without an owned channel evaporates on algorithm changes. Email turns followers into an actual audience.'
    };
  } else if (type === 'nonprofit') {
    offer = {
      description: 'Turn your most compelling story into a one-page appeal and send it to your 10 warmest supporters.',
      reason: 'Warm asks convert 10x cold ones. Your existing supporters are the fundraising engine you already own.'
    };
  } else if (type === 'small') {
    offer = {
      description: 'Create a this week only special for ' + name + '. Limited offers create urgency without discounting your core menu.',
      reason: 'Regulars need a reason to come back this week, not just this month. A rotating hook gives them one.'
    };
  } else {
    offer = {
      description: 'Create a simple first time offer for ' + name + '. Even a small incentive changes the decision for someone on the fence.',
      reason: 'The first purchase is the hardest. Lowering the barrier once is cheaper than convincing them forever.'
    };
  }

  return { id: 'offer-1', type: 'OFFER', description: offer.description, time: '15 min', reason: offer.reason };
}

// ---------------------------------------------
// Helpers
// ---------------------------------------------

function _productFallback(type) {
  // Used only when Q3's product extractor pulled nothing. Keeps the
  // task copy grammatical ("your services" reads better than "your ").
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
