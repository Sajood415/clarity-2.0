// ---------------------------------------------
// Clarity 2.0 — Chat View (structured onboarding)
// ---------------------------------------------
//
// Clara now runs a 6-question onboarding as a step machine. State lives
// on the concept as `chat.onboardingStep` so refreshes / navigation away
// resume on the right step. The full flow:
//
//   opening      → CLARA_OPENING + ["Let's go", "Sure"]         (single-select)
//   q1           → CL_Q1_QUESTION + CL_OPTIONS_Q1               (single-select)
//   q1_other     → CL_Q1_OTHER_QUESTION + text input            (free text)
//   q2           → CL_Q2_QUESTION + CL_OPTIONS_Q2               (single-select)
//   q3           → CL_Q3_QUESTION + text input                  (free text)
//   q4           → CL_Q4_QUESTION + CL_OPTIONS_Q4 + Done        (multi-select)
//   q5           → CL_Q5_QUESTION + CL_OPTIONS_Q5               (single-select)
//   q6           → CL_Q6_QUESTION + text input                  (free text)
//   building     → thinking indicator (3s)                      (transient)
//   validate     → customer read-back + Yes/Fix options         (single-select)
//   validate_fix → "tell me more" text input                    (free text)
//   done         → free chat, no options                        (terminal)
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

// Vertical spacing between message groups. 18px is the "new turn" gap;
// 6px is the "same speaker still talking" gap, applied via opts.continued
// in _buildMessageEl. This is what makes a burst like "Got it. / A couple
// more quick ones. / Where are you marketing?" read as one thought
// instead of three separate replies.
// Margin split intentionally: `margin: 0 auto 18px` collapses to
// margin-top:0 which INLINE overrides the CSS rule
//   `.cl-chat-area > *:first-child { margin-top: auto }`
// meant to push a lone message to the bottom of the chat area. We
// break out margin-left/right/bottom so CSS can still set margin-top
// on first-child \u2014 critical for the onboarding overlay where the
// viewport is otherwise a big empty rectangle above Clara's greeting.
const CL_GROUP_BASE_STYLE = 'max-width:760px;margin-left:auto;margin-right:auto;margin-bottom:18px;width:100%;padding:0 20px;';
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

// After the modal onboarding restructure, chat.js only renders in one
// context: the Chat nav item. Async continuations (thinking dots,
// queued Clara messages) should abort the moment the user navigates
// away from Chat. Onboarding-overlay context no longer routes through
// this file \u2014 that lives in screens/onboardingModal.js now.
function _chatStillMounted() {
  return appState.mode === 'home' && appState.activeView === 'chat';
}

