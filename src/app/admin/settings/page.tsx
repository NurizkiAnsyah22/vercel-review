import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import { getPublicAppUrl } from "@/lib/public-url";
import { getEnv } from "@/server/config/env";

export const dynamic = "force-dynamic";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "230px 1fr", gap: 12, padding: "8px 0" }}>
      <span className="muted">{label}</span>
      <span style={{ wordBreak: "break-word" }}>{children}</span>
    </div>
  );
}

export default async function SettingsPage() {
  const env = getEnv();

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Konfigurasi yang sedang aktif. Semua nilai di bawah read-only (diatur lewat environment server)."
      />

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))" }}>
        <section className="card">
          <div className="card-title">PUBLIC URL & QR</div>
          <div className="divider" />
          <Row label="Public App URL (QR/NFC)">
            <span className="mono">{getPublicAppUrl()}</span>
          </Row>
          <Row label="App Base URL">
            <span className="mono">{env.APP_BASE_URL}</span>
          </Row>
          <Row label="Environment">{env.NODE_ENV}</Row>
          <p className="muted" style={{ marginTop: 8 }}>
            URL pada QR/NFC selalu memakai Public App URL. Gambar QR dibuat on demand dari token kartu
            (tanpa penyimpanan file lokal).
          </p>
        </section>

        <section className="card">
          <div className="card-title">AKTIVASI</div>
          <div className="divider" />
          <Row label="Google Places API">
            {env.GOOGLE_PLACES_API_KEY ? (
              <Badge tone="success">Terkonfigurasi</Badge>
            ) : (
              <Badge tone="warning">Tidak dipakai (aktivasi gratis via Maps URL)</Badge>
            )}
          </Row>
          <Row label="Rate limit /r">{`${env.RATE_LIMIT_REDIRECT_PER_MINUTE} / menit`}</Row>
          <Row label="Rate limit aktivasi">{`${env.RATE_LIMIT_ACTIVATE_PER_HOUR} / jam`}</Row>
        </section>

        <section className="card">
          <div className="card-title">BELUM TERSEDIA (placeholder)</div>
          <div className="divider" />
          <p className="muted">
            Item berikut <strong>belum memiliki backend</strong> di project ini, jadi sengaja tidak
            diaktifkan:
          </p>
          <ul className="muted" style={{ marginTop: 8, paddingLeft: 18 }}>
            <li>Edit profil admin / multi-user & role (saat ini satu admin dari environment).</li>
            <li>Pengaturan pembayaran / invoice.</li>
            <li>Integrasi Google Business Profile (OAuth) — di luar MVP.</li>
          </ul>
        </section>
      </div>
    </>
  );
}
