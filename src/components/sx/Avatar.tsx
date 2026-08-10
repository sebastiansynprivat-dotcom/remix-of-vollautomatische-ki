
interface Props { id: string; name: string; size?: number; ring?: boolean; }

export function Avatar({ id, name, size = 40, ring = false }: Props) {
  const initials = name.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div
      style={{
        width: size, height: size, borderRadius: "50%",
        background: "var(--surface-3)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "var(--text)", fontWeight: 500, fontSize: size * 0.38,
        flexShrink: 0,
        boxShadow: "inset 0 0 0 1px var(--hairline-strong)",
      }}
      aria-label={name}
    >{initials}</div>
  );
}
