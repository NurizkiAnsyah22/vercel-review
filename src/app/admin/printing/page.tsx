import Link from "next/link";
import CopyButton from "@/components/ui/CopyButton";
import PageHeader from "@/components/ui/PageHeader";
import { listPrintableCards } from "@/server/services/printing";
import GenerateCardsForm from "../cards/GenerateCardsForm";

export const dynamic = "force-dynamic";

/**
 * Printing workflow (production).
 *
 * There is NO shared "QR master" anymore: every card carries its OWN QR sticker.
 * The same QR is dual purpose — it opens the activation form while the card is
 * inactive, and redirects to that card's Google Review URL once active.
 * The printing house receives one generated file (print sheet / CSV).
 */
export default async function PrintingPage() {
  const [cards, allCards] = await Promise.all([
    listPrintableCards({ limit: 25 }),
    listPrintableCards(),
  ]);

  const withoutQr = allCards.filter((card) => !card.qrReady).length;
  const unactivated = allCards.filter((card) => card.status === "UNACTIVATED").length;

  return (
    <>
      <PageHeader
        title="Printing — QR per Kartu"
        subtitle="Setiap kartu punya QR sendiri. Setelah aktivasi, QR itu otomatis mengarah ke Google Review toko kartu tersebut."
      />

      <div className="alert alert-info" style={{ marginBottom: 16 }}>
        <strong>Cara kerja:</strong> cetak QR kartu → tempel ke kartu → buyer scan dan mengisi data toko
        (tanpa kode) → kartu ACTIVE → scan QR berikutnya langsung membuka <strong>Google Review</strong>{" "}
        toko itu. NFC pada kartu memakai URL yang sama.
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">1. PRINT SHEET (1 FILE SIAP CETAK)</div>
        <div className="divider" />

        <p className="muted" style={{ marginTop: 0 }}>
          Buka print sheet, lalu cetak A4 atau simpan sebagai PDF (<em>Print → Save as PDF</em>). Kirim satu
          file itu ke percetakan: setiap kotak sudah berisi QR unik + Card ID + Kode Aktivasi kartu tersebut.
        </p>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <Link className="btn btn-primary btn-sm" href="/admin/printing/sheet?status=UNACTIVATED&limit=24">
            Print Sheet — kartu belum aktif ({unactivated})
          </Link>
          <Link className="btn btn-sm" href="/admin/printing/sheet?status=ALL&limit=24">
            Print Sheet — semua kartu
          </Link>
        </div>

        <p className="muted" style={{ fontSize: 12, marginTop: 12, marginBottom: 0 }}>
          Spesifikasi cetak QR: ukuran minimal 20×20 mm, error correction M, quiet zone kosong minimal 4
          modul. Jangan menimpa QR dengan desain gelap.
        </p>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">2. DATA PRODUKSI (CSV)</div>
        <div className="divider" />

        <p className="muted" style={{ marginTop: 0 }}>
          Satu baris per kartu: <code>Card ID,Activation Code,NFC Token,QR URL</code>. Gunakan ini bila
          percetakan ingin membuat QR sendiri dari data.
        </p>

        {withoutQr > 0 ? (
          <div className="alert alert-warning">
            {withoutQr} kartu QR-nya belum siap (akan dibuat otomatis saat file ini diunduh).
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <a className="btn btn-primary btn-sm" href="/api/admin/export/cards" download>
            Download CSV ({allCards.length} kartu)
          </a>
          <span className="muted" style={{ fontSize: 12 }}>
            Contoh baris: CARD-000001,VRC-7K4P-92MA,A8x91Kxxxxxxxxxxxx,https://review.virai.id/r/A8x91K…
          </span>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">3. GENERATE BATCH KARTU</div>
        <div className="divider" />
        <p className="muted" style={{ marginTop: 0 }}>
          Setiap kartu baru otomatis mendapat Card ID, Kode Aktivasi unik, NFC Token unik, dan{" "}
          <strong>QR unik</strong> yang siap dicetak (tidak perlu menunggu aktivasi).
        </p>
        <GenerateCardsForm />
      </div>

      <div className="card">
        <div className="card-title">KARTU TERBARU (25)</div>
        <div className="divider" />

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Card ID</th>
                <th>Activation Code</th>
                <th>QR</th>
                <th>QR URL (isi QR)</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {cards.map((card) => (
                <tr key={card.id}>
                  <td className="mono">{card.code}</td>
                  <td className="mono">{card.activationCode ?? "-"}</td>
                  <td>{card.qrReady ? "✅ siap" : "⚠️ belum"}</td>
                  <td className="mono" style={{ wordBreak: "break-all", maxWidth: 260 }}>
                    <CopyButton value={card.qrUrl} label="Copy" className="btn btn-sm" successMessage="✓" />
                    <span style={{ marginLeft: 8, fontSize: 12 }}>{card.qrUrl}</span>
                  </td>
                  <td>{card.status}</td>
                  <td>
                    <Link className="btn btn-sm" href={`/admin/cards/${card.id}`}>
                      Detail
                    </Link>
                  </td>
                </tr>
              ))}
              {cards.length === 0 ? (
                <tr>
                  <td colSpan={6} className="muted">
                    Belum ada kartu. Gunakan Generate Batch di atas.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
