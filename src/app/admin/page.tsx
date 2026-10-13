import Link from "next/link";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import { formatDateTimeID, orderStatusMeta } from "@/lib/status";
import { listIncomingMessages, getNotificationStats } from "@/server/services/admin-queries";
import { getOverview } from "@/server/services/card-admin";
import { getOrderCounts } from "@/server/services/order";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const [data, orders, notifications, incoming] = await Promise.all([
    getOverview(),
    getOrderCounts(),
    getNotificationStats(),
    listIncomingMessages(8),
  ]);

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Ringkasan stok kartu, order, interaksi, dan notifikasi."
        actions={
          <Link className="btn btn-primary btn-sm" href="/admin/cards">
            Kelola Kartu
          </Link>
        }
      />

      <h2 style={{ fontSize: 14, marginBottom: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        Kartu
      </h2>
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <StatCard label="Total Cards" value={data.cards.total} />
        <StatCard label="Active" value={data.cards.active} />
        <StatCard label="Unactivated" value={data.cards.unactivated} />
        <StatCard label="Pending" value={data.cards.pending} />
        <StatCard label="Suspended" value={data.cards.suspended} />
      </div>

      <h2 style={{ fontSize: 14, marginBottom: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        Orders / Sales
      </h2>
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <StatCard label="Total Orders" value={orders.total} />
        <StatCard label="Waiting Activation" value={orders.WAITING_ACTIVATION} />
        <StatCard label="Activated" value={orders.ACTIVATED + orders.READY_TO_PRINT + orders.READY_TO_SHIP + orders.SHIPPED} />
        <StatCard label="Ready to Print" value={orders.READY_TO_PRINT} />
        <StatCard label="Shipped" value={orders.SHIPPED} />
      </div>

      <h2 style={{ fontSize: 14, marginBottom: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        Interaksi & Notifikasi
      </h2>
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <StatCard label="Total Interaction" value={data.interactions.total} />
        <StatCard label="QR Scan" value={data.interactions.qr} />
        <StatCard label="NFC Tap" value={data.interactions.nfc} />
        <StatCard label="Notif Terkirim" value={notifications.SENT ?? 0} />
        <StatCard label="Notif Gagal" value={notifications.FAILED ?? 0} />
      </div>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))" }}>
        <section>
          <h2 style={{ fontSize: 15, marginBottom: 10 }}>Aktivitas Interaksi Terbaru</h2>
          <div className="table-wrap">
            <table className="table" style={{ minWidth: 520 }}>
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Kartu</th>
                  <th>Toko</th>
                  <th>Sumber</th>
                </tr>
              </thead>
              <tbody>
                {data.recentInteractions.map((interaction) => (
                  <tr key={interaction.id}>
                    <td>{formatDateTimeID(interaction.createdAt)}</td>
                    <td className="mono">{interaction.card.code}</td>
                    <td>{interaction.business?.name ?? "-"}</td>
                    <td>
                      <Badge tone={interaction.source === "QR" ? "brand" : interaction.source === "NFC" ? "info" : "neutral"}>
                        {interaction.source}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {data.recentInteractions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="muted">
                      Belum ada interaksi.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 style={{ fontSize: 15, marginBottom: 10 }}>Riwayat Pesan Masuk (arsip)</h2>
          <div className="table-wrap">
            <table className="table" style={{ minWidth: 520 }}>
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Dari</th>
                  <th>Hasil</th>
                </tr>
              </thead>
              <tbody>
                {incoming.map((message) => (
                  <tr key={message.id}>
                    <td>{formatDateTimeID(message.createdAt)}</td>
                    <td className="mono">{message.fromNumber}</td>
                    <td>
                      <Badge
                        tone={
                          message.result === "ACTIVATED"
                            ? "success"
                            : message.result === "ERROR" || message.result === "NO_ORDER"
                              ? "danger"
                              : "warning"
                        }
                      >
                        {message.result}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {incoming.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="muted">
                      Belum ada pesan masuk.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 15, marginBottom: 10 }}>Ringkasan Status Produksi</h2>
        <div className="card" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {(["WAITING_ACTIVATION", "ACTIVATED", "READY_TO_PRINT", "READY_TO_SHIP", "SHIPPED"] as const).map(
            (status) => (
              <Badge key={status} tone={orderStatusMeta(status).tone}>
                {orderStatusMeta(status).label}: {orders[status] ?? 0}
              </Badge>
            ),
          )}
        </div>
      </div>
    </>
  );
}
