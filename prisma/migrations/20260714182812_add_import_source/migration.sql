-- AlterTable
ALTER TABLE "ProfileItem" ADD COLUMN     "sourceId" TEXT;

-- CreateTable
CREATE TABLE "ImportSource" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT,
    "fileBytes" BYTEA,
    "extractedText" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportSource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImportSource_userId_idx" ON "ImportSource"("userId");

-- CreateIndex
CREATE INDEX "ImportSource_userId_fileName_idx" ON "ImportSource"("userId", "fileName");

-- CreateIndex
CREATE INDEX "ProfileItem_sourceId_idx" ON "ProfileItem"("sourceId");

-- AddForeignKey
ALTER TABLE "ImportSource" ADD CONSTRAINT "ImportSource_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileItem" ADD CONSTRAINT "ProfileItem_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ImportSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
