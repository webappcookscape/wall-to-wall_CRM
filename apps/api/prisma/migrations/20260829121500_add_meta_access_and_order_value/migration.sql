-- AlterTable
ALTER TABLE "Lead" ADD COLUMN "orderValue" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "metaAccess" BOOLEAN NOT NULL DEFAULT false;
