// ---------------------------------------------
// Clarity 2.0 — Workspace Chatbot
// ---------------------------------------------
//
// A floating "C" bubble in the bottom-right of every workspace view.
// Click it and a small self-contained chat panel opens. The user can
// ask Clara about *this* concept's workspace — today's tasks, what to
// create, how results look, etc. — and Clara replies in-panel using
// the concept's business context.
//
// This is deliberately NOT a shortcut to the main Chat page. Messages
// live in `concept.widgetChat.messages` (separate from the main
// `concept.chat.messages`) so the widget stays lightweight and
// scoped to the workspace.
//
// First time per concept: bubble slides in, panel auto-opens with
// Clara's contextual welcome, a soft chime plays. After that the
// bubble is silent and the panel waits for a click.
//
// Public API:
//   _syncWorkspaceGreeter()  — router hook. Mount/unmount the bubble
//                              based on workspace vs chat.
//   _openWorkspaceGreeter()  — force-open the panel.
//   _closeWorkspaceGreeter() — animated close.
//   _toggleWorkspaceGreeter()— used by the bubble click handler.

var _greeterAudioCtx = null;
var _greeterPanelOpen = false;

function _syncWorkspaceGreeter() {
  const bubble = document.getElementById('wgBubble');
  const panel = document.getElementById('wgPanel');

  const inWorkspace =
    appState.mode === 'home' &&
    typeof appState.activeView === 'string' &&
    appState.activeView !== 'chat';

  if (!inWorkspace) {
    if (bubble) bubble.parentNode.removeChild(bubble);
    if (panel) panel.parentNode.removeChild(panel);
    _greeterPanelOpen = false;
    return;
  }

  const c = getActiveConcept();
  if (!c) return;
  if (!c.chat || !c.chat.onboardingComplete) return;

  if (bubble) return;
  _mountWorkspaceGreeter();
}

function _mountWorkspaceGreeter() {
  const c = getActiveConcept();
  if (!c) return;
  const firstTime = !c.hasSeenWorkspaceIntro;

  const bubble = document.createElement('button');
  bubble.type = 'button';
  bubble.id = 'wgBubble';
  bubble.className = 'wg-bubble';
  bubble.setAttribute('aria-label', 'Open Clara');
  bubble.innerHTML = ''
    + '<span class="wg-bubble-glyph">C</span>'
    + '<span class="wg-bubble-ring"></span>'
    + (firstTime ? '<span class="wg-bubble-dot"></span>' : '');

  document.body.appendChild(bubble);
  bubble.addEventListener('click', _toggleWorkspaceGreeter);

  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      bubble.classList.add('wg-bubble-mounted');
    });
  });

  if (firstTime) {
    // Mark seen the moment the bubble mounts \u2014 a reload during the
    // first visit still counts as "we already showed them".
    c.hasSeenWorkspaceIntro = true;
    _saveState();

    setTimeout(function () {
      _openWorkspaceGreeter({ playSound: true, autoOpened: true });
    }, 520);
  }
}

function _toggleWorkspaceGreeter() {
  if (_greeterPanelOpen) _closeWorkspaceGreeter();
  else _openWorkspaceGreeter({ playSound: false });
}

