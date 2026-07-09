// ---------------------------------------------
// Clarity 2.0 — Chat View
// ---------------------------------------------
//
// Clara's conversation for the active concept. It has two visual states:
//
//   1. EMPTY (concept.chat.messages.length === 0)
//      → centered hero question ("Tell me about your business.")
//        + input in the middle + starter chips below
//
//   2. POPULATED
//      → scrollable chat log
//        + input bar pinned to the bottom of the view
//
// Sending the first message triggers a FLIP animation from the centered
// input to the docked input. Clara's 3-question onboarding runs entirely
// here; the moment she's done, we flip `chat.onboardingComplete = true`
// and switch the active view to `today`.

const CL_GROUP_BASE_STYLE = 'max-width:640px;margin:0 auto 28px;width:100%;padding:0 20px;';
const CL_GROUP_CLARA_STYLE = CL_GROUP_BASE_STYLE + 'display:flex;flex-direction:row;align-items:flex-start;gap:12px;';
const CL_GROUP_USER_STYLE = CL_GROUP_BASE_STYLE + 'display:flex;justify-content:flex-end;';

const CL_AVATAR_STYLE = [
  'width:32px', 'height:32px', 'border-radius:50%',
  'background:linear-gradient(135deg, #F5A623 0%, #D4860A 100%)',
  'color:#000', 'display:flex', 'align-items:center', 'justify-content:center',
  'flex-shrink:0',
  'font-size:13px', 'font-weight:700',
  'margin-top:2px',
  'box-shadow:0 2px 12px rgba(245,166,35,0.3)'
].join(';') + ';';

const CL_CLARA_TEXT_STYLE = [
  'background:transparent',
  'border:none',
  'border-radius:0',
  'padding:0',
  'font-size:16px',
  'color:#F5F0E8',
  'line-height:1.75',
  'flex:1',
  'max-width:none',
  'word-wrap:break-word',
  'white-space:pre-wrap'
].join(';') + ';';

const CL_USER_TEXT_STYLE = [
  'background:rgba(245,166,35,0.12)',
  'border:1px solid rgba(245,166,35,0.2)',
  'border-radius:18px 18px 4px 18px',
  'padding:14px 20px',
  'font-size:15px',
  'color:#F5F0E8',
  'max-width:75%',
  'line-height:1.5',
  'word-wrap:break-word',
  'white-space:pre-wrap',
  'box-shadow:0 2px 12px rgba(245,166,35,0.1)'
].join(';') + ';';

const CL_BOUNCE_DOT_STYLE = 'display:inline-block;width:8px;height:8px;border-radius:50%;background:rgba(245,240,232,0.3);margin:0 3px;animation:cl-bounce 0.8s ease-in-out infinite;';

// The Chat view is called by the router with the home content container.
function renderChat(container) {
  const chat = getChat();
  if (!chat.messages || chat.messages.length === 0) {
    _renderInitialState(container);
  } else {
    _renderChatState(container, { animateLast: false });
    _resumeConversation();
  }
}

