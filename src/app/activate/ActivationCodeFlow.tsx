"use client";

import { useRef, useState, type FormEvent } from "react";
import {
  formatActivationCodeInput,
  isCompleteActivationCodeInput,
} from "@/lib/activation-code";
import {
  hasFieldErrors,
  normalizePhoneID,
  validateActivationFields,
  type ActivationFieldErrors,
} from "@/lib/activation-input";

type CardInfo = {
  code: string;
  cardCode: string;
  storeName: string | null;
  reviewUrl: string | null;
};

type Stage = "code" | "form" | "success" | "pending" | "already" | "suspended";

const inputWrap: React.CSSProperties = { marginBottom: 16 };

export default function ActivationCodeFlow() {
  const [stage, setStage] = useState<Stage>("code");

  // Step 1 — Kode Aktivasi
  const [codeInput, setCodeInput] = useState("");
  const [card, setCard] = useState<CardInfo | null>(null);
  const [codeError, setCodeError] = useState("");
  const [codeBusy, setCodeBusy] = useState(false);
  const codeInFlight = useRef(false);

  // Step 2 — informasi bisnis
  const [storeName, setStoreName] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [fieldErrors, setFieldErrors] = useState<ActivationFieldErrors>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const formInFlight = useRef(false);

  const [result, setResult] = useState<{ storeName: string; cardCode: string; reviewUrl: string | null }>({
    storeName: "",
    cardCode: "",
    reviewUrl: null,
  });
  const [pendingReason, setPendingReason] = useState("");

  async function onVerifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (codeInFlight.current || codeBusy) return;

    setCodeError("");
    if (!isCompleteActivationCodeInput(codeInput)) {
      setCodeError("Kode aktivasi tidak lengkap. Contoh: VRC-7K4P-92MA");
      return;
    }

    codeInFlight.current = true;
    setCodeBusy(true);
    try {
      const response = await fetch("/api/activate/code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activationCode: codeInput }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        data?: {
          status?: string;
          cardCode?: string;
          code?: string;
          storeName?: string | null;
          reviewUrl?: string | null;
        };
        error?: string;
      };

      if (response.status === 409) {
        setCard({
          code: body.data?.code ?? codeInput,
          cardCode: body.data?.cardCode ?? "",
          storeName: body.data?.storeName ?? null,
          reviewUrl: null,
        });
        setStage("suspended");
        return;
      }

      if (!response.ok || !body.data?.cardCode) {
        setCodeError(body.error ?? "Kode aktivasi tidak ditemukan. Periksa kembali kode pada kartu Anda.");
        return;
      }

      const info: CardInfo = {
        code: body.data.code ?? codeInput,
        cardCode: body.data.cardCode,
        storeName: body.data.storeName ?? null,
        reviewUrl: body.data.reviewUrl ?? null,
      };
      setCard(info);

      if (body.data.status === "ACTIVE") {
        setResult({
          storeName: info.storeName ?? "",
          cardCode: info.cardCode,
          reviewUrl: info.reviewUrl,
        });
        setStage("already");
        return;
      }

      setStage("form");
    } catch {
      setCodeError("Tidak dapat menghubungi server. Periksa koneksi Anda dan coba lagi.");
    } finally {
      setCodeBusy(false);
      codeInFlight.current = false;
    }
  }

  async function onActivate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (formInFlight.current || submitting || !card) return;

    setFormError("");
    const errors = validateActivationFields({ storeName, mapsUrl, whatsapp });
    setFieldErrors(errors);
    if (hasFieldErrors(errors)) return;

    formInFlight.current = true;
    setSubmitting(true);
    try {
      const response = await fetch("/api/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activationCode: card.code,
          storeName: storeName.trim(),
          mapsUrl: mapsUrl.trim(),
          whatsappNumber: normalizePhoneID(whatsapp),
        }),
      });

      const body = (await response.json().catch(() => ({}))) as {
        data?: { status?: string; cardCode?: string; reviewUrl?: string; reason?: string };
        error?: string;
        details?: Record<string, string[]>;
      };

      if (response.ok || response.status === 202) {
        const status = body.data?.status;

        if (status === "pending") {
          setPendingReason(body.data?.reason ?? "unknown");
          setStage("pending");
          return;
        }

        setResult({
          storeName: storeName.trim(),
          cardCode: body.data?.cardCode ?? card.cardCode,
          reviewUrl: body.data?.reviewUrl ?? null,
        });
        setStage("success");
        return;
      }

      if (response.status === 422 && body.details) {
        setFieldErrors(body.details);
        setFormError("Periksa kembali data yang Anda masukkan.");
        return;
      }

      setFormError(body.error ?? "Aktivasi gagal. Silakan coba lagi.");
    } catch {
      setFormError("Tidak dapat menghubungi server. Periksa koneksi Anda dan coba lagi.");
    } finally {
      setSubmitting(false);
      formInFlight.current = false;
    }
  }

  // ---------------- Result views ----------------

  if (stage === "success" || stage === "already") {
    return (
      <div className="pub-card stack">
        <div className="pub-icon pub-icon-success">✓</div>
        <h1 className="pub-title">
          {stage === "already" ? "Kartu Sudah Aktif" : "Kartu Berhasil Diaktifkan"}
        </h1>
        <p className="pub-subtitle">{result.storeName || "Toko Anda"}</p>

        <div className="pub-cardid">
          <div className="pub-cardid-label">Card ID</div>
          <div className="pub-cardid-value">{result.cardCode || card?.cardCode || "-"}</div>
        </div>

        <p className="muted" style={{ textAlign: "center" }}>
          Kartu Anda sudah aktif. Sekarang pelanggan dapat menggunakan <strong>NFC</strong> pada kartu
          untuk memberikan review Google.
        </p>

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

  if (stage === "suspended") {
    return (
      <div className="pub-card stack">
        <div className="pub-icon pub-icon-danger">⛔</div>
        <h1 className="pub-title">Kartu Tidak Aktif</h1>
        <p className="pub-subtitle">Kartu ini sedang tidak aktif.</p>
        {card?.cardCode ? (
          <div className="pub-cardid">
            <div className="pub-cardid-label">Card ID</div>
            <div className="pub-cardid-value">{card.cardCode}</div>
          </div>
        ) : null}
        <div className="alert alert-warning">Hubungi admin Virai Review Card untuk bantuan.</div>
        <button type="button" className="btn" onClick={() => setStage("code")}>
          Kembali
        </button>
      </div>
    );
  }

  if (stage === "pending") {
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
          Kartu Anda <strong>belum aktif</strong>. Perbaiki link Google Maps lalu kirim ulang, atau
          hubungi admin.
        </p>

        <button type="button" className="btn btn-lg" onClick={() => setStage("form")}>
          Perbaiki Data
        </button>
      </div>
    );
  }

  // ---------------- Step 2: business information ----------------

  if (stage === "form" && card) {
    return (
      <form onSubmit={onActivate} noValidate>
        <div className="pub-card stack" style={{ marginBottom: 16 }}>
          <div className="pub-icon pub-icon-success">✓</div>
          <h1 className="pub-title">Kartu Ditemukan</h1>
          <p className="pub-subtitle">Kartu ini siap diaktifkan.</p>

          <div className="pub-cardid">
            <div className="pub-cardid-label">Card ID</div>
            <div className="pub-cardid-value">{card.cardCode}</div>
          </div>

          <p className="muted" style={{ textAlign: "center", fontSize: 12.5 }}>
            Kode Aktivasi: <strong>{card.code}</strong>
          </p>
        </div>

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
              Google Maps
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

          {formError ? <div className="alert alert-danger">{formError}</div> : null}

          <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}>
            {submitting ? "Mengaktifkan..." : "Aktifkan Kartu"}
          </button>

          <button
            type="button"
            className="btn"
            disabled={submitting}
            onClick={() => {
              setStage("code");
              setFormError("");
            }}
          >
            Ganti Kode Aktivasi
          </button>
        </div>
      </form>
    );
  }

  // ---------------- Step 1: Kode Aktivasi ----------------

  return (
    <form onSubmit={onVerifyCode} noValidate>
      <div className="pub-card stack">
        <h1 className="pub-title">Aktifkan Kartu Anda</h1>
        <p className="pub-subtitle">Masukkan kode yang tertera pada kartu Anda.</p>

        <div style={{ marginTop: 4 }}>
          <label className="label" htmlFor="activationCode">
            Kode Aktivasi
          </label>
          <input
            id="activationCode"
            className="input pub-code-input"
            value={codeInput}
            onChange={(event) => setCodeInput(formatActivationCodeInput(event.target.value))}
            placeholder="VRC-____-____"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            inputMode="text"
            maxLength={14}
            disabled={codeBusy}
            style={{ textAlign: "center" }}
          />
          <div className="field-help" style={{ textAlign: "center" }}>
            Contoh: VRC-7K4P-92MA — tertera di bawah QR pada kartu.
          </div>
        </div>

        {codeError ? <div className="alert alert-danger">{codeError}</div> : null}

        <button type="submit" className="btn btn-primary btn-lg" disabled={codeBusy}>
          {codeBusy ? "Memeriksa..." : "Lanjutkan"}
        </button>

        <p className="muted" style={{ textAlign: "center", fontSize: 12 }}>
          Tidak perlu login dan tidak perlu mengetik Card ID.
        </p>
      </div>
    </form>
  );
}
