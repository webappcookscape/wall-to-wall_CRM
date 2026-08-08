-- CreateTable
CREATE TABLE "SplitUp" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "SplitUp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "ActivityType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorSource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "VendorSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionHold" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "ProductionHold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkNotification" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "WorkNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnlineQuestionCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "OnlineQuestionCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnlineQuestion" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "options" TEXT,

    CONSTRAINT "OnlineQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmsTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,

    CONSTRAINT "SmsTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "content" TEXT NOT NULL,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SplitUp_name_key" ON "SplitUp"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityType_name_key" ON "ActivityType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "VendorSource_name_key" ON "VendorSource"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionHold_name_key" ON "ProductionHold"("name");

-- CreateIndex
CREATE UNIQUE INDEX "WorkNotification_name_key" ON "WorkNotification"("name");

-- CreateIndex
CREATE UNIQUE INDEX "OnlineQuestionCategory_name_key" ON "OnlineQuestionCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SmsTemplate_name_key" ON "SmsTemplate"("name");

-- CreateIndex
CREATE UNIQUE INDEX "EmailTemplate_name_key" ON "EmailTemplate"("name");

-- AddForeignKey
ALTER TABLE "OnlineQuestion" ADD CONSTRAINT "OnlineQuestion_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "OnlineQuestionCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