function _renderInitialState(container) {
  const business = getBusiness();
  const preName = (business.name && business.name.trim()) ? business.name.trim() : '';
  const heroTitle = preName
    ? 'Tell me about ' + _escape(preName) + '.'
    : 'Tell me about your business.';
  const heroSub = preName
    ? 'What does it do, and what are you trying to achieve?'
    : 'What are you trying to achieve right now?';

  const outerStyle = [
    'min-height:calc(100vh - 40px)', 'padding:0',
    'display:flex', 'flex-direction:column',
    'align-items:center', 'justify-content:center',
    'background:radial-gradient(ellipse at 50% 35%, #261c08 0%, #0F0D0B 60%)',
    'position:relative', 'overflow:hidden'
  ].join(';') + ';';

  const blob1Style = 'position:absolute;width:600px;height:600px;border-radius:50%;background:rgba(245,166,35,0.07);filter:blur(140px);top:-150px;left:50%;transform:translateX(-50%);pointer-events:none;z-index:0;';
  const blob2Style = 'position:absolute;width:300px;height:300px;border-radius:50%;background:rgba(232,132,90,0.05);filter:blur(100px);bottom:50px;right:5%;pointer-events:none;z-index:0;';
  const blob3Style = 'position:absolute;width:200px;height:200px;border-radius:50%;background:rgba(245,166,35,0.04);filter:blur(80px);bottom:100px;left:5%;pointer-events:none;z-index:0;';

  const contentStyle = 'position:relative;z-index:1;max-width:660px;margin:0 auto;padding:0 24px;display:flex;flex-direction:column;align-items:center;width:100%;';

  const questionBlockStyle = 'width:100%;max-width:600px;margin:0 auto 40px;display:flex;flex-direction:column;align-items:center;text-align:center;opacity:0;animation:cl-init-fade-in 500ms cubic-bezier(0.2,0.7,0.2,1) 150ms forwards;';

  const avatarStyle = [
    'width:32px', 'height:32px', 'border-radius:50%',
    'background:linear-gradient(135deg, #F5A623 0%, #D4860A 100%)',
    'display:flex', 'align-items:center', 'justify-content:center',
    'flex-shrink:0',
    'color:#000', 'font-size:13px', 'font-weight:700', 'line-height:1',
    'box-shadow:0 2px 12px rgba(245,166,35,0.3)',
    'margin-bottom:16px'
  ].join(';') + ';';

  const questionStyle = 'font-size:32px;font-weight:700;color:#F5F0E8;letter-spacing:-0.02em;line-height:1.2;text-align:center;';
  const followupStyle = 'font-size:20px;font-weight:400;color:rgba(245,240,232,0.5);line-height:1.4;margin-top:8px;text-align:center;';

  const inputBarStyle = 'width:100%;padding:0;margin:0;display:flex;justify-content:center;';

  const chipsRowStyle = 'margin-top:20px;display:flex;flex-wrap:wrap;gap:8px;justify-content:center;max-width:600px;width:100%;margin-left:auto;margin-right:auto;';
  const chipStyle = 'background:rgba(255,240,220,0.04);border:1px solid rgba(255,240,220,0.08);border-radius:24px;padding:10px 20px;font-size:13px;color:rgba(245,240,232,0.5);cursor:pointer;transition:all 200ms ease;font-family:inherit;';

  container.innerHTML = `
    <div class="cl-onboarding cl-initial-state" id="clOnboarding" style="${outerStyle}">
      <div style="${blob1Style}"></div>
      <div style="${blob2Style}"></div>
      <div style="${blob3Style}"></div>
      <div style="${contentStyle}">
        <div class="cl-greeting" style="${questionBlockStyle}">
          <div class="cl-init-avatar" style="${avatarStyle}">C</div>
          <div style="${questionStyle}">${heroTitle}</div>
          <div style="${followupStyle}">${heroSub}</div>
        </div>
        <div class="cl-input-bar" id="clInputBar" style="${inputBarStyle}">
          ${_renderInputContainerHtml()}
        </div>
        <div class="cl-chips-row" style="${chipsRowStyle}">
          ${CL_STARTER_CHIPS.map(function (c) {
            return '<button type="button" class="cl-chip cl-init-chip" style="' + chipStyle + '">' + _escape(c) + '</button>';
          }).join('')}
        </div>
      </div>
    </div>
  `;

  const initialContainer = container.querySelector('.cl-initial-state .cl-input-container');
  if (initialContainer) {
    initialContainer.style.maxWidth = '600px';
    initialContainer.style.width = '100%';
    initialContainer.style.margin = '0 auto';
    initialContainer.style.background = 'rgba(28,24,20,0.95)';
    initialContainer.style.border = '1px solid rgba(255,240,220,0.12)';
    initialContainer.style.borderRadius = '20px';
    initialContainer.style.boxShadow = '0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(245,166,35,0.06)';
    initialContainer.style.padding = '16px 16px 16px 20px';
    initialContainer.style.display = 'flex';
    initialContainer.style.alignItems = 'flex-end';
    initialContainer.style.gap = '12px';
    initialContainer.style.backdropFilter = 'blur(20px)';
    initialContainer.style.webkitBackdropFilter = 'blur(20px)';
  }

  _bindInputEvents();
  _bindStarterChips();
}

