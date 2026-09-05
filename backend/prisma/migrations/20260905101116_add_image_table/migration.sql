-- CreateTable
CREATE TABLE "Image" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "originalSize" INTEGER NOT NULL,
    "originalPath" TEXT NOT NULL,
    "sifPath" TEXT NOT NULL,
    "sifSize" INTEGER NOT NULL,
    "imageUuid" TEXT NOT NULL,
    "ownerIdHash" TEXT NOT NULL,
    "kekId" TEXT NOT NULL,
    "cipherSuite" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Image_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Image_userId_idx" ON "Image"("userId");

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
