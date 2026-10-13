import { describe, expect, it } from "vitest";
import { extractPlaceIdFromMapsUrl, ftidToPlaceId } from "@/server/services/maps-link";

describe("ftidToPlaceId", () => {
  it("converts a real FTID (Puridigital) to its ChIJ Place ID", () => {
    expect(ftidToPlaceId("0x298bb8714576401f:0x3ab3194123f22e66")).toBe(
      "ChIJH0B2RXG4iykRZi7yI0EZszo",
    );
  });

  it("returns null for malformed input", () => {
    expect(ftidToPlaceId("not-an-ftid")).toBeNull();
  });
});

describe("extractPlaceIdFromMapsUrl", () => {
  it("reads an explicit place_id query param", () => {
    expect(
      extractPlaceIdFromMapsUrl("https://www.google.com/maps/place/X?place_id=ChIJabcdefghijklmnop"),
    ).toBe("ChIJabcdefghijklmnop");
  });

  it("reads a ChIJ value from a data segment", () => {
    expect(
      extractPlaceIdFromMapsUrl("https://www.google.com/maps/place/X/data=!4m2!3m1!1sChIJzyxwvutsrqponmlk"),
    ).toBe("ChIJzyxwvutsrqponmlk");
  });

  it("converts an FTID to a ChIJ place id", () => {
    const url =
      "https://www.google.com/maps/place/Puridigital/@-6.95,106.96,17z/data=!4m6!3m5!1s0x298bb8714576401f:0x3ab3194123f22e66!8m2!3d-6.955645!4d106.96784";
    expect(extractPlaceIdFromMapsUrl(url)).toBe("ChIJH0B2RXG4iykRZi7yI0EZszo");
  });

  it("returns null when nothing usable is present", () => {
    expect(extractPlaceIdFromMapsUrl("https://www.google.com/maps")).toBeNull();
  });
});