function renderChat(container) {
  const chat = getChat();

  // Backfill for any concept that predates the step machine.
  if (!chat.onboardingStep) {
    chat.onboardingStep = chat.onboardingComplete ? 'done' : 'opening';
  }

  // Clear the sidebar's unread badge whenever the Chat view mounts.
  // The sidebar click already clears it on the primary path; this is a
  // defensive fallback for reloads (badge persisted, sidebar rendered
  // with the stale count above renderChat in the router order). Re-sync
  // the sidebar right after clearing so the red dot goes away in the
  // same frame the chat log paints.
  if (typeof _claraClearUnread === 'function') {
    const hadUnread = appState.chatUnread > 0;
    _claraClearUnread();
    if (hadUnread && typeof _syncSidebar === 'function') _syncSidebar();
  }

  _renderChatShell(container);
  _paintExistingMessages();

  // Brand-new concept: bootstrap Clara's opening after a 600ms beat so
  // the entry feels like a real greeting instead of a cold form.
  if (chat.messages.length === 0 && chat.onboardingStep === 'opening') {
    _renderInputBarForStep('opening');
    setTimeout(function () {
      if (!_chatStillMounted()) return;
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

  // Post-onboarding customer validation. Runs exactly once per concept
  // — the first time the user is on Chat after onboarding wraps up.
  // The 1500ms beat lets the "Your workspace is ready" line breathe
  // before Clara pipes up one more time with her read-back.
  if (chat.onboardingComplete
      && chat.onboardingStep === 'done'
      && !getBusiness().customerValidated) {
    _renderStepUI();
    setTimeout(function () {
      if (!_chatStillMounted()) return;
      const c = getChat();
      // Guard against double-fire if renderChat re-runs before the beat.
      if (c.onboardingStep !== 'done' || getBusiness().customerValidated) return;
      _advanceStep('validate');
      _claraQueue([_claraValidationQuestion()], _renderStepUI);
    }, 1500);
    return;
  }

  _renderStepUI();
}

// ---------------------------------------------
// Layout / painting
// ---------------------------------------------

function _renderChatShell(container) {
  // Fills the parent regardless of whether we're inside the onboarding
  // overlay panel or the plain content area \u2014 both parents are
  // configured as column-flex containers, so `flex: 1` claims the
  // available height and `min-height: 0` lets us shrink below the
  // content's intrinsic size (needed for chat-area overflow scrolling).
  const rootStyle = [
    'flex:1',
    'min-height:0',
    'display:flex',
    'flex-direction:column',
    'background:radial-gradient(ellipse at 50% 0%, #1e1508 0%, #0F0D0B 50%)'
  ].join(';') + ';';

  container.innerHTML = `
    <div class="cl-onboarding cl-chat-state" id="clOnboarding" style="${rootStyle}">
      <div class="cl-watermark" aria-hidden="true">CLARITY</div>
      <main class="cl-chat-area" id="clChatArea"></main>
      <div class="cl-input-bar" id="clInputBar"></div>
    </div>
  `;
}

function _paintExistingMessages() {
  const chatArea = document.getElementById('clChatArea');
  if (!chatArea) return;
  const messages = getChat().messages || [];
  messages.forEach(function (m, i) {
    const continued = i > 0 && messages[i - 1].role === m.role;
    chatArea.appendChild(_buildMessageEl(m.role, m.text, false, {
      continued: continued,
      insightCard: m.insightCard || null,
      messageIndex: i
    }));
  });
  // Proactive-message options only render on the LAST Clara message
  // that still carries them. Painted after the message loop so the
  // option row sits below its parent bubble in DOM order.
  _renderProactiveOptionsForLast();
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

  if (step === 'q1') {
    _appendOptionsRow('single', CL_OPTIONS_Q1);
  } else if (step === 'q2') {
    _appendOptionsRow('single', CL_OPTIONS_Q2);
  } else if (step === 'q4') {
    _appendOptionsRow('multi', CL_OPTIONS_Q4);
  } else if (step === 'q5') {
    _appendOptionsRow('single', CL_OPTIONS_Q5);
  } else if (step === 'validate') {
    _appendOptionsRow('single', CL_OPTIONS_VALIDATE);
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

  _advanceStep('q5');
  _claraQueue([_q4Ack(channels), CL_Q5_QUESTION], _renderStepUI);
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

  if (step === 'q5') {
    // Store the machine key (zero/low/medium/high/enterprise/unknown) so
    // downstream logic \u2014 the paid-channel gate in _todayTasks() \u2014
    // keys off a stable identifier, never the dollar-band label.
    const budgetKey = CL_Q5_BUDGET_MAP[label] || 'unknown';
    getBusiness().budget = budgetKey;
    _saveState();
    _advanceStep('q6');
    const ack = CL_Q5_ACK[budgetKey] || "Got it.";
    _claraQueue([ack, CL_Q6_QUESTION], _renderStepUI);
    return;
  }

  if (step === 'validate') {
    if (label === CL_VALIDATE_YES) {
      // Confirmation path: lock the flag and drop back into free chat.
      getBusiness().customerValidated = true;
      _advanceStep('done');
      _saveState();
      _claraQueue([CL_VALIDATE_YES_ACK], _renderStepUI);
    } else {
      // Fix path: open a single free-text step so the user can rewrite
      // the customer summary in their own words.
      _advanceStep('validate_fix');
      _claraQueue([CL_VALIDATE_FIX_QUESTION], _renderStepUI);
    }
    return;
  }
}

// ---------------------------------------------
// Input bar (text steps + hidden during option steps)
// ---------------------------------------------

function _isTextStep(step) {
  return step === 'opening'
      || step === 'q1_other'
      || step === 'q3'
      || step === 'q6'
      || step === 'validate_fix'
      || step === 'done';
}

function _placeholderForStep(step) {
  if (step === 'opening') return CL_NAME_PLACEHOLDER;
  if (step === 'q1_other') return 'Tell Clara a bit about what you do...';
  if (step === 'q3') return CL_Q3_PLACEHOLDER;
  if (step === 'q6') return CL_Q6_PLACEHOLDER;
  if (step === 'validate_fix') return CL_VALIDATE_FIX_PLACEHOLDER;
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
    // Live-rename side effect during the opening step: as the user
    // types the business name, update the active concept row in the
    // sidebar in real time (ChatGPT/Claude-style auto-titling). We
    // deliberately don't _saveState() per keystroke \u2014 the persist
    // happens on send. Below the 2-char fallback threshold the row
    // stays "New concept" so it doesn't flash on single letters.
    if (getChat().onboardingStep === 'opening') {
      _liveRenameActiveConcept(input.value);
    }
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

// Update the active concept's business.name in memory + patch the
// sidebar row's visible name in place. Cheaper than re-rendering the
// whole sidebar on every keystroke, and matches how the sidebar's
// _resolveConceptName picks a display name (falls back to "New concept"
// while under 2 chars).
function _liveRenameActiveConcept(raw) {
  const business = getBusiness();
  if (!business) return;
  business.name = raw;
  const trimmed = (raw || '').trim();
  const display = trimmed.length >= 2 ? trimmed : 'New concept';
  const id = appState.activeConceptId;
  if (!id) return;
  const row = document.querySelector('[data-concept="' + id + '"]');
  if (!row) return;
  const label = row.querySelector('.sb-concept-name');
  if (label) label.textContent = display;
}

// ---------------------------------------------
// Text step handler
// ---------------------------------------------

// Per-step minimum content length. "UK" is fine for location; "Local
// families who want fresh sourdough" is a much lower bar for Q3.
const CL_TEXT_MIN = { opening: 2, q1_other: 3, q3: 8, q6: 2, validate_fix: 6 };

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

  if (step === 'opening') {
    // First real answer — the business name. Commit it, sync the
    // sidebar row so the concept is officially named, then hand off
    // to the ack + Q1 in Clara's usual queued cadence.
    const business = getBusiness();
    business.name = text;
    _saveState();
    if (typeof _syncSidebar === 'function') _syncSidebar();
    _advanceStep('q1');
    _claraQueue([_claraNameAck(text), CL_Q1_QUESTION], _renderStepUI);
    return;
  }

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

  if (step === 'validate_fix') {
    // Overwrite the customer summary with the user's correction and lock
    // the validation flag so this whole flow never runs again.
    const business = getBusiness();
    business.customer = text;
    business.customerValidated = true;
    _advanceStep('done');
    _saveState();
    _claraQueue([CL_VALIDATE_FIX_ACK], _renderStepUI);
    return;
  }

  // Post-onboarding free chat ('done' step, customer validated). Clara
  // runs the context-aware response engine: cycling thinking bubble
  // for 1500ms, then _claraRespond(...) which returns { text,
  // insightCard? }.
  if (step === 'done') {
    _claraFreeChatReply(text);
    return;
  }
}

// ---------------------------------------------
// Free-chat: thinking \u2192 context-aware reply
// ---------------------------------------------

// Phrases the thinking bubble cycles through while Clara "thinks" for
// 1500ms. Not persisted \u2014 purely visual.
const CL_THINKING_PHRASES = [
  'Looking into your business...',
  'Checking your insights...',
  'Reviewing your tasks...',
  'Thinking about this...'
];
const CL_THINKING_TICK_MS = 800;
const CL_THINKING_DURATION_MS = 1500;

function _claraFreeChatReply(userText) {
  if (typeof window._claraRespond !== 'function') {
    // Defensive: if respond.js failed to load, fall back to a canned
    // acknowledgment so the user never sees a silent chat.
    setTimeout(function () {
      if (!_chatStillMounted()) return;
      _claraSay('Got it. Let me think on that.');
    }, 600);
    return;
  }
  _showCyclingThinking();
  setTimeout(function () {
    _hideCyclingThinking();
    if (!_chatStillMounted()) return;
    const concept = getActiveConcept();
    const reply = window._claraRespond(userText, concept);
    _claraSay(reply.text, { insightCard: reply.insightCard || null });
  }, CL_THINKING_DURATION_MS);
}

function _showCyclingThinking() {
  const chatArea = document.getElementById('clChatArea');
  if (!chatArea) return;
  _hideCyclingThinking();

  const group = document.createElement('div');
  group.className = 'cl-msg-group cl-msg-clara';
  group.id = 'clCyclingThinking';
  const continued = _prevGroupIsSameRole('clara');
  group.setAttribute('style', CL_GROUP_CLARA_STYLE + (continued ? 'margin-top:-10px;margin-bottom:6px;' : ''));

  const avatar = document.createElement('div');
  avatar.className = 'cl-avatar';
  avatar.setAttribute('style', CL_AVATAR_STYLE + (continued ? 'visibility:hidden;' : ''));
  avatar.textContent = 'C';
  group.appendChild(avatar);

  const bubble = document.createElement('div');
  bubble.className = 'cl-thinking-bubble';

  const label = document.createElement('span');
  label.className = 'cl-thinking-bubble-text';
  label.textContent = CL_THINKING_PHRASES[0];
  bubble.appendChild(label);

  const dots = document.createElement('span');
  dots.className = 'cl-thinking-bubble-dots';
  dots.setAttribute('aria-hidden', 'true');
  dots.innerHTML = '<span></span><span></span><span></span>';
  bubble.appendChild(dots);

  group.appendChild(bubble);
  chatArea.appendChild(group);
  _scrollChatToBottom();

  // Cycle phrase every CL_THINKING_TICK_MS. Interval id is stashed on
  // the element so _hideCyclingThinking can clean it up.
  let idx = 0;
  const timer = setInterval(function () {
    idx = (idx + 1) % CL_THINKING_PHRASES.length;
    if (!document.getElementById('clCyclingThinking')) {
      clearInterval(timer);
      return;
    }
    label.textContent = CL_THINKING_PHRASES[idx];
  }, CL_THINKING_TICK_MS);
  group._clTimer = timer;
}

function _hideCyclingThinking() {
  const el = document.getElementById('clCyclingThinking');
  if (!el) return;
  if (el._clTimer) clearInterval(el._clTimer);
  if (el.parentNode) el.parentNode.removeChild(el);
}

// ---------------------------------------------
// Proactive option chips (attached to a specific Clara message)
// ---------------------------------------------
//
// Clara's proactive messages carry an `options` payload on the message
// itself so they survive reloads. We only render chips for the LAST
// message in the log that still has options \u2014 once the user picks,
// we strip the options and let the chat move on.

function _renderProactiveOptionsForLast() {
  // Nuke any stale row so we never end up with two.
  const stale = document.getElementById('clProactiveOptions');
  if (stale && stale.parentNode) stale.parentNode.removeChild(stale);

  const chatArea = document.getElementById('clChatArea');
  if (!chatArea) return;
  const chat = getChat();
  const messages = chat.messages || [];
  if (messages.length === 0) return;
  const last = messages[messages.length - 1];
  if (!last || last.role !== 'clara' || !last.options || !Array.isArray(last.options.labels)) return;
  if (last.options.labels.length === 0) return;

  const row = document.createElement('div');
  row.className = 'cl-options-row cl-proactive-options';
  row.id = 'clProactiveOptions';
  row.setAttribute('data-action', last.options.action || '');

  last.options.labels.forEach(function (label) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cl-option-btn';
    btn.setAttribute('data-label', label);
    btn.textContent = label;
    btn.addEventListener('click', function () {
      _handleProactiveOptionTap(last, label);
    });
    row.appendChild(btn);
  });
  chatArea.appendChild(row);
  _scrollChatToBottom();
}

function _handleProactiveOptionTap(message, label) {
  const chat = getChat();
  const concept = getActiveConcept();
  // Snapshot the action BEFORE clearing options \u2014 dispatch happens
  // below and needs the action name.
  const dispatchAction = message && message.options ? message.options.action : null;

  // Consume the options on the source message so it can't be tapped twice
  // (and so a reload doesn't re-render the chips).
  message.options = null;
  _saveState();

  // Echo the user's pick as a plain user bubble.
  chat.messages.push({ role: 'user', text: label });
  _saveState();
  _appendMessage('user', label);

  let result;
  if (dispatchAction === 'suggest-tasks' && typeof window._claraHandleSuggestTasks === 'function') {
    result = window._claraHandleSuggestTasks(concept, label);
  } else if (dispatchAction === 'next-content' && typeof window._claraHandleNextContent === 'function') {
    result = window._claraHandleNextContent(concept);
  } else if (dispatchAction === 'welcome-back' && typeof window._claraHandleWelcomeBack === 'function') {
    result = window._claraHandleWelcomeBack(concept, label);
  } else {
    result = { follow: null };
  }

  _saveState(); // handler may have mutated concept.tasks.items etc.

  if (result && result.follow && _chatStillMounted()) {
    // Route Clara's follow-up through the same cycling-thinking beat as
    // regular free chat so proactive follow-ups feel consistent with
    // her other replies.
    _showCyclingThinking();
    setTimeout(function () {
      _hideCyclingThinking();
      if (!_chatStillMounted()) return;
      _claraSay(result.follow);
    }, CL_THINKING_DURATION_MS);
  }
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
    if (!_chatStillMounted()) return;
    if (i >= messages.length) {
      if (typeof done === 'function') done();
      return;
    }
    _showThinkingBubble();
    setTimeout(function () {
      if (!_chatStillMounted()) return;
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
  // Onboarding always dismisses onto the sidebar dashboard with
  // Overview selected. Chat is never a landing view \u2014 users reach it
  // from the sidebar nav after the workspace is open.
  appState.activeView = 'overview';
  appState.onboardingOverlayOpen = false;
  // Legacy flag consumed by the old concept header. Harmless now (no
  // reader) \u2014 kept for one release in case anything downstream still
  // listens for it; safe to remove later.
  window._justUnlockedConcept = true;
  // Seed one closing message into the Chat nav history so the first
  // time the user opens Chat later, Clara's not silent. Never shown
  // during onboarding \u2014 the overlay is already closing when this
  // pushes.
  chat.messages.push({
    role: 'clara',
    text: "Your workspace is ready. I'll be here in the Chat tab whenever you want to talk through anything."
  });
  // Seed the Tasks board with Clara's GTM suggestions (legacy flow).
  if (typeof window._seedClaraTasksIfMissing === 'function') {
    const active = getActiveConcept();
    if (active) window._seedClaraTasksIfMissing(active);
  }
  _saveState();
  renderApp();
}

// ---------------------------------------------
// Message primitives (append / scroll / thinking)
// ---------------------------------------------

function _buildMessageEl(role, text, animate, opts) {
  const continued = !!(opts && opts.continued);
  const insightCard = opts && opts.insightCard ? opts.insightCard : null;
  const messageIndex = (opts && typeof opts.messageIndex === 'number') ? opts.messageIndex : -1;
  const group = document.createElement('div');
  group.className = 'cl-msg-group cl-msg-' + role + (continued ? ' cl-msg-continued' : '');
  if (messageIndex >= 0) group.setAttribute('data-msg-idx', String(messageIndex));
  // Continued messages sit close under the previous one (6px gap vs 18px)
  // and — for Clara — hide the avatar so the text column flows under a
  // single head. This is how Claude/GPT/Linear render bursts.
  const base = role === 'clara' ? CL_GROUP_CLARA_STYLE : CL_GROUP_USER_STYLE;
  const styleAdd = continued ? 'margin-top:-10px;margin-bottom:6px;' : '';
  group.setAttribute('style', base + styleAdd);

  if (role === 'clara') {
    const avatar = document.createElement('div');
    avatar.className = 'cl-avatar';
    // The avatar slot stays in the layout (so text stays aligned) but
    // becomes invisible on continued groups.
    avatar.setAttribute('style', CL_AVATAR_STYLE + (continued ? 'visibility:hidden;' : ''));
    avatar.textContent = 'C';
    group.appendChild(avatar);

    // Wrap the text + optional insight card in a column so the card
    // sits directly under the message and shares the same left gutter.
    const column = document.createElement('div');
    column.className = 'cl-clara-column';
    column.style.cssText = 'flex:1;min-width:0;display:flex;flex-direction:column;';

    const textEl = document.createElement('div');
    textEl.className = 'cl-clara-text';
    textEl.setAttribute('style', CL_CLARA_TEXT_STYLE);
    textEl.textContent = text;
    column.appendChild(textEl);

    if (insightCard && insightCard.label && insightCard.text) {
      const card = document.createElement('div');
      card.className = 'cl-insight-reference';
      const eye = document.createElement('div');
      eye.className = 'cl-insight-reference-eye';
      eye.textContent = insightCard.label;
      const body = document.createElement('div');
      body.className = 'cl-insight-reference-text';
      body.textContent = insightCard.text;
      card.appendChild(eye);
      card.appendChild(body);
      column.appendChild(card);
    }

    group.appendChild(column);
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

// Returns true if the last real (non-thinking, non-options-row) message
// group in the DOM already belongs to this role. Used so freshly
// appended messages can render as "continued" — no avatar, tight gap.
function _prevGroupIsSameRole(role) {
  const chat = document.getElementById('clChatArea');
  if (!chat) return false;
  const groups = chat.querySelectorAll('.cl-msg-group');
  // Walk backwards skipping any transient thinking bubbles at the tail
  // (both the onboarding-era clThinkingBubble and the free-chat cycling
  // clCyclingThinking). They're Clara-styled groups but shouldn't be
  // treated as real prior messages for continuation purposes.
  for (let i = groups.length - 1; i >= 0; i--) {
    const g = groups[i];
    if (g.id === 'clThinkingBubble' || g.id === 'clCyclingThinking') continue;
    return g.classList.contains('cl-msg-' + role);
  }
  return false;
}

function _buildThinkingBubbleEl(opts) {
  const continued = !!(opts && opts.continued);
  const group = document.createElement('div');
  group.className = 'cl-msg-group cl-msg-clara' + (continued ? ' cl-msg-continued' : '');
  group.id = 'clThinkingBubble';
  const styleAdd = continued ? 'margin-top:-10px;margin-bottom:6px;' : '';
  group.setAttribute('style', CL_GROUP_CLARA_STYLE + styleAdd);

  const avatar = document.createElement('div');
  avatar.className = 'cl-avatar';
  avatar.setAttribute('style', CL_AVATAR_STYLE + (continued ? 'visibility:hidden;' : ''));
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
  const bubble = _buildThinkingBubbleEl({ continued: _prevGroupIsSameRole('clara') });
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

function _appendMessage(role, text, opts) {
  const chat = document.getElementById('clChatArea');
  if (!chat) return;
  // Insert new messages BEFORE the options row so the log stays in
  // chronological order (user reply above, options remain anchored to
  // the most recent Clara question below).
  const options = document.getElementById('clOptionsRow');
  const proactive = document.getElementById('clProactiveOptions');
  const messages = getChat().messages || [];
  const messageIndex = messages.length > 0 ? messages.length - 1 : -1;
  const el = _buildMessageEl(role, text, true, {
    continued: _prevGroupIsSameRole(role),
    insightCard: opts && opts.insightCard ? opts.insightCard : null,
    messageIndex: messageIndex
  });
  // If a proactive-option row is currently visible, tear it down first
  // so the new message drops in above where it used to sit; the caller
  // decides whether the new message deserves fresh options.
  if (proactive && proactive.parentNode) proactive.parentNode.removeChild(proactive);
  if (options) chat.insertBefore(el, options);
  else chat.appendChild(el);
  // Re-render proactive options for the (possibly new) last message.
  _renderProactiveOptionsForLast();
  _scrollChatToBottom();
}

function _claraSay(text, opts) {
  const chat = getChat();
  const message = { role: 'clara', text: text };
  if (opts && opts.insightCard) message.insightCard = opts.insightCard;
  if (opts && opts.options) message.options = opts.options;
  chat.messages.push(message);
  _saveState();
  _appendMessage('clara', text, { insightCard: message.insightCard || null });
}

window.renderChat = renderChat;
