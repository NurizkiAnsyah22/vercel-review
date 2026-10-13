import Link from "next/link";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import { cardStatusMeta, formatDateID, orderStatusMeta } from "@/lib/status";
import { listCards } from "@/server/services/card";
import { listCardsQuerySchema } from "@/server/validation/card";
import GenerateCardsForm from "./GenerateCardsForm";

export const dynamic = "force-dynamic";

const CARD_FILTERS = ["ALL", "UNACTIVATED", "PENDING", "ACTIVE", "SUSPENDED"];
const ORDER_FILTERS = [
  "WAITING_ACTIVATION",
  "ACTIVATED",
  "READY_TO_PRINT",
  "READY_TO_SHIP",
  "SHIPPED",
  "CANCELLED",
];

type SearchParams = { status?: string; orderStatus?: string; q?: string; page?: string };

function buildQuery(base: SearchParams, patch: Partial<SearchParams>): string {
  const merged = { ...base, ...patch };
  const params = new URLSearchParams();
  if (merged.q) params.set("q", merged.q);
  if (merged.status && merged.status !== "ALL") params.set("status", merged.status);
  if (merged.orderStatus && merged.orderStatus !== "ALL") params.set("orderStatus", merged.orderStatus);
  if (merged.page && merged.page !== "1") params.set("page", merged.page);
  const qs = params.toString();
  return qs ? `/admin/cards?${qs}` : "/admin/cards";
}

export default async function CardsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const parsed = listCardsQuerySchema.safeParse(params);
  const query = parsed.success ? parsed.data : { page: 1, pageSize: 20 };
  const result = await listCards(query);

  const chipStyle = (active: boolean): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
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

  return (
    <>
      <PageHeader
        title="Cards"
        subtitle={`${result.pagination.total} kartu terdaftar`}
        actions={<GenerateCardsForm />}
      />

      <div className="card" style={{ marginBottom: 16 }}>
        <form method="get" action="/admin/cards" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            className="input"
            style={{ flex: "1 1 260px" }}
            name="q"
            placeholder="Cari Card ID, toko, atau nomor WhatsApp…"
            defaultValue={params.q ?? ""}
          />
          {params.status ? <input type="hidden" name="status" value={params.status} /> : null}
          {params.orderStatus ? <input type="hidden" name="orderStatus" value={params.orderStatus} /> : null}
          <button className="btn btn-primary" type="submit">
            Cari
          </button>
          {params.q ? (
            <Link className="btn" href={buildQuery(params, { q: undefined, page: "1" })}>
              Reset
            </Link>
          ) : null}
        </form>

        <div className="divider" />

        <div>
          <span className="muted" style={{ marginRight: 8 }}>
            Status kartu:
          </span>
          {CARD_FILTERS.map((status) => (
            <Link
              key={status}
              href={buildQuery(params, { status, page: "1" })}
              style={chipStyle((params.status ?? "ALL") === status)}
            >
              {status === "ALL" ? "ALL" : cardStatusMeta(status).label}
            </Link>
          ))}
        </div>

        <div style={{ marginTop: 6 }}>
          <span className="muted" style={{ marginRight: 8 }}>
            Status produksi:
          </span>
          {ORDER_FILTERS.map((status) => (
            <Link
              key={status}
              href={buildQuery(params, { orderStatus: status, page: "1" })}
              style={chipStyle(params.orderStatus === status)}
            >
              {orderStatusMeta(status).label}
            </Link>
          ))}
        </div>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Card ID</th>
              <th>Activation Code</th>
              <th>Store</th>
              <th>Status</th>
              <th>Production</th>
              <th>WhatsApp</th>
              <th>Activated At</th>
              <th>QR</th>
              <th>NFC</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {result.items.map((card) => {
              const cardMeta = cardStatusMeta(card.status);
              const orderMeta = card.order ? orderStatusMeta(card.order.status) : null;
              return (
                <tr key={card.id}>
                  <td className="mono">
                    <Link href={`/admin/cards/${card.id}`} style={{ fontWeight: 650 }}>
                      {card.code}
                    </Link>
                  </td>
                  <td className="mono">{card.activationCode ?? "-"}</td>
                  <td>{card.business?.name ?? "-"}</td>
                  <td>
                    <Badge tone={cardMeta.tone}>{cardMeta.label}</Badge>
                  </td>
                  <td>
                    {orderMeta ? <Badge tone={orderMeta.tone}>{orderMeta.label}</Badge> : <span className="muted">-</span>}
                  </td>
                  <td className="mono">{card.business?.whatsappNumber ?? "-"}</td>
                  <td>{card.activatedAt ? formatDateID(card.activatedAt) : "-"}</td>
                  <td>
                    <Badge tone="brand">{card.interactionCounts.QR}</Badge>
                  </td>
                  <td>
                    <Badge tone="info">{card.interactionCounts.NFC}</Badge>
                  </td>
                  <td>
                    <Link className="btn btn-sm" href={`/admin/cards/${card.id}`}>
                      Detail
                    </Link>
                  </td>
                </tr>
              );
            })}
            {result.items.length === 0 ? (
              <tr>
                <td colSpan={10} className="muted">
                  Tidak ada kartu yang cocok.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 14 }}>
        {result.pagination.page > 1 ? (
          <Link className="btn btn-sm" href={buildQuery(params, { page: String(result.pagination.page - 1) })}>
            ← Sebelumnya
          </Link>
        ) : null}
        <span className="muted">
          Halaman {result.pagination.page} dari {result.pagination.totalPages}
        </span>
        {result.pagination.page < result.pagination.totalPages ? (
          <Link className="btn btn-sm" href={buildQuery(params, { page: String(result.pagination.page + 1) })}>
            Berikutnya →
          </Link>
        ) : null}
      </div>
    </>
  );
}
