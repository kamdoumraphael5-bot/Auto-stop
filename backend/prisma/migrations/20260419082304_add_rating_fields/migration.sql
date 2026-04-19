/*
  Warnings:

  - You are about to drop the column `firstName` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `lastName` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "ratingComment" TEXT,
ADD COLUMN     "ratingDate" TIMESTAMP(3),
ADD COLUMN     "ratingGiven" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ratingValue" INTEGER;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "firstName",
DROP COLUMN "lastName";
