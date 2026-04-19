-- DropForeignKey
ALTER TABLE "Conversation" DROP CONSTRAINT "Conversation_rideId_fkey";

-- AlterTable
ALTER TABLE "Conversation" ALTER COLUMN "rideId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "cniNumber" TEXT,
ADD COLUMN     "cniVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "gallery" TEXT[];

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "Ride"("id") ON DELETE SET NULL ON UPDATE CASCADE;
