import { prisma } from "../db/client";

export async function getBusinessDetail(id: string) {
  return prisma.business.findUnique({
    where: { id },
    include: {
      owner: true,
      cards: { select: { id: true, code: true, status: true }, orderBy: { code: "asc" } },
      monitoringJobs: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });
}

export type BusinessUpdateInput = {
  name?: string;
  whatsappNumber?: string;
  placeId?: string | null;
  googleReviewUrl?: string | null;
  lastKnownReviewCount?: number | null;
  status?: "ACTIVE" | "PENDING_VERIFICATION" | "SUSPENDED";
};

export async function updateBusiness(id: string, data: BusinessUpdateInput) {
  return prisma.business.update({ where: { id }, data });
}

export async function listActiveBusinesses() {
  return prisma.business.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
    take: 100,
  });
}
