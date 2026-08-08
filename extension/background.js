// ============================================================
// Premium Copilot — Extension Background Service Worker (MV3)
// ============================================================
//
// AUTH HOOK FOR LATER BACKEND:
// ----------------------------------------------------------------
// Right now this extension talks to the same Lovable Cloud edge
// function ('chat-copilot') as the web dashboard, using the public
// anon key. When you (the future backend dev) add real per-user
// auth + per-model API keys, REPLACE ONLY `getAuthHeaders()` below.
//
// Storage keys reserved for you:
//   chrome.storage.local['pc_user_token']     -> Supabase user JWT
//   chrome.storage.local['pc_model_api_key']  -> optional user-provided model key
//   chrome.storage.local['pc_model_id']       -> optional selected model id
//
// Everything else in this file stays as-is.
// ----------------------------------------------------------------

const SUPABASE_URL = 'https://kdbphtazqzxwfuluzzld.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkYnBodGF6cXp4d2Z1bHV6emxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzNTgxMTIsImV4cCI6MjA5MzkzNDExMn0.1noYtBQPZH1rS4pNjWN1TPlFdDOpCS7pjH2h360VljA';

/**
 * Single source of truth for outbound auth/model headers.
 * TODO(backend): swap anon-key fallback for real JWT + optional user model key.
 */
async function getAuthHeaders() {
  const { pc_user_token, pc_model_api_key, pc_model_id } =
    await chrome.storage.local.get(['pc_user_token', 'pc_model_api_key', 'pc_model_id']);

  const bearer = pc_user_token || ANON_KEY;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${bearer}`,
    'apikey': ANON_KEY,
  };
  if (pc_model_api_key) headers['X-User-Model-Key'] = pc_model_api_key;
  if (pc_model_id)      headers['X-User-Model-Id']  = pc_model_id;
  return headers;
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== 'COPILOT') return;
  (async () => {
    try {
      const headers = await getAuthHeaders();
      const { pc_model_id } = await chrome.storage.local.get(['pc_model_id']);
      const modelId = (typeof pc_model_id === 'string' && /^[0-9a-f-]{36}$/i.test(pc_model_id)) ? pc_model_id : null;

      const payload = {
        ...(msg.payload || {}),
        // Hint to backend: we only want one suggestion. If backend
        // ignores it, the client still picks the first one.
        requestVariant: 'single',
      };
      // If a model UUID is configured in the popup, let the edge function
      // load the full Steckbrief from public.model_profiles. This is what
      // makes extension replies match the web app's persona style.
      if (modelId) payload.modelId = modelId;

      const res = await fetch(`${SUPABASE_URL}/functions/v1/chat-copilot`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        sendResponse({ error: `HTTP ${res.status}: ${text.slice(0, 300)}` });
        return;
      }
      const data = await res.json();
      sendResponse({ data });
    } catch (e) {
      sendResponse({ error: e?.message || 'Unknown error' });
    }
  })();
  return true;
});


chrome.action?.onClicked?.addListener?.(() => {
  chrome.storage.local.set({ pc_panel_hidden: false });
});
