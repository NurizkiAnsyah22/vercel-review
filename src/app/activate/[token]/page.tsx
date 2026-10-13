import { prisma } from "@/server/db/client";
import ActivationForm from "./ActivationForm";

export const dynamic = "force-dynamic";

type Tone = "success" | "warning" | "danger";

function InfoCard({
  icon,
  tone,
  title,
  message,
  rows,
  action,
}: {
  icon: string;
  tone: Tone;
  title: string;
  message: string;
  rows?: Array<{ k: string; v: string }>;
  action?: { href: string; label: string };
}) {
  return (
    <div className="pub-card stack">
      <div className={`pub-icon pub-icon-${tone}`}>{icon}</div>
      <h1 className="pub-title">{title}</h1>
      <p className="pub-subtitle">{message}</p>
      {rows?.length ? (
        <ul className="pub-list">
          {rows.map((row) => (
            <li key={row.k}>
              <span className="k">{row.k}</span>
              <span className="v">{row.v}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {action ? (
        <a className="btn btn-primary btn-lg" href={action.href} target="_blank" rel="noreferrer">
          {action.label}
        </a>
      ) : null}
    </div>
  );
}

export default async function ActivatePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const card = await prisma.card.findUnique({
    where: { publicToken: token },
    include: { business: { select: { name: true, googleReviewUrl: true } } },
  });

  let content: React.ReactNode;

  if (!card) {
    content = (
      <InfoCard
        icon="🚫"
        tone="danger"
        title="Kartu Tidak Ditemukan"
        message="Kartu ini tidak terdaftar. Periksa kembali kartu Anda atau hubungi admin."
      />
    );
  } else if (card.status === "SUSPENDED") {
    content = (
      <InfoCard
        icon="⛔"
        tone="danger"
        title="Kartu Tidak Aktif"
        message="Kartu ini sedang tidak aktif. Hubungi admin untuk bantuan."
        rows={[{ k: "Card ID", v: card.code }]}
      />
    );
  } else if (card.status === "ACTIVE") {
    content = (
      <InfoCard
        icon="✅"
        tone="success"
        title="Kartu Sudah Aktif"
        message="Kartu ini sudah terhubung ke sebuah bisnis dan siap digunakan."
        rows={[
          { k: "Card ID", v: card.code },
          { k: "Toko", v: card.business?.name ?? "-" },
          { k: "Status", v: "ACTIVE" },
        ]}
        action={
          card.business?.googleReviewUrl
            ? { href: card.business.googleReviewUrl, label: "Buka Google Review" }
            : undefined
        }
      />
    );
  } else {
    // UNACTIVATED or PENDING → activation form (PENDING can be corrected & resent).
    content = (
      <>
        <div className="pub-card stack" style={{ marginBottom: 16 }}>
          <h1 className="pub-title">Aktifkan Kartu</h1>
          <p className="pub-subtitle">
            Kartu Anda belum terhubung ke bisnis apa pun.
          </p>

          <div className="pub-cardid">
            <div className="pub-cardid-label">Card ID</div>
            <div className="pub-cardid-value">{card.code}</div>
          </div>

          {card.status === "PENDING" ? (
            <div className="alert alert-warning">
              Aktivasi sebelumnya belum selesai. Silakan perbaiki data di bawah ini.
            </div>
          ) : null}

          <p className="muted" style={{ fontSize: 12.5, textAlign: "center", marginBottom: 0 }}>
            Setelah kartu aktif, QR dan NFC pada kartu ini otomatis mengarah ke Google Review toko Anda —
            pelanggan cukup scan atau tap, tanpa kode.
          </p>
        </div>

        <ActivationForm token={token} />
      </>
    );
  }

  return (
    <main className="pub-page">
      <div className="pub-shell">
        <div className="pub-brand">Virai Review Card</div>
        {content}
      </div>
    </main>
  );
}
