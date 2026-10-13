-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'WAITING_ACTIVATION';

-- AlterTable
ALTER TABLE "cards" ADD COLUMN     "qrError" TEXT,
ADD COLUMN     "qrGeneratedAt" TIMESTAMP(3),
ADD COLUMN     "qrPngPath" VARCHAR(255),
ADD COLUMN     "qrSvgPath" VARCHAR(255);