function _renderChatState(container, opts) {
  const animateLast = !!(opts && opts.animateLast);

  const rootStyle = [
    'min-height:calc(100vh - 40px)',
    'display:flex',
    'flex-direction:column',
    'background:radial-gradient(ellipse at 50% 0%, #1e1508 0%, #0F0D0B 50%)'
  ].join(';') + ';';

  const watermarkStyle = [
    'font-size:11px',
    'font-weight:600',
    'color:rgba(245,166,35,0.12)',
    'letter-spacing:0.25em',
    'text-transform:uppercase',
    'padding-top:20px',
    'padding-bottom:16px',
    'text-align:center',
    'flex-shrink:0'
  ].join(';') + ';';

  const disclaimerStyle = 'max-width:640px;margin:10px auto 0;text-align:center;font-size:11px;color:rgba(245,240,232,0.18);line-height:1.4;';

  container.innerHTML = `
    <div class="cl-onboarding cl-chat-state" id="clOnboarding" style="${rootStyle}">
      <div class="cl-watermark" style="${watermarkStyle}">Clarity</div>
      <main class="cl-chat-area" id="clChatArea"></main>
      <div class="cl-input-bar" id="clInputBar">
        ${_renderInputContainerHtml()}
        <div class="cl-disclaimer" style="${disclaimerStyle}">Clara may make mistakes. Always verify important decisions.</div>
      </div>
    </div>
  `;

  const chatArea = document.getElementById('clChatArea');
  const messages = getChat().messages || [];
  messages.forEach(function (m, i) {
    const isLast = i === messages.length - 1;
    chatArea.appendChild(_buildMessageEl(m.role, m.text, animateLast && isLast));
  });

  _bindInputEvents();
  _scrollChatToBottom();
}

function _renderInputContainerHtml() {
  return `
    <div class="cl-input-container">
      <button type="button" class="cl-attach-btn" id="clAttachBtn" aria-label="Attach file">
        ${CL_ATTACH_ICON_SVG}
        <span class="cl-attach-tooltip">Attach file</span>
      </button>
      <textarea
        class="cl-input"
        id="clInput"
        placeholder="Message Clara..."
        rows="1"
        autocomplete="off"
      ></textarea>
      <button type="button" class="cl-send-btn" id="clSendBtn" disabled aria-label="Send">
        ${CL_SEND_ARROW_SVG}
      </button>
    </div>
  `;
}

function _bindInputEvents() {
  const input = document.getElementById('clInput');
  const btn = document.getElementById('clSendBtn');
  if (!input || !btn) return;

  input.focus();

  const refreshDisabled = function () {
    btn.disabled = input.value.trim() === '';
  };

  const autoGrow = function () {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 150) + 'px';
  };

  input.addEventListener('input', function () {
    autoGrow();
    refreshDisabled();
  });

  btn.addEventListener('click', _handleSend);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.value.trim() === '') return;
      _handleSend();
    }
  });
}

function _bindStarterChips() {
  document.querySelectorAll('.cl-chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      const input = document.getElementById('clInput');
      if (!input) return;
      input.value = chip.textContent || '';
      input.focus();
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  });
}

function _buildMessageEl(role, text, animate) {
  const group = document.createElement('div');
  group.className = 'cl-msg-group cl-msg-' + role;
  group.setAttribute('style', role === 'clara' ? CL_GROUP_CLARA_STYLE : CL_GROUP_USER_STYLE);

  if (role === 'clara') {
    const avatar = document.createElement('div');
    avatar.className = 'cl-avatar';
    avatar.setAttribute('style', CL_AVATAR_STYLE);
    avatar.textContent = 'C';
    group.appendChild(avatar);

    const textEl = document.createElement('div');
    textEl.className = 'cl-clara-text';
    textEl.setAttribute('style', CL_CLARA_TEXT_STYLE);
    textEl.textContent = text;
    group.appendChild(textEl);
  } else {
    const textEl = document.createElement('div');
    textEl.className = 'cl-user-text';
    textEl.setAttribute('style', CL_USER_TEXT_STYLE);
    textEl.textContent = text;
    group.appendChild(textEl);
  }

  if (!animate) {
    group.style.animation = 'none';
  }
  return group;
}

