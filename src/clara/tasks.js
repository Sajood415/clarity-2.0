// ---------------------------------------------
// Clarity 2.0 — Today's tasks generator
// ---------------------------------------------
//
// Given the active concept's business context, produces the 3 daily tasks:
// POST (content), OUTREACH, OFFER. Every branch references the extracted
// business fields so the copy feels specific, not generic.

function _todayTasks() {
  const b = getBusiness();
  const name = b.name || 'your business';
  const type = b.type || 'other';
  const product = b.product || (type === 'other' ? 'services' : type + ' services');
  const reach = b.reach || 'online';
  const challenge = b.challenge || 'acquisition';
  const goal = b.goal || 'grow my business';

  // --- Task 1: POST / content ---
  let post;
  if (type === 'food' && reach === 'local') {
    post = {
      description: 'Post a behind the scenes video of making your ' + product + '. Local food lovers stop scrolling for process content.',
      reason: 'Neighbors buying ' + product + ' want to feel connected to who makes it. Process content earns that in seconds.'
    };
  } else if (type === 'food' && reach === 'online') {
    post = {
      description: 'Share the story behind ' + name + ' on Instagram. People buy from makers they know.',
      reason: 'For a food brand shipping beyond the neighborhood, story is the product. ' + name + ' only stands out if people remember why it exists.'
    };
  } else if (type === 'service' && challenge === 'acquisition') {
    post = {
      description: 'Post one client result from ' + name + ' this week. Specific outcomes beat generic claims every time.',
      reason: 'Trust is the whole sale for service work. One real outcome cuts through where a dozen "we help you grow" posts don\u2019t.'
    };
  } else if (type === 'service' && challenge === 'retention') {
    post = {
      description: 'Send a personal check-in message to your last 5 clients from ' + name + '. One message can rebook a customer.',
      reason: 'Your existing clients already trust you. A single message reactivates more revenue than any cold campaign.'
    };
  } else if (type === 'tech' && challenge === 'acquisition') {
    post = {
      description: 'Write one post about the problem ' + product + ' solves. Lead with the pain, not the solution.',
      reason: 'People don\u2019t buy features, they buy relief. Naming the pain qualifies the right buyers for ' + name + ' instantly.'
    };
  } else if (type === 'tech' && challenge === 'retention') {
    post = {
      description: 'Email your last 10 signups from ' + name + ' and ask what almost stopped them from signing up.',
      reason: 'The gap between signup and use is where most tools lose. Closing it makes ' + name + ' impossible to abandon.'
    };
  } else if (type === 'retail' && reach === 'local') {
    post = {
      description: 'Post a photo of your best selling item at ' + name + ' with the price. Local shoppers want to know what to expect.',
      reason: 'Foot traffic decides in the window. Best item plus a real price is the clearest free ad you can run.'
    };
  } else if (type === 'trades' && challenge === 'acquisition') {
    post = {
      description: 'Ask your last happy customer to leave a Google review for ' + name + '. One review brings three more.',
      reason: 'For trades, Google reviews outperform paid ads 5 to 1. This one takes 2 minutes and pays for weeks.'
    };
  } else {
    post = {
      description: 'Share what makes ' + name + ' different in one sentence. Post it on your best platform today.',
      reason: 'If people can\u2019t say what ' + name + ' does in one line, they won\u2019t refer you. Clarity of message beats volume.'
    };
  }

  // --- Task 2: OUTREACH ---
  let outreach;
  if (challenge === 'acquisition') {
    outreach = {
      description: 'Message 3 people who have shown interest in ' + name + ' but never bought. A simple follow up closes more than any ad.',
      reason: 'Warm interest cools fast. The people who came close to buying ' + name + ' are your highest leverage list right now.'
    };
  } else if (challenge === 'retention') {
    outreach = {
      description: 'Pick your top 5 customers from ' + name + ' and send them something personal today. A thank you or an exclusive offer.',
      reason: 'For your goal to ' + goal + ', existing customers are cheaper to grow than new ones. A single personal touch beats any discount.'
    };
  } else {
    outreach = {
      description: 'Reach out to 3 potential customers for ' + name + ' directly. No pitch, just start a conversation.',
      reason: 'You control who you talk to. Direct outreach beats waiting for an algorithm to bring you customers.'
    };
  }

  // --- Task 3: OFFER / action ---
  let offer;
  if (type === 'food') {
    offer = {
      description: 'Create a this week only special at ' + name + '. Limited offers create urgency without discounting your core menu.',
      reason: 'Restaurants live on repeat visits. A weekly hook gives regulars a reason to return without training them to only come with a discount.'
    };
  } else if (type === 'service' || type === 'trades') {
    offer = {
      description: 'Package one of your ' + product + ' services into a fixed price offer. Clarity on price removes the biggest buying barrier.',
      reason: 'Buyers don\u2019t fear the work, they fear the price. Packaging ' + product + ' removes their biggest reason to delay.'
    };
  } else if (type === 'tech') {
    offer = {
      description: 'Add one line to your ' + name + ' homepage about who it is for. Specific beats clever every time.',
      reason: 'The homepage is your best salesperson. One clear line about who ' + name + ' is for outperforms every other tweak you could make.'
    };
  } else if (type === 'retail') {
    offer = {
      description: 'Bundle your two best selling items from ' + name + ' into one deal. Bundles increase average order without cutting margin.',
      reason: 'Bundles raise ticket size without lowering perceived value. Your top sellers can carry weaker items along for the ride.'
    };
  } else {
    offer = {
      description: 'Create a simple first time offer for ' + name + '. Even a small incentive changes the decision for someone on the fence.',
      reason: 'The first purchase is the hardest. Lowering the barrier once is cheaper than convincing them forever.'
    };
  }

  return [
    { id: 'post-1',     type: 'POST',     description: post.description,     time: '5 min',  reason: post.reason },
    { id: 'outreach-1', type: 'OUTREACH', description: outreach.description, time: '10 min', reason: outreach.reason },
    { id: 'offer-1',    type: 'OFFER',    description: offer.description,    time: '15 min', reason: offer.reason }
  ];
}

window._todayTasks = _todayTasks;
