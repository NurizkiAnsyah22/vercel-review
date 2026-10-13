import { NextResponse } from "next/server";
import { getAdminSession } from "@/server/auth/guard";
import { jsonError } from "@/server/http/respond";
import { listPrintableCards } from "@/server/services/printing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Production CSV for the printing house: one line per physical card.
 *
 *   Card ID,Activation Code,NFC Token,QR URL
 *   CARD-000001,VRC-7K4P-92MA,A8x91K...,https://review.virai.id/r/A8x91K...
 *
 * The QR URL column is the payload of that card's OWN QR sticker, so a printer
 * that prefers to generate the QR codes themselves has everything they need.
 * Cards whose QR asset is missing are regenerated before the file is built.
 */
export async function GET() {
  const session = await getAdminSession();
  if (!session) return jsonError("Unauthorized", 401);

  const cards = await listPrintableCards();

  const rows = [
    "Card ID,Activation Code,NFC Token,QR URL",
    ...cards.map(
      (card) =>
        `${card.code},${card.activationCode ?? ""},${card.publicToken},${card.qrUrl}`,
    ),
  ];

  return new NextResponse(`${rows.join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="virai-review-cards.csv"',
      "Cache-Control": "no-store",
    },
  });
}
