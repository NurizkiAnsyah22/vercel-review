import { notFound } from "next/navigation";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import { cardStatusMeta, formatDateTimeID, orderStatusMeta } from "@/lib/status";
import { getOrderDetail } from "@/server/services/admin-queries";

export const dynamic = "force-dynamic";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "190px 1fr", gap: 12, padding: "7px 0" }}>
      <span className="muted">{label}</span>
      <span style={{ wordBreak: "break-word" }}>{children}</span>
    </div>
  );
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrderDetail(id);
  if (!order) notFound();

  const oMeta = orderStatusMeta(order.status);
  const cMeta = cardStatusMeta(order.card.status);

  return (
    <>
      <PageHeader
        title={`Order ${order.id.slice(0, 8)}`}
        subtitle={
          <span style={{ display: "inline-flex", gap: 8, marginTop: 4 }}>
            <Badge tone={oMeta.tone}>{oMeta.label}</Badge>
            <Badge tone={cMeta.tone}>{cMeta.label}</Badge>
          </span>
        }
        actions={
          <Link className="btn btn-sm" href="/admin/orders">
            ← Semua Order
          </Link>
        }
      />

      <div className="card">
        <div className="card-title">ORDER</div>
        <div className="divider" />
        <Row label="Order ID">
          <span className="mono">{order.id}</span>
        </Row>
        <Row label="Card ID">
          <Link href={`/admin/cards/${order.card.id}`} className="mono">
            {order.card.code}
          </Link>
        </Row>
        <Row label="Customer">{order.buyerName ?? "-"}</Row>
        <Row label="WhatsApp Pembeli">
          <span className="mono">{order.buyerWhatsappNumber}</span>
        </Row>
        <Row label="Store">{order.business?.name ?? order.card.business?.name ?? "-"}</Row>
        <Row label="Order Status">
          <Badge tone={oMeta.tone}>{oMeta.label}</Badge>
        </Row>
        <Row label="Card Status">
          <Badge tone={cMeta.tone}>{cMeta.label}</Badge>
        </Row>
        <Row label="Created At">{formatDateTimeID(order.createdAt)}</Row>
        <Row label="Activated At">{order.activatedAt ? formatDateTimeID(order.activatedAt) : "-"}</Row>
        {order.note ? <Row label="Catatan">{order.note}</Row> : null}
      </div>
    </>
  );
}
