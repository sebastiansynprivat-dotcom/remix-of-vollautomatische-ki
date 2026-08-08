export function TypingIndicator({ name }: { name: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 24px" }}>
      <span style={{ fontSize: 11, color: "var(--text-subtle)", letterSpacing: 0.2 }}>
        {name} schreibt
      </span>
      <div style={{ display: "flex", gap: 5, alignItems: "center", height: 12 }}>
        {[0, 1, 2].map(i => (
          <span key={i} style={{
            width: 6, height: 6, borderRadius: "50%",
            background: "linear-gradient(135deg, var(--gold-light), var(--gold-dark))",
            boxShadow: "0 0 6px hsla(40,55%,60%,0.5)",
            animation: "typingPulse 1.3s ease-in-out infinite",
            animationDelay: `${i * 180}ms`,
          }} />
        ))}
      </div>
    </div>
  );
}
