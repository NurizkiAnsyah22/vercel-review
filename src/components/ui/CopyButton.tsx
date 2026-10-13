"use client";

import { useState } from "react";

/**
 * Clipboard copy that also works on plain http:// LAN origins, where the async
 * Clipboard API is unavailable (not a secure context) — falls back to the
 * legacy textarea + execCommand approach.
 */
export async function copyText(value: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // fall through to the legacy fallback
  }

  try {
    const area = document.createElement("textarea");
    area.value = value;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.focus();
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

export default function CopyButton({
  value,
  label = "Copy",
  className = "btn btn-sm",
  successMessage = "Dicopy",
  errorMessage = "Gagal copy",
}: {
  value: string;
  label?: string;
  className?: string;
  successMessage?: string;
  errorMessage?: string;
}) {
  const [notice, setNotice] = useState("");

  async function onCopy() {
    const ok = await copyText(value);
    setNotice(ok ? successMessage : errorMessage);
    setTimeout(() => setNotice(""), 2000);
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <button type="button" className={className} onClick={onCopy}>
        {label}
      </button>
      {notice ? <span style={{ fontSize: 12, color: "#1a7f37" }}>{notice}</span> : null}
    </span>
  );
}
