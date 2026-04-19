-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "ratingSent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reminderSent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "securitySent" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Ride" ADD COLUMN     "reminderSent10min" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reminderSent15min" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reminderSent2h" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reminderSent30min" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reminderSent5min" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "securitySent" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "expoPushToken" TEXT,
ADD COLUMN     "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true;