function _openWorkspaceGreeter(opts) {
  const playSound = !!(opts && opts.playSound);
  const autoOpened = !!(opts && opts.autoOpened);
  if (document.getElementById('wgPanel')) return;

  const c = getActiveConcept();
  if (!c) return;

  // Ensure the concept has a widgetChat container and seed the first
  // Clara message once so the panel is never empty.
  if (!c.widgetChat || !Array.isArray(c.widgetChat.messages)) {
    c.widgetChat = { messages: [] };
  }
  _seedWidgetChat(c);

  const b = c.business || {};
  const name = (b.name && b.name.trim()) ? b.name.trim() : 'your business';
  const color = c.color || '#F5A623';

  const panel = document.createElement('div');
  panel.id = 'wgPanel';
  panel.className = 'wg-panel';
  panel.style.setProperty('--wg-color', color);
  panel.innerHTML = ''
    + '<div class="wg-panel-glow"></div>'
    + '<div class="wg-panel-header">'
    +   '<div class="wg-avatar">C</div>'
    +   '<div class="wg-panel-title-block">'
    +     '<div class="wg-panel-title">Clara</div>'
    +     '<div class="wg-panel-subtitle">for ' + _escape(name) + '</div>'
    +   '</div>'
    +   '<button type="button" class="wg-panel-close" id="wgPanelClose" aria-label="Close">'
    +     '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">'
    +       '<path d="M3 3 L11 11 M11 3 L3 11"/>'
    +     '</svg>'
    +   '</button>'
    + '</div>'
    + '<div class="wg-panel-body" id="wgPanelBody">'
    +   _renderWidgetMessages(c)
    + '</div>'
    + '<form class="wg-input-form" id="wgInputForm" autocomplete="off">'
    +   '<input type="text" class="wg-input" id="wgInput" placeholder="Ask about ' + _escape(name) + '\u2026" autocomplete="off" />'
    +   '<button type="submit" class="wg-send" id="wgSend" aria-label="Send">'
    +     '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
    +       '<path d="M7 12 L7 2 M3 6 L7 2 L11 6"/>'
    +     '</svg>'
    +   '</button>'
    + '</form>';

  document.body.appendChild(panel);
  _greeterPanelOpen = true;

  const bubble = document.getElementById('wgBubble');
  if (bubble) {
    bubble.classList.add('wg-bubble-active');
    const dot = bubble.querySelector('.wg-bubble-dot');
    if (dot) dot.remove();
  }

  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      panel.classList.add('wg-panel-open');
      if (playSound) _playGreeterSound();
    });
  });

  // Anchor to the bottom (chat convention) and focus the input so
  // typing works immediately. Skip the focus on the auto-open so the
  // user reads the welcome first without a keyboard popping up on
  // mobile.
  const body = panel.querySelector('#wgPanelBody');
  if (body) body.scrollTop = body.scrollHeight;

  if (!autoOpened) {
    setTimeout(function () {
      const input = panel.querySelector('#wgInput');
      if (input) input.focus();
    }, 280);
  }

  const closeBtn = panel.querySelector('#wgPanelClose');
  const form = panel.querySelector('#wgInputForm');
  if (closeBtn) closeBtn.addEventListener('click', _closeWorkspaceGreeter);
  if (form) form.addEventListener('submit', _handleWidgetSubmit);
}

function _closeWorkspaceGreeter() {
  const panel = document.getElementById('wgPanel');
  const bubble = document.getElementById('wgBubble');
  if (bubble) bubble.classList.remove('wg-bubble-active');
  _greeterPanelOpen = false;
  if (!panel) return;

  panel.classList.remove('wg-panel-open');
  panel.classList.add('wg-panel-closing');
  setTimeout(function () {
    if (panel.parentNode) panel.parentNode.removeChild(panel);
  }, 260);
}

// ---------------------------------------------
// Message thread
// ---------------------------------------------

function _seedWidgetChat(c) {
  if (c.widgetChat.messages.length > 0) return;
  const b = c.business || {};
  const name = (b.name && b.name.trim()) ? b.name.trim() : 'your business';
  const text = _buildGreeterMessage(b, name);
  c.widgetChat.messages.push({ role: 'clara', text: text, ts: Date.now() });
  _saveState();
}

function _renderWidgetMessages(c) {
  return c.widgetChat.messages.map(_renderWidgetMessage).join('');
}

function _renderWidgetMessage(msg) {
  if (msg.role === 'user') {
    return ''
      + '<div class="wg-msg wg-msg-user">'
      +   '<div class="wg-msg-bubble">' + _escape(msg.text) + '</div>'
      + '</div>';
  }
  return ''
    + '<div class="wg-msg">'
    +   '<div class="wg-msg-avatar">C</div>'
    +   '<div class="wg-msg-bubble">' + _formatMultiline(msg.text) + '</div>'
    + '</div>';
}

// Clara's replies sometimes include multi-line lists. Escape everything
// first, then convert `\n` into <br> so the layout stays clean.
function _formatMultiline(text) {
  return _escape(String(text || '')).replace(/\n/g, '<br>');
}

function _appendWidgetMessage(msg) {
  const body = document.getElementById('wgPanelBody');
  if (!body) return;
  const wrap = document.createElement('div');
  wrap.innerHTML = _renderWidgetMessage(msg);
  const el = wrap.firstElementChild;
  if (!el) return;
  el.classList.add('wg-msg-fresh');
  body.appendChild(el);
  body.scrollTop = body.scrollHeight;
}

function _showWidgetThinking() {
  const body = document.getElementById('wgPanelBody');
  if (!body) return;
  if (document.getElementById('wgThinking')) return;
  const el = document.createElement('div');
  el.id = 'wgThinking';
  el.className = 'wg-msg wg-msg-thinking';
  el.innerHTML = ''
    + '<div class="wg-msg-avatar">C</div>'
    + '<div class="wg-msg-bubble wg-thinking">'
    +   '<span class="wg-thinking-dot"></span>'
    +   '<span class="wg-thinking-dot"></span>'
    +   '<span class="wg-thinking-dot"></span>'
    + '</div>';
  body.appendChild(el);
  body.scrollTop = body.scrollHeight;
}

