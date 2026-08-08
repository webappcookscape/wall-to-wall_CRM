/*
  Warnings:

  - You are about to drop the column `name` on the `BankDetail` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[accountNumber]` on the table `BankDetail` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `accountHolderName` to the `BankDetail` table without a default value. This is not possible if the table is not empty.
  - Added the required column `accountNumber` to the `BankDetail` table without a default value. This is not possible if the table is not empty.
  - Added the required column `bankName` to the `BankDetail` table without a default value. This is not possible if the table is not empty.
  - Added the required column `branch` to the `BankDetail` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `BankDetail` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "BankDetail_name_key";

-- AlterTable
ALTER TABLE "BankDetail" DROP COLUMN "name",
ADD COLUMN     "accountHolderName" TEXT NOT NULL,
ADD COLUMN     "accountNumber" TEXT NOT NULL,
ADD COLUMN     "bankName" TEXT NOT NULL,
ADD COLUMN     "branch" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "updatedBy" TEXT;

-- AlterTable
ALTER TABLE "Brand" ADD COLUMN     "logo" TEXT;

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "contactableDate" TIMESTAMP(3),
ADD COLUMN     "metaAdAccountId" TEXT,
ADD COLUMN     "metaAdId" TEXT,
ADD COLUMN     "metaCampaignId" TEXT,
ADD COLUMN     "metaFormId" TEXT,
ADD COLUMN     "metaLeadId" TEXT,
ADD COLUMN     "ratingName" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "businessHeadId" TEXT,
ADD COLUMN     "password" TEXT,
ADD COLUMN     "signaturePhotoId" TEXT;

-- CreateTable
CREATE TABLE "SignaturePhoto" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SignaturePhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BankDetail_accountNumber_key" ON "BankDetail"("accountNumber");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_signaturePhotoId_fkey" FOREIGN KEY ("signaturePhotoId") REFERENCES "SignaturePhoto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_businessHeadId_fkey" FOREIGN KEY ("businessHeadId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
