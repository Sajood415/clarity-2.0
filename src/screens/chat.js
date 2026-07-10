// ---------------------------------------------
// Clarity 2.0 — Chat View (structured onboarding)
// ---------------------------------------------
//
// Clara now runs a 6-question onboarding as a step machine. State lives
// on the concept as `chat.onboardingStep` so refreshes / navigation away
// resume on the right step. The full flow:
//
//   opening  → CLARA_OPENING + ["Let's go", "Sure"]         (single-select)
//   q1       → CL_Q1_QUESTION + CL_OPTIONS_Q1               (single-select)
//   q1_other → CL_Q1_OTHER_QUESTION + text input            (free text)
//   q2       → CL_Q2_QUESTION + CL_OPTIONS_Q2               (single-select)
//   q3       → CL_Q3_QUESTION + text input                  (free text)
//   q4       → CL_Q4_QUESTION + CL_OPTIONS_Q4 + Done        (multi-select)
//   q6       → CL_Q6_QUESTION + text input                  (free text)
//   building → thinking indicator (3s)                      (transient)
//   done     → free chat, no options                        (terminal)
//
// Q5 (budget) is intentionally skipped for now — Clara will ask it later
// when she's actually recommending paid options.
//
// Rendering:
//   • Options render as .cl-options-row appended inside the chat log,
//     right after Clara's most recent question. Tapping an option turns
//     into a user bubble and dispatches the answer.
//   • Text-step input is the existing .cl-input-container in the docked
//     input bar — hidden during option steps so the tap targets are the
//     only affordance.
//   • The chat has no separate "initial hero" state anymore; the log
//     is always populated (Clara's opening is auto-appended after 600ms
//     for a brand-new concept).

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
  'background:rgba(245,166,35,0.2)',
  'border:1px solid rgba(245,166,35,0.32)',
  'border-radius:18px 18px 4px 18px',
  'padding:14px 20px',
  'font-size:15px',
  'color:#F5F0E8',
  'max-width:75%',
  'line-height:1.5',
  'word-wrap:break-word',
  'white-space:pre-wrap',
  'box-shadow:0 2px 16px rgba(245,166,35,0.14)'
].join(';') + ';';

const CL_BOUNCE_DOT_STYLE = 'display:inline-block;width:8px;height:8px;border-radius:50%;background:rgba(245,240,232,0.3);margin:0 3px;animation:cl-bounce 0.8s ease-in-out infinite;';

// ---------------------------------------------
// Entry
// ---------------------------------------------

function renderChat(container) {
  const chat = getChat();

  // Backfill for any concept that predates the step machine.
  if (!chat.onboardingStep) {
    chat.onboardingStep = chat.onboardingComplete ? 'done' : 'opening';
  }

  _renderChatShell(container);
  _paintExistingMessages();

  // Brand-new concept: bootstrap Clara's opening after a 600ms beat so
  // the entry feels like a real greeting instead of a cold form.
  if (chat.messages.length === 0 && chat.onboardingStep === 'opening') {
    _renderInputBarForStep('opening');
    setTimeout(function () {
      if (appState.mode !== 'home' || appState.activeView !== 'chat') return;
      _claraSay(CLARA_OPENING);
      _renderStepUI();
    }, 600);
    return;
  }

  // Recovering mid-flow after a reload: 'building' isn't safe to resume
  // (the 3s timer is gone), so fall back to 'done' + finalize.
  if (chat.onboardingStep === 'building') {
    _completeOnboardingNow();
    return;
  }

  _renderStepUI();
}

// ---------------------------------------------
// Layout / painting
// ---------------------------------------------

function _renderChatShell(container) {
  const rootStyle = [
    'min-height:calc(100vh - 44px)',
    'display:flex',
    'flex-direction:column',
    'background:radial-gradient(ellipse at 50% 0%, #1e1508 0%, #0F0D0B 50%)'
  ].join(';') + ';';

  container.innerHTML = `
    <div class="cl-onboarding cl-chat-state" id="clOnboarding" style="${rootStyle}">
      <main class="cl-chat-area" id="clChatArea"></main>
      <div class="cl-input-bar" id="clInputBar"></div>
    </div>
  `;
}

function _paintExistingMessages() {
  const chatArea = document.getElementById('clChatArea');
  if (!chatArea) return;
  const messages = getChat().messages || [];
  messages.forEach(function (m) {
    chatArea.appendChild(_buildMessageEl(m.role, m.text, false));
  });
  _scrollChatToBottom();
}

