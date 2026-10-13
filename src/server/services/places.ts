import { getEnv } from "../config/env";
import { expandMapsShortUrl, extractPlaceIdFromMapsUrl } from "./maps-link";

const PLACES_TEXT_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";
const ALLOWED_HOST_SUFFIXES = ["google.com", "google.co.id", "goo.gl"];

export class PlacesResolutionError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "PlacesResolutionError";
  }
}

export type ResolvedPlace = {
  placeId: string;
  name: string;
  rating: number | null;
  reviewCount: number | null;
  /** How the Place ID was obtained. */
  source: "maps-url" | "places-api";
};

/** True when the URL points at a Google Maps / short-link domain. */
export function isGoogleMapsUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    const host = url.hostname.toLowerCase();
    return ALLOWED_HOST_SUFFIXES.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
  } catch {
    return false;
  }
}

/** Builds the "write a review" URL that sends customers straight to the form. */
export function buildGoogleReviewUrl(placeId: string): string {
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
}

/** Extracts a human-readable place query from a Google Maps URL. */
export function extractPlaceQuery(mapsUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(mapsUrl);
  } catch {
    return null;
  }

  const placeMatch = url.pathname.match(/\/maps\/place\/([^/]+)/);
  if (placeMatch?.[1]) return decodeURIComponent(placeMatch[1].replace(/\+/g, " "));

  const searchMatch = url.pathname.match(/\/maps\/search\/([^/]+)/);
  if (searchMatch?.[1]) return decodeURIComponent(searchMatch[1].replace(/\+/g, " "));

  const query = url.searchParams.get("q");
  if (query) return query;

  return null;
}

/** Extracts coordinates from `@lat,lng` or `q=lat,lng` when present. */
export function extractCoordinates(
  mapsUrl: string,
): { latitude: number; longitude: number } | null {
  const atMatch = mapsUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) {
    return { latitude: Number(atMatch[1]), longitude: Number(atMatch[2]) };
  }

  const qMatch = mapsUrl.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (qMatch) {
    return { latitude: Number(qMatch[1]), longitude: Number(qMatch[2]) };
  }

  return null;
}

function normalizePlaceId(name: string): string {
  return name.startsWith("places/") ? name.slice("places/".length) : name;
}

/**
 * Resolves a Google Maps URL to a Place ID (and best-effort rating/review count)
 * using the Google Places API (New) Text Search.
 */
export async function resolvePlaceFromMapsUrl(mapsUrl: string): Promise<ResolvedPlace> {
  const expanded = await expandMapsShortUrl(mapsUrl);

  // 1) FREE path — derive the Place ID directly from the Maps URL (no API cost).
  for (const candidate of [expanded, mapsUrl]) {
    const placeId = extractPlaceIdFromMapsUrl(candidate);
    if (placeId) {
      return {
        placeId,
        name: extractPlaceQuery(candidate) ?? "",
        rating: null,
        reviewCount: null,
        source: "maps-url",
      };
    }
  }

  // 2) Optional fallback — Google Places API, only when a key is configured.
  const apiKey = getEnv().GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new PlacesResolutionError(
      "place_id_not_found",
      "Place ID tidak ditemukan di link Google Maps dan Google Places API tidak dikonfigurasi",
    );
  }

  const query = extractPlaceQuery(expanded) ?? extractPlaceQuery(mapsUrl);
  if (!query) {
    throw new PlacesResolutionError("unparseable_url", "Could not extract a place query from the Maps URL");
  }

  const coordinates = extractCoordinates(expanded) ?? extractCoordinates(mapsUrl);

  const payload: Record<string, unknown> = { textQuery: query, languageCode: "id" };
  if (coordinates) {
    payload.locationBias = { circle: { center: coordinates, radius: 1500 } };
  }

  const response = await fetch(PLACES_TEXT_SEARCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id,places.displayName,places.rating,places.userRatingCount",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new PlacesResolutionError("api_error", `Places API responded with ${response.status}`);
  }

  const data = (await response.json()) as {
    places?: Array<{
      id?: string;
      displayName?: { text?: string };
      rating?: number;
      userRatingCount?: number;
    }>;
  };

  const first = data.places?.[0];
  if (!first?.id) {
    throw new PlacesResolutionError("not_found", "No matching place found for this Maps URL");
  }

  return {
    placeId: normalizePlaceId(first.id),
    name: first.displayName?.text ?? query,
    rating: typeof first.rating === "number" ? first.rating : null,
    reviewCount: typeof first.userRatingCount === "number" ? first.userRatingCount : null,
    source: "places-api",
  };
}

export type PlaceDetails = {
  placeId: string;
  name: string | null;
  rating: number | null;
  reviewCount: number | null;
};

/**
 * Fetches current rating/review count for a known Place ID (Place Details New).
 * Used by the review-count monitoring job.
 */
export async function fetchPlaceDetails(placeId: string): Promise<PlaceDetails> {
  const apiKey = getEnv().GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new PlacesResolutionError("not_configured", "Google Places API key is not configured");
  }

  const response = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=id`,
    {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "id,displayName,rating,userRatingCount",
      },
    },
  );

  if (!response.ok) {
    throw new PlacesResolutionError("api_error", `Places API responded with ${response.status}`);
  }

  const data = (await response.json()) as {
    id?: string;
    displayName?: { text?: string };
    rating?: number;
    userRatingCount?: number;
  };

  if (!data.id) {
    throw new PlacesResolutionError("not_found", "Place details not found");
  }

  return {
    placeId: normalizePlaceId(data.id),
    name: data.displayName?.text ?? null,
    rating: typeof data.rating === "number" ? data.rating : null,
    reviewCount: typeof data.userRatingCount === "number" ? data.userRatingCount : null,
  };
}
