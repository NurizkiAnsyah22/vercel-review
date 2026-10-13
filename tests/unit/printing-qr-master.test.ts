import { describe, expect, it } from "vitest";
import * as publicUrl from "@/lib/public-url";

/**
 * REGRESSION GUARD — the shared "QR MASTER" concept was removed from the product.
 *
 * A single identical QR can never identify a card, so the destination could not
 * change per card after activation. Every card now has its OWN QR
 * (see tests/unit/printing-per-card-qr.test.ts).
 */
describe("shared QR master (removed)", () => {
  it("no longer exposes a builder for an identifier-less activation QR", () => {
    expect((publicUrl as Record<string, unknown>).buildActivationEntryUrl).toBeUndefined();
  });
});
