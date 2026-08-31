-- AlterEnum
ALTER TYPE "ActionStatus" ADD VALUE 'OVERDUE';

-- DropForeignKey
ALTER TABLE "ActionHistory" DROP CONSTRAINT "ActionHistory_userId_fkey";

-- AlterTable
ALTER TABLE "Action" ADD COLUMN     "department" TEXT,
ADD COLUMN     "priority" "Priority" NOT NULL DEFAULT 'MEDIUM';

-- AlterTable
ALTER TABLE "ActionHistory" ALTER COLUMN "userId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "ActionHistory" ADD CONSTRAINT "ActionHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
