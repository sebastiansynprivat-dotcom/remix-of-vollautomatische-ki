const $ = (id) => document.getElementById(id);

chrome.storage.local.get(['pc_user_token', 'pc_model_id'], (r) => {
  if (r.pc_user_token) $('token').value = r.pc_user_token;
  if (r.pc_model_id) $('modelId').value = r.pc_model_id;
});

$('save').addEventListener('click', () => {
  const modelId = $('modelId').value.trim();
  const token = $('token').value.trim();
  const isUuid = /^[0-9a-f-]{36}$/i.test(modelId);
  if (modelId && !isUuid) {
    $('status').style.color = '#ff7a7a';
    $('status').textContent = '✗ Model-ID muss eine UUID sein';
    return;
  }
  chrome.storage.local.set({ pc_user_token: token, pc_model_id: modelId }, () => {
    $('status').style.color = '#7ed09a';
    $('status').textContent = '✓ Gespeichert';
    setTimeout(() => ($('status').textContent = ''), 1500);
  });
});

$('show').addEventListener('click', async () => {
  await chrome.storage.local.set({ pc_panel_hidden: false });
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) chrome.tabs.reload(tab.id);
});

$('reset').addEventListener('click', () => {
  chrome.storage.local.remove(['pc_panel_position'], () => {
    $('status').style.color = '#7ed09a';
    $('status').textContent = '✓ Position zurückgesetzt';
    setTimeout(() => ($('status').textContent = ''), 1500);
  });
});
