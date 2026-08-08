import { useState } from "react";

interface Props {
  onClose: () => void;
  onSend: (amountCents: number, message: string) => void;
}

const QUICK = [100, 500, 1000, 2500];

export function TipPanel({ onClose, onSend }: Props) {
  const [selected, setSelected] = useState<number | null>(500);
  const [custom, setCustom] = useState("");
  const [msg, setMsg] = useState("");

  const amount = (() => {
    if (custom.trim()) {
      const v = parseFloat(custom.replace(",", "."));
      if (!isNaN(v) && v > 0) return Math.round(v * 100);
      return 0;
    }
    return selected ?? 0;
  })();

  const handleTipSend = () => {
    if (amount <= 0) return;
    onSend(amount, msg.trim());
  };

  return (
    <div className="premium-card reveal" style={{
      position: "absolute", bottom: 76, right: 24, width: 320, padding: 18, zIndex: 20,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <h4 style={{ color: "var(--text-strong)", fontSize: 14, fontWeight: 600 }}>Trinkgeld senden</h4>
        <button onClick={onClose} style={{ color: "var(--text-muted)", fontSize: 16 }}>×</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginBottom: 12 }}>
        {QUICK.map(amt => {
          const active = selected === amt && !custom.trim();
          return (
            <button key={amt}
              onClick={() => { setSelected(amt); setCustom(""); }}
              className="tabular"
              style={{
                padding: "10px 6px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                color: active ? "var(--gold)" : "var(--text)",
                border: `1px solid ${active ? "hsla(40,45%,55%,0.5)" : "hsla(0,0%,100%,0.06)"}`,
                background: active ? "hsla(40,45%,55%,0.10)" : "hsla(0,0%,100%,0.02)",
                boxShadow: active ? "0 0 16px hsla(40,45%,55%,0.18)" : undefined,
                transition: "all 200ms var(--easing)",
              }}>{amt / 100} €</button>
          );
        })}
      </div>
      <input
        placeholder="Eigener Betrag (€)"
        value={custom}
        onChange={e => { setCustom(e.target.value); setSelected(null); }}
        className="tabular"
        style={{
          width: "100%", padding: "10px 12px", borderRadius: 8,
          border: "1px solid hsla(0,0%,100%,0.06)",
          background: "hsla(0,0%,100%,0.02)",
          fontSize: 13, color: "var(--text-strong)", marginBottom: 10,
        }}
      />
      <input
        placeholder="Nachricht (optional)"
        value={msg}
        onChange={e => setMsg(e.target.value)}
        style={{
          width: "100%", padding: "10px 12px", borderRadius: 8,
          border: "1px solid hsla(0,0%,100%,0.06)",
          background: "hsla(0,0%,100%,0.02)",
          fontSize: 13, color: "var(--text-strong)", marginBottom: 14,
        }}
      />
      <button
        onClick={handleTipSend}
        disabled={amount <= 0}
        className="gold-gradient-bg"
        style={{
          width: "100%", padding: "11px", borderRadius: 10, fontSize: 13, fontWeight: 700,
          opacity: amount <= 0 ? 0.5 : 1,
        }}>Senden ✦</button>
    </div>
  );
}
