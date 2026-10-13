import type { ReactNode } from "react";

export default function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 12,
        alignItems: "flex-end",
        justifyContent: "space-between",
        marginBottom: 20,
      }}
    >
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 750, letterSpacing: "-0.02em" }}>{title}</h1>
        {subtitle ? <div className="muted" style={{ marginTop: 4 }}>{subtitle}</div> : null}
      </div>
      {actions ? <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{actions}</div> : null}
    </div>
  );
}
