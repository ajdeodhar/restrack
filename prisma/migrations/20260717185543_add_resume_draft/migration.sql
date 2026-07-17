-- CreateTable
CREATE TABLE "ResumeDraft" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "originalTex" TEXT NOT NULL,
    "editedTex" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT '',
    "company" TEXT NOT NULL DEFAULT '',
    "section" TEXT NOT NULL DEFAULT '',
    "changeDescription" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "commitHash" TEXT,
    "commitUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResumeDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResumeDraft_userId_idx" ON "ResumeDraft"("userId");

-- AddForeignKey
ALTER TABLE "ResumeDraft" ADD CONSTRAINT "ResumeDraft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