function _buildThinkingBubbleEl() {
  const group = document.createElement('div');
  group.className = 'cl-msg-group cl-msg-clara';
  group.id = 'clThinkingBubble';
  group.setAttribute('style', CL_GROUP_CLARA_STYLE);

  const avatar = document.createElement('div');
  avatar.className = 'cl-avatar';
  avatar.setAttribute('style', CL_AVATAR_STYLE);
  avatar.textContent = 'C';
  group.appendChild(avatar);

  const textEl = document.createElement('div');
  textEl.className = 'cl-clara-text';
  textEl.setAttribute('style', CL_CLARA_TEXT_STYLE);
  textEl.innerHTML =
    '<span class="cl-bounce-dots" style="display:inline-flex;align-items:center;height:20px;">'
    + '<span class="cl-bounce-dot" style="' + CL_BOUNCE_DOT_STYLE + '"></span>'
    + '<span class="cl-bounce-dot" style="' + CL_BOUNCE_DOT_STYLE + 'animation-delay:0.15s;"></span>'
    + '<span class="cl-bounce-dot" style="' + CL_BOUNCE_DOT_STYLE + 'animation-delay:0.3s;"></span>'
    + '</span>';
  group.appendChild(textEl);

  return group;
}

function _showThinkingBubble() {
  const chat = document.getElementById('clChatArea');
  if (!chat) return;
  if (document.getElementById('clThinkingBubble')) return;
  chat.appendChild(_buildThinkingBubbleEl());
  _scrollChatToBottom();
}

function _removeThinkingBubble() {
  const el = document.getElementById('clThinkingBubble');
  if (el && el.parentNode) el.parentNode.removeChild(el);
}

function _scrollChatToBottom() {
  const area = document.getElementById('clChatArea');
  if (area) area.scrollTop = area.scrollHeight;
}

// Flash the input red + shake and show a transient hint. Non-blocking:
// caller just returns after invoking. Used to reject too-short onboarding
// answers without a modal.
function _flashInputError(hint) {
  const container = document.querySelector('.cl-input-container');
  if (!container) return;
  container.classList.remove('cl-input-error');
  // Force reflow so re-adding the class replays the animation.
  void container.offsetWidth;
  container.classList.add('cl-input-error');

  let hintEl = document.getElementById('clInputHint');
  if (!hintEl) {
    hintEl = document.createElement('div');
    hintEl.id = 'clInputHint';
    hintEl.className = 'cl-input-hint';
    const bar = document.getElementById('clInputBar');
    const parent = bar || container.parentNode;
    if (parent) parent.appendChild(hintEl);
  }
  hintEl.textContent = hint || 'Please give a real answer.';
  hintEl.classList.add('cl-input-hint-show');

  clearTimeout(_flashInputError._t1);
  clearTimeout(_flashInputError._t2);
  _flashInputError._t1 = setTimeout(function () {
    container.classList.remove('cl-input-error');
  }, 700);
  _flashInputError._t2 = setTimeout(function () {
    if (hintEl && hintEl.parentNode) hintEl.classList.remove('cl-input-hint-show');
  }, 2200);
}

function _appendMessage(role, text) {
  const chat = document.getElementById('clChatArea');
  if (!chat) return;
  chat.appendChild(_buildMessageEl(role, text, true));
  _scrollChatToBottom();
}

function _claraSay(text) {
  const chat = getChat();
  chat.messages.push({ role: 'clara', text: text });
  _saveState();
  _appendMessage('clara', text);
}

function _handleSend() {
  const input = document.getElementById('clInput');
  const btn = document.getElementById('clSendBtn');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;

  const chat = getChat();

  // Onboarding needs real answers. Reject one- and two-character noise
  // ("k", "ok", ".") so Clara doesn't burn a question on a shrug.
  if (!chat.onboardingComplete && text.length < 3) {
    _flashInputError('Give Clara a bit more to work with.');
    return;
  }

  input.value = '';
  input.style.height = 'auto';
  if (btn) btn.disabled = true;

  const wasInitial = (chat.messages || []).length === 0;
  chat.messages.push({ role: 'user', text: text });

  const userMsgCount = chat.messages.filter(function (m) { return m.role === 'user'; }).length;
  const business = getBusiness();

  if (userMsgCount === 1) {
    const ctx = _extractBusinessContext(text);
    // Only take an extracted name if we don't already have one from the
    // "New concept" modal. Keeps user-provided names authoritative.
    if (!business.name || !business.name.trim()) business.name = ctx.name;
    business.type = ctx.type;
    business.product = ctx.product;
    business.goal = ctx.goal;
  } else if (userMsgCount === 2) {
    business.reach = _detectReach(text);
  } else if (userMsgCount === 3) {
    business.challenge = _detectChallenge(text);
  }

  _saveState();

  if (wasInitial) {
    _transitionToChatState();
    return;
  }

  _appendMessage('user', text);
  _resumeConversation();
}

