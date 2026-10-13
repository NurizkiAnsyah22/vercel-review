import type { Metadata } from "next";
import ActivationCodeFlow from "./ActivationCodeFlow";

export const dynamic = "force-dynamic";

/**
 * QR MASTER landing page.
 *
 * Every printed card carries this SAME QR ({PUBLIC_APP_URL}/activate), so the
 * buyer identifies their card with the Kode Aktivasi printed on it. No login,
 * no Card ID typing, no Google Review URL / Place ID.
 */
export const metadata: Metadata = {
  title: "Aktifkan Kartu Anda — Virai Review Card",
  description: "Masukkan Kode Aktivasi yang tertera pada kartu Review Card Anda.",
  robots: { index: false, follow: false },
};

export default function ActivateEntryPage() {
  return (
    <main className="pub-page">
      <div className="pub-shell">
        <div className="pub-brand">Virai Review Card</div>
        <ActivationCodeFlow />
      </div>
    </main>
  );
}
