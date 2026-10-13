import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// `after()` requires a Next request scope; in tests we run the task inline.
vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return {
    ...actual,
    after: (task: () => void | Promise<void>) => {
      void task();
    },
  };
});

import { GET as cardEntry } from "@/app/r/[token]/route";
import { getPublicAppUrl } from "@/lib/public-url";
import { prisma } from "@/server/db/client";

const suffix = Date.now();
const tokenUnactivated = `it-unact-${suffix}`;
const tokenActive = `it-active-${suffix}`;
const tokenPending = `it-pend-${suffix}`;
const tokenSuspended = `it-susp-${suffix}`;

let ownerId = "";
let businessId = "";
const cardIds: string[] = [];
let activeCardId = "";

function call(token: string, query = "") {
  return cardEntry(new Request(`http://localhost/r/${token}${query}`), {
    params: Promise.resolve({ token }),
  });
}

beforeAll(async () => {
  const owner = await prisma.owner.create({
    data: { name: `IT Owner ${suffix}`, whatsappNumber: "628000000002" },
  });
  ownerId = owner.id;

  const business = await prisma.business.create({
    data: {
      ownerId: owner.id,
      name: `IT Store ${suffix}`,
      whatsappNumber: "628000000002",
      googleReviewUrl: "https://search.google.com/local/writereview?placeid=ChIJitEntryTest01",
      placeId: "ChIJitEntryTest01",
      status: "ACTIVE",
    },
  });
  businessId = business.id;

  const active = await prisma.card.create({
    data: { code: `CARD-IT-A-${suffix}`, publicToken: tokenActive, status: "ACTIVE", businessId },
  });
  activeCardId = active.id;

  const unactivated = await prisma.card.create({
    data: { code: `CARD-IT-U-${suffix}`, publicToken: tokenUnactivated, status: "UNACTIVATED" },
  });
  const pending = await prisma.card.create({
    data: { code: `CARD-IT-P-${suffix}`, publicToken: tokenPending, status: "PENDING" },
  });
  const suspended = await prisma.card.create({
    data: { code: `CARD-IT-S-${suffix}`, publicToken: tokenSuspended, status: "SUSPENDED" },
  });

  cardIds.push(active.id, unactivated.id, pending.id, suspended.id);
});

afterAll(async () => {
  await prisma.interaction.deleteMany({ where: { cardId: { in: cardIds } } });
  await prisma.cardAssignment.deleteMany({ where: { cardId: { in: cardIds } } });
  await prisma.card.deleteMany({ where: { id: { in: cardIds } } });
  await prisma.business.deleteMany({ where: { id: businessId } });
  await prisma.owner.deleteMany({ where: { id: ownerId } });
  await prisma.$disconnect();
});

describe("GET /r/{token}", () => {
  it("UNACTIVATED → redirects to the public activation page", async () => {
    const response = await call(tokenUnactivated);
    expect(response.status).toBe(302);
    // Must be the PUBLIC base URL, not the container-internal request origin
    // (would be http://0.0.0.0:3000 behind Docker/Nginx).
    expect(response.headers.get("location")).toBe(
      `${getPublicAppUrl()}/activate/${tokenUnactivated}`,
    );
  });

  it("ACTIVE (QR) → 302 to the Google review URL and records a QR interaction", async () => {
    const response = await call(tokenActive, "?s=qr");
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "https://search.google.com/local/writereview?placeid=ChIJitEntryTest01",
    );

    await new Promise((resolve) => setTimeout(resolve, 300));

    const interactions = await prisma.interaction.findMany({ where: { cardId: activeCardId } });
    expect(interactions.some((row) => row.source === "QR")).toBe(true);
  });

  it("ACTIVE (NFC) → 302 to Google and records an NFC interaction", async () => {
    const response = await call(tokenActive, "?s=nfc");
    expect(response.status).toBe(302);

    await new Promise((resolve) => setTimeout(resolve, 300));

    const interactions = await prisma.interaction.findMany({ where: { cardId: activeCardId } });
    expect(interactions.some((row) => row.source === "NFC")).toBe(true);
  });

  it("PENDING → informational page, never redirects to Google", async () => {
    const response = await call(tokenPending);
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
    const body = await response.text();
    expect(body).toContain("Kartu sedang diverifikasi");
  });

  it("SUSPENDED → informational page, never redirects to Google", async () => {
    const response = await call(tokenSuspended);
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
    const body = await response.text();
    expect(body).toContain("Kartu tidak aktif");
  });

  it("unknown token → 404", async () => {
    const response = await call(`does-not-exist-${suffix}`);
    expect(response.status).toBe(404);
  });
});