function _transitionToChatState() {
  const container = document.getElementById('clOnboarding');
  const homeContent = document.getElementById('homeContent');
  if (!container || !homeContent) {
    _renderChatState(homeContent || document.getElementById('app'), { animateLast: true });
    _resumeConversation();
    return;
  }

  const greeting = container.querySelector('.cl-greeting');
  const chips = container.querySelector('.cl-chips-row');
  const oldInput = container.querySelector('.cl-input-container');
  const oldRect = oldInput ? oldInput.getBoundingClientRect() : null;

  if (greeting) greeting.classList.add('cl-fade-out');
  if (chips) chips.classList.add('cl-fade-out');

  setTimeout(function () {
    if (appState.mode !== 'home' || appState.activeView !== 'chat') return;
    _renderChatState(document.getElementById('homeContent'), { animateLast: true });

    const newInput = document.querySelector('.cl-input-container');
    if (newInput && oldRect) {
      const newRect = newInput.getBoundingClientRect();
      const deltaY = oldRect.top - newRect.top;
      if (Math.abs(deltaY) > 1) {
        newInput.style.transform = 'translateY(' + deltaY + 'px)';
        newInput.style.transition = 'none';
        void newInput.offsetHeight;
        newInput.style.transition = 'transform 250ms ease';
        newInput.style.transform = 'translateY(0)';
        setTimeout(function () {
          newInput.style.transition = '';
          newInput.style.transform = '';
        }, 280);
      }
    }

    _resumeConversation();
  }, 200);
}

function _resumeConversation() {
  if (appState.mode !== 'home' || appState.activeView !== 'chat') return;
  const chat = getChat();
  if (chat.onboardingComplete) return; // already done — user is just browsing chat

  const messages = chat.messages || [];
  const userMsgCount = messages.filter(function (m) { return m.role === 'user'; }).length;
  const claraMsgCount = messages.filter(function (m) { return m.role === 'clara'; }).length;

  if (userMsgCount === 1 && claraMsgCount === 0) {
    _showThinkingBubble();
    setTimeout(function () {
      if (appState.activeView !== 'chat') return;
      _removeThinkingBubble();
      _claraSay(CLARA_SECOND);
    }, 800);
  } else if (userMsgCount === 2 && claraMsgCount === 1) {
    _showThinkingBubble();
    setTimeout(function () {
      if (appState.activeView !== 'chat') return;
      _removeThinkingBubble();
      _claraSay(_claraChallengeQuestion(getBusiness().type));
    }, 800);
  } else if (userMsgCount === 3 && claraMsgCount === 2) {
    _showThinkingBubble();
    setTimeout(function () {
      if (appState.activeView !== 'chat') return;
      _removeThinkingBubble();
      _claraSay(CLARA_FINAL);
      // Give the "give me a moment" line a beat to read, then flip the
      // input bar into the thinking state so there's no dead space.
      setTimeout(function () {
        if (appState.activeView !== 'chat') return;
        _startThinking();
      }, 400);
    }, 800);
  } else if (userMsgCount === 3 && claraMsgCount === 3 && !chat.onboardingComplete) {
    _startThinking();
  }
}

function _startThinking() {
  const bar = document.getElementById('clInputBar');
  if (!bar) return;
  bar.innerHTML = `
    <div class="cl-thinking">
      <span class="cl-thinking-dots">
        <span class="cl-dot"></span>
        <span class="cl-dot"></span>
        <span class="cl-dot"></span>
      </span>
      <div class="cl-thinking-label">Clara is building your plan...</div>
    </div>
  `;

  setTimeout(function () {
    const chat = getChat();
    chat.onboardingComplete = true;
    // Land on Overview so the user sees the whole concept at a glance
    // (today's tasks + create + results tiles) instead of being dropped
    // into a raw task list.
    appState.activeView = 'overview';
    _saveState();
    renderApp();
  }, 3000);
}

window.renderChat = renderChat;
