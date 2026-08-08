// ============================================================
// Premium Copilot — Two independent floating panels
//   1) Chat panel  (AI suggestion)
//   2) Fan Brain panel (context store)
// Plus a small launcher to re-open closed panels.
// ============================================================
//
// FAN-BRAIN STORAGE HOOK FOR LATER BACKEND:
//   loadFan() / saveFan() are the only place to swap chrome.storage
//   for a real backend call. Nothing else changes.
// ============================================================

(() => {
  if (document.getElementById('pc-copilot-root')) return;

  const FAN_KEY        = 'pc_fan_profile';
  const POS_CHAT_KEY   = 'pc_pos_chat';
  const POS_FAN_KEY    = 'pc_pos_fan';
  const HIDDEN_CHAT    = 'pc_hidden_chat';
  const HIDDEN_FAN     = 'pc_hidden_fan';

  // Root host for launcher (panels are body-level so they can be dragged anywhere).
  const root = document.createElement('div');
  root.id = 'pc-copilot-root';
  document.body.appendChild(root);

  mountLauncher();
  chrome.storage.local.get([HIDDEN_CHAT, HIDDEN_FAN], (r) => {
    if (!r[HIDDEN_CHAT]) mountChatPanel();
    if (!r[HIDDEN_FAN])  mountFanPanel();
  });

  // ── Launcher (always visible bottom-right) ──────────────────
  function mountLauncher() {
    const bar = document.createElement('div');
    bar.id = 'pc-launcher';
    bar.innerHTML = `
      <button class="pc-launch-btn" data-open="chat" title="Chat-Copilot öffnen">
        <span class="pc-dot"></span> Chat
      </button>
      <button class="pc-launch-btn" data-open="fan" title="Fan Brain öffnen">
        <span class="pc-dot"></span> Fan
      </button>
    `;
    document.body.appendChild(bar);
    bar.querySelector('[data-open="chat"]').addEventListener('click', () => {
      chrome.storage.local.set({ [HIDDEN_CHAT]: false });
      if (!document.getElementById('pc-panel-chat')) mountChatPanel();
    });
    bar.querySelector('[data-open="fan"]').addEventListener('click', () => {
      chrome.storage.local.set({ [HIDDEN_FAN]: false });
      if (!document.getElementById('pc-panel-fan')) mountFanPanel();
    });
  }

  // ── CHAT PANEL ──────────────────────────────────────────────
  function mountChatPanel() {
    const panel = createPanel({
      id: 'pc-panel-chat',
      title: 'Chat-Copilot',
      hiddenKey: HIDDEN_CHAT,
      posKey: POS_CHAT_KEY,
      defaultPos: { right: 24, top: 24 },
      bodyHtml: `
        <label class="pc-label">Letzte Nachrichten (eine pro Zeile, mit Präfix)</label>
        <textarea class="pc-textarea" id="pc-conv" placeholder="Fan: Hey wie geht's dir heute?&#10;Ich: Hey schatz, freu mich von dir zu hören 😘&#10;Fan: Was machst du gerade?"></textarea>
        <div class="pc-hint">Präfixe: <code>Fan:</code> / <code>Ich:</code>. Fan Brain wird automatisch mitgeschickt.</div>
        <button class="pc-refresh" id="pc-go">⚡ Vorschlag generieren</button>
        <div id="pc-result"></div>
      `,
    });
    wireGenerate(panel);
  }

  // ── FAN PANEL ───────────────────────────────────────────────
  async function mountFanPanel() {
    const fan = await loadFan();
    const panel = createPanel({
      id: 'pc-panel-fan',
      title: 'Fan Brain',
      hiddenKey: HIDDEN_FAN,
      posKey: POS_FAN_KEY,
      defaultPos: { right: 24, top: 24, offsetY: 0 },
      bodyHtml: `
        <label class="pc-label">Fan-Name</label>
        <input class="pc-input" id="pc-fan-name" placeholder="z. B. Marc" value="${esc(fan.name)}" />
        <div class="pc-row" style="margin-top:10px">
          <div style="flex:1">
            <label class="pc-label">Job / Hint</label>
            <input class="pc-input" id="pc-fan-job" placeholder="z. B. IT" value="${esc(fan.job)}" />
          </div>
          <div style="flex:1">
            <label class="pc-label">Stadt</label>
            <input class="pc-input" id="pc-fan-city" placeholder="z. B. Köln" value="${esc(fan.city)}" />
          </div>
        </div>
        <label class="pc-label" style="margin-top:10px">Lifetime Spend (€)</label>
        <input class="pc-input" id="pc-fan-spent" type="number" min="0" placeholder="0" value="${fan.spent || ''}" />

        <label class="pc-label" style="margin-top:14px">Persönlichkeit / Tonalität</label>
        <textarea class="pc-textarea" id="pc-fan-personality" placeholder="z. B. ruhig, romantisch, mag tiefe Gespräche">${esc(fan.personality)}</textarea>

        <label class="pc-label" style="margin-top:10px">Kinks / Vorlieben</label>
        <textarea class="pc-textarea" id="pc-fan-kinks" placeholder="z. B. Roleplay, Dom/Sub">${esc(fan.kinks)}</textarea>

        <label class="pc-label" style="margin-top:10px">Trigger / No-Gos</label>
        <textarea class="pc-textarea" id="pc-fan-nogos" placeholder="z. B. keine Anspielung auf Ex">${esc(fan.nogos)}</textarea>

        <label class="pc-label" style="margin-top:10px">Freie Notizen</label>
        <textarea class="pc-textarea" id="pc-fan-notes" placeholder="z. B. hat Hund Bruno, kauft Sonntag abends">${esc(fan.notes)}</textarea>

        <button class="pc-secondary" id="pc-fan-save">Speichern</button>
        <div class="pc-hint">Lokal gespeichert (pro Domain). Wird in jeden Vorschlag eingewoben.</div>

        <details style="margin-top:14px;border-top:1px solid rgba(255,255,255,0.08);padding-top:12px">
          <summary style="cursor:pointer;font-size:11.5px;font-weight:600;color:rgba(255,255,255,0.6);letter-spacing:0.5px;text-transform:uppercase">Backend-Sync (API-Key)</summary>
          <label class="pc-label" style="margin-top:10px">API Base URL</label>
          <input class="pc-input" id="pc-api-base" placeholder="https://golden-stream-chat.lovable.app" />
          <label class="pc-label" style="margin-top:10px">API-Key (pck_live_…)</label>
          <input class="pc-input" id="pc-api-key" type="password" placeholder="pck_live_…" />
          <label class="pc-label" style="margin-top:10px">External Ref (Fan-Username)</label>
          <input class="pc-input" id="pc-api-ref" placeholder="z. B. plattform_handle" />
          <div style="display:flex;gap:8px;margin-top:10px">
            <button class="pc-secondary" id="pc-api-save" style="flex:1">Verbindung speichern</button>
            <button class="pc-secondary" id="pc-api-push" style="flex:1">Fan jetzt syncen</button>
          </div>
          <div id="pc-api-status" class="pc-hint" style="margin-top:8px"></div>
        </details>
      `,
    });

    // Offset second panel a bit so they don't fully overlap on first launch
    if (!panel.dataset.posRestored) {
      panel.style.right = '420px';
    }
    wireFan(panel);
  }

  // ── Generic panel factory ───────────────────────────────────
  function createPanel({ id, title, hiddenKey, posKey, bodyHtml }) {
    const panel = document.createElement('div');
    panel.id = id;
    panel.className = 'pc-panel';
    panel.innerHTML = `
      <div class="pc-header" data-drag-handle>
        <div class="pc-title"><span class="pc-dot"></span>${esc(title)}</div>
        <div class="pc-actions">
          <button class="pc-iconbtn" data-action="minimize" title="Minimieren">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14"/></svg>
          </button>
          <button class="pc-iconbtn" data-action="close" title="Schließen">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
      </div>
      <div class="pc-body">${bodyHtml}</div>
    `;
    document.body.appendChild(panel);

    chrome.storage.local.get([posKey], (r) => {
      const pos = r[posKey];
      if (pos && typeof pos.x === 'number') {
        panel.style.left = clamp(pos.x, 8, window.innerWidth - 100) + 'px';
        panel.style.top  = clamp(pos.y, 8, window.innerHeight - 60) + 'px';
        panel.style.right = 'auto';
        panel.dataset.posRestored = '1';
      }
    });

    wireDrag(panel, posKey);
    wireActions(panel, hiddenKey);
    return panel;
  }

  // ── Drag ────────────────────────────────────────────────────
  function wireDrag(panel, posKey) {
    const handle = panel.querySelector('[data-drag-handle]');
    let drag = null;
    handle.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.pc-iconbtn')) return;
      const rect = panel.getBoundingClientRect();
      drag = { dx: e.clientX - rect.left, dy: e.clientY - rect.top, id: e.pointerId };
      handle.setPointerCapture(e.pointerId);
      panel.classList.add('pc-dragging');
      // Bring to front
      document.querySelectorAll('.pc-panel').forEach(p => (p.style.zIndex = '2147483646'));
      panel.style.zIndex = '2147483647';
    });
    handle.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const x = clamp(e.clientX - drag.dx, 8, window.innerWidth - panel.offsetWidth - 8);
      const y = clamp(e.clientY - drag.dy, 8, window.innerHeight - 40);
      panel.style.left = x + 'px'; panel.style.top = y + 'px'; panel.style.right = 'auto';
    });
    const end = () => {
      if (!drag) return;
      panel.classList.remove('pc-dragging');
      const r = panel.getBoundingClientRect();
      chrome.storage.local.set({ [posKey]: { x: r.left, y: r.top } });
      drag = null;
    };
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
  }

  function wireActions(panel, hiddenKey) {
    panel.querySelector('[data-action="minimize"]').addEventListener('click', () => panel.classList.toggle('pc-minimized'));
    panel.querySelector('[data-action="close"]').addEventListener('click', () => {
      chrome.storage.local.set({ [hiddenKey]: true });
      panel.remove();
    });
  }

  // ── Fan storage (hook for backend) ──────────────────────────
  async function loadFan() {
    return new Promise((res) => {
      chrome.storage.local.get([FAN_KEY], (r) => {
        res(Object.assign(
          { name: '', job: '', city: '', spent: 0,
            personality: '', kinks: '', nogos: '', notes: '' },
          r[FAN_KEY] || {},
        ));
      });
    });
  }
  function saveFan(fan) {
    return new Promise((res) => chrome.storage.local.set({ [FAN_KEY]: fan }, res));
  }

  function wireFan(panel) {
    // Backend sync settings (additive, optional)
    const API_KEYS = ['pc_api_base', 'pc_api_key', 'pc_api_ref'];
    chrome.storage.local.get(API_KEYS, (r) => {
      const baseEl = panel.querySelector('#pc-api-base');
      const keyEl  = panel.querySelector('#pc-api-key');
      const refEl  = panel.querySelector('#pc-api-ref');
      if (baseEl) baseEl.value = r.pc_api_base || '';
      if (keyEl)  keyEl.value  = r.pc_api_key  || '';
      if (refEl)  refEl.value  = r.pc_api_ref  || '';
    });

    const saveSettingsBtn = panel.querySelector('#pc-api-save');
    if (saveSettingsBtn) {
      saveSettingsBtn.addEventListener('click', () => {
        const obj = {
          pc_api_base: (panel.querySelector('#pc-api-base').value || '').trim().replace(/\/+$/, ''),
          pc_api_key:  (panel.querySelector('#pc-api-key').value  || '').trim(),
          pc_api_ref:  (panel.querySelector('#pc-api-ref').value  || '').trim(),
        };
        chrome.storage.local.set(obj, () => {
          setApiStatus(panel, '✓ Gespeichert', 'ok');
        });
      });
    }

    const pushBtn = panel.querySelector('#pc-api-push');
    if (pushBtn) {
      pushBtn.addEventListener('click', async () => {
        setApiStatus(panel, '… sync', 'busy');
        const fan = await loadFan();
        const r = await copilotPushFan(fan);
        setApiStatus(panel, r.ok ? '✓ Sync OK' : `✗ ${r.error || 'Fehler'}`, r.ok ? 'ok' : 'err');
      });
    }

    panel.querySelector('#pc-fan-save').addEventListener('click', async () => {
      const fan = {
        name:        panel.querySelector('#pc-fan-name').value.trim(),
        job:         panel.querySelector('#pc-fan-job').value.trim(),
        city:        panel.querySelector('#pc-fan-city').value.trim(),
        spent:       parseFloat(panel.querySelector('#pc-fan-spent').value) || 0,
        personality: panel.querySelector('#pc-fan-personality').value.trim(),
        kinks:       panel.querySelector('#pc-fan-kinks').value.trim(),
        nogos:       panel.querySelector('#pc-fan-nogos').value.trim(),
        notes:       panel.querySelector('#pc-fan-notes').value.trim(),
      };
      await saveFan(fan);
      // Best-effort backend sync (no-op if not configured)
      copilotPushFan(fan).then((r) => {
        if (r.configured) setApiStatus(panel, r.ok ? '✓ Backend synct' : `✗ ${r.error || 'Sync-Fehler'}`, r.ok ? 'ok' : 'err');
      });
      const btn = panel.querySelector('#pc-fan-save');
      const orig = btn.textContent;
      btn.textContent = '✓ Gespeichert';
      setTimeout(() => (btn.textContent = orig), 1200);
    });
  }

  function setApiStatus(panel, text, kind) {
    const el = panel.querySelector('#pc-api-status');
    if (!el) return;
    el.textContent = text;
    el.style.color = kind === 'ok' ? 'rgba(134,217,161,0.9)'
                    : kind === 'err' ? 'rgba(240,138,138,0.9)'
                    : 'rgba(255,255,255,0.55)';
  }

  // ── Backend Copilot API ─────────────────────────────────────
  async function copilotConfig() {
    return new Promise((res) => {
      chrome.storage.local.get(['pc_api_base', 'pc_api_key', 'pc_api_ref'], (r) => res({
        base: (r.pc_api_base || '').replace(/\/+$/, ''),
        key:  r.pc_api_key  || '',
        ref:  r.pc_api_ref  || '',
      }));
    });
  }

  async function copilotPushFan(fan) {
    const cfg = await copilotConfig();
    if (!cfg.base || !cfg.key) return { ok: false, configured: false, error: 'not_configured' };
    const ref = cfg.ref || fan.name || 'unknown';
    const facts = {
      name: fan.name || undefined,
      job: fan.job || undefined,
      location: fan.city || undefined,
      kinks: splitLines(fan.kinks),
      turn_offs: splitLines(fan.nogos),
      other: [fan.personality, fan.notes].filter(Boolean),
    };
    try {
      const res = await fetch(`${cfg.base}/api/public/copilot/fan-brain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Pc-Key': cfg.key },
        body: JSON.stringify({ external_ref: ref, display_name: fan.name || ref, facts }),
      });
      const json = await res.json().catch(() => ({}));
      return { ok: res.ok && json.ok !== false, configured: true, error: json.error };
    } catch (e) {
      return { ok: false, configured: true, error: e.message };
    }
  }

  async function copilotFetchSets() {
    const cfg = await copilotConfig();
    if (!cfg.base || !cfg.key) return null;
    try {
      const res = await fetch(`${cfg.base}/api/public/copilot/sets`, {
        headers: { 'X-Pc-Key': cfg.key },
      });
      const json = await res.json();
      if (json && json.ok) {
        window.PC_SETS = json.sets;
        return json.sets;
      }
    } catch {}
    return null;
  }
  // Warm-up: load sets in background so AI prompt builders can read window.PC_SETS
  copilotFetchSets();

  function splitLines(s) {
    return (s || '').split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  }


  // ── Chat generate ───────────────────────────────────────────
  function wireGenerate(panel) {
    const btn = panel.querySelector('#pc-go');
    const out = panel.querySelector('#pc-result');

    const run = async (regen = false) => {
      const raw = panel.querySelector('#pc-conv').value.trim();
      if (!raw) {
        out.innerHTML = '<div class="pc-error">Bitte zuerst den Chatverlauf einfügen.</div>';
        return;
      }
      const messages = parseConversation(raw);
      if (!messages.length) {
        out.innerHTML = '<div class="pc-error">Konnte keine Nachrichten erkennen. Nutze <code>Fan:</code> / <code>Ich:</code> Präfixe.</div>';
        return;
      }
      const fan = await loadFan();
      const fanBrain = {
        personality: fan.personality || '',
        kinks: fan.kinks || '',
        nogos: fan.nogos || '',
        notes: fan.notes || '',
      };
      const knownFacts = {};
      if (fan.job)  knownFacts.job = fan.job;
      if (fan.city) knownFacts.location = fan.city;
      const otherBits = [fan.notes, fan.personality, fan.kinks, fan.nogos].filter(Boolean);
      if (otherBits.length) knownFacts.other = otherBits;

      btn.disabled = true;
      btn.textContent = regen ? '… neu generieren' : '… denkt nach';
      out.innerHTML = '<div class="pc-loading"><div class="pc-shimmer"></div><div class="pc-shimmer"></div><div class="pc-shimmer short"></div></div>';

      try {
        const res = await chrome.runtime.sendMessage({
          type: 'COPILOT',
          payload: {
            messages,
            fanMeta: { displayName: fan.name || 'Fan', totalSpent_eur: fan.spent || 0 },
            // modelPersona is loaded server-side from model_profiles by the
            // edge function based on the modelId added in background.js.
            knownFacts,
            fanBrain,
            fanId: null,
            regenNonce: regen ? Date.now() : 0,
          },
        });
        if (res?.error) throw new Error(res.error);
        renderBrief(out, res?.data || {}, run);

        // Auto-merge extracted fanFacts into Fan Brain (parity with dashboard).
        if (res?.data?.fanFacts) {
          const { next, changed, changedFields } = mergeFanFacts(fan, res.data.fanFacts);
          if (changed) {
            await saveFan(next);
            refreshFanPanelIfOpen(fan, next);
            flashFanNotice(out, changedFields);
          }
        }
      } catch (e) {
        out.innerHTML = `<div class="pc-error">${esc(e.message || 'Fehler beim Laden.')}</div>`;
      } finally {
        btn.disabled = false;
        btn.textContent = '⚡ Vorschlag generieren';
      }
    };

    btn.addEventListener('click', () => run(false));
  }

  // ── Auto-merge fanFacts from copilot response ───────────────
  function mergeFanFacts(current, incoming) {
    const next = { ...current };
    const changedFields = [];
    let changed = false;

    // String map: incoming key -> stored key + human label
    const strMap = [
      ['name',     'name', 'Name'],
      ['job',      'job',  'Job'],
      ['location', 'city', 'Stadt'],
    ];
    for (const [inKey, outKey, label] of strMap) {
      const v = incoming?.[inKey];
      if (typeof v === 'string' && v.trim()) {
        const val = v.trim();
        if (!current[outKey] && val !== current[outKey]) {
          next[outKey] = val;
          changedFields.push(label);
          changed = true;
        }
      }
    }

    // Array map -> append to multi-line textarea, dedup
    const arrMap = [
      ['kinks',    'kinks', 'Kinks',   8],
      ['dislikes', 'nogos', 'No-Gos',  8],
      ['other',    'notes', 'Notizen', 6],
    ];
    for (const [inKey, outKey, label, max] of arrMap) {
      const v = incoming?.[inKey];
      if (!Array.isArray(v) || !v.length) continue;
      const existing = (current[outKey] || '')
        .split(/\r?\n/).map(s => s.trim()).filter(Boolean);
      const merged = Array.from(new Set([
        ...existing,
        ...v.map(String).map(s => s.trim()).filter(Boolean),
      ])).slice(0, max);
      if (merged.length !== existing.length) {
        next[outKey] = merged.join('\n');
        changedFields.push(label);
        changed = true;
      }
    }

    return { next, changed, changedFields };
  }

  function refreshFanPanelIfOpen(prev, next) {
    const fp = document.getElementById('pc-panel-fan');
    if (!fp) return;
    const setIfUnchanged = (sel, prevVal, nextVal) => {
      const el = fp.querySelector(sel);
      if (!el) return;
      // Only overwrite when user hasn't typed something different in the meantime.
      if ((el.value ?? '').trim() === (prevVal ?? '').trim()) {
        el.value = nextVal ?? '';
      }
    };
    setIfUnchanged('#pc-fan-name', prev.name, next.name);
    setIfUnchanged('#pc-fan-job',  prev.job,  next.job);
    setIfUnchanged('#pc-fan-city', prev.city, next.city);
    setIfUnchanged('#pc-fan-kinks', prev.kinks, next.kinks);
    setIfUnchanged('#pc-fan-nogos', prev.nogos, next.nogos);
    setIfUnchanged('#pc-fan-notes', prev.notes, next.notes);
  }

  function flashFanNotice(out, fields) {
    const note = document.createElement('div');
    note.className = 'pc-fan-notice';
    const label = fields.length ? ` (${fields.join(', ')})` : '';
    note.textContent = `🧠 Fan Brain aktualisiert${label}`;
    out.prepend(note);
    setTimeout(() => note.remove(), 3500);
  }



  function parseConversation(raw) {
    const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const out = [];
    for (const line of lines) {
      const m = line.match(/^(fan|ich|model|me|you|du)\s*[:>-]\s*(.+)$/i);
      if (m) {
        const role = /^(fan|you|du)$/i.test(m[1]) ? 'FAN' : 'MODEL';
        out.push({ role: 'user', content: `${role}: ${m[2]}` });
      } else if (out.length) {
        out[out.length - 1].content += ' ' + line;
      } else {
        out.push({ role: 'user', content: `FAN: ${line}` });
      }
    }
    return out;
  }

  function renderBrief(out, data, runAgain) {
    const parts = [];
    const chips = [];
    if (data.sentiment) chips.push(chip(`Stimmung: ${data.sentiment}`, sentChip(data.sentiment)));
    if (typeof data.buyIntent === 'number') chips.push(chip(`Buy-Intent ${Math.round(data.buyIntent * 100)}%`, data.buyIntent > 0.6 ? 'pc-chip-gold' : ''));
    if (data.nextPriceStep) chips.push(chip(`Next: ${data.nextPriceStep}€`, 'pc-chip-gold'));
    if (Array.isArray(data.riskFlags)) data.riskFlags.forEach(f => chips.push(chip(`⚠ ${f}`, 'pc-chip-warn')));
    if (chips.length) parts.push(`<div class="pc-meta">${chips.join('')}</div>`);

    if (data.ppvHint && (data.ppvHint.shouldSend || data.ppvHint.text)) {
      parts.push(`
        <div class="pc-ppv">
          <div class="pc-ppv-title">${data.ppvHint.shouldSend ? '📨 PPV-Moment' : 'PPV-Status'}</div>
          <div class="pc-ppv-body">${esc(data.ppvHint.text || data.ppvHint.reason || '')}</div>
        </div>
      `);
    }

    const sugs = Array.isArray(data.suggestions) ? data.suggestions : [];
    const first = sugs[0];
    if (first) {
      const tone = first.tone || 'flirty';
      const textParts = [first.text, first.text2, first.text3].filter(Boolean);
      const full = textParts.join('\n\n');
      const bodyHtml = textParts.map(t => `<div class="pc-sug-text" data-copy="${esc(t)}">${esc(t)}</div>`).join('');
      parts.push(`
        <div class="pc-suggestion pc-suggestion-solo">
          <div class="pc-sug-head">
            <span class="pc-tone pc-tone-${esc(tone)}">${esc(tone)}</span>
            <button class="pc-iconbtn" data-copy="${esc(full)}" title="Kopieren" style="margin-left:auto;font-size:10px;width:auto;padding:0 8px">Kopieren</button>
          </div>
          <div class="pc-sug-body">${bodyHtml}</div>
        </div>
        <button class="pc-secondary" id="pc-regen">↻ Neu generieren</button>
      `);
    } else {
      parts.push('<div class="pc-empty">Kein Vorschlag erhalten.</div>');
    }

    out.innerHTML = parts.join('');

    out.querySelectorAll('[data-copy]').forEach(el => {
      el.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(el.dataset.copy);
          const flash = document.createElement('span');
          flash.className = 'pc-copied-flash';
          flash.textContent = '✓ kopiert';
          el.appendChild(flash);
          setTimeout(() => flash.remove(), 1200);
        } catch {}
      });
    });

    const regen = out.querySelector('#pc-regen');
    if (regen) regen.addEventListener('click', () => runAgain(true));
  }

  function sentChip(s) {
    if (/positiv|happy|warm/i.test(s)) return 'pc-chip-ok';
    if (/negativ|cold|risk/i.test(s)) return 'pc-chip-warn';
    return '';
  }
  function chip(text, cls = '') { return `<span class="pc-chip ${cls}">${esc(text)}</span>`; }
  function clamp(v, mn, mx) { return Math.max(mn, Math.min(mx, v)); }
  function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
})();
