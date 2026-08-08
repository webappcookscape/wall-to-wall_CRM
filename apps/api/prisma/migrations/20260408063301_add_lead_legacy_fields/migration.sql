-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "dataCollected" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "instructionToPass" TEXT,
ADD COLUMN     "leadType" TEXT DEFAULT 'Direct Lead';
