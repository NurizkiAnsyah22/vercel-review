import Link from "next/link";
import type { CardStatus } from "@prisma/client";
import PrintButton from "@/components/ui/PrintButton";
import PageHeader from "@/components/ui/PageHeader";
import { listPrintableCards } from "@/server/services/printing";

export const dynamic = "force-dynamic";

const STATUS_OPTIONS: Array<{ value: "UNACTIVATED" | "ACTIVE" | "ALL"; label: string }> = [
  { value: "UNACTIVATED", label: "Belum aktif (untuk dicetak & ditempel)" },
  { value: "ACTIVE", label: "Sudah aktif" },
  { value: "ALL", label: "Semua kartu" },
];

function resolveStatuses(status: string | undefined): CardStatus[] | undefined {
  if (!status || status === "ALL") return undefined;
  const allowed: CardStatus[] = ["UNACTIVATED", "PENDING", "ACTIVE", "SUSPENDED"];
  return allowed.includes(status as CardStatus) ? [status as CardStatus] : ["UNACTIVATED"];
}

/**
 * Print sheet: one cell per card, each containing THAT card's own QR sticker.
 * Printed on A4 (or saved as PDF) → the printing house receives one single file
 * even though every QR is unique.
 */
export default async function PrintingSheetPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; limit?: string }>;
}) {
  const params = await searchParams;
  const status = params.status ?? "UNACTIVATED";
  const limit = Math.min(Math.max(Number(params.limit ?? 24) || 24, 1), 300);

  const cards = await listPrintableCards({ statuses: resolveStatuses(status), limit });

  return (
    <>
      <div className="no-print">
        <PageHeader
          title="Print Sheet — QR per Kartu"
          subtitle="Cetak A4 atau simpan sebagai PDF, lalu kirim SATU file ini ke percetakan. Setiap kartu punya QR-nya sendiri."
          actions={
            <>
              <PrintButton />
              <Link className="btn" href="/admin/printing">
                ← Kembali
              </Link>
            </>
          }
        />

        <div className="alert alert-warning" style={{ marginBottom: 16 }}>
          <strong>Penting:</strong> QR di setiap kotak <em>berbeda</em> dan hanya boleh ditempel pada kartu
          dengan Card ID yang sama. Setelah kartu aktif, QR yang sama otomatis membuka Google Review toko
          pemilik kartu itu.
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          {STATUS_OPTIONS.map((option) => (
            <Link
              key={option.value}
              className={option.value === status ? "btn btn-sm btn-primary" : "btn btn-sm"}
              href={`/admin/printing/sheet?status=${option.value}&limit=${limit}`}
            >
              {option.label}
            </Link>
          ))}
          <span className="muted" style={{ alignSelf: "center", fontSize: 12 }}>
            {cards.length} kartu (maks. {limit})
          </span>
        </div>
      </div>

      <div className="print-sheet">
        <div className="print-sheet-head">
          Virai Review Card — Print Sheet ({cards.length} kartu)
        </div>

        <div className="print-grid">
          {cards.map((card) => (
            <div className="print-cell" key={card.id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="print-qr"
                src={`/api/qr/${card.publicToken}?format=png`}
                alt={`QR ${card.code}`}
                width={150}
                height={150}
              />
              <div className="print-cell-code">{card.code}</div>
              <div className="print-cell-code-kecil">{card.activationCode ?? "-"}</div>
              <div className="print-cell-note">Scan untuk review</div>
              <div className="print-cell-token">{card.nfcUrl}</div>
            </div>
          ))}

          {cards.length === 0 ? (
            <div className="muted">Tidak ada kartu untuk kriteria ini.</div>
          ) : null}
        </div>
      </div>
    </>
  );
}
