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
import { buildPublicCardUrl } from "@/lib/public-url";
import { prisma } from "@/server/db/client";

const suffix = Date.now();
const tokenA = `nfcA${suffix}`;
const tokenB = `nfcB${suffix}`;

let ownerId = "";
let businessAId = "";
let businessBId = "";
let cardAId = "";
let cardBId = "";
let cardSuspendedId = "";
const suspendedToken = `nfcS${suffix}`;

const reviewA = "https://search.google.com/local/writereview?placeid=ChIJnfcTestStoreA";
const reviewB = "https://search.google.com/local/writereview?placeid=ChIJnfcTestStoreB";

function call(token: string, query = "") {
  return cardEntry(new Request(`http://localhost/r/${token}${query}`), {
    params: Promise.resolve({ token }),
  });
}

beforeAll(async () => {
  const owner = await prisma.owner.create({
    data: { name: `IT NFC Owner ${suffix}`, whatsappNumber: "628000000003" },
  });
  ownerId = owner.id;

  const businessA = await prisma.business.create({
    data: {
      ownerId: owner.id,
      name: `IT Store A ${suffix}`,
      whatsappNumber: "628000000003",
      googleReviewUrl: reviewA,
      placeId: "ChIJnfcTestStoreA",
      status: "ACTIVE",
    },
  });
  const businessB = await prisma.business.create({
    data: {
      ownerId: owner.id,
      name: `IT Store B ${suffix}`,
      whatsappNumber: "628000000004",
      googleReviewUrl: reviewB,
      placeId: "ChIJnfcTestStoreB",
      status: "ACTIVE",
    },
  });
  businessAId = businessA.id;
  businessBId = businessB.id;

  const cardA = await prisma.card.create({
    data: {
      code: `CARD-NFC-A-${suffix}`,
      publicToken: tokenA,
      activationCode: `VRC-AAAA-${String(suffix).slice(-4)}`,
      status: "ACTIVE",
      businessId: businessA.id,
    },
  });
  const cardB = await prisma.card.create({
    data: {
      code: `CARD-NFC-B-${suffix}`,
      publicToken: tokenB,
      activationCode: `VRC-BBBB-${String(suffix).slice(-4)}`,
      status: "ACTIVE",
      businessId: businessB.id,
    },
  });
  const suspended = await prisma.card.create({
    data: {
      code: `CARD-NFC-S-${suffix}`,
      publicToken: suspendedToken,
      activationCode: `VRC-CCCC-${String(suffix).slice(-4)}`,
      status: "SUSPENDED",
      businessId: businessB.id,
    },
  });

  cardAId = cardA.id;
  cardBId = cardB.id;
  cardSuspendedId = suspended.id;
});

afterAll(async () => {
  const cardIds = [cardAId, cardBId, cardSuspendedId];
  await prisma.interaction.deleteMany({ where: { cardId: { in: cardIds } } });
  await prisma.monitoringJob.deleteMany({
    where: { businessId: { in: [businessAId, businessBId] } },
  });
  await prisma.cardAssignment.deleteMany({ where: { cardId: { in: cardIds } } });
  await prisma.card.deleteMany({ where: { id: { in: cardIds } } });
  await prisma.business.deleteMany({ where: { id: { in: [businessAId, businessBId] } } });
  await prisma.owner.deleteMany({ where: { id: ownerId } });
  await prisma.$disconnect();
});

/**
 * Because the QR MASTER is identical on every card, the NFC URL (public token)
 * is what tells the backend WHICH card was tapped. Each card must therefore
 * redirect to its OWN Google Review URL.
 */
describe("NFC is the per-card identifier", () => {
  it("Card A → its own Google Review, Card B → its own Google Review", async () => {
    const responseA = await call(tokenA, "?s=nfc");
    const responseB = await call(tokenB, "?s=nfc");

    expect(responseA.status).toBe(302);
    expect(responseB.status).toBe(302);
    expect(responseA.headers.get("location")).toBe(reviewA);
    expect(responseB.headers.get("location")).toBe(reviewB);
  });

  it("records the interaction against the correct card", async () => {
    await new Promise((resolve) => setTimeout(resolve, 300));

    const interactionsA = await prisma.interaction.findMany({ where: { cardId: cardAId } });
    const interactionsB = await prisma.interaction.findMany({ where: { cardId: cardBId } });

    expect(interactionsA.some((row) => row.source === "NFC")).toBe(true);
    expect(interactionsB.some((row) => row.source === "NFC")).toBe(true);
  });

  it("SUSPENDED card never redirects to Google", async () => {
    const response = await call(suspendedToken, "?s=nfc");
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("while each card keeps its own QR/NFC payload (no shared master QR)", () => {
    expect(buildPublicCardUrl(tokenA)).not.toBe(buildPublicCardUrl(tokenB));
    expect(buildPublicCardUrl(tokenA)).toContain(`/r/${tokenA}`);
  });
});
