"use client";

import { useRef, useState, type FormEvent } from "react";
import {
  hasFieldErrors,
  normalizePhoneID,
  validateActivationFields,
} from "@/lib/activation-input";

// Kept for backwards compatibility with earlier imports.
export { normalizePhoneID } from "@/lib/activation-input";

type View = "form" | "success" | "pending";

const inputWrap: React.CSSProperties = { marginBottom: 16 };

export default function ActivationForm({ token }: { token: string }) {
  const [storeName, setStoreName] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  const [view, setView] = useState<View>("form");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [result, setResult] = useState<{
    storeName: string;
    cardCode: string;
    reviewUrl: string | null;
    qrFailed: boolean;
  }>({
    storeName: "",
    cardCode: "",
    reviewUrl: null,
    qrFailed: false,
  });
  const [pendingReason, setPendingReason] = useState("");

  // Hard guard against duplicate submits (double tap / slow network).
  const inFlight = useRef(false);

  function validate(): boolean {
    const next = validateActivationFields({ storeName, mapsUrl, whatsapp });
    setFieldErrors(next);
    return !hasFieldErrors(next);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || submitting) return;
    setError("");
    if (!validate()) return;

    inFlight.current = true;
    setSubmitting(true);

    try {
      const response = await fetch("/api/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          storeName: storeName.trim(),
          mapsUrl: mapsUrl.trim(),
          whatsappNumber: normalizePhoneID(whatsapp),
        }),
      });

      const body = (await response.json().catch(() => ({}))) as {
        data?: {
          status?: string;
          cardCode?: string;
          reviewUrl?: string;
          reason?: string;
          qr?: string;
        };
        error?: string;
        details?: Record<string, string[]>;
      };

      if (response.ok || response.status === 202) {
        const status = body.data?.status;

        if (status === "pending") {
          setPendingReason(body.data?.reason ?? "unknown");
          setView("pending");
          return;
        }

        // "already_active" is idempotent: the card stays ACTIVE and is never
        // taken over; show the same success screen with its review link.
        setResult({
          storeName: storeName.trim(),
          cardCode: body.data?.cardCode ?? "",
          reviewUrl: body.data?.reviewUrl ?? null,
          qrFailed: body.data?.qr === "FAILED",
        });
        setView("success");
        return;
      }

      if (response.status === 422 && body.details) {
        setFieldErrors(body.details);
        setError("Periksa kembali data yang Anda masukkan.");
        return;
      }

      setError(body.error ?? "Aktivasi gagal. Silakan coba lagi.");
    } catch {
      setError("Tidak dapat menghubungi server. Periksa koneksi Anda dan coba lagi.");
    } finally {
      setSubmitting(false);
      inFlight.current = false;
    }
  }

  if (view === "success") {
    return (
      <div className="pub-card stack">
        <div className="pub-icon pub-icon-success">✅</div>
        <h1 className="pub-title">Kartu Berhasil Diaktifkan</h1>
        <p className="pub-subtitle">Kartu Review Anda sekarang sudah aktif.</p>

        <ul className="pub-list">
          <li>
            <span className="k">Card ID</span>
            <span className="v">{result.cardCode || "-"}</span>
          </li>
          <li>
            <span className="k">Toko</span>
            <span className="v">{result.storeName}</span>
          </li>
          <li>
            <span className="k">Status</span>
            <span className="v">ACTIVE</span>
          </li>
          <li>
            <span className="k">QR & NFC</span>
            <span className="v">{result.qrFailed ? "Menunggu admin" : "Siap digunakan"}</span>
          </li>
        </ul>

        {result.qrFailed ? (
          <div className="alert alert-warning">
            Kartu sudah aktif, tetapi QR belum berhasil dibuat otomatis. Admin akan membuat ulang QR —
            QR & NFC tetap mengarah ke kartu ini.
          </div>
        ) : (
          <p className="muted" style={{ textAlign: "center" }}>
            QR dan NFC pada kartu ini sudah siap digunakan untuk menerima review Google.
          </p>
        )}

        {result.reviewUrl ? (
          <a className="btn btn-primary btn-lg" href={result.reviewUrl} target="_blank" rel="noreferrer">
            Buka Google Review
          </a>
        ) : null}

        <button type="button" className="btn" onClick={() => window.close()}>
          Selesai
        </button>
      </div>
    );
  }

  if (view === "pending") {
    return (
      <div className="pub-card stack">
        <div className="pub-icon pub-icon-warning">⏳</div>
        <h1 className="pub-title">Aktivasi Belum Selesai</h1>
        <p className="pub-subtitle">
          Data toko sudah kami terima, tetapi link Google Maps belum bisa diproses otomatis.
        </p>

        <div className="alert alert-warning">
          {pendingReason === "place_id_not_found" || pendingReason === "not_configured"
            ? "Link Google Maps tidak dapat ditemukan. Pastikan link mengarah ke bisnis yang benar (gunakan tombol Bagikan di Google Maps)."
            : "Data perlu diperiksa oleh admin. Kartu belum aktif."}
        </div>

        <p className="muted" style={{ textAlign: "center" }}>
          Kartu Anda <strong>belum aktif</strong>. Silakan perbaiki link Google Maps lalu kirim ulang, atau
          hubungi admin.
        </p>

        <button type="button" className="btn btn-lg" onClick={() => setView("form")}>
          Perbaiki Data
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="pub-card stack">
        <div className="pub-section-title">Informasi Bisnis</div>

        <div style={inputWrap}>
          <label className="label" htmlFor="storeName">
            Nama Toko
          </label>
          <input
            id="storeName"
            className="input"
            value={storeName}
            onChange={(event) => setStoreName(event.target.value)}
            placeholder="Contoh: Warung Maju Jaya"
            maxLength={160}
            autoComplete="organization"
            disabled={submitting}
          />
          {fieldErrors.storeName ? <div className="field-error">{fieldErrors.storeName[0]}</div> : null}
        </div>

        <div style={inputWrap}>
          <label className="label" htmlFor="mapsUrl">
            Link Google Maps
          </label>
          <input
            id="mapsUrl"
            className="input"
            value={mapsUrl}
            onChange={(event) => setMapsUrl(event.target.value)}
            placeholder="https://maps.app.goo.gl/..."
            inputMode="url"
            autoComplete="off"
            disabled={submitting}
          />
          <div className="field-help">
            Buka toko Anda di Google Maps → Bagikan → Salin link, lalu tempel di sini.
          </div>
          {fieldErrors.mapsUrl ? <div className="field-error">{fieldErrors.mapsUrl[0]}</div> : null}
        </div>

        <div style={inputWrap}>
          <label className="label" htmlFor="whatsappNumber">
            Nomor WhatsApp
          </label>
          <input
            id="whatsappNumber"
            className="input"
            value={whatsapp}
            onChange={(event) => setWhatsapp(event.target.value)}
            placeholder="081234567890"
            inputMode="tel"
            autoComplete="tel"
            disabled={submitting}
          />
          <div className="field-help">Nomor kontak toko (disimpan sebagai data kontak).</div>
          {fieldErrors.whatsappNumber ? (
            <div className="field-error">{fieldErrors.whatsappNumber[0]}</div>
          ) : null}
        </div>

        {error ? <div className="alert alert-danger">{error}</div> : null}

        <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}>
          {submitting ? (
            <>
              <span className="spinner" aria-hidden />
              Mengaktifkan kartu...
            </>
          ) : (
            "Aktifkan Kartu"
          )}
        </button>

        <p className="pub-legal">
          Dengan mengaktifkan kartu ini, Anda menyetujui bahwa data bisnis digunakan untuk konfigurasi
          Review Card.
        </p>
      </div>
    </form>
  );
}
