-- AlterTable
ALTER TABLE "Impact" ADD COLUMN "requirementId" TEXT;
ALTER TABLE "Impact" ADD COLUMN "actionId" TEXT;
ALTER TABLE "Impact" ADD COLUMN "reason" TEXT;

-- AddForeignKey
ALTER TABLE "Impact" ADD CONSTRAINT "Impact_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Impact" ADD CONSTRAINT "Impact_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "Action"("id") ON DELETE SET NULL ON UPDATE CASCADE;
