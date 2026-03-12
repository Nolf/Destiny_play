-- CreateTable
CREATE TABLE "Match" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "round" TEXT NOT NULL,
    "court" INTEGER NOT NULL,
    "startTime" DATETIME,
    "endTime" DATETIME,
    "teamAPlayer1" TEXT NOT NULL,
    "teamAPlayer2" TEXT NOT NULL,
    "teamBPlayer1" TEXT NOT NULL,
    "teamBPlayer2" TEXT NOT NULL,
    "scoreA" INTEGER NOT NULL DEFAULT 0,
    "scoreB" INTEGER NOT NULL DEFAULT 0,
    "lastUpdatedBy" TEXT,
    "lastUpdatedAt" DATETIME
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "voterName" TEXT NOT NULL,
    "targetName" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Vote_voterName_key" ON "Vote"("voterName");
