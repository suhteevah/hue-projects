-- CreateTable
CREATE TABLE "MatterNode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nodeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "vendorId" INTEGER,
    "productId" INTEGER,
    "deviceType" TEXT NOT NULL,
    "serialNumber" TEXT,
    "commissioned" BOOLEAN NOT NULL DEFAULT true,
    "commissionedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "MatterNode_nodeId_key" ON "MatterNode"("nodeId");