function _hideWidgetThinking() {
  const t = document.getElementById('wgThinking');
  if (t && t.parentNode) t.parentNode.removeChild(t);
}

// ---------------------------------------------
// Send flow
// ---------------------------------------------

function _handleWidgetSubmit(evt) {
  if (evt && typeof evt.preventDefault === 'function') evt.preventDefault();

  const input = document.getElementById('wgInput');
  const c = getActiveConcept();
  if (!input || !c) return;

  const text = input.value.trim();
  if (!text) return;

  input.value = '';
  input.focus();

  const userMsg = { role: 'user', text: text, ts: Date.now() };
  c.widgetChat.messages.push(userMsg);
  _saveState();
  _appendWidgetMessage(userMsg);

  _showWidgetThinking();

  // Small delay so Clara feels considered rather than instant.
  const delay = 550 + Math.floor(Math.random() * 350);
  setTimeout(function () {
    _hideWidgetThinking();
    const current = getActiveConcept();
    if (!current) return;
    const reply = _generateWidgetReply(text, current);
    const claraMsg = { role: 'clara', text: reply, ts: Date.now() };
    current.widgetChat.messages.push(claraMsg);
    _saveState();
    _appendWidgetMessage(claraMsg);
  }, delay);
}

// ---------------------------------------------
// Reply generator \u2014 keyword-routed, always scoped to the concept.
// This isn't an LLM; it's a considered set of intents that reference
// what Clara actually knows (business, tasks, results) so responses
// feel grounded even without a real backend.
// ---------------------------------------------

