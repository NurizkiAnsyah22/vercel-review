import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { cardQrUrl } from "@/server/services/printing";
import { prisma } from "@/server/db/client";
import { activateCard } from "@/server/services/activation";
import { lookupCardByActivationCode } from "@/server/services/activation-code";
import { ACTIVATION_CODE_PATTERN } from "@/lib/activation-code";
import { generateCards } from "@/server/services/card";

const suffix = Date.now();
const MAPS_URL =
  "https://www.google.com/maps/place/IT+Kode+Aktif/@-6.9,106.9,17z?place_id=ChIJitActivationCode01";

const batchCodes: string[] = [];
let suspendedCardId = "";
const suspendedCode = `VRC-AAAA-${String(suffix).slice(-4)}`;

async function cleanupCard(cardId: string) {
  const card = await prisma.card.findUnique({ where: { id: cardId }, select: { businessId: true } });
  const businessId = card?.businessId ?? null;

  if (businessId) {
    await prisma.notification.deleteMany({ where: { businessId } });
    await prisma.monitoringJob.deleteMany({ where: { businessId } });
  }
  await prisma.interaction.deleteMany({ where: { cardId } });
  await prisma.cardAssignment.deleteMany({ where: { cardId } });
  await prisma.order.deleteMany({ where: { cardId } });
  await prisma.card.deleteMany({ where: { id: cardId } });

  if (businessId) {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { ownerId: true },
    });
    await prisma.business.deleteMany({ where: { id: businessId } });
    if (business) await prisma.owner.deleteMany({ where: { id: business.ownerId } });
  }
}

beforeAll(async () => {
  const cards = await generateCards(8);
  for (const card of cards) batchCodes.push(card.code);

  const suspended = await prisma.card.create({
    data: {
      code: `CARD-SUSP-${suffix}`,
      publicToken: `suspcode${suffix}`,
      activationCode: suspendedCode,
      status: "SUSPENDED",
    },
  });
  suspendedCardId = suspended.id;
});

afterAll(async () => {
  const cards = await prisma.card.findMany({
    where: { code: { in: batchCodes } },
    select: { id: true },
  });
  for (const card of cards) await cleanupCard(card.id);
  await cleanupCard(suspendedCardId);

  await prisma.$disconnect();
});

describe("mass card generation (one unique QR per card)", () => {
  it("gives every card a unique Card ID, activation code and NFC token", async () => {
    const cards = await prisma.card.findMany({ where: { code: { in: batchCodes } } });

    expect(cards).toHaveLength(8);
    expect(new Set(cards.map((card) => card.code)).size).toBe(8);
    expect(new Set(cards.map((card) => card.publicToken)).size).toBe(8);

    const codes = cards.map((card) => card.activationCode);
    expect(codes.every((code) => typeof code === "string" && code.length > 0)).toBe(true);
    expect(new Set(codes).size).toBe(8);
    for (const code of codes) expect(code).toMatch(ACTIVATION_CODE_PATTERN);
  });

  it("gives every card its own QR payload (no shared master QR)", async () => {
    const cards = await prisma.card.findMany({ where: { code: { in: batchCodes } } });
    const urls = new Set(cards.map((card) => cardQrUrl(card.publicToken)));

    expect(urls.size).toBe(cards.length);
    for (const url of urls) {
      expect(url).toContain("/r/");
      expect(url).not.toContain("/activate");
    }
  });
});

describe("activation by Kode Aktivasi", () => {
  it("rejects an unknown code", async () => {
    const result = await lookupCardByActivationCode("VRC-9999-9999");
    expect(result.status).toBe("not_found");
  });

  it("rejects a malformed code", async () => {
    const result = await lookupCardByActivationCode("VRC-123");
    expect(result.status).toBe("invalid_format");
  });

  it("finds the card and returns its Card ID", async () => {
    const card = await prisma.card.findFirst({ where: { code: batchCodes[0] } });
    const result = await lookupCardByActivationCode(card?.activationCode ?? "");

    expect(result.status).toBe("found");
    if (result.status !== "found") return;
    expect(result.card.code).toBe(card?.code);
    expect(result.card.status).toBe("UNACTIVATED");
  });

  it("activates the card, sets the business data and never rolls back on repeat", async () => {
    const card = await prisma.card.findFirst({ where: { code: batchCodes[1] } });
    const activationCode = card?.activationCode ?? "";

    const first = await activateCard({
      activationCode,
      storeName: "IT Warung Kode",
      whatsappNumber: "628123456789",
      mapsUrl: MAPS_URL,
    });

    expect(first.status).toBe("activated");
    if (first.status !== "activated") return;
    expect(first.cardCode).toBe(card?.code);
    expect(first.reviewUrl).toContain("placeid=ChIJitActivationCode01");

    const stored = await prisma.card.findUnique({
      where: { id: card?.id },
      include: { business: true },
    });
    expect(stored?.status).toBe("ACTIVE");
    expect(stored?.business?.name).toBe("IT Warung Kode");
    expect(stored?.business?.googleReviewUrl).toContain("placeid=ChIJitActivationCode01");
    expect(stored?.qrGeneratedAt).toBeTruthy();

    // Second submit with the SAME code must be idempotent and must NOT let a
    // stranger take over the now-ACTIVE card.
    const second = await activateCard({
      activationCode,
      storeName: "Penyerang Lain",
      whatsappNumber: "628999999999",
      mapsUrl: MAPS_URL,
    });

    expect(second.status).toBe("already_active");

    const afterAttack = await prisma.card.findUnique({
      where: { id: card?.id },
      include: { business: true },
    });
    expect(afterAttack?.business?.name).toBe("IT Warung Kode");
    expect(afterAttack?.business?.whatsappNumber).toBe("628123456789");
  });

  it("never activates a SUSPENDED card through its code", async () => {
    const result = await activateCard({
      activationCode: suspendedCode,
      storeName: "IT Suspended",
      whatsappNumber: "628123450000",
      mapsUrl: MAPS_URL,
    });

    expect(result.status).toBe("suspended");

    const card = await prisma.card.findUnique({ where: { id: suspendedCardId } });
    expect(card?.status).toBe("SUSPENDED");
    expect(card?.businessId).toBeNull();
  });
});
