import { describe, expect, it } from "vitest";
import {
  cardStatusMeta,
  formatDateTimeID,
  maskToken,
  notificationStatusMeta,
  orderStatusMeta,
  qrStatusMeta,
} from "@/lib/status";

describe("cardStatusMeta", () => {
  it("maps every technical status to a label and tone", () => {
    expect(cardStatusMeta("UNACTIVATED")).toEqual({ label: "Unactivated", tone: "neutral" });
    expect(cardStatusMeta("PENDING")).toEqual({ label: "Pending", tone: "warning" });
    expect(cardStatusMeta("ACTIVE")).toEqual({ label: "Active", tone: "success" });
    expect(cardStatusMeta("SUSPENDED")).toEqual({ label: "Suspended", tone: "danger" });
  });
});

describe("orderStatusMeta", () => {
  it("keeps production statuses separate and readable", () => {
    expect(orderStatusMeta("WAITING_ACTIVATION").label).toBe("Waiting Activation");
    expect(orderStatusMeta("READY_TO_PRINT").label).toBe("Ready to Print");
    expect(orderStatusMeta("SHIPPED").label).toBe("Shipped");
  });
});

describe("qrStatusMeta", () => {
  it("reports ready / failed / not generated", () => {
    expect(qrStatusMeta(new Date(), null).tone).toBe("success");
    expect(qrStatusMeta(null, "boom").tone).toBe("danger");
    expect(qrStatusMeta(null, null).tone).toBe("neutral");
  });
});

describe("notificationStatusMeta", () => {
  it("maps notification outcomes", () => {
    expect(notificationStatusMeta("SENT").tone).toBe("success");
    expect(notificationStatusMeta("FAILED").tone).toBe("danger");
  });
});

describe("formatDateTimeID", () => {
  it("formats deterministically in WIB (UTC+7)", () => {
    expect(formatDateTimeID("2026-10-08T14:30:00.000Z")).toBe("08 Okt 2026 21:30");
  });

  it("handles empty values", () => {
    expect(formatDateTimeID(null)).toBe("-");
    expect(formatDateTimeID("not-a-date")).toBe("-");
  });
});

describe("maskToken", () => {
  it("never returns the full token", () => {
    const token = "AbCd123Xyz987Qwerty";
    const masked = maskToken(token);
    expect(masked).not.toBe(token);
    expect(masked.startsWith("AbCd")).toBe(true);
    expect(masked.endsWith("erty")).toBe(true);
  });
});
