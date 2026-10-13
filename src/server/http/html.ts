function escapeHtml(value: string): string {
  return value
    .replace(/\u0026/g, "\u0026amp;")
    .replace(/</g, "\u0026lt;")
    .replace(/>/g, "\u0026gt;")
    .replace(/"/g, "\u0026quot;")
    .replace(/'/g, "\u0026#39;");
}

type InfoTone = "info" | "warning" | "danger" | "success";

const TONE_STYLES: Record<InfoTone, { bg: string; border: string; color: string; icon: string }> = {
  info: { bg: "#eff6ff", border: "#bfdbfe", color: "#1d4ed8", icon: "ℹ️" },
  warning: { bg: "#fffbeb", border: "#fde68a", color: "#b45309", icon: "⏳" },
  danger: { bg: "#fef2f2", border: "#fecaca", color: "#b91c1c", icon: "🚫" },
  success: { bg: "#ecfdf3", border: "#bbf7d0", color: "#15803d", icon: "✅" },
};

/**
 * Minimal, dependency-free HTML page for card status messages shown to
 * customers (PENDING / SUSPENDED / not found / rate limited / not ready).
 * Matches the Virai Review Card design tokens used by the web app.
 */
export function renderInfoPage({
  title,
  message,
  tone = "info",
  cardCode,
}: {
  title: string;
  message: string;
  tone?: InfoTone;
  cardCode?: string;
}): string {
  const t = TONE_STYLES[tone];

  return `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>${escapeHtml(title)}</title>
<style>
  :root { --text:#0f172a; --muted:#64748b; --border:#e6e8ee; }
  * { box-sizing: border-box; }
  body { margin:0; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: var(--text);
    background: radial-gradient(1200px 500px at 50% -10%, #eef2ff 0%, rgba(238,242,255,0) 60%), #f6f7fb;
    min-height:100dvh; display:flex; justify-content:center; padding:28px 16px; }
  .shell { width:100%; max-width:460px; }
  .brand { text-align:center; font-size:11px; letter-spacing:.22em; text-transform:uppercase;
    color:var(--muted); font-weight:700; margin-bottom:16px; }
  .card { background:#fff; border:1px solid var(--border); border-radius:22px; padding:28px 22px;
    box-shadow:0 10px 30px rgba(16,24,40,.08); text-align:center; }
  .icon { width:64px; height:64px; border-radius:999px; margin:0 auto 14px; display:flex;
    align-items:center; justify-content:center; font-size:30px; background:${t.bg}; border:1px solid ${t.border}; }
  h1 { font-size:21px; margin:0 0 8px; letter-spacing:-.01em; }
  p { color:var(--muted); margin:0; font-size:14.5px; }
  .code { margin-top:16px; padding:12px 14px; border-radius:10px; background:#f9fafb;
    border:1px solid var(--border); font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
    font-size:17px; font-weight:700; }
  .note { margin-top:14px; font-size:11.5px; color:var(--muted); }
</style>
</head>
<body>
  <div class="shell">
    <div class="brand">Virai Review Card</div>
    <div class="card">
      <div class="icon">${t.icon}</div>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(message)}</p>
      ${cardCode ? `<div class="code">${escapeHtml(cardCode)}</div>` : ""}
      <div class="note">Jika Anda merasa ini keliru, hubungi admin Virai Review Card.</div>
    </div>
  </div>
</body>
</html>`;
}
