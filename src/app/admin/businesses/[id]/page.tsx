import { notFound } from "next/navigation";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import { cardStatusMeta, formatDateTimeID } from "@/lib/status";
import { getBusinessDetail } from "@/server/services/business";

export const dynamic = "force-dynamic";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 12, padding: "7px 0" }}>
      <span className="muted">{label}</span>
      <span style={{ wordBreak: "break-word" }}>{children}</span>
    </div>
  );
}

export default async function BusinessDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const business = await getBusinessDetail(id);
  if (!business) notFound();

  return (
    <>
      <PageHeader
        title={business.name}
        subtitle={
          <span style={{ display: "inline-flex", gap: 8, marginTop: 4 }}>
            <Badge tone={business.status === "ACTIVE" ? "success" : "warning"}>{business.status}</Badge>
            <span className="muted">{business.cards.length} kartu</span>
          </span>
        }
        actions={
          <Link className="btn btn-sm" href="/admin/customers">
            ← Customers
          </Link>
        }
      />

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))" }}>
        <section className="card">
          <div className="card-title">BUSINESS</div>
          <div className="divider" />
          <Row label="Nomor WhatsApp">
            <span className="mono">{business.whatsappNumber}</span>
          </Row>
          <Row label="Owner">{business.owner.name}</Row>
          <Row label="Google Maps">
            {business.googleMapsUrl ? (
              <a href={business.googleMapsUrl} target="_blank" rel="noreferrer">
                [ Open Maps ]
              </a>
            ) : (
              "-"
            )}
          </Row>
          <Row label="Google Review">
            {business.googleReviewUrl ? (
              <a href={business.googleReviewUrl} target="_blank" rel="noreferrer">
                [ Open Review ]
              </a>
            ) : (
              "-"
            )}
          </Row>
          <Row label="Place ID">
            <span className="mono">{business.placeId ?? "-"}</span>
          </Row>
        </section>

        <section className="card">
          <div className="card-title">MONITORING</div>
          <div className="divider" />
          {business.monitoringJobs.length === 0 ? (
            <p className="muted">Belum ada monitoring window.</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5 }}>
              {business.monitoringJobs.map((job) => (
                <li key={job.id} style={{ padding: "3px 0" }}>
                  {formatDateTimeID(job.createdAt)} — {job.status}
                  {job.lastError ? ` (${job.lastError})` : ""}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card" style={{ marginTop: 16 }}>
        <div className="card-title">KARTU DALAM BISNIS INI</div>
        <div className="divider" />
        <div className="table-wrap" style={{ boxShadow: "none" }}>
          <table className="table" style={{ minWidth: 520 }}>
            <thead>
              <tr>
                <th>Card ID</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {business.cards.map((card) => {
                const meta = cardStatusMeta(card.status);
                return (
                  <tr key={card.id}>
                    <td className="mono">{card.code}</td>
                    <td>
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                    </td>
                    <td>
                      <Link className="btn btn-sm" href={`/admin/cards/${card.id}`}>
                        Detail
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {business.cards.length === 0 ? (
                <tr>
                  <td colSpan={3} className="muted">
                    Belum ada kartu.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
