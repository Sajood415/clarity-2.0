// ---------------------------------------------
// Clarity 2.0 \u2014 Workspace Greeter (retired)
// ---------------------------------------------
//
// The floating "C" chat bubble that used to live in the bottom-right
// of every workspace view was removed in the dashboard restructure.
// Clara chat is now a first-class nav item in the sidebar; the widget
// concept is gone.
//
// The stubs below preserve the public API so the router and any
// lingering callers keep working. Widget chat messages that existed
// on `concept.widgetChat.messages` are merged into `concept.chat.messages`
// once on load by the migration in state.js (`widgetMerged` guard).
//
// Safe to delete this file (and its CSS) once no caller references
// _syncWorkspaceGreeter / _openWorkspaceGreeter / etc. anymore.

function _syncWorkspaceGreeter() {
  // Defensive: if a bubble/panel snuck into the DOM from a prior
  // session (e.g. HMR / cached extension), clean them up now.
  const bubble = document.getElementById('wgBubble');
  const panel = document.getElementById('wgPanel');
  if (bubble && bubble.parentNode) bubble.parentNode.removeChild(bubble);
  if (panel && panel.parentNode) panel.parentNode.removeChild(panel);
}

function _openWorkspaceGreeter() { /* no-op: widget retired */ }
function _closeWorkspaceGreeter() { /* no-op: widget retired */ }
function _toggleWorkspaceGreeter() { /* no-op: widget retired */ }

window._syncWorkspaceGreeter = _syncWorkspaceGreeter;
window._openWorkspaceGreeter = _openWorkspaceGreeter;
window._closeWorkspaceGreeter = _closeWorkspaceGreeter;
window._toggleWorkspaceGreeter = _toggleWorkspaceGreeter;