function _renderStepUI() {
  const step = getChat().onboardingStep;
  _renderOptionsForStep(step);
  _renderInputBarForStep(step);
  _scrollChatToBottom();
}

// ---------------------------------------------
// Option rows (single / multi select)
// ---------------------------------------------

function _clearOptionsRow() {
  const el = document.getElementById('clOptionsRow');
  if (el && el.parentNode) el.parentNode.removeChild(el);
}

function _renderOptionsForStep(step) {
  _clearOptionsRow();
  const chatArea = document.getElementById('clChatArea');
  if (!chatArea) return;

  if (step === 'opening') {
    _appendOptionsRow('single', CL_OPTIONS_OPENING);
  } else if (step === 'q1') {
    _appendOptionsRow('single', CL_OPTIONS_Q1);
  } else if (step === 'q2') {
    _appendOptionsRow('single', CL_OPTIONS_Q2);
  } else if (step === 'q4') {
    _appendOptionsRow('multi', CL_OPTIONS_Q4);
  }
}

function _appendOptionsRow(kind, labels) {
  const chatArea = document.getElementById('clChatArea');
  if (!chatArea) return;

  const row = document.createElement('div');
  row.className = 'cl-options-row';
  row.id = 'clOptionsRow';
  row.setAttribute('data-kind', kind);

  labels.forEach(function (label) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = kind === 'multi' ? 'cl-option-btn cl-option-btn-multi' : 'cl-option-btn';
    btn.setAttribute('data-label', label);
    btn.textContent = label;
    btn.addEventListener('click', function () {
      _onOptionTap(kind, label);
    });
    row.appendChild(btn);
  });

  // Multi-select needs an inline "Done →" commit button. Wrapped so it
  // always drops to its own line below the options via flex-basis 100%.
  if (kind === 'multi') {
    const wrap = document.createElement('div');
    wrap.className = 'cl-options-done-wrap';
    wrap.id = 'clOptionsDoneWrap';
    wrap.style.display = 'none';

    const done = document.createElement('button');
    done.type = 'button';
    done.className = 'cl-options-done-btn';
    done.id = 'clOptionsDone';
    done.textContent = 'Done →';
    done.addEventListener('click', _onMultiDone);
    wrap.appendChild(done);
    row.appendChild(wrap);
  }

  chatArea.appendChild(row);

  // Restore any in-flight multi-select highlights (e.g. after reload).
  if (kind === 'multi') {
    _refreshMultiHighlights();
    _updateMultiDone();
  }
}

function _onOptionTap(kind, label) {
  if (kind === 'single') {
    _commitSingleAnswer(label);
    return;
  }
  // Multi (Q4) — toggle in pendingChannels; "Not marketing yet" is an
  // exclusive escape option.
  const chat = getChat();
  const pending = (chat.pendingChannels || []).slice();
  const isEscape = label === CL_Q4_ESCAPE;
  const escapeIdx = pending.indexOf(CL_Q4_ESCAPE);
  const idx = pending.indexOf(label);

  if (isEscape) {
    chat.pendingChannels = idx === -1 ? [label] : [];
  } else {
    if (idx !== -1) {
      pending.splice(idx, 1);
    } else {
      if (escapeIdx !== -1) pending.splice(escapeIdx, 1);
      pending.push(label);
    }
    chat.pendingChannels = pending;
  }
  _saveState();
  _refreshMultiHighlights();
  _updateMultiDone();
}

function _refreshMultiHighlights() {
  const row = document.getElementById('clOptionsRow');
  if (!row) return;
  const pending = getChat().pendingChannels || [];
  Array.prototype.slice.call(row.querySelectorAll('.cl-option-btn')).forEach(function (b) {
    const lbl = b.getAttribute('data-label');
    if (pending.indexOf(lbl) !== -1) b.classList.add('cl-option-btn-selected');
    else b.classList.remove('cl-option-btn-selected');
  });
}

function _updateMultiDone() {
  const wrap = document.getElementById('clOptionsDoneWrap');
  if (!wrap) return;
  const pending = getChat().pendingChannels || [];
  wrap.style.display = pending.length > 0 ? 'block' : 'none';
}

