import { prisma } from "../db/client";

/** Customers = business owners, with their businesses and card counts. */
export async function listCustomers(search?: string) {
  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { whatsappNumber: { contains: search } },
          { businesses: { some: { name: { contains: search, mode: "insensitive" as const } } } },
        ],
      }
    : {};

  const owners = await prisma.owner.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      businesses: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          whatsappNumber: true,
          status: true,
          placeId: true,
          googleReviewUrl: true,
          _count: { select: { cards: true } },
        },
      },
    },
  });

  return owners;
}

export async function listNotifications(limit = 50) {
  return prisma.notification.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      business: {
        select: {
          id: true,
          name: true,
          cards: { select: { code: true }, orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
    },
  });
}

export async function getNotificationStats() {
  const grouped = await prisma.notification.groupBy({
    by: ["status"],
    _count: { _all: true },
  });

  const stats = { total: 0, SENT: 0, PENDING: 0, FAILED: 0 } as Record<string, number>;
  for (const row of grouped) {
    stats[row.status] = row._count._all;
    stats.total += row._count._all;
  }
  return stats;
}

export async function getOrderDetail(id: string) {
  return prisma.order.findUnique({
    where: { id },
    include: {
      card: {
        include: {
          business: true,
        },
      },
      business: true,
    },
  });
}

export async function listOrdersWithCards(filter?: { search?: string; status?: string }) {
  const where: Record<string, unknown> = {};
  if (filter?.status) where.status = filter.status;
  if (filter?.search) {
    where.OR = [
      { buyerWhatsappNumber: { contains: filter.search } },
      { buyerName: { contains: filter.search, mode: "insensitive" } },
      { card: { code: { contains: filter.search, mode: "insensitive" } } },
      { card: { business: { name: { contains: filter.search, mode: "insensitive" } } } },
    ];
  }

  return prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      card: { select: { id: true, code: true, status: true } },
      business: { select: { name: true } },
    },
  });
}

/** Recent incoming WhatsApp messages (activation attempts). */
export async function listIncomingMessages(limit = 20) {
  return prisma.incomingMessage.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      fromNumber: true,
      pushName: true,
      result: true,
      detail: true,
      text: true,
      createdAt: true,
    },
  });
}
