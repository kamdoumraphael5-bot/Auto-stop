/*
  Warnings:

  - You are about to drop the column `time` on the `Ride` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Ride" DROP COLUMN "time",
ADD COLUMN     "dropoffPoint" TEXT,
ADD COLUMN     "isRecurring" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "meetingPoint" TEXT;
