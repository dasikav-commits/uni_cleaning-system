-- Redesign of the cleaning monitoring process (Kuliyapitiya BOQ):
--   * new logins (Deputy Registrar, PHI, Faculty Coordinator, Sub-Warden, Curator, Unit Officer)
--   * BOQ items per location, reporting assignments, monthly evaluation reports,
--     PHI daily attendance sheet and the "Cleaning & Janitorial Services" payment report.
-- Nothing is dropped: tables of the earlier workflow are kept with their data.

-- CreateEnum
CREATE TYPE "LocationCategory" AS ENUM ('FACULTY', 'ADMINISTRATION', 'HALL', 'COMMON_UNIT', 'LANDSCAPE', 'EXTERNAL_SERVICE');

-- CreateEnum
CREATE TYPE "EvaluationFormat" AS ENUM ('SCHEDULED', 'RATE_BASED');

-- CreateEnum
CREATE TYPE "BoqFrequency" AS ENUM ('TWICE_DAILY', 'DAILY', 'WEEKLY', 'MONTHLY', 'ANNUAL', 'WHEN_NECESSARY', 'ON_REQUEST', 'PER_SERVICE');

-- CreateEnum
CREATE TYPE "EvaluationReportStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'RETURNED', 'ACCEPTED');

-- CreateEnum
CREATE TYPE "PaymentReportStatus" AS ENUM ('DRAFT', 'FINALIZED');

-- AlterEnum: new logins.
--   GAA                    -> DEPUTY_REGISTRAR (the DR is now the administrator; stays active)
--   EVALUATING_OFFICER     -> DEPUTY_REGISTRAR, deactivated (the Evaluation Officer role became the DR;
--                             an existing DR must re-activate these accounts on purpose)
--   ADMINISTRATION_OFFICER -> UNIT_OFFICER, deactivated (Administration Officer section removed)
--   VICE_CHANCELLOR        -> UNIT_OFFICER, deactivated (VC login removed)
--   PHI                    -> PHI
BEGIN;
UPDATE "User" SET "active" = false
WHERE "role"::text IN ('EVALUATING_OFFICER', 'ADMINISTRATION_OFFICER', 'VICE_CHANCELLOR');
CREATE TYPE "UserRole_new" AS ENUM ('DEPUTY_REGISTRAR', 'PHI', 'FACULTY_COORDINATOR', 'SUB_WARDEN', 'CURATOR', 'UNIT_OFFICER');
ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole_new" USING (
  CASE "role"::text
    WHEN 'GAA' THEN 'DEPUTY_REGISTRAR'
    WHEN 'EVALUATING_OFFICER' THEN 'DEPUTY_REGISTRAR'
    WHEN 'ADMINISTRATION_OFFICER' THEN 'UNIT_OFFICER'
    WHEN 'VICE_CHANCELLOR' THEN 'UNIT_OFFICER'
    ELSE "role"::text
  END
)::"UserRole_new";
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "UserRole_old";
COMMIT;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActivityAction" ADD VALUE 'BOQ_IMPORTED';
ALTER TYPE "ActivityAction" ADD VALUE 'BOQ_ITEM_CREATED';
ALTER TYPE "ActivityAction" ADD VALUE 'BOQ_ITEM_UPDATED';
ALTER TYPE "ActivityAction" ADD VALUE 'REPORTING_ASSIGNMENT_CREATED';
ALTER TYPE "ActivityAction" ADD VALUE 'REPORTING_ASSIGNMENT_UPDATED';
ALTER TYPE "ActivityAction" ADD VALUE 'EVALUATION_REPORT_STARTED';
ALTER TYPE "ActivityAction" ADD VALUE 'EVALUATION_REPORT_UPDATED';
ALTER TYPE "ActivityAction" ADD VALUE 'EVALUATION_REPORT_SUBMITTED';
ALTER TYPE "ActivityAction" ADD VALUE 'EVALUATION_REPORT_RETURNED';
ALTER TYPE "ActivityAction" ADD VALUE 'EVALUATION_REPORT_ACCEPTED';
ALTER TYPE "ActivityAction" ADD VALUE 'EVALUATION_REPORT_REOPENED';
ALTER TYPE "ActivityAction" ADD VALUE 'PHI_DAILY_ATTENDANCE_SAVED';
ALTER TYPE "ActivityAction" ADD VALUE 'PAYMENT_REPORT_PREPARED';
ALTER TYPE "ActivityAction" ADD VALUE 'PAYMENT_REPORT_UPDATED';
ALTER TYPE "ActivityAction" ADD VALUE 'PAYMENT_REPORT_FINALIZED';
ALTER TYPE "ActivityAction" ADD VALUE 'PAYMENT_REPORT_REOPENED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationEvent" ADD VALUE 'EVALUATION_REPORT_SUBMITTED';
ALTER TYPE "NotificationEvent" ADD VALUE 'EVALUATION_REPORT_RETURNED';
ALTER TYPE "NotificationEvent" ADD VALUE 'EVALUATION_REPORT_ACCEPTED';
ALTER TYPE "NotificationEvent" ADD VALUE 'PHI_ATTENDANCE_SUBMITTED';
ALTER TYPE "NotificationEvent" ADD VALUE 'PAYMENT_REPORT_FINALIZED';

-- AlterTable
ALTER TABLE "Location" ADD COLUMN     "boqAmount" DECIMAL(15,2),
ADD COLUMN     "boqDescription" TEXT,
ADD COLUMN     "boqNumber" INTEGER,
ADD COLUMN     "category" "LocationCategory" NOT NULL DEFAULT 'COMMON_UNIT',
ADD COLUMN     "evaluationFormat" "EvaluationFormat" NOT NULL DEFAULT 'SCHEDULED',
ADD COLUMN     "shortName" TEXT;

