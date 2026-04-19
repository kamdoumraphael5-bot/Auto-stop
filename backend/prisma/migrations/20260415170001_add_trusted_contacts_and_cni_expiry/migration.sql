/*
  Warnings:

  - You are about to drop the column `passportVerified` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "canRate" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "ratingDeadline" TIMESTAMP(3),
ADD COLUMN     "trustedContact1" TEXT,
ADD COLUMN     "trustedContact2" TEXT,
ADD COLUMN     "trustedContact3" TEXT;

-- AlterTable
ALTER TABLE "Ride" ADD COLUMN     "totalSeats" INTEGER NOT NULL DEFAULT 4,
ALTER COLUMN "availableSeats" SET DEFAULT 4;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "passportVerified",
ADD COLUMN     "cniExpiryDate" TIMESTAMP(3),
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "lastName" TEXT;
