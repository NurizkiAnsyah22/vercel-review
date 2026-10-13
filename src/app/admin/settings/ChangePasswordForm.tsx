"use client";

import { useState, type FormEvent } from "react";

const inputWrap: React.CSSProperties = { marginBottom: 14 };

export default function ChangePasswordForm({ email }: { email: string }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (newPassword.length < 8) {
      setError("Password baru minimal 8 karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Konfirmasi password tidak sama dengan password baru.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/admin/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        data?: { message?: string };
        error?: string;
        details?: Record<string, string[]>;
      };

      if (!response.ok) {
        setError(body.error ?? "Gagal mengubah password.");
        return;
      }

      setMessage(body.data?.message ?? "Password berhasil diubah.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setError("Tidak dapat menghubungi server. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <div style={inputWrap}>
        <label className="label" htmlFor="currentPassword">
          Password Saat Ini
        </label>
        <input
          id="currentPassword"
          className="input"
          type="password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          autoComplete="current-password"
          disabled={busy}
        />
      </div>

      <div style={inputWrap}>
        <label className="label" htmlFor="newPassword">
          Password Baru
        </label>
        <input
          id="newPassword"
          className="input"
          type="password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          autoComplete="new-password"
          disabled={busy}
        />
        <div className="field-help">Minimal 8 karakter.</div>
      </div>

      <div style={inputWrap}>
        <label className="label" htmlFor="confirmPassword">
          Konfirmasi Password Baru
        </label>
        <input
          id="confirmPassword"
          className="input"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          autoComplete="new-password"
          disabled={busy}
        />
      </div>

      {error ? <div className="alert alert-danger">{error}</div> : null}
      {message ? <div className="alert alert-success">{message}</div> : null}

      <button type="submit" className="btn btn-primary btn-lg" disabled={busy}>
        {busy ? "Menyimpan..." : "Ubah Password"}
      </button>

      <p className="muted" style={{ fontSize: 12, marginTop: 10, marginBottom: 0 }}>
        Password untuk akun: <span className="mono">{email}</span>
      </p>
    </form>
  );
}
