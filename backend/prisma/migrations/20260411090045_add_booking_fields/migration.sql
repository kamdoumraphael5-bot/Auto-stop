/*
  Warnings:

  - You are about to drop the column `idIssueDate` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `idNumber` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "amount" DOUBLE PRECISION,
ADD COLUMN     "bookerName" TEXT,
ADD COLUMN     "bookerPhone" TEXT,
ADD COLUMN     "idExpiryDate" TIMESTAMP(3),
ADD COLUMN     "idNumber" TEXT,
ADD COLUMN     "paymentMethod" TEXT,
ADD COLUMN     "travelerName" TEXT,
ADD COLUMN     "travelerPhone" TEXT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "idIssueDate",
DROP COLUMN "idNumber";
