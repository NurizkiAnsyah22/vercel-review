import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { POST as activatePost } from "@/app/api/activate/route";
import { prisma } from "@/server/db/client";

const suffix = Date.now();
const TOKEN = `it-act-${suffix}`;
const TOKEN_SUSPENDED = `it-act-susp-${suffix}`;

const MAPS_URL =
  "https://www.google.com/maps/place/Warung+Maju+Jaya/@-6.95,106.96,17z?place_id=ChIJactivateApiTest01";

let cardId = "";
let suspendedCardId = "";

function post(body: unknown, ip: string) {
  return activatePost(
    new Request("http://localhost/api/activate", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify(body),
    }),
  );
}

beforeAll(async () => {
  const card = await prisma.card.create({
    data: { code: `CARD-ACT-${suffix}`, publicToken: TOKEN, status: "UNACTIVATED" },
  });
  cardId = card.id;

  const suspended = await prisma.card.create({
    data: { code: `CARD-ACTS-${suffix}`, publicToken: TOKEN_SUSPENDED, status: "SUSPENDED" },
  });
  suspendedCardId = suspended.id;
});

afterAll(async () => {
  await prisma.cardAssignment.deleteMany({ where: { cardId: { in: [cardId, suspendedCardId] } } });
  await prisma.business.deleteMany({ where: { name: "Warung Maju Jaya" } });
  await prisma.owner.deleteMany({ where: { name: "Warung Maju Jaya" } });
  await prisma.card.deleteMany({ where: { id: { in: [cardId, suspendedCardId] } } });
  await prisma.$disconnect();
});

describe("POST /api/activate", () => {
  it("rejects a non-Google Maps URL with 422", async () => {
    const response = await post(
      { token: TOKEN, storeName: "Warung Maju Jaya", whatsappNumber: "085156032825", mapsUrl: "https://example.com/x" },
      "10.0.0.1",
    );
    expect(response.status).toBe(422);
  });

  it("rejects an invalid WhatsApp number with 422", async () => {
    const response = await post(
      { token: TOKEN, storeName: "Warung Maju Jaya", whatsappNumber: "123", mapsUrl: MAPS_URL },
      "10.0.0.2",
    );
    expect(response.status).toBe(422);
  });

  it("activates the card (ACTIVE + Google Review URL, QR ready)", async () => {
    const response = await post(
      { token: TOKEN, storeName: "Warung Maju Jaya", whatsappNumber: "085156032825", mapsUrl: MAPS_URL },
      "10.0.0.3",
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { data: { status: string; reviewUrl: string; qr: string } };
    expect(body.data.status).toBe("activated");
    expect(body.data.reviewUrl).toContain("placeid=ChIJactivateApiTest01");
    expect(body.data.qr).toBe("READY");

    const card = await prisma.card.findUnique({ where: { id: cardId }, include: { business: true } });
    expect(card?.status).toBe("ACTIVE");
    expect(card?.activatedAt).toBeTruthy();
    expect(card?.qrGeneratedAt).toBeTruthy();
    expect(card?.business?.googleReviewUrl).toContain("placeid=ChIJactivateApiTest01");
  });

  it("is idempotent: a duplicate submit does not create another activation", async () => {
    const before = await prisma.cardAssignment.count({ where: { cardId } });

    const response = await post(
      { token: TOKEN, storeName: "Warung Maju Jaya", whatsappNumber: "085156032825", mapsUrl: MAPS_URL },
      "10.0.0.4",
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { data: { status: string } };
    expect(body.data.status).toBe("already_active");

    const after = await prisma.cardAssignment.count({ where: { cardId } });
    expect(after).toBe(before);

    const businessCount = await prisma.business.count({ where: { name: "Warung Maju Jaya" } });
    expect(businessCount).toBe(1);
  });

  it("rejects activation of a SUSPENDED card with 409", async () => {
    const response = await post(
      {
        token: TOKEN_SUSPENDED,
        storeName: "Warung Maju Jaya",
        whatsappNumber: "085156032825",
        mapsUrl: MAPS_URL,
      },
      "10.0.0.5",
    );
    expect(response.status).toBe(409);
  });
});
