"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        router.push("/admin");
        router.refresh();
        return;
      }

      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Email atau password salah.");
    } catch {
      setError("Tidak dapat menghubungi server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="pub-page" style={{ alignItems: "center" }}>
      <div className="pub-shell" style={{ maxWidth: 400 }}>
        <div className="pub-brand">Virai Review Card</div>

        <div className="pub-card">
          <h1 className="pub-title" style={{ fontSize: 22 }}>
            Masuk Admin
          </h1>
          <p className="pub-subtitle" style={{ marginBottom: 18 }}>
            Kelola kartu, order, dan notifikasi.
          </p>

          <form onSubmit={onSubmit} noValidate>
            <div style={{ marginBottom: 14 }}>
              <label className="label" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                className="input"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@virai.id"
                disabled={loading}
                required
              />
            </div>

            <div style={{ marginBottom: 18 }}>
              <label className="label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                className="input"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                disabled={loading}
                required
              />
            </div>

            {error ? <div className="alert alert-danger" style={{ marginBottom: 14 }}>{error}</div> : null}

            <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner" aria-hidden />
                  Memproses...
                </>
              ) : (
                "Masuk"
              )}
            </button>
          </form>
        </div>

        <p className="pub-legal">Akses khusus admin Virai Review Card.</p>
      </div>
    </main>
  );
}
