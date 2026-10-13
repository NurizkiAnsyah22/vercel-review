/**
 * FREE Place ID extraction from Google Maps URLs — no Google Places API, no billing.
 *
 * Google Maps place URLs carry an "FTID" like `0x...:0x...` inside the `data=` param.
 * Those 16 bytes (two 64-bit little-endian values) base64-encode to the same
 * identifier as the Place ID (`ChIJ...`), which is exactly what the
 * `search.google.com/local/writereview?placeid=` endpoint needs.
 */

const SHORT_LINK_HOST = /goo\.gl/i;

/** Follows `maps.app.goo.gl` style short links to the full Maps URL. */
export async function expandMapsShortUrl(raw: string): Promise<string> {
  if (!SHORT_LINK_HOST.test(raw)) return raw;

  try {
    const response = await fetch(raw, {
      redirect: "follow",
      headers: {
        // A plain browser UA makes Google return the canonical URL.
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(10000),
    });
    return response.url || raw;
  } catch {
    return raw;
  }
}

function hexToLittleEndianBuffer(hex: string): Buffer {
  const clean = hex.replace(/^0x/i, "");
  const padded = clean.padStart(16, "0").slice(-16);
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64LE(BigInt(`0x${padded}`), 0);
  return buffer;
}

/**
 * `0x…:0x…` (FTID) -> Place ID (`ChIJ…`).
 *
 * A Place ID is the base64 of a small protobuf message:
 *   0x0A 0x12            -> field 1 (LEN, 18 bytes)
 *   0x09 + 8 bytes (LE)  -> inner field 1 (fixed64) = FTID part A
 *   0x11 + 8 bytes (LE)  -> inner field 2 (fixed64) = FTID part B
 * The first three bytes encode to "ChIJ", which is why real Place IDs start
 * with that prefix. Skipping the wrapper produces an INVALID id.
 */
export function ftidToPlaceId(ftid: string): string | null {
  const match = ftid.match(/^(?:0x)?([0-9a-f]+):(?:0x)?([0-9a-f]+)$/i);
  if (!match) return null;

  try {
    const raw = Buffer.concat([
      Buffer.from([0x0a, 0x12, 0x09]),
      hexToLittleEndianBuffer(match[1]),
      Buffer.from([0x11]),
      hexToLittleEndianBuffer(match[2]),
    ]);
    return raw.toString("base64").replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  } catch {
    return null;
  }
}

/**
 * Extracts a Place ID from a Maps URL, trying (in order):
 *  1. explicit `place_id=` / `placeid=` query param
 *  2. `!1sChIJ…` / `!2sChIJ…` data segments (already a Place ID)
 *  3. `!…s0x…:0x…` FTID segment converted to a Place ID
 */
export function extractPlaceIdFromMapsUrl(url: string): string | null {
  const direct = url.match(/[?&]place_?id=([A-Za-z0-9_-]{10,})/i);
  if (direct) return direct[1];

  const decoded = decodeURIComponent(url);

  const dataPlaceId = decoded.match(/![0-9]?[a-z]?(ChIJ[A-Za-z0-9_-]{10,})/);
  if (dataPlaceId) return dataPlaceId[1];

  const ftid = decoded.match(/(?:0x[0-9a-f]{6,}:(?:0x)?[0-9a-f]{4,})/i);
  if (ftid) {
    const placeId = ftidToPlaceId(ftid[0]);
    if (placeId) return placeId;
  }

  return null;
}
