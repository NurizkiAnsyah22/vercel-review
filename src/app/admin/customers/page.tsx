import Link from "next/link";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import { formatDateID } from "@/lib/status";
import { listCustomers } from "@/server/services/admin-queries";

export const dynamic = "force-dynamic";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const owners = await listCustomers(params.q);

  return (
    <>
      <PageHeader
        title="Customers"
        subtitle="Pemilik bisnis yang berasal dari aktivasi kartu (data nyata dari tabel Owner)."
      />

      <div className="card" style={{ marginBottom: 16 }}>
        <form method="get" action="/admin/customers" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            className="input"
            style={{ flex: "1 1 260px" }}
            name="q"
            placeholder="Cari nama pemilik, nomor, atau nama toko…"
            defaultValue={params.q ?? ""}
          />
          <button className="btn btn-primary" type="submit">
            Cari
          </button>
        </form>
      </div>

      {owners.length === 0 ? (
        <EmptyState title="Belum ada customer" message="Customer akan muncul setelah ada kartu yang diaktivasi." />
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {owners.map((owner) => (
            <div className="card" key={owner.id}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{owner.name}</div>
                  <div className="muted mono">{owner.whatsappNumber}</div>
                </div>
                <div className="muted">Terdaftar {formatDateID(owner.createdAt)}</div>
              </div>

              <div className="divider" />

              <div className="table-wrap" style={{ boxShadow: "none" }}>
                <table className="table" style={{ minWidth: 640 }}>
                  <thead>
                    <tr>
                      <th>Toko</th>
                      <th>Nomor</th>
                      <th>Kartu</th>
                      <th>Place ID</th>
                      <th>Google Review</th>
                    </tr>
                  </thead>
                  <tbody>
                    {owner.businesses.map((business) => (
                      <tr key={business.id}>
                        <td>
                          <Link href={`/admin/businesses/${business.id}`}>{business.name}</Link>
                        </td>
                        <td className="mono">{business.whatsappNumber}</td>
                        <td>
                          <Badge tone="neutral">{business._count.cards} kartu</Badge>
                        </td>
                        <td className="mono">{business.placeId ? `${business.placeId.slice(0, 10)}…` : "-"}</td>
                        <td>
                          {business.googleReviewUrl ? (
                            <a href={business.googleReviewUrl} target="_blank" rel="noreferrer">
                              [ Open ]
                            </a>
                          ) : (
                            "-"
                          )}
                        </td>
                      </tr>
                    ))}
                    {owner.businesses.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="muted">
                          Belum ada bisnis.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