function _onMultiDone() {
  const chat = getChat();
  if (chat.onboardingStep !== 'q4') return;
  const pending = (chat.pendingChannels || []).slice();
  if (pending.length === 0) return;

  const isEscapeOnly = pending.length === 1 && pending[0] === CL_Q4_ESCAPE;
  const channels = isEscapeOnly ? [] : pending.slice();

  const business = getBusiness();
  business.channels = channels;
  business.reach = _inferReach(channels);
  chat.pendingChannels = [];

  _clearOptionsRow();
  // The user's selection is echoed as a single amber bubble so the log
  // reads like a real message-and-reply exchange.
  const displayText = pending.join(', ');
  chat.messages.push({ role: 'user', text: displayText });
  _saveState();
  _appendMessage('user', displayText);

  _advanceStep('q6');
  _claraQueue([_q4Ack(channels), CL_Q6_QUESTION], _renderStepUI);
}

// ---------------------------------------------
// Single-select answer dispatch
// ---------------------------------------------

function _commitSingleAnswer(label) {
  _clearOptionsRow();
  const chat = getChat();
  chat.messages.push({ role: 'user', text: label });
  _saveState();
  _appendMessage('user', label);

  const step = chat.onboardingStep;
  if (step === 'opening') {
    // Both "Let's go" and "Sure" go to Q1.
    _advanceStep('q1');
    _claraQueue([CL_Q1_QUESTION], _renderStepUI);
    return;
  }

  if (step === 'q1') {
    const typeKey = CL_Q1_TYPE_MAP[label] || 'other';
    getBusiness().type = typeKey;
    _saveState();
    if (typeKey === 'other') {
      _advanceStep('q1_other');
      _claraQueue([CL_Q1_OTHER_QUESTION], _renderStepUI);
    } else {
      _advanceStep('q2');
      _claraQueue([CL_Q1_ACK[typeKey], CL_Q2_QUESTION], _renderStepUI);
    }
    return;
  }

  if (step === 'q2') {
    getBusiness().goal = label;
    _saveState();
    _advanceStep('q3');
    const ack = CL_Q2_ACK[label] || "Got it.";
    _claraQueue([ack, CL_Q3_QUESTION], _renderStepUI);
    return;
  }
}

// ---------------------------------------------
// Input bar (text steps + hidden during option steps)
// ---------------------------------------------

function _isTextStep(step) {
  return step === 'q1_other' || step === 'q3' || step === 'q6' || step === 'done';
}

function _placeholderForStep(step) {
  if (step === 'q1_other') return 'Tell Clara a bit about what you do...';
  if (step === 'q3') return CL_Q3_PLACEHOLDER;
  if (step === 'q6') return CL_Q6_PLACEHOLDER;
  return 'Message Clara...';
}

