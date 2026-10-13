"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to legacy fallback (needed on plain http LAN)
  }

  try {
    const area = document.createElement("textarea");
    area.value = text;
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

function triggerDownload(href: string, filename: string): void {
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default function CardQrPanel({
  cardId,
  cardCode,
  activationCode,
  token,
  publicUrl,
  nfcUrl,
  googleReviewUrl,
  qrReady,
  qrError,
  qrGeneratedAt,
}: {
  cardId: string;
  cardCode: string;
  activationCode: string | null;
  token: string;
  publicUrl: string;
  nfcUrl: string;
  googleReviewUrl: string | null;
  qrReady: boolean;
  qrError: string | null;
  qrGeneratedAt: string | null;
}) {
  const router = useRouter();
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const cacheBuster = qrGeneratedAt ? new Date(qrGeneratedAt).getTime() : 0;
  const pngSrc = `/api/qr/${token}?format=png&v=${cacheBuster}`;
  const svgSrc = `/api/qr/${token}?format=svg&v=${cacheBuster}`;

  function flash(text: string) {
    setNotice(text);
    setTimeout(() => setNotice(""), 2000);
  }

  async function retryQr() {
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch(`/api/admin/cards/${cardId}/generate-qr`, { method: "POST" });
      const data = (await response.json().catch(() => ({}))) as {
        data?: { message?: string };
        error?: string;
      };
      flash(response.ok ? (data.data?.message ?? "QR dibuat") : (data.error ?? "QR gagal dibuat"));
      if (response.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <div className="card-title">QR CODE</div>
      <div className="divider" />

      <div className="pub-cardid" style={{ marginBottom: 16 }}>
        <div className="pub-cardid-label">Kode Aktivasi (tercetak di kartu)</div>
        <div className="pub-cardid-value mono">{activationCode ?? "belum dibuat"}</div>
      </div>

      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        <div style={{ textAlign: "center" }}>
          {qrReady ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={pngSrc} alt={`QR ${cardCode}`} width={200} height={200} />
          ) : (
            <div
              style={{
                width: 200,
                height: 200,
                background: "#fef2f2",
                border: "1px dashed #d1242f",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#d1242f",
                fontWeight: 600,
                fontSize: 13,
                padding: 12,
                textAlign: "center",
              }}
            >
              QR GENERATION FAILED
            </div>
          )}
          <p style={{ fontSize: 12, color: "#6b7280", margin: "8px 0 0" }}>
            {qrReady ? "QR berisi Public Review URL (otomatis dibuat)" : qrError ?? "QR belum dibuat"}
          </p>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={retryQr}
            disabled={busy}
            style={{ marginTop: 8 }}
          >
            {busy ? "Memproses..." : qrReady ? "Regenerate QR" : "Retry QR Generation"}
          </button>
          <p style={{ fontSize: 11.5, color: "#6b7280", margin: "6px 0 0" }}>
            QR ini yang dicetak & ditempel di kartu. Isinya <code>{publicUrl}</code> — sebelum kartu aktif
            membuka halaman aktivasi, setelah aktif langsung membuka Google Review toko ini. Klik Regenerate
            bila URL di atas berubah.
          </p>
        </div>

        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            <button
              type="button"
              className="btn btn-sm"
              disabled={!qrReady}
              onClick={() => triggerDownload(pngSrc, `${cardCode}-qr.png`)}
            >
              Download PNG
            </button>
            <button
              type="button"
              className="btn btn-sm"
              disabled={!qrReady}
              onClick={() => triggerDownload(svgSrc, `${cardCode}-qr.svg`)}
            >
              Download SVG
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => void copyText(publicUrl).then((ok) => flash(ok ? "Review URL dicopy" : "Gagal copy"))}
            >
              Copy Review URL
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => void copyText(nfcUrl).then((ok) => flash(ok ? "NFC URL dicopy" : "Gagal copy"))}
            >
              Copy NFC URL
            </button>
            <button
              type="button"
              className="btn btn-sm"
              disabled={!activationCode}
              onClick={() =>
                void copyText(activationCode ?? "").then((ok) =>
                  flash(ok ? "Kode Aktivasi dicopy" : "Gagal copy"),
                )
              }
            >
              Copy Kode Aktivasi
            </button>
          </div>

          {notice && <p style={{ color: "#1a7f37", fontSize: 13 }}>{notice}</p>}

          <dl style={{ display: "grid", gridTemplateColumns: "150px 1fr", rowGap: 8, margin: 0, fontSize: 13 }}>
            <dt style={{ color: "#6b7280" }}>Public Review URL</dt>
            <dd style={{ margin: 0, wordBreak: "break-all" }}>{publicUrl}</dd>
            <dt style={{ color: "#6b7280" }}>NFC URL</dt>
            <dd style={{ margin: 0, wordBreak: "break-all" }}>{nfcUrl}</dd>
            <dt style={{ color: "#6b7280" }}>Google Review URL</dt>
            <dd style={{ margin: 0, wordBreak: "break-all" }}>{googleReviewUrl ?? "-"}</dd>
          </dl>
        </div>
      </div>
    </div>
  );
}
