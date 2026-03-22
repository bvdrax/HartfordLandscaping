-- CreateEnum
CREATE TYPE "ExpenseType" AS ENUM ('BUSINESS', 'PERSONAL');

-- AlterTable
ALTER TABLE "Receipt" ADD COLUMN     "expenseType" "ExpenseType" NOT NULL DEFAULT 'BUSINESS',
ADD COLUMN     "purchasedByUserId" TEXT;

-- AlterTable
ALTER TABLE "ReceiptLineItem" ADD COLUMN     "expenseType" "ExpenseType",
ADD COLUMN     "projectId" TEXT;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_purchasedByUserId_fkey" FOREIGN KEY ("purchasedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptLineItem" ADD CONSTRAINT "ReceiptLineItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