function _renderInputBarForStep(step) {
  const bar = document.getElementById('clInputBar');
  if (!bar) return;

  if (step === 'building') {
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
    return;
  }

  if (!_isTextStep(step)) {
    // Options step — no textarea. Keep the bar element so `_flashInputError`
    // etc. always have somewhere to attach hints if we ever need them.
    bar.innerHTML = '';
    return;
  }

  const disclaimerStyle = 'max-width:640px;margin:10px auto 0;text-align:center;font-size:11px;color:rgba(245,240,232,0.18);line-height:1.4;';
  bar.innerHTML = `
    ${_renderInputContainerHtml()}
    <div class="cl-disclaimer" style="${disclaimerStyle}">Clara may make mistakes. Always verify important decisions.</div>
  `;

  const input = document.getElementById('clInput');
  if (input) input.placeholder = _placeholderForStep(step);

  _bindInputEvents();
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

// ---------------------------------------------
// Text step handler
// ---------------------------------------------

// Per-step minimum content length. "UK" is fine for location; "Local
// families who want fresh sourdough" is a much lower bar for Q3.
const CL_TEXT_MIN = { q1_other: 3, q3: 8, q6: 2 };

function _handleSend() {
  const input = document.getElementById('clInput');
  const btn = document.getElementById('clSendBtn');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;

  const chat = getChat();
  const step = chat.onboardingStep;

  const minLen = CL_TEXT_MIN[step];
  if (typeof minLen === 'number' && text.length < minLen) {
    _flashInputError('Give Clara a bit more to work with.');
    return;
  }

  input.value = '';
  input.style.height = 'auto';
  if (btn) btn.disabled = true;

  chat.messages.push({ role: 'user', text: text });
  _saveState();
  _appendMessage('user', text);

  if (step === 'q1_other') {
    getBusiness().typeDescription = text;
    _saveState();
    _advanceStep('q2');
    _claraQueue([CL_Q1_OTHER_ACK, CL_Q2_QUESTION], _renderStepUI);
    return;
  }

  if (step === 'q3') {
    const business = getBusiness();
    business.customer = text;
    business.product = _extractProduct(text);
    _saveState();
    _advanceStep('q4');
    // Q3 → Q4 uses the spec's two-beat ack: warm nod, tiny pause, then
    // the "one more" bridge and the actual next question.
    _claraQueue([CL_Q3_ACK_1, CL_Q3_ACK_2, CL_Q4_QUESTION], _renderStepUI);
    return;
  }

  if (step === 'q6') {
    getBusiness().location = text;
    _saveState();
    _advanceStep('building');
    _claraQueue([CL_Q6_ACK], _startBuildingPlan);
    return;
  }

  // Any other step (post-onboarding 'done'): message is captured, but
  // Clara has no follow-up logic yet — matches pre-rebuild behavior.
}

// ---------------------------------------------
// Product extraction (Q3 side-effect)
// ---------------------------------------------

function _extractProduct(text) {
  // Look for a phrase right after any of: sell(s|ing), offer(s|ing),
  // make(s|ing), provide(s|ing), specialis[ez]e in. First hit wins, then
  // trim to 6 words. This is deliberately shallow — Clara's task copy
  // reads better with a short noun phrase than a full clause.
  const m = String(text || '').match(
    /(?:\bsell(?:s|ing)?\b|\boffer(?:s|ing)?\b|\bmake(?:s|ing)?\b|\bprovide(?:s|ing)?\b|\bspecialis[ez]e\s+in\b)\s+([^.,;!?\n]+)/i
  );
  if (!m) return '';
  return m[1]
    .trim()
    .split(/\s+/)
    .slice(0, 6)
    .join(' ');
}

// ---------------------------------------------
// Clara message queueing
// ---------------------------------------------

// Sequential Clara messages with thinking-dot beats between each so the
// chat feels like a person composing, not a form dropping copy. Runs
// each message with an animated dot, then the message with fade-up, then
// a 350ms breather before the next. Bails out cleanly if the user
// navigates away between beats.
function _claraQueue(messages, done) {
  let i = 0;
  function step() {
    if (appState.mode !== 'home' || appState.activeView !== 'chat') return;
    if (i >= messages.length) {
      if (typeof done === 'function') done();
      return;
    }
    _showThinkingBubble();
    setTimeout(function () {
      if (appState.mode !== 'home' || appState.activeView !== 'chat') return;
      _removeThinkingBubble();
      _claraSay(messages[i]);
      i++;
      setTimeout(step, 350);
    }, 700);
  }
  step();
}

function _advanceStep(next) {
  const chat = getChat();
  chat.onboardingStep = next;
  _saveState();
}

// ---------------------------------------------
// Final "building your plan" transition
// ---------------------------------------------

function _startBuildingPlan() {
  _renderInputBarForStep('building');
  setTimeout(_completeOnboardingNow, 3000);
}

function _completeOnboardingNow() {
  const chat = getChat();
  chat.onboardingComplete = true;
  chat.onboardingStep = 'done';
  appState.activeView = 'chat';
  window._justUnlockedConcept = true;
  chat.messages.push({
    role: 'clara',
    text: 'Your workspace is ready. Open it from the top-right when you want to see today\u2019s tasks and start creating.'
  });
  _saveState();
  renderApp();
}

// ---------------------------------------------
// Message primitives (append / scroll / thinking)
// ---------------------------------------------

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
  // If options are currently visible, insert the thinking bubble BEFORE
  // them so the visual order is: last user reply → Clara thinking →
  // (next options will replace the thinking bubble anyway).
  const options = document.getElementById('clOptionsRow');
  const bubble = _buildThinkingBubbleEl();
  if (options) chat.insertBefore(bubble, options);
  else chat.appendChild(bubble);
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

function _flashInputError(hint) {
  const container = document.querySelector('.cl-input-container');
  if (!container) return;
  container.classList.remove('cl-input-error');
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
  // Insert new messages BEFORE the options row so the log stays in
  // chronological order (user reply above, options remain anchored to
  // the most recent Clara question below).
  const options = document.getElementById('clOptionsRow');
  const el = _buildMessageEl(role, text, true);
  if (options) chat.insertBefore(el, options);
  else chat.appendChild(el);
  _scrollChatToBottom();
}

function _claraSay(text) {
  const chat = getChat();
  chat.messages.push({ role: 'clara', text: text });
  _saveState();
  _appendMessage('clara', text);
}

window.renderChat = renderChat;
