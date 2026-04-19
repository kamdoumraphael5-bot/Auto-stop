-- AlterTable
ALTER TABLE "Ride" ADD COLUMN     "arrivalTime" TIMESTAMP(3),
ADD COLUMN     "estimatedDuration" INTEGER,
ADD COLUMN     "licensePlate" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "idIssueDate" TIMESTAMP(3),
ADD COLUMN     "idNumber" TEXT;
