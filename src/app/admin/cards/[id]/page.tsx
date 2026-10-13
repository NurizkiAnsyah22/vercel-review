import { notFound } from "next/navigation";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import { buildNfcUrl, buildPublicCardUrl } from "@/lib/public-url";
import {
  cardStatusMeta,
  formatDateTimeID,
  maskToken,
  notificationStatusMeta,
  orderStatusMeta,
  qrStatusMeta,
} from "@/lib/status";
import { getCardById } from "@/server/services/card";
import CardActions from "./CardActions";
import CardQrPanel from "./CardQrPanel";
import OrderPanel from "./OrderPanel";

export const dynamic = "force-dynamic";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card">
      <div className="card-title">{title}</div>
      <div className="divider" />
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "190px 1fr",
        gap: 12,
        padding: "7px 0",
        alignItems: "center",
      }}
    >
      <span className="muted">{label}</span>
      <span style={{ wordBreak: "break-word" }}>{children}</span>
    </div>
  );
}

export default async function CardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = await getCardById(id);
  if (!card) notFound();

  const publicUrl = buildPublicCardUrl(card.publicToken);
  const nfcUrl = buildNfcUrl(card.publicToken);
  const qrReady = Boolean(card.qrGeneratedAt) && !card.qrError;

  const cMeta = cardStatusMeta(card.status);
  const oMeta = card.order ? orderStatusMeta(card.order.status) : null;
  const qrMeta = qrStatusMeta(card.qrGeneratedAt, card.qrError);
  const nMeta = card.lastNotification ? notificationStatusMeta(card.lastNotification.status) : null;

  return (
    <>
      <PageHeader
        title={card.code}
        subtitle={
          <span style={{ display: "inline-flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
            <Badge tone={cMeta.tone}>{cMeta.label}</Badge>
            {oMeta ? <Badge tone={oMeta.tone}>{oMeta.label}</Badge> : null}
            <Badge tone={qrMeta.tone}>{qrMeta.label}</Badge>
          </span>
        }
        actions={
          <Link className="btn btn-sm" href="/admin/cards">
            ← Semua Kartu
          </Link>
        }
      />

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))" }}>
        <Section title="BUSINESS">
          <Row label="Nama Toko">{card.business?.name ?? "-"}</Row>
          <Row label="WhatsApp Owner">{card.business?.whatsappNumber ?? "-"}</Row>
          <Row label="Google Maps">
            {card.business?.googleMapsUrl ? (
              <a href={card.business.googleMapsUrl} target="_blank" rel="noreferrer">
                [ Open Maps ]
              </a>
            ) : (
              "-"
            )}
          </Row>
          <Row label="Google Review">
            {card.business?.googleReviewUrl ? (
              <a href={card.business.googleReviewUrl} target="_blank" rel="noreferrer">
                [ Open Review ]
              </a>
            ) : (
              "-"
            )}
          </Row>
          <Row label="Place ID">
            <span className="mono">{card.business?.placeId ?? "-"}</span>
          </Row>
        </Section>

        <Section title="CARD">
          <Row label="Card ID">
            <span className="mono" style={{ fontWeight: 650 }}>
              {card.code}
            </span>
          </Row>
          <Row label="Public Token">
            <span className="mono" title="Disamarkan untuk keamanan">
              {maskToken(card.publicToken)}
            </span>
          </Row>
          <Row label="Public URL">
            <span className="mono">{publicUrl}</span>
          </Row>
          <Row label="NFC URL">
            <span className="mono">{nfcUrl}</span>
          </Row>
        </Section>
      </div>

      <div style={{ marginTop: 16 }}>
        <CardQrPanel
          cardId={card.id}
          cardCode={card.code}
          activationCode={card.activationCode}
          token={card.publicToken}
          publicUrl={publicUrl}
          nfcUrl={nfcUrl}
          googleReviewUrl={card.business?.googleReviewUrl ?? null}
          qrReady={qrReady}
          qrError={card.qrError}
          qrGeneratedAt={card.qrGeneratedAt ? card.qrGeneratedAt.toISOString() : null}
        />
      </div>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", marginTop: 16 }}>
        <Section title="INTERACTIONS">
          <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
            <Badge tone="brand">QR {card.interactionCounts.QR}</Badge>
            <Badge tone="info">NFC {card.interactionCounts.NFC}</Badge>
            <Badge tone="neutral">Total {card.interactionCounts.total}</Badge>
          </div>
          <Row label="Last Interaction">
            {card.lastInteraction ? formatDateTimeID(card.lastInteraction.createdAt) : "-"}
          </Row>
        </Section>

        <Section title="ACTIVATION">
          <Row label="Activated At">{card.activatedAt ? formatDateTimeID(card.activatedAt) : "-"}</Row>
          <Row label="QR Generated">
            {card.qrGeneratedAt ? formatDateTimeID(card.qrGeneratedAt) : "-"}
          </Row>
          {card.qrError ? (
            <Row label="QR Error">
              <span style={{ color: "var(--danger)" }}>{card.qrError}</span>
            </Row>
          ) : null}
        </Section>
      </div>

      <div style={{ marginTop: 16 }}>
        <Section title="NOTIFICATIONS (arsip)">
          {card.lastNotification && nMeta ? (
            <>
              <Row label="Status">
                <Badge tone={nMeta.tone}>{nMeta.label}</Badge>
              </Row>
              <Row label="Recipient">
                <span className="mono">{card.lastNotification.recipient}</span>
              </Row>
              <Row label="Sent At">
                {card.lastNotification.sentAt ? formatDateTimeID(card.lastNotification.sentAt) : "-"}
              </Row>
              {card.lastNotification.error ? (
                <Row label="Error">
                  <span style={{ color: "var(--danger)" }}>{card.lastNotification.error}</span>
                </Row>
              ) : null}
              <Row label="Lihat Semua">
                <Link href="/admin/notifications">Buka halaman Notifications</Link>
              </Row>
            </>
          ) : (
            <p className="muted">Belum ada notifikasi untuk kartu ini.</p>
          )}
        </Section>
      </div>

      <div style={{ marginTop: 16 }}>
        <OrderPanel
          cardId={card.id}
          order={
            card.order
              ? {
                  id: card.order.id,
                  status: card.order.status,
                  buyerWhatsappNumber: card.order.buyerWhatsappNumber,
                  buyerName: card.order.buyerName,
                }
              : null
          }
        />
      </div>

      <div style={{ marginTop: 16 }}>
        <CardActions cardId={card.id} status={card.status} />
      </div>

      <div style={{ marginTop: 16 }}>
        <Section title="RIWAYAT PENUGASAN">
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5 }}>
            {card.assignments.map((assignment) => (
              <li key={assignment.id} style={{ padding: "3px 0" }}>
                {formatDateTimeID(assignment.assignedAt)} — {assignment.action}
                {assignment.note ? ` (${assignment.note})` : ""}
              </li>
            ))}
            {card.assignments.length === 0 ? <li className="muted">Belum ada riwayat.</li> : null}
          </ul>
        </Section>
      </div>
    </>
  );
}
