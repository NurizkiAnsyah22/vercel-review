import type { OrderStatus } from "@prisma/client";
import { prisma } from "../db/client";

export type CreateOrderInput = {
  cardId: string;
  buyerWhatsappNumber: string;
  buyerName?: string | null;
  note?: string | null;
};

export async function createOrder(input: CreateOrderInput) {
  const card = await prisma.card.findUnique({ where: { id: input.cardId } });
  if (!card) throw new Error("Kartu tidak ditemukan");

  return prisma.order.create({
    data: {
      cardId: input.cardId,
      buyerWhatsappNumber: input.buyerWhatsappNumber,
      buyerName: input.buyerName ?? null,
      note: input.note ?? null,
    },
  });
}

export async function getOrderByCardId(cardId: string) {
  return prisma.order.findUnique({ where: { cardId } });
}

export async function listOrders(filter?: { status?: OrderStatus; take?: number }) {
  return prisma.order.findMany({
    where: filter?.status ? { status: filter.status } : {},
    orderBy: { createdAt: "desc" },
    take: filter?.take ?? 50,
    include: {
      card: { select: { code: true, status: true } },
      business: { select: { name: true } },
    },
  });
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  return prisma.order.update({ where: { id: orderId }, data: { status } });
}

export async function getOrderCounts(): Promise<Record<OrderStatus, number> & { total: number }> {
  const grouped = await prisma.order.groupBy({ by: ["status"], _count: { _all: true } });

  const counts: Record<string, number> = {
    WAITING_ACTIVATION: 0,
    PAID: 0,
    ACTIVATION_RECEIVED: 0,
    PROCESSING: 0,
    ACTIVATED: 0,
    READY_TO_PRINT: 0,
    READY_TO_SHIP: 0,
    SHIPPED: 0,
    CANCELLED: 0,
  };

  let total = 0;
  for (const row of grouped) {
    counts[row.status] = row._count._all;
    total += row._count._all;
  }

  return { ...(counts as Record<OrderStatus, number>), total };
}
