import { describe, expect, it } from "vitest";
import {
  buildGoogleReviewUrl,
  extractCoordinates,
  extractPlaceQuery,
  isGoogleMapsUrl,
} from "@/server/services/places";

describe("isGoogleMapsUrl", () => {
  it("accepts Google Maps domains and short links", () => {
    expect(isGoogleMapsUrl("https://www.google.com/maps/place/X")).toBe(true);
    expect(isGoogleMapsUrl("https://maps.app.goo.gl/abc123")).toBe(true);
    expect(isGoogleMapsUrl("https://google.co.id/maps")).toBe(true);
  });

  it("rejects non-Google and malformed URLs", () => {
    expect(isGoogleMapsUrl("https://example.com/foo")).toBe(false);
    expect(isGoogleMapsUrl("not a url")).toBe(false);
  });
});

describe("extractPlaceQuery", () => {
  it("extracts the place name from /maps/place/", () => {
    expect(
      extractPlaceQuery("https://www.google.com/maps/place/Kedai+Kopi+ABC/@-6.2,106.8,17z"),
    ).toBe("Kedai Kopi ABC");
  });

  it("extracts from the q parameter", () => {
    expect(extractPlaceQuery("https://maps.google.com/?q=Toko+Uji")).toBe("Toko Uji");
  });

  it("returns null when nothing can be extracted", () => {
    expect(extractPlaceQuery("https://www.google.com/maps")).toBeNull();
  });
});

describe("extractCoordinates", () => {
  it("extracts @lat,lng coordinates", () => {
    expect(extractCoordinates("https://x/@-6.2,106.8,17z")).toEqual({
      latitude: -6.2,
      longitude: 106.8,
    });
  });

  it("returns null when no coordinates are present", () => {
    expect(extractCoordinates("https://www.google.com/maps/place/X")).toBeNull();
  });
});

describe("buildGoogleReviewUrl", () => {
  it("builds the writereview URL from a place id", () => {
    expect(buildGoogleReviewUrl("ChIJabc")).toBe(
      "https://search.google.com/local/writereview?placeid=ChIJabc",
    );
  });
});
