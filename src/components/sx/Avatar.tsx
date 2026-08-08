import { colorFromId } from "@/data/mockData";

interface Props { id: string; name: string; size?: number; ring?: boolean; }

export function Avatar({ id, name, size = 40, ring = false }: Props) {
  const initials = name.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div
      style={{
        width: size, height: size, borderRadius: "50%",
        background: colorFromId(id),
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "var(--text-strong)", fontWeight: 600, fontSize: size * 0.38,
        flexShrink: 0,
        boxShadow: ring
          ? "0 0 0 2px var(--gold), 0 0 0 4px var(--background), 0 0 24px hsla(40,45%,55%,0.3)"
          : "inset 0 0 0 1px hsla(0,0%,100%,0.08)",
      }}
      aria-label={name}
    >{initials}</div>
  );
}
