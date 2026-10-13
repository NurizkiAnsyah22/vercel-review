-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PAID', 'ACTIVATION_RECEIVED', 'PROCESSING', 'ACTIVATED', 'READY_TO_PRINT', 'READY_TO_SHIP', 'SHIPPED', 'CANCELLED');

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "cardId" UUID NOT NULL,
    "businessId" UUID,
    "buyerName" VARCHAR(120),
    "buyerWhatsappNumber" VARCHAR(32) NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PAID',
    "note" TEXT,
    "activatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incoming_messages" (
    "id" UUID NOT NULL,
    "providerMessageId" VARCHAR(128) NOT NULL,
    "fromNumber" VARCHAR(32) NOT NULL,
    "pushName" VARCHAR(120),
    "text" TEXT NOT NULL,
    "orderId" UUID,
    "result" VARCHAR(32) NOT NULL,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incoming_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "orders_cardId_key" ON "orders"("cardId");

-- CreateIndex
CREATE INDEX "orders_buyerWhatsappNumber_idx" ON "orders"("buyerWhatsappNumber");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE UNIQUE INDEX "incoming_messages_providerMessageId_key" ON "incoming_messages"("providerMessageId");

-- CreateIndex
CREATE INDEX "incoming_messages_fromNumber_idx" ON "incoming_messages"("fromNumber");

-- CreateIndex
CREATE INDEX "incoming_messages_createdAt_idx" ON "incoming_messages"("createdAt");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incoming_messages" ADD CONSTRAINT "incoming_messages_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