function _generateWidgetReply(userText, c) {
  const raw = String(userText || '');
  const text = raw.toLowerCase().trim();
  const b = c.business || {};
  const name = (b.name && b.name.trim()) ? b.name.trim() : 'your business';

  const has = function (re) { return re.test(text); };

  // 1) Tasks / focus / priorities
  if (has(/\b(task|todo|to do|focus|priorit|what should i do|what to do|work on|do today)\b/)) {
    const tasks = (typeof _todayTasks === 'function') ? _todayTasks() : [];
    if (tasks.length) {
      const lines = tasks.slice(0, 3).map(function (t, i) {
        const desc = t.description.length > 90
          ? t.description.slice(0, 90).trim() + '\u2026'
          : t.description;
        return (i + 1) + '. ' + t.type + ' \u2014 ' + desc;
      });
      return 'Today\u2019s three for ' + name + ':\n\n' + lines.join('\n') + '\n\nOpen the Today tab when you\u2019re ready to work through them.';
    }
    return 'Head to the Today tab \u2014 that\u2019s where I keep the three things I want you focused on.';
  }

  // 2) Create / drafts / content
  if (has(/\b(create|post|content|write|draft|publish|share|caption|copy|generate)\b/)) {
    return 'Open the Create tab and pick a format \u2014 post, image, video, or audio. I\u2019ll draft variations based on today\u2019s tasks and you can publish or save whatever lands.';
  }

  // 3) Results / performance
  if (has(/\b(result|reach|analytic|perform|track|working|success|grow|metric|engag)\b/)) {
    const items = (c.results && Array.isArray(c.results.items)) ? c.results.items : [];
    const published = items.filter(function (i) { return i && i.status && i.status !== 'draft'; }).length;
    if (published > 0) {
      return 'You\u2019ve shipped ' + published + (published === 1 ? ' piece' : ' pieces') + ' so far. The Results tab shows reach, engagement, and what\u2019s working.';
    }
    return 'Nothing published yet, so Results is quiet. Ship your first piece from Create and I\u2019ll start tracking reach and engagement.';
  }

  // 4) Business context recall
  if (has(/\b(business|about|remember|who am i|context|my company|my brand|recap|summary)\b/)) {
    const parts = [];
    if (b.type && b.type !== 'other') parts.push('a ' + b.type + ' business');
    if (b.reach === 'local') parts.push('serving a local crowd');
    else if (b.reach === 'online') parts.push('serving an online audience');
    if (b.challenge === 'retention') parts.push('focused on keeping the customers you already have');
    else parts.push('focused on finding new customers');
    if (b.product && b.product.length > 2 && !/services$/.test(b.product)) {
      parts.push('centered on ' + b.product);
    }
    if (parts.length === 0) {
      return 'Honestly, not much yet \u2014 tell me more about ' + name + ' and I\u2019ll tune everything to it.';
    }
    return 'Here\u2019s what I have on ' + name + ': ' + parts.join(', ') + '. Anything off?';
  }

  // 5) Meta / help
  if (has(/\b(help|how do|how does|what can|what should|guide|show me|tour|explain)\b/)) {
    return 'Three places to spend your time:\n\n\u2022 Today \u2014 the three things I want you working on\n\u2022 Create \u2014 turn those into a post, image, video, or audio\n\u2022 Results \u2014 what\u2019s actually landing\n\nWhich do you want to dig into?';
  }

  // 6) Greetings
  if (has(/^(hi|hello|hey|yo|sup|hola|hey clara|hey there|howdy)\b/)) {
    return 'Hey. What are we working on for ' + name + ' today?';
  }

  // 7) Thanks / acknowledgment
  if (has(/\b(thanks|thank you|ty|thx|cool|nice|awesome|got it|okay|ok)\b/) && text.length < 22) {
    return 'Anytime. Ping me if anything else comes up.';
  }

  // 8) Fallback \u2014 acknowledge and steer, referencing the concept.
  const fallbacks = [
    'Tell me a bit more \u2014 I can point you at Today, Create, or Results depending on where you want to spend the next 20 minutes.',
    'Got it. Do you want to work through a task, draft something new, or look at what\u2019s landed for ' + name + '?',
    'Say more. Everything I do here is scoped to ' + name + ', so give me a direction and I\u2019ll run with it.'
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

// ---------------------------------------------
// Contextual welcome message (seeds the thread on first open)
// ---------------------------------------------

function _buildGreeterMessage(b, name) {
  const typeLabels = {
    food: 'food',
    retail: 'retail',
    service: 'service',
    tech: 'tech',
    creative: 'creative',
    trades: 'trades',
    health: 'health',
    education: 'education'
  };

  const type = (b.type && b.type !== 'other') ? (typeLabels[b.type] || b.type) : '';
  const reach = b.reach === 'local'
    ? 'a local crowd'
    : (b.reach === 'online' ? 'an online audience' : '');
  const challenge = b.challenge === 'retention'
    ? 'keeping the customers you already have'
    : 'finding new customers';

  let opener;
  if (type && reach) {
    opener = 'Your workspace for ' + name + ' is set up around a ' + type + ' business serving ' + reach + '.';
  } else if (type) {
    opener = 'Your workspace for ' + name + ' is set up around a ' + type + ' business.';
  } else if (reach) {
    opener = 'Your workspace for ' + name + ' is set up around ' + reach + '.';
  } else {
    opener = 'Your workspace for ' + name + ' is set up.';
  }

  const focus = "Today's tasks lean into " + challenge + ".";
  const outro = 'Ask me anything about ' + name + ' \u2014 I\u2019ll stay scoped to this workspace.';

  return opener + ' ' + focus + ' ' + outro;
}

// ---------------------------------------------
// Sound: soft two-note synth chime via Web Audio API.
// ---------------------------------------------

function _playGreeterSound() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!_greeterAudioCtx) _greeterAudioCtx = new AC();
    const ctx = _greeterAudioCtx;

    if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
      ctx.resume().catch(function () {});
    }

    const now = ctx.currentTime;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.09, now + 0.02);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2400, now);
    filter.Q.setValueAtTime(0.7, now);

    const oscA = ctx.createOscillator();
    oscA.type = 'sine';
    oscA.frequency.setValueAtTime(880, now);
    oscA.frequency.exponentialRampToValueAtTime(1174, now + 0.12);

    const oscB = ctx.createOscillator();
    oscB.type = 'sine';
    oscB.frequency.setValueAtTime(1320, now + 0.08);

    const gainB = ctx.createGain();
    gainB.gain.setValueAtTime(0.0001, now + 0.06);
    gainB.gain.exponentialRampToValueAtTime(0.6, now + 0.11);
    gainB.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);

    oscA.connect(filter);
    oscB.connect(gainB);
    gainB.connect(filter);
    filter.connect(master);
    master.connect(ctx.destination);

    oscA.start(now);
    oscA.stop(now + 0.6);
    oscB.start(now + 0.06);
    oscB.stop(now + 0.55);
  } catch (err) {
    // Silently ignore \u2014 the panel still opens without sound.
  }
}

window._syncWorkspaceGreeter = _syncWorkspaceGreeter;
window._openWorkspaceGreeter = _openWorkspaceGreeter;
window._closeWorkspaceGreeter = _closeWorkspaceGreeter;
window._toggleWorkspaceGreeter = _toggleWorkspaceGreeter;
