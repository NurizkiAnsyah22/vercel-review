import { rm } from "node:fs/promises";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// `after()` (interaction recording) requires a Next request scope; run it inline.
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
import { activateCard } from "@/server/services/activation";
import { suspendCard } from "@/server/services/card-admin";
import { generateCards } from "@/server/services/card";
import { cardQrUrl, listPrintableCards } from "@/server/services/printing";

/**
 * End-to-end product rule:
 *   ONE unique QR per card, printed BEFORE activation.
 *   - inactive card  -> QR opens the activation form of that card (no code typing)
 *   - active card    -> the SAME QR redirects to that card's Google Review URL
 *   - suspended card -> informational page, never Google
 */
const suffix = Date.now();
const MAPS_URL =
  "https://www.google.com/maps/place/IT+Print/@-6.9,106.9,17z?place_id=ChIJitPrintSheetTest01";

type CreatedCard = {
  id: string;
  code: string;
  publicToken: string;
  activationCode: string | null;
};

const created: CreatedCard[] = [];

function scan(token: string, query = "") {
  return cardEntry(new Request(`http://localhost/r/${token}${query}`), {
    params: Promise.resolve({ token }),
  });
}

beforeAll(async () => {
  const cards = await generateCards(3);
  for (const card of cards) {
    created.push({
      id: card.id,
      code: card.code,
      publicToken: card.publicToken,
      activationCode: card.activationCode,
    });
  }
});

afterAll(async () => {
  for (const card of created) {
    const row = await prisma.card.findUnique({
      where: { id: card.id },
      select: { businessId: true },
    });
    const businessId = row?.businessId ?? null;

    if (businessId) {
      await prisma.notification.deleteMany({ where: { businessId } });
      await prisma.monitoringJob.deleteMany({ where: { businessId } });
    }
    await prisma.interaction.deleteMany({ where: { cardId: card.id } });
    await prisma.cardAssignment.deleteMany({ where: { cardId: card.id } });
    await prisma.order.deleteMany({ where: { cardId: card.id } });
    await prisma.card.deleteMany({ where: { id: card.id } });

    if (businessId) {
      const business = await prisma.business.findUnique({
        where: { id: businessId },
        select: { ownerId: true },
      });
      await prisma.business.deleteMany({ where: { id: businessId } });
      if (business) await prisma.owner.deleteMany({ where: { id: business.ownerId } });
    }
  }

  await rm(path.resolve(process.cwd(), ".tmp-test-storage"), { recursive: true, force: true });
  await prisma.$disconnect();
});

describe("QR per kartu (print → activation → review)", () => {
  it("prepares a QR for every card when the batch is generated (printable before activation)", async () => {
    const rows = await prisma.card.findMany({ where: { id: { in: created.map((c) => c.id) } } });

    expect(rows).toHaveLength(3);
    for (const row of rows) {
      expect(row.qrGeneratedAt).toBeTruthy();
      expect(row.qrError).toBeNull();
    }
  });

  it("exposes one UNIQUE QR URL per card in the print data", async () => {
    const printable = await listPrintableCards({ limit: 500 });
    const mine = printable.filter((card) => created.some((item) => item.code === card.code));

    expect(mine).toHaveLength(3);
    expect(new Set(mine.map((card) => card.qrUrl)).size).toBe(3);
    expect(mine.every((card) => card.qrReady)).toBe(true);

    for (const card of mine) {
      expect(card.qrUrl).toBe(cardQrUrl(card.publicToken));
      expect(card.qrUrl).toContain(`/r/${card.publicToken}`);
    }
  });

  it("scanning an INACTIVE card QR opens the activation form for that exact card", async () => {
    const response = await scan(created[0].publicToken, "?s=qr");

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      `${getPublicAppUrl()}/activate/${created[0].publicToken}`,
    );
  });

  it("after activation the SAME QR goes straight to that card's Google Review", async () => {
    const result = await activateCard({
      activationCode: created[0].activationCode ?? "",
      storeName: `IT Print Store ${suffix}`,
      whatsappNumber: "628123450001",
      mapsUrl: MAPS_URL,
    });

    expect(result.status).toBe("activated");
    if (result.status !== "activated") return;
    expect(result.reviewUrl).toContain("placeid=ChIJitPrintSheetTest01");

    const response = await scan(created[0].publicToken, "?s=qr");
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(result.reviewUrl);
    expect(response.headers.get("location")).not.toContain("/activate");

    await new Promise((resolve) => setTimeout(resolve, 300));
    const interactions = await prisma.interaction.findMany({ where: { cardId: created[0].id } });
    expect(interactions.some((row) => row.source === "QR")).toBe(true);
  });

  it("keeps every other card on its own destination (different review URL per card)", async () => {
    // Card 2 was never activated -> still the activation form.
    const card2 = await scan(created[1].publicToken);
    expect(card2.status).toBe(302);
    expect(card2.headers.get("location")).toBe(
      `${getPublicAppUrl()}/activate/${created[1].publicToken}`,
    );

    // Card 1 is active -> review.
    const card1 = await scan(created[0].publicToken);
    expect(card1.headers.get("location")).toContain("writereview");

    // The two cards therefore never share a destination.
    expect(card1.headers.get("location")).not.toBe(card2.headers.get("location"));
  });

  it("never redirects a SUSPENDED card to Google", async () => {
    const activation = await activateCard({
      activationCode: created[2].activationCode ?? "",
      storeName: `IT Print Suspended ${suffix}`,
      whatsappNumber: "628123450002",
      mapsUrl: MAPS_URL,
    });
    expect(activation.status).toBe("activated");

    const suspended = await suspendCard(created[2].id);
    expect(suspended.ok).toBe(true);

    const response = await scan(created[2].publicToken);
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });
});
