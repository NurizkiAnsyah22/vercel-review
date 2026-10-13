export type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "brand";

export type StatusMeta = { label: string; tone: Tone };

/** Technical card status → human label + badge tone. */
export function cardStatusMeta(status: string): StatusMeta {
  switch (status) {
    case "ACTIVE":
      return { label: "Active", tone: "success" };
    case "UNACTIVATED":
      return { label: "Unactivated", tone: "neutral" };
    case "PENDING":
      return { label: "Pending", tone: "warning" };
    case "SUSPENDED":
      return { label: "Suspended", tone: "danger" };
    default:
      return { label: status, tone: "neutral" };
  }
}

/** Order / production status → human label + badge tone. */
export function orderStatusMeta(status: string): StatusMeta {
  switch (status) {
    case "WAITING_ACTIVATION":
      return { label: "Waiting Activation", tone: "warning" };
    case "ACTIVATION_RECEIVED":
      return { label: "Activation Received", tone: "info" };
    case "PROCESSING":
      return { label: "Processing", tone: "info" };
    case "ACTIVATED":
      return { label: "Activated", tone: "brand" };
    case "READY_TO_PRINT":
      return { label: "Ready to Print", tone: "success" };
    case "READY_TO_SHIP":
      return { label: "Ready to Ship", tone: "success" };
    case "SHIPPED":
      return { label: "Shipped", tone: "neutral" };
    case "PAID":
      return { label: "Paid", tone: "info" };
    case "CANCELLED":
      return { label: "Cancelled", tone: "danger" };
    default:
      return { label: status, tone: "neutral" };
  }
}

export function notificationStatusMeta(status: string): StatusMeta {
  switch (status) {
    case "SENT":
      return { label: "Sent", tone: "success" };
    case "PENDING":
      return { label: "Pending", tone: "warning" };
    case "FAILED":
      return { label: "Failed", tone: "danger" };
    default:
      return { label: status, tone: "neutral" };
  }
}

/** QR readiness derived from the card fields (no extra query needed). */
export function qrStatusMeta(qrGeneratedAt: Date | string | null, qrError: string | null): StatusMeta {
  if (qrGeneratedAt && !qrError) return { label: "QR Ready", tone: "success" };
  if (qrError) return { label: "QR Failed", tone: "danger" };
  return { label: "QR Not generated", tone: "neutral" };
}

const MONTHS_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * Deterministic WIB (UTC+7) formatter — identical output on server and client,
 * so it is safe to use in both server and client components (no hydration drift).
 */
export function formatDateTimeID(value: Date | string | null | undefined): string {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "-";

  const wib = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return `${pad(wib.getUTCDate())} ${MONTHS_ID[wib.getUTCMonth()]} ${wib.getUTCFullYear()} ${pad(
    wib.getUTCHours(),
  )}:${pad(wib.getUTCMinutes())}`;
}

export function formatDateID(value: Date | string | null | undefined): string {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "-";

  const wib = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return `${pad(wib.getUTCDate())} ${MONTHS_ID[wib.getUTCMonth()]} ${wib.getUTCFullYear()}`;
}

/** Never show the full public token in the admin UI by default. */
export function maskToken(token: string): string {
  if (token.length <= 6) return token;
  return `${token.slice(0, 4)}${"•".repeat(Math.max(4, token.length - 8))}${token.slice(-4)}`;
}
