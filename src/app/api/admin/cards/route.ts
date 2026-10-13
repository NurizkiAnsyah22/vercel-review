import type { NextRequest } from "next/server";
import { getAdminSession } from "@/server/auth/guard";
import { jsonError, jsonOk } from "@/server/http/respond";
import { generateCards, listCards } from "@/server/services/card";
import { generateCardsSchema, listCardsQuerySchema } from "@/server/validation/card";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) return jsonError("Unauthorized", 401);

  const parsed = listCardsQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return jsonError("Invalid query", 422, parsed.error.flatten().fieldErrors);
  }

  const result = await listCards(parsed.data);
  return jsonOk(result);
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) return jsonError("Unauthorized", 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = generateCardsSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Invalid payload", 422, parsed.error.flatten().fieldErrors);
  }

  const cards = await generateCards(parsed.data.count);
  return jsonOk({ created: cards.length, cards }, 201);
}