-- CreateTable
CREATE TABLE "BoqItem" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "itemNo" TEXT NOT NULL,
    "subItem" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL,
    "frequency" "BoqFrequency" NOT NULL,
    "monthlyAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "unitRate" DECIMAL(15,2),
    "unitLabel" TEXT,
    "plannedPerYear" INTEGER,
    "penaltyRate" DECIMAL(15,2),
    "details" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoqItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportingAssignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportingAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationReport" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "status" "EvaluationReportStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "submittedById" TEXT,
    "submittedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "returnReason" TEXT,
    "remarks" TEXT,
    "boqTotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "deductionTotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "approvedTotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvaluationReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationReportRow" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "boqItemId" TEXT,
    "itemNo" TEXT NOT NULL,
    "subItem" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL,
    "frequency" "BoqFrequency" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "monthlyAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "unitRate" DECIMAL(15,2),
    "unitLabel" TEXT,
    "penaltyRate" DECIMAL(15,2),
    "scheduledCount" INTEGER NOT NULL DEFAULT 0,
    "completedCount" INTEGER NOT NULL DEFAULT 0,
    "completedKeys" JSONB,
    "quantity" INTEGER,
    "penaltyQuantity" INTEGER,
    "filled" BOOLEAN NOT NULL DEFAULT false,
    "deductionPercent" DECIMAL(5,2),
    "deductionAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvaluationReportRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhiDailyAttendance" (
    "id" TEXT NOT NULL,
    "phiUserId" TEXT NOT NULL,
    "attendanceDate" DATE NOT NULL,
    "halfDayEmployees" INTEGER NOT NULL DEFAULT 0,
    "halfDayGrassCutters" INTEGER NOT NULL DEFAULT 0,
    "halfDaySupervisors" INTEGER NOT NULL DEFAULT 0,
    "absentEmployees" INTEGER NOT NULL DEFAULT 0,
    "absentGrassCutters" INTEGER NOT NULL DEFAULT 0,
    "absentSupervisors" INTEGER NOT NULL DEFAULT 0,
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhiDailyAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyPaymentReport" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "status" "PaymentReportStatus" NOT NULL DEFAULT 'DRAFT',
    "boqTotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "invoiceTotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "approvedTotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "absenceDeduction" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "payableTotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "remarks" TEXT,
    "createdById" TEXT NOT NULL,
    "finalizedById" TEXT,
    "finalizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyPaymentReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyPaymentReportLine" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "boqNumber" INTEGER,
    "description" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "boqAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "invoiceAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "approvedAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "evaluationReportId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyPaymentReportLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BoqItem_locationId_sortOrder_idx" ON "BoqItem"("locationId", "sortOrder");

-- CreateIndex
CREATE INDEX "ReportingAssignment_locationId_idx" ON "ReportingAssignment"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "ReportingAssignment_userId_locationId_key" ON "ReportingAssignment"("userId", "locationId");

-- CreateIndex
CREATE INDEX "EvaluationReport_year_month_idx" ON "EvaluationReport"("year", "month");

-- CreateIndex
CREATE INDEX "EvaluationReport_status_idx" ON "EvaluationReport"("status");

-- CreateIndex
CREATE UNIQUE INDEX "EvaluationReport_locationId_year_month_key" ON "EvaluationReport"("locationId", "year", "month");

-- CreateIndex
CREATE INDEX "EvaluationReportRow_boqItemId_idx" ON "EvaluationReportRow"("boqItemId");

-- CreateIndex
CREATE UNIQUE INDEX "EvaluationReportRow_reportId_boqItemId_key" ON "EvaluationReportRow"("reportId", "boqItemId");

-- CreateIndex
CREATE INDEX "PhiDailyAttendance_attendanceDate_idx" ON "PhiDailyAttendance"("attendanceDate");

-- CreateIndex
CREATE UNIQUE INDEX "PhiDailyAttendance_phiUserId_attendanceDate_key" ON "PhiDailyAttendance"("phiUserId", "attendanceDate");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyPaymentReport_year_month_key" ON "MonthlyPaymentReport"("year", "month");

-- CreateIndex
CREATE INDEX "MonthlyPaymentReportLine_locationId_idx" ON "MonthlyPaymentReportLine"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyPaymentReportLine_reportId_locationId_key" ON "MonthlyPaymentReportLine"("reportId", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "Location_boqNumber_key" ON "Location"("boqNumber");

-- AddForeignKey
ALTER TABLE "BoqItem" ADD CONSTRAINT "BoqItem_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportingAssignment" ADD CONSTRAINT "ReportingAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportingAssignment" ADD CONSTRAINT "ReportingAssignment_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationReport" ADD CONSTRAINT "EvaluationReport_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationReport" ADD CONSTRAINT "EvaluationReport_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationReport" ADD CONSTRAINT "EvaluationReport_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationReport" ADD CONSTRAINT "EvaluationReport_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationReportRow" ADD CONSTRAINT "EvaluationReportRow_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "EvaluationReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationReportRow" ADD CONSTRAINT "EvaluationReportRow_boqItemId_fkey" FOREIGN KEY ("boqItemId") REFERENCES "BoqItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhiDailyAttendance" ADD CONSTRAINT "PhiDailyAttendance_phiUserId_fkey" FOREIGN KEY ("phiUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyPaymentReport" ADD CONSTRAINT "MonthlyPaymentReport_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyPaymentReport" ADD CONSTRAINT "MonthlyPaymentReport_finalizedById_fkey" FOREIGN KEY ("finalizedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyPaymentReportLine" ADD CONSTRAINT "MonthlyPaymentReportLine_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "MonthlyPaymentReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyPaymentReportLine" ADD CONSTRAINT "MonthlyPaymentReportLine_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
