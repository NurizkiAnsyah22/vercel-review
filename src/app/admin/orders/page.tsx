import Link from "next/link";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import { cardStatusMeta, formatDateTimeID, orderStatusMeta } from "@/lib/status";
import { listOrdersWithCards } from "@/server/services/admin-queries";
import { getOrderCounts } from "@/server/services/order";

export const dynamic = "force-dynamic";

const FILTERS = ["ALL", "WAITING_ACTIVATION", "ACTIVATED", "READY_TO_PRINT", "READY_TO_SHIP", "SHIPPED", "CANCELLED"];

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const params = await searchParams;
  const status = params.status && params.status !== "ALL" ? params.status : undefined;

  const [orders, counts] = await Promise.all([
    listOrdersWithCards({ status, search: params.q }),
    getOrderCounts(),
  ]);

  const chip = (active: boolean): React.CSSProperties => ({
    display: "inline-flex",
    padding: "5px 12px",
    borderRadius: 999,
    fontSize: 12.5,
    fontWeight: 620,
    border: `1px solid ${active ? "var(--brand)" : "var(--border)"}`,
    background: active ? "var(--brand)" : "var(--surface)",
    color: active ? "#fff" : "var(--text)",
    marginRight: 6,
    marginBottom: 6,
  });

  const href = (patch: { status?: string; q?: string }) => {
    const sp = new URLSearchParams();
    const nextStatus = patch.status ?? status;
    const nextQ = patch.q ?? params.q;
    if (nextStatus && nextStatus !== "ALL") sp.set("status", nextStatus);
    if (nextQ) sp.set("q", nextQ);
    const qs = sp.toString();
    return qs ? `/admin/orders?${qs}` : "/admin/orders";
  };

  return (
    <>
      <PageHeader title="Orders / Sales" subtitle={`${counts.total} order tercatat`} />

      <div className="stat-grid" style={{ marginBottom: 16 }}>
        {(["WAITING_ACTIVATION", "ACTIVATED", "READY_TO_PRINT", "READY_TO_SHIP", "SHIPPED"] as const).map(
          (key) => (
            <div className="stat" key={key}>
              <div className="stat-label">{orderStatusMeta(key).label}</div>
              <div className="stat-value">{counts[key] ?? 0}</div>
            </div>
          ),
        )}
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <form method="get" action="/admin/orders" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            className="input"
            style={{ flex: "1 1 260px" }}
            name="q"
            placeholder="Cari Card ID, nama, atau nomor pembeli…"
            defaultValue={params.q ?? ""}
          />
          {status ? <input type="hidden" name="status" value={status} /> : null}
          <button className="btn btn-primary" type="submit">
            Cari
          </button>
        </form>
        <div className="divider" />
        {FILTERS.map((value) => (
          <Link key={value} href={href({ status: value })} style={chip((status ?? "ALL") === value)}>
            {value === "ALL" ? "ALL" : orderStatusMeta(value).label}
          </Link>
        ))}
      </div>

      {orders.length === 0 ? (
        <EmptyState
          title="Belum ada order"
          message="Order dibuat dari halaman detail kartu (panel Order / Produksi)."
        />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Card ID</th>
                <th>Store</th>
                <th>Customer</th>
                <th>WhatsApp</th>
                <th>Order Status</th>
                <th>Card Status</th>
                <th>Created</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const oMeta = orderStatusMeta(order.status);
                const cMeta = cardStatusMeta(order.card.status);
                return (
                  <tr key={order.id}>
                    <td className="mono">{order.card.code}</td>
                    <td>{order.business?.name ?? order.card.code ? (order.business?.name ?? "-") : "-"}</td>
                    <td>{order.buyerName ?? "-"}</td>
                    <td className="mono">{order.buyerWhatsappNumber}</td>
                    <td>
                      <Badge tone={oMeta.tone}>{oMeta.label}</Badge>
                    </td>
                    <td>
                      <Badge tone={cMeta.tone}>{cMeta.label}</Badge>
                    </td>
                    <td>{formatDateTimeID(order.createdAt)}</td>
                    <td>
                      <Link className="btn btn-sm" href={`/admin/orders/${order.id}`}>
                        Detail
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
