// ---------------------------------------------
// Clarity 2.0 — Business context extraction
// ---------------------------------------------
//
// These functions parse free-form user messages into structured business
// data during Clara's onboarding. They are pure — no state, no DOM — so
// they can be tested and reasoned about in isolation.

function _extractBusinessContext(message) {
  const raw = String(message || '').trim();
  const lower = raw.toLowerCase();

  // --- Type classification ---
  const typeBuckets = [
    { type: 'food',      words: ['bakery', 'cafe', 'restaurant', 'food', 'coffee', 'catering', 'kitchen', 'sourdough', 'pastry'] },
    { type: 'retail',    words: ['shop', 'store', 'boutique', 'clothing', 'fashion', 'products', 'sell'] },
    { type: 'service',   words: ['agency', 'consulting', 'freelance', 'marketing', 'design', 'photography', 'cleaning', 'plumbing', 'electrician'] },
    { type: 'tech',      words: ['software', 'app', 'saas', 'development', 'coding', 'website', 'digital'] },
    { type: 'creative',  words: ['art', 'music', 'studio', 'content', 'video', 'writing'] },
    { type: 'trades',    words: ['plumbing', 'electrical', 'construction', 'carpentry', 'repair', 'maintenance'] },
    { type: 'health',    words: ['clinic', 'doctor', 'fitness', 'gym', 'yoga', 'wellness', 'therapy'] },
    { type: 'education', words: ['school', 'tutoring', 'coaching', 'training', 'courses'] }
  ];
  let type = 'other';
  for (let i = 0; i < typeBuckets.length; i++) {
    const bucket = typeBuckets[i];
    const hit = bucket.words.some(function (w) {
      return new RegExp('\\b' + w + '\\b', 'i').test(lower);
    });
    if (hit) { type = bucket.type; break; }
  }

  // --- Name extraction ---
  let namePart = raw.replace(/^\s*(?:i\s+run|i\s+own|i\s+have|i\s+started|i\s+opened|i\s+am|i'm|we\s+run|we\s+are|we\s+have|my\s+name\s+is)\s+(?:a|an|the)?\s*/i, '');
  const stopIdx = namePart.search(/[.,;!?]|\s(?:and|but|that|which|because|to|so|since|however|though)\s/i);
  let namePhrase = (stopIdx > 0 ? namePart.slice(0, stopIdx) : namePart).trim();
  const nameWords = namePhrase.split(/\s+/).filter(Boolean).slice(0, 5);
  let name = nameWords.join(' ');
  if (!name) {
    name = raw.split(/\s+/).filter(Boolean).slice(0, 3).join(' ');
  }
  if (!name) name = 'your business';

  // --- Product / service extraction ---
  let product = '';
  const productMatch = raw.match(/(?:sell|make|offer|specialis[ez]e in|known for)\s+([^.,;!?\n]+)/i);
  if (productMatch) {
    product = productMatch[1].trim().split(/\s+/).slice(0, 5).join(' ');
  }
  if (!product) {
    product = type === 'other' ? 'services' : (type + ' services');
  }

  // --- Goal extraction ---
  let goal = '';
  const goalMatch = raw.match(/(?:want to|trying to|need to|hoping to|looking to|goal is(?: to)?|help me|would like to|aiming to)\s+([^.,;!?\n]+)/i);
  if (goalMatch) {
    goal = goalMatch[1].trim();
  }
  if (!goal) {
    if (/more customers/i.test(raw))       goal = 'get more customers';
    else if (/more sales/i.test(raw))      goal = 'get more sales';
    else if (/more visibility/i.test(raw)) goal = 'get more visibility';
    else if (/\blaunch\b/i.test(raw))      goal = 'launch';
    else if (/grow online/i.test(raw))     goal = 'grow online';
  }
  if (!goal) goal = 'grow my business';

  return { name: name, type: type, product: product, goal: goal };
}

function _detectReach(text) {
  const local = /\b(nearby|local|walk|walk[-\s]?in|foot traffic|area|neighborhood|neighbourhood|city|town|street|block|near me|around here|in person)\b/i;
  return local.test(text) ? 'local' : 'online';
}

function _detectChallenge(text) {
  const t = String(text || '').toLowerCase();
  const acquisition = /\b(new|find|get|attract|more customers|leads?|signups?)\b/;
  const retention   = /\b(keep|return|loyal|existing|repeat|back)\b/;
  if (acquisition.test(t)) return 'acquisition';
  if (retention.test(t))   return 'retention';
  return 'acquisition';
}

window._extractBusinessContext = _extractBusinessContext;
window._detectReach = _detectReach;
window._detectChallenge = _detectChallenge;
