-- =============================================================================
-- Schema repair - part 2 of 2: tables, columns, indexes, foreign keys
-- Generated from prisma/schema.prisma (Prisma 7.9.1).
--
-- SAFE TO RUN MORE THAN ONCE. It only CREATES what is missing:
--   * never drops tables, columns, types or data
--   * existing objects are left unchanged
--   * if one statement cannot be applied (e.g. existing rows violate a new
--     constraint) a WARNING is printed and the rest of the script continues.
-- =============================================================================

-- Run 01_enums.sql first, as a separate run.
-- If you ran both files together and see a WARNING containing "unsafe use of new
-- value", simply run this file once more - it will finish the remaining step.

-- ---------------------------------------------------------------------------
-- 1. Missing tables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Location" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "minimumWorkers" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CleaningTask" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "TaskCategory" NOT NULL,
    "frequency" "TaskFrequency" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CleaningTask_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LocationTask" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "frequency" "TaskFrequency" NOT NULL,
    "allocatedAmount" DECIMAL(15,2) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isAdditional" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LocationTask_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CleaningWorker" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CleaningWorker_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "WorkerLocationAssignment" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "allocatedAmount" DECIMAL(15,2) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkerLocationAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EvaluatingOfficerAssignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvaluatingOfficerAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PHIAssignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PHIAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "DailyCleaningEvaluation" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "locationTaskId" TEXT NOT NULL,
    "evaluatingOfficerId" TEXT NOT NULL,
    "evaluationDate" TIMESTAMP(3) NOT NULL,
    "occurrenceKey" TEXT NOT NULL DEFAULT 'default',
    "result" "EvaluationResult" NOT NULL,
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "finalizedAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),

    CONSTRAINT "DailyCleaningEvaluation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "WorkerAttendance" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "phiUserId" TEXT NOT NULL,
    "attendanceDate" TIMESTAMP(3) NOT NULL,
    "attendanceStatus" "AttendanceStatus" NOT NULL,
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "finalizedAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),

    CONSTRAINT "WorkerAttendance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "DailyAttendanceEvaluation" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "phiUserId" TEXT NOT NULL,
    "attendanceDate" TIMESTAMP(3) NOT NULL,
    "totalPresentCount" INTEGER NOT NULL,
    "remark" TEXT,
    "finalized" BOOLEAN NOT NULL DEFAULT false,
    "finalizedAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyAttendanceEvaluation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MonthlyEvaluationReport" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'DRAFT',
    "isComplete" BOOLEAN NOT NULL DEFAULT true,
    "processingError" TEXT,
    "attendanceHistory" JSONB,
    "generatedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "resubmittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyEvaluationReport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PhiMonthlyAttendanceReport" (
    "id" TEXT NOT NULL,
    "phiUserId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'DRAFT',
    "processingError" TEXT,
    "grandTotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "generatedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "resubmittedAt" TIMESTAMP(3),
    "finalizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhiMonthlyAttendanceReport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PhiMonthlyAttendanceSummary" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "category" "PhiMonthlyAttendanceCategory" NOT NULL,
    "employeeCount" INTEGER NOT NULL,
    "deductionRate" DECIMAL(15,2) NOT NULL,
    "rowTotal" DECIMAL(15,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhiMonthlyAttendanceSummary_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PhiMonthlyAttendanceReview" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "decision" "AdministrationDecision" NOT NULL,
    "remarks" TEXT,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhiMonthlyAttendanceReview_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MonthlyTaskSummary" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "locationTaskId" TEXT NOT NULL,
    "taskNameSnapshot" TEXT NOT NULL,
    "categorySnapshot" "TaskCategory" NOT NULL,
    "frequencySnapshot" "TaskFrequency" NOT NULL,
    "allocatedAmount" DECIMAL(15,2) NOT NULL,
    "completionPercentage" DECIMAL(5,2) NOT NULL,
    "recommendedAmount" DECIMAL(15,2),
    "expectedOccurrences" INTEGER NOT NULL DEFAULT 0,
    "passedOccurrences" INTEGER NOT NULL DEFAULT 0,
    "failedOccurrences" INTEGER NOT NULL DEFAULT 0,
    "notApplicableOccurrences" INTEGER NOT NULL DEFAULT 0,
    "missingOccurrences" INTEGER NOT NULL DEFAULT 0,
    "evaluationHistory" JSONB,
    "taskRemarks" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyTaskSummary_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MonthlyWorkerSummary" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "workerLocationAssignmentId" TEXT NOT NULL,
    "workerNameSnapshot" TEXT NOT NULL,
    "allocatedAmount" DECIMAL(15,2) NOT NULL,
    "recommendedAmount" DECIMAL(15,2) NOT NULL,
    "attendancePercentage" DECIMAL(5,2) NOT NULL,
    "applicableWorkingDays" INTEGER NOT NULL,
    "presentWorkingDays" INTEGER NOT NULL DEFAULT 0,
    "absentWorkingDays" INTEGER NOT NULL DEFAULT 0,
    "missingAttendanceOccurrences" INTEGER NOT NULL DEFAULT 0,
    "attendanceHistory" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyWorkerSummary_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AdministrationReview" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "decision" "AdministrationDecision" NOT NULL,
    "remarks" TEXT,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdministrationReview_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PaymentRecommendation" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "status" "PaymentRecommendationStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "locationCleaningTotal" DECIMAL(15,2) NOT NULL,
    "locationAttendanceTotal" DECIMAL(15,2) NOT NULL,
    "locationGrandTotal" DECIMAL(15,2) NOT NULL,
    "overallRecommendedPayment" DECIMAL(15,2) NOT NULL,
    "sentToVcAt" TIMESTAMP(3),
    "submittedByUserId" TEXT,
    "remarks" TEXT,
    "finalizedAt" TIMESTAMP(3),
    "finalizedByUserId" TEXT,
    "finalizationRemarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentRecommendation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PaymentTaskCalculation" (
    "id" TEXT NOT NULL,
    "recommendationId" TEXT NOT NULL,
    "monthlyTaskSummaryId" TEXT NOT NULL,
    "locationTaskId" TEXT NOT NULL,
    "originalAmount" DECIMAL(15,2) NOT NULL,
    "recommendationAmount" DECIMAL(15,2) NOT NULL,
    "completionPercentage" DECIMAL(5,2) NOT NULL,
    "recommendedAmount" DECIMAL(15,2) NOT NULL,
    "changedById" TEXT,
    "changedAt" TIMESTAMP(3),
    "changeReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentTaskCalculation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PaymentWorkerCalculation" (
    "id" TEXT NOT NULL,
    "recommendationId" TEXT NOT NULL,
    "monthlyWorkerSummaryId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "workerLocationAssignmentId" TEXT NOT NULL,
    "originalAmount" DECIMAL(15,2) NOT NULL,
    "recommendationAmount" DECIMAL(15,2) NOT NULL,
    "attendancePercentage" DECIMAL(5,2) NOT NULL,
    "recommendedAmount" DECIMAL(15,2) NOT NULL,
    "changedById" TEXT,
    "changedAt" TIMESTAMP(3),
    "changeReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentWorkerCalculation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AdditionalCleaningTask" (
    "id" TEXT NOT NULL,
    "recommendationId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "taskName" TEXT NOT NULL,
    "category" "TaskCategory" NOT NULL,
    "allocatedAmount" DECIMAL(15,2) NOT NULL,
    "completionPercentage" DECIMAL(5,2) NOT NULL,
    "recommendedAmount" DECIMAL(15,2) NOT NULL,
    "remark" TEXT,
    "isAdditional" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdditionalCleaningTask_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "VCApproval" (
    "id" TEXT NOT NULL,
    "recommendationId" TEXT NOT NULL,
    "vcUserId" TEXT NOT NULL,
    "decision" "VCDecision" NOT NULL,
    "remarks" TEXT,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VCApproval_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ActivityLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" "ActivityAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "metadata" JSONB,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Notification" (
    "id" TEXT NOT NULL,
    "recipientUserId" TEXT NOT NULL,
    "event" "NotificationEvent" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "dedupeKey" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- ---------------------------------------------------------------------------
-- 2. Missing columns on tables that already existed
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column User.id: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column User.name: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "email" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column User.email: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "role" "UserRole" NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column User.role: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column User.active: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column User.createdAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column User.updatedAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "Location" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column Location.id: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "Location" ADD COLUMN IF NOT EXISTS "code" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column Location.code: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "Location" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column Location.name: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "Location" ADD COLUMN IF NOT EXISTS "minimumWorkers" INTEGER;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column Location.minimumWorkers: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "Location" ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column Location.active: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "Location" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column Location.createdAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "Location" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column Location.updatedAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "CleaningTask" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column CleaningTask.id: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "CleaningTask" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column CleaningTask.name: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "CleaningTask" ADD COLUMN IF NOT EXISTS "category" "TaskCategory" NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column CleaningTask.category: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "CleaningTask" ADD COLUMN IF NOT EXISTS "frequency" "TaskFrequency" NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column CleaningTask.frequency: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "CleaningTask" ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column CleaningTask.active: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "CleaningTask" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column CleaningTask.createdAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "CleaningTask" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column CleaningTask.updatedAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "LocationTask" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column LocationTask.id: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "LocationTask" ADD COLUMN IF NOT EXISTS "locationId" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column LocationTask.locationId: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "LocationTask" ADD COLUMN IF NOT EXISTS "taskId" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column LocationTask.taskId: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "LocationTask" ADD COLUMN IF NOT EXISTS "frequency" "TaskFrequency" NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column LocationTask.frequency: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "LocationTask" ADD COLUMN IF NOT EXISTS "allocatedAmount" DECIMAL(15,2) NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column LocationTask.allocatedAmount: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "LocationTask" ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column LocationTask.active: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "LocationTask" ADD COLUMN IF NOT EXISTS "isAdditional" BOOLEAN NOT NULL DEFAULT false;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column LocationTask.isAdditional: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "LocationTask" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column LocationTask.createdAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "LocationTask" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column LocationTask.updatedAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "CleaningWorker" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column CleaningWorker.id: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "CleaningWorker" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column CleaningWorker.name: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "CleaningWorker" ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column CleaningWorker.active: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "CleaningWorker" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column CleaningWorker.createdAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "CleaningWorker" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column CleaningWorker.updatedAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "WorkerLocationAssignment" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column WorkerLocationAssignment.id: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "WorkerLocationAssignment" ADD COLUMN IF NOT EXISTS "workerId" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column WorkerLocationAssignment.workerId: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "WorkerLocationAssignment" ADD COLUMN IF NOT EXISTS "locationId" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column WorkerLocationAssignment.locationId: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "WorkerLocationAssignment" ADD COLUMN IF NOT EXISTS "allocatedAmount" DECIMAL(15,2) NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column WorkerLocationAssignment.allocatedAmount: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "WorkerLocationAssignment" ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column WorkerLocationAssignment.active: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "WorkerLocationAssignment" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column WorkerLocationAssignment.createdAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "WorkerLocationAssignment" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column WorkerLocationAssignment.updatedAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "EvaluatingOfficerAssignment" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column EvaluatingOfficerAssignment.id: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "EvaluatingOfficerAssignment" ADD COLUMN IF NOT EXISTS "userId" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column EvaluatingOfficerAssignment.userId: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "EvaluatingOfficerAssignment" ADD COLUMN IF NOT EXISTS "locationId" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column EvaluatingOfficerAssignment.locationId: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "EvaluatingOfficerAssignment" ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column EvaluatingOfficerAssignment.active: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "EvaluatingOfficerAssignment" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column EvaluatingOfficerAssignment.createdAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "EvaluatingOfficerAssignment" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column EvaluatingOfficerAssignment.updatedAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PHIAssignment" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PHIAssignment.id: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PHIAssignment" ADD COLUMN IF NOT EXISTS "userId" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PHIAssignment.userId: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PHIAssignment" ADD COLUMN IF NOT EXISTS "locationId" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PHIAssignment.locationId: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PHIAssignment" ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PHIAssignment.active: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PHIAssignment" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PHIAssignment.createdAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PHIAssignment" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PHIAssignment.updatedAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "DailyCleaningEvaluation" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column DailyCleaningEvaluation.id: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "DailyCleaningEvaluation" ADD COLUMN IF NOT EXISTS "locationId" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column DailyCleaningEvaluation.locationId: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "DailyCleaningEvaluation" ADD COLUMN IF NOT EXISTS "locationTaskId" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column DailyCleaningEvaluation.locationTaskId: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "DailyCleaningEvaluation" ADD COLUMN IF NOT EXISTS "evaluatingOfficerId" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column DailyCleaningEvaluation.evaluatingOfficerId: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "DailyCleaningEvaluation" ADD COLUMN IF NOT EXISTS "evaluationDate" TIMESTAMP(3) NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column DailyCleaningEvaluation.evaluationDate: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "DailyCleaningEvaluation" ADD COLUMN IF NOT EXISTS "occurrenceKey" TEXT NOT NULL DEFAULT 'default';
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column DailyCleaningEvaluation.occurrenceKey: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "DailyCleaningEvaluation" ADD COLUMN IF NOT EXISTS "result" "EvaluationResult" NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column DailyCleaningEvaluation.result: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "DailyCleaningEvaluation" ADD COLUMN IF NOT EXISTS "remark" TEXT;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column DailyCleaningEvaluation.remark: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "DailyCleaningEvaluation" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column DailyCleaningEvaluation.createdAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "DailyCleaningEvaluation" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column DailyCleaningEvaluation.updatedAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "DailyCleaningEvaluation" ADD COLUMN IF NOT EXISTS "finalizedAt" TIMESTAMP(3);
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column DailyCleaningEvaluation.finalizedAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "DailyCleaningEvaluation" ADD COLUMN IF NOT EXISTS "lockedAt" TIMESTAMP(3);
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column DailyCleaningEvaluation.lockedAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "WorkerAttendance" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column WorkerAttendance.id: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "WorkerAttendance" ADD COLUMN IF NOT EXISTS "workerId" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column WorkerAttendance.workerId: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "WorkerAttendance" ADD COLUMN IF NOT EXISTS "locationId" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column WorkerAttendance.locationId: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "WorkerAttendance" ADD COLUMN IF NOT EXISTS "phiUserId" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column WorkerAttendance.phiUserId: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "WorkerAttendance" ADD COLUMN IF NOT EXISTS "attendanceDate" TIMESTAMP(3) NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column WorkerAttendance.attendanceDate: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "WorkerAttendance" ADD COLUMN IF NOT EXISTS "attendanceStatus" "AttendanceStatus" NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column WorkerAttendance.attendanceStatus: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "WorkerAttendance" ADD COLUMN IF NOT EXISTS "remark" TEXT;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column WorkerAttendance.remark: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "WorkerAttendance" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column WorkerAttendance.createdAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "WorkerAttendance" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column WorkerAttendance.updatedAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "WorkerAttendance" ADD COLUMN IF NOT EXISTS "finalizedAt" TIMESTAMP(3);
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column WorkerAttendance.finalizedAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "WorkerAttendance" ADD COLUMN IF NOT EXISTS "lockedAt" TIMESTAMP(3);
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column WorkerAttendance.lockedAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "DailyAttendanceEvaluation" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column DailyAttendanceEvaluation.id: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "DailyAttendanceEvaluation" ADD COLUMN IF NOT EXISTS "locationId" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column DailyAttendanceEvaluation.locationId: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "DailyAttendanceEvaluation" ADD COLUMN IF NOT EXISTS "phiUserId" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column DailyAttendanceEvaluation.phiUserId: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "DailyAttendanceEvaluation" ADD COLUMN IF NOT EXISTS "attendanceDate" TIMESTAMP(3) NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column DailyAttendanceEvaluation.attendanceDate: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "DailyAttendanceEvaluation" ADD COLUMN IF NOT EXISTS "totalPresentCount" INTEGER NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column DailyAttendanceEvaluation.totalPresentCount: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "DailyAttendanceEvaluation" ADD COLUMN IF NOT EXISTS "remark" TEXT;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column DailyAttendanceEvaluation.remark: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "DailyAttendanceEvaluation" ADD COLUMN IF NOT EXISTS "finalized" BOOLEAN NOT NULL DEFAULT false;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column DailyAttendanceEvaluation.finalized: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "DailyAttendanceEvaluation" ADD COLUMN IF NOT EXISTS "finalizedAt" TIMESTAMP(3);
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column DailyAttendanceEvaluation.finalizedAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "DailyAttendanceEvaluation" ADD COLUMN IF NOT EXISTS "lockedAt" TIMESTAMP(3);
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column DailyAttendanceEvaluation.lockedAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "DailyAttendanceEvaluation" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column DailyAttendanceEvaluation.createdAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "DailyAttendanceEvaluation" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column DailyAttendanceEvaluation.updatedAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "MonthlyEvaluationReport" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column MonthlyEvaluationReport.id: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "MonthlyEvaluationReport" ADD COLUMN IF NOT EXISTS "locationId" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column MonthlyEvaluationReport.locationId: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "MonthlyEvaluationReport" ADD COLUMN IF NOT EXISTS "month" INTEGER NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column MonthlyEvaluationReport.month: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "MonthlyEvaluationReport" ADD COLUMN IF NOT EXISTS "year" INTEGER NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column MonthlyEvaluationReport.year: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "MonthlyEvaluationReport" ADD COLUMN IF NOT EXISTS "status" "ReportStatus" NOT NULL DEFAULT 'DRAFT';
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column MonthlyEvaluationReport.status: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "MonthlyEvaluationReport" ADD COLUMN IF NOT EXISTS "isComplete" BOOLEAN NOT NULL DEFAULT true;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column MonthlyEvaluationReport.isComplete: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "MonthlyEvaluationReport" ADD COLUMN IF NOT EXISTS "processingError" TEXT;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column MonthlyEvaluationReport.processingError: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "MonthlyEvaluationReport" ADD COLUMN IF NOT EXISTS "attendanceHistory" JSONB;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column MonthlyEvaluationReport.attendanceHistory: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "MonthlyEvaluationReport" ADD COLUMN IF NOT EXISTS "generatedAt" TIMESTAMP(3);
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column MonthlyEvaluationReport.generatedAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "MonthlyEvaluationReport" ADD COLUMN IF NOT EXISTS "submittedAt" TIMESTAMP(3);
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column MonthlyEvaluationReport.submittedAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "MonthlyEvaluationReport" ADD COLUMN IF NOT EXISTS "resubmittedAt" TIMESTAMP(3);
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column MonthlyEvaluationReport.resubmittedAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "MonthlyEvaluationReport" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column MonthlyEvaluationReport.createdAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "MonthlyEvaluationReport" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column MonthlyEvaluationReport.updatedAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PhiMonthlyAttendanceReport" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PhiMonthlyAttendanceReport.id: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PhiMonthlyAttendanceReport" ADD COLUMN IF NOT EXISTS "phiUserId" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PhiMonthlyAttendanceReport.phiUserId: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PhiMonthlyAttendanceReport" ADD COLUMN IF NOT EXISTS "month" INTEGER NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PhiMonthlyAttendanceReport.month: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PhiMonthlyAttendanceReport" ADD COLUMN IF NOT EXISTS "year" INTEGER NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PhiMonthlyAttendanceReport.year: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PhiMonthlyAttendanceReport" ADD COLUMN IF NOT EXISTS "status" "ReportStatus" NOT NULL DEFAULT 'DRAFT';
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PhiMonthlyAttendanceReport.status: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PhiMonthlyAttendanceReport" ADD COLUMN IF NOT EXISTS "processingError" TEXT;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PhiMonthlyAttendanceReport.processingError: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PhiMonthlyAttendanceReport" ADD COLUMN IF NOT EXISTS "grandTotal" DECIMAL(15,2) NOT NULL DEFAULT 0;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PhiMonthlyAttendanceReport.grandTotal: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PhiMonthlyAttendanceReport" ADD COLUMN IF NOT EXISTS "generatedAt" TIMESTAMP(3);
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PhiMonthlyAttendanceReport.generatedAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PhiMonthlyAttendanceReport" ADD COLUMN IF NOT EXISTS "submittedAt" TIMESTAMP(3);
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PhiMonthlyAttendanceReport.submittedAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PhiMonthlyAttendanceReport" ADD COLUMN IF NOT EXISTS "resubmittedAt" TIMESTAMP(3);
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PhiMonthlyAttendanceReport.resubmittedAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PhiMonthlyAttendanceReport" ADD COLUMN IF NOT EXISTS "finalizedAt" TIMESTAMP(3);
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PhiMonthlyAttendanceReport.finalizedAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PhiMonthlyAttendanceReport" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PhiMonthlyAttendanceReport.createdAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PhiMonthlyAttendanceReport" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PhiMonthlyAttendanceReport.updatedAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PhiMonthlyAttendanceSummary" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PhiMonthlyAttendanceSummary.id: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PhiMonthlyAttendanceSummary" ADD COLUMN IF NOT EXISTS "reportId" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PhiMonthlyAttendanceSummary.reportId: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PhiMonthlyAttendanceSummary" ADD COLUMN IF NOT EXISTS "category" "PhiMonthlyAttendanceCategory" NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PhiMonthlyAttendanceSummary.category: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PhiMonthlyAttendanceSummary" ADD COLUMN IF NOT EXISTS "employeeCount" INTEGER NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PhiMonthlyAttendanceSummary.employeeCount: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PhiMonthlyAttendanceSummary" ADD COLUMN IF NOT EXISTS "deductionRate" DECIMAL(15,2) NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PhiMonthlyAttendanceSummary.deductionRate: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PhiMonthlyAttendanceSummary" ADD COLUMN IF NOT EXISTS "rowTotal" DECIMAL(15,2) NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PhiMonthlyAttendanceSummary.rowTotal: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PhiMonthlyAttendanceSummary" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PhiMonthlyAttendanceSummary.createdAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PhiMonthlyAttendanceSummary" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PhiMonthlyAttendanceSummary.updatedAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PhiMonthlyAttendanceReview" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PhiMonthlyAttendanceReview.id: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PhiMonthlyAttendanceReview" ADD COLUMN IF NOT EXISTS "reportId" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PhiMonthlyAttendanceReview.reportId: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PhiMonthlyAttendanceReview" ADD COLUMN IF NOT EXISTS "reviewerId" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PhiMonthlyAttendanceReview.reviewerId: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PhiMonthlyAttendanceReview" ADD COLUMN IF NOT EXISTS "decision" "AdministrationDecision" NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PhiMonthlyAttendanceReview.decision: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PhiMonthlyAttendanceReview" ADD COLUMN IF NOT EXISTS "remarks" TEXT;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PhiMonthlyAttendanceReview.remarks: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PhiMonthlyAttendanceReview" ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PhiMonthlyAttendanceReview.reviewedAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PhiMonthlyAttendanceReview" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PhiMonthlyAttendanceReview.createdAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PhiMonthlyAttendanceReview" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PhiMonthlyAttendanceReview.updatedAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "MonthlyTaskSummary" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column MonthlyTaskSummary.id: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "MonthlyTaskSummary" ADD COLUMN IF NOT EXISTS "reportId" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column MonthlyTaskSummary.reportId: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "MonthlyTaskSummary" ADD COLUMN IF NOT EXISTS "locationTaskId" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column MonthlyTaskSummary.locationTaskId: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "MonthlyTaskSummary" ADD COLUMN IF NOT EXISTS "taskNameSnapshot" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column MonthlyTaskSummary.taskNameSnapshot: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "MonthlyTaskSummary" ADD COLUMN IF NOT EXISTS "categorySnapshot" "TaskCategory" NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column MonthlyTaskSummary.categorySnapshot: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "MonthlyTaskSummary" ADD COLUMN IF NOT EXISTS "frequencySnapshot" "TaskFrequency" NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column MonthlyTaskSummary.frequencySnapshot: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "MonthlyTaskSummary" ADD COLUMN IF NOT EXISTS "allocatedAmount" DECIMAL(15,2) NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column MonthlyTaskSummary.allocatedAmount: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "MonthlyTaskSummary" ADD COLUMN IF NOT EXISTS "completionPercentage" DECIMAL(5,2) NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column MonthlyTaskSummary.completionPercentage: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "MonthlyTaskSummary" ADD COLUMN IF NOT EXISTS "recommendedAmount" DECIMAL(15,2);
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column MonthlyTaskSummary.recommendedAmount: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "MonthlyTaskSummary" ADD COLUMN IF NOT EXISTS "expectedOccurrences" INTEGER NOT NULL DEFAULT 0;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column MonthlyTaskSummary.expectedOccurrences: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "MonthlyTaskSummary" ADD COLUMN IF NOT EXISTS "passedOccurrences" INTEGER NOT NULL DEFAULT 0;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column MonthlyTaskSummary.passedOccurrences: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "MonthlyTaskSummary" ADD COLUMN IF NOT EXISTS "failedOccurrences" INTEGER NOT NULL DEFAULT 0;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column MonthlyTaskSummary.failedOccurrences: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "MonthlyTaskSummary" ADD COLUMN IF NOT EXISTS "notApplicableOccurrences" INTEGER NOT NULL DEFAULT 0;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column MonthlyTaskSummary.notApplicableOccurrences: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "MonthlyTaskSummary" ADD COLUMN IF NOT EXISTS "missingOccurrences" INTEGER NOT NULL DEFAULT 0;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column MonthlyTaskSummary.missingOccurrences: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "MonthlyTaskSummary" ADD COLUMN IF NOT EXISTS "evaluationHistory" JSONB;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column MonthlyTaskSummary.evaluationHistory: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "MonthlyTaskSummary" ADD COLUMN IF NOT EXISTS "taskRemarks" JSONB;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column MonthlyTaskSummary.taskRemarks: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "MonthlyTaskSummary" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column MonthlyTaskSummary.createdAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "MonthlyTaskSummary" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column MonthlyTaskSummary.updatedAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "MonthlyWorkerSummary" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column MonthlyWorkerSummary.id: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "MonthlyWorkerSummary" ADD COLUMN IF NOT EXISTS "reportId" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column MonthlyWorkerSummary.reportId: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "MonthlyWorkerSummary" ADD COLUMN IF NOT EXISTS "workerId" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column MonthlyWorkerSummary.workerId: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "MonthlyWorkerSummary" ADD COLUMN IF NOT EXISTS "workerLocationAssignmentId" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column MonthlyWorkerSummary.workerLocationAssignmentId: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "MonthlyWorkerSummary" ADD COLUMN IF NOT EXISTS "workerNameSnapshot" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column MonthlyWorkerSummary.workerNameSnapshot: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "MonthlyWorkerSummary" ADD COLUMN IF NOT EXISTS "allocatedAmount" DECIMAL(15,2) NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column MonthlyWorkerSummary.allocatedAmount: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "MonthlyWorkerSummary" ADD COLUMN IF NOT EXISTS "recommendedAmount" DECIMAL(15,2) NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column MonthlyWorkerSummary.recommendedAmount: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "MonthlyWorkerSummary" ADD COLUMN IF NOT EXISTS "attendancePercentage" DECIMAL(5,2) NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column MonthlyWorkerSummary.attendancePercentage: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "MonthlyWorkerSummary" ADD COLUMN IF NOT EXISTS "applicableWorkingDays" INTEGER NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column MonthlyWorkerSummary.applicableWorkingDays: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "MonthlyWorkerSummary" ADD COLUMN IF NOT EXISTS "presentWorkingDays" INTEGER NOT NULL DEFAULT 0;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column MonthlyWorkerSummary.presentWorkingDays: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "MonthlyWorkerSummary" ADD COLUMN IF NOT EXISTS "absentWorkingDays" INTEGER NOT NULL DEFAULT 0;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column MonthlyWorkerSummary.absentWorkingDays: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "MonthlyWorkerSummary" ADD COLUMN IF NOT EXISTS "missingAttendanceOccurrences" INTEGER NOT NULL DEFAULT 0;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column MonthlyWorkerSummary.missingAttendanceOccurrences: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "MonthlyWorkerSummary" ADD COLUMN IF NOT EXISTS "attendanceHistory" JSONB;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column MonthlyWorkerSummary.attendanceHistory: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "MonthlyWorkerSummary" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column MonthlyWorkerSummary.createdAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "MonthlyWorkerSummary" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column MonthlyWorkerSummary.updatedAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "AdministrationReview" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column AdministrationReview.id: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "AdministrationReview" ADD COLUMN IF NOT EXISTS "reportId" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column AdministrationReview.reportId: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "AdministrationReview" ADD COLUMN IF NOT EXISTS "reviewerId" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column AdministrationReview.reviewerId: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "AdministrationReview" ADD COLUMN IF NOT EXISTS "decision" "AdministrationDecision" NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column AdministrationReview.decision: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "AdministrationReview" ADD COLUMN IF NOT EXISTS "remarks" TEXT;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column AdministrationReview.remarks: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "AdministrationReview" ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column AdministrationReview.reviewedAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "AdministrationReview" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column AdministrationReview.createdAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "AdministrationReview" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column AdministrationReview.updatedAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PaymentRecommendation" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PaymentRecommendation.id: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PaymentRecommendation" ADD COLUMN IF NOT EXISTS "reportId" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PaymentRecommendation.reportId: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PaymentRecommendation" ADD COLUMN IF NOT EXISTS "createdByUserId" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PaymentRecommendation.createdByUserId: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PaymentRecommendation" ADD COLUMN IF NOT EXISTS "status" "PaymentRecommendationStatus" NOT NULL DEFAULT 'DRAFT';
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PaymentRecommendation.status: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PaymentRecommendation" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PaymentRecommendation.version: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PaymentRecommendation" ADD COLUMN IF NOT EXISTS "locationCleaningTotal" DECIMAL(15,2) NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PaymentRecommendation.locationCleaningTotal: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PaymentRecommendation" ADD COLUMN IF NOT EXISTS "locationAttendanceTotal" DECIMAL(15,2) NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PaymentRecommendation.locationAttendanceTotal: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PaymentRecommendation" ADD COLUMN IF NOT EXISTS "locationGrandTotal" DECIMAL(15,2) NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PaymentRecommendation.locationGrandTotal: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PaymentRecommendation" ADD COLUMN IF NOT EXISTS "overallRecommendedPayment" DECIMAL(15,2) NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PaymentRecommendation.overallRecommendedPayment: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PaymentRecommendation" ADD COLUMN IF NOT EXISTS "sentToVcAt" TIMESTAMP(3);
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PaymentRecommendation.sentToVcAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PaymentRecommendation" ADD COLUMN IF NOT EXISTS "submittedByUserId" TEXT;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PaymentRecommendation.submittedByUserId: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PaymentRecommendation" ADD COLUMN IF NOT EXISTS "remarks" TEXT;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PaymentRecommendation.remarks: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PaymentRecommendation" ADD COLUMN IF NOT EXISTS "finalizedAt" TIMESTAMP(3);
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PaymentRecommendation.finalizedAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PaymentRecommendation" ADD COLUMN IF NOT EXISTS "finalizedByUserId" TEXT;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PaymentRecommendation.finalizedByUserId: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PaymentRecommendation" ADD COLUMN IF NOT EXISTS "finalizationRemarks" TEXT;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PaymentRecommendation.finalizationRemarks: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PaymentRecommendation" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PaymentRecommendation.createdAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PaymentRecommendation" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PaymentRecommendation.updatedAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PaymentTaskCalculation" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PaymentTaskCalculation.id: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PaymentTaskCalculation" ADD COLUMN IF NOT EXISTS "recommendationId" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PaymentTaskCalculation.recommendationId: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PaymentTaskCalculation" ADD COLUMN IF NOT EXISTS "monthlyTaskSummaryId" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PaymentTaskCalculation.monthlyTaskSummaryId: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PaymentTaskCalculation" ADD COLUMN IF NOT EXISTS "locationTaskId" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PaymentTaskCalculation.locationTaskId: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PaymentTaskCalculation" ADD COLUMN IF NOT EXISTS "originalAmount" DECIMAL(15,2) NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PaymentTaskCalculation.originalAmount: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PaymentTaskCalculation" ADD COLUMN IF NOT EXISTS "recommendationAmount" DECIMAL(15,2) NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PaymentTaskCalculation.recommendationAmount: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PaymentTaskCalculation" ADD COLUMN IF NOT EXISTS "completionPercentage" DECIMAL(5,2) NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PaymentTaskCalculation.completionPercentage: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PaymentTaskCalculation" ADD COLUMN IF NOT EXISTS "recommendedAmount" DECIMAL(15,2) NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PaymentTaskCalculation.recommendedAmount: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PaymentTaskCalculation" ADD COLUMN IF NOT EXISTS "changedById" TEXT;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PaymentTaskCalculation.changedById: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PaymentTaskCalculation" ADD COLUMN IF NOT EXISTS "changedAt" TIMESTAMP(3);
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PaymentTaskCalculation.changedAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PaymentTaskCalculation" ADD COLUMN IF NOT EXISTS "changeReason" TEXT;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PaymentTaskCalculation.changeReason: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PaymentTaskCalculation" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PaymentTaskCalculation.createdAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PaymentTaskCalculation" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PaymentTaskCalculation.updatedAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PaymentWorkerCalculation" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PaymentWorkerCalculation.id: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PaymentWorkerCalculation" ADD COLUMN IF NOT EXISTS "recommendationId" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PaymentWorkerCalculation.recommendationId: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PaymentWorkerCalculation" ADD COLUMN IF NOT EXISTS "monthlyWorkerSummaryId" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PaymentWorkerCalculation.monthlyWorkerSummaryId: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PaymentWorkerCalculation" ADD COLUMN IF NOT EXISTS "workerId" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PaymentWorkerCalculation.workerId: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PaymentWorkerCalculation" ADD COLUMN IF NOT EXISTS "workerLocationAssignmentId" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PaymentWorkerCalculation.workerLocationAssignmentId: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PaymentWorkerCalculation" ADD COLUMN IF NOT EXISTS "originalAmount" DECIMAL(15,2) NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PaymentWorkerCalculation.originalAmount: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PaymentWorkerCalculation" ADD COLUMN IF NOT EXISTS "recommendationAmount" DECIMAL(15,2) NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PaymentWorkerCalculation.recommendationAmount: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PaymentWorkerCalculation" ADD COLUMN IF NOT EXISTS "attendancePercentage" DECIMAL(5,2) NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PaymentWorkerCalculation.attendancePercentage: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PaymentWorkerCalculation" ADD COLUMN IF NOT EXISTS "recommendedAmount" DECIMAL(15,2) NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PaymentWorkerCalculation.recommendedAmount: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PaymentWorkerCalculation" ADD COLUMN IF NOT EXISTS "changedById" TEXT;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PaymentWorkerCalculation.changedById: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PaymentWorkerCalculation" ADD COLUMN IF NOT EXISTS "changedAt" TIMESTAMP(3);
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PaymentWorkerCalculation.changedAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PaymentWorkerCalculation" ADD COLUMN IF NOT EXISTS "changeReason" TEXT;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PaymentWorkerCalculation.changeReason: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PaymentWorkerCalculation" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PaymentWorkerCalculation.createdAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PaymentWorkerCalculation" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column PaymentWorkerCalculation.updatedAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "AdditionalCleaningTask" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column AdditionalCleaningTask.id: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "AdditionalCleaningTask" ADD COLUMN IF NOT EXISTS "recommendationId" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column AdditionalCleaningTask.recommendationId: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "AdditionalCleaningTask" ADD COLUMN IF NOT EXISTS "locationId" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column AdditionalCleaningTask.locationId: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "AdditionalCleaningTask" ADD COLUMN IF NOT EXISTS "taskName" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column AdditionalCleaningTask.taskName: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "AdditionalCleaningTask" ADD COLUMN IF NOT EXISTS "category" "TaskCategory" NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column AdditionalCleaningTask.category: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "AdditionalCleaningTask" ADD COLUMN IF NOT EXISTS "allocatedAmount" DECIMAL(15,2) NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column AdditionalCleaningTask.allocatedAmount: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "AdditionalCleaningTask" ADD COLUMN IF NOT EXISTS "completionPercentage" DECIMAL(5,2) NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column AdditionalCleaningTask.completionPercentage: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "AdditionalCleaningTask" ADD COLUMN IF NOT EXISTS "recommendedAmount" DECIMAL(15,2) NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column AdditionalCleaningTask.recommendedAmount: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "AdditionalCleaningTask" ADD COLUMN IF NOT EXISTS "remark" TEXT;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column AdditionalCleaningTask.remark: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "AdditionalCleaningTask" ADD COLUMN IF NOT EXISTS "isAdditional" BOOLEAN NOT NULL DEFAULT true;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column AdditionalCleaningTask.isAdditional: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "AdditionalCleaningTask" ADD COLUMN IF NOT EXISTS "createdByUserId" TEXT;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column AdditionalCleaningTask.createdByUserId: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "AdditionalCleaningTask" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column AdditionalCleaningTask.createdAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "AdditionalCleaningTask" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column AdditionalCleaningTask.updatedAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "VCApproval" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column VCApproval.id: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "VCApproval" ADD COLUMN IF NOT EXISTS "recommendationId" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column VCApproval.recommendationId: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "VCApproval" ADD COLUMN IF NOT EXISTS "vcUserId" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column VCApproval.vcUserId: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "VCApproval" ADD COLUMN IF NOT EXISTS "decision" "VCDecision" NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column VCApproval.decision: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "VCApproval" ADD COLUMN IF NOT EXISTS "remarks" TEXT;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column VCApproval.remarks: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "VCApproval" ADD COLUMN IF NOT EXISTS "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column VCApproval.decidedAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "VCApproval" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column VCApproval.createdAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "VCApproval" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column VCApproval.updatedAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "ActivityLog" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column ActivityLog.id: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "ActivityLog" ADD COLUMN IF NOT EXISTS "userId" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column ActivityLog.userId: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "ActivityLog" ADD COLUMN IF NOT EXISTS "action" "ActivityAction" NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column ActivityLog.action: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "ActivityLog" ADD COLUMN IF NOT EXISTS "entityType" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column ActivityLog.entityType: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "ActivityLog" ADD COLUMN IF NOT EXISTS "entityId" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column ActivityLog.entityId: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "ActivityLog" ADD COLUMN IF NOT EXISTS "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column ActivityLog.timestamp: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "ActivityLog" ADD COLUMN IF NOT EXISTS "description" TEXT;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column ActivityLog.description: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "ActivityLog" ADD COLUMN IF NOT EXISTS "metadata" JSONB;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column ActivityLog.metadata: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column Notification.id: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "recipientUserId" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column Notification.recipientUserId: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "event" "NotificationEvent" NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column Notification.event: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "title" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column Notification.title: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "message" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column Notification.message: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "entityType" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column Notification.entityType: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "entityId" TEXT NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column Notification.entityId: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "dedupeKey" TEXT;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column Notification.dedupeKey: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "readAt" TIMESTAMP(3);
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column Notification.readAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column Notification.createdAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "metadata" JSONB;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add column Notification.metadata: %', SQLERRM;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Nullability and defaults the application relies on
--    (only relaxes NOT NULL / sets defaults - never removes data)
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  ALTER TABLE "User" ALTER COLUMN "active" SET DEFAULT true;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not set default on User.active: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "User" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not set default on User.createdAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "Location" ALTER COLUMN "minimumWorkers" DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not make Location.minimumWorkers nullable: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "Location" ALTER COLUMN "active" SET DEFAULT true;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not set default on Location.active: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "Location" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not set default on Location.createdAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "CleaningTask" ALTER COLUMN "active" SET DEFAULT true;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not set default on CleaningTask.active: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "CleaningTask" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not set default on CleaningTask.createdAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "LocationTask" ALTER COLUMN "active" SET DEFAULT true;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not set default on LocationTask.active: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "LocationTask" ALTER COLUMN "isAdditional" SET DEFAULT false;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not set default on LocationTask.isAdditional: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "LocationTask" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not set default on LocationTask.createdAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "CleaningWorker" ALTER COLUMN "active" SET DEFAULT true;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not set default on CleaningWorker.active: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "CleaningWorker" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not set default on CleaningWorker.createdAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "WorkerLocationAssignment" ALTER COLUMN "active" SET DEFAULT true;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not set default on WorkerLocationAssignment.active: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "WorkerLocationAssignment" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not set default on WorkerLocationAssignment.createdAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "EvaluatingOfficerAssignment" ALTER COLUMN "active" SET DEFAULT true;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not set default on EvaluatingOfficerAssignment.active: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "EvaluatingOfficerAssignment" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not set default on EvaluatingOfficerAssignment.createdAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PHIAssignment" ALTER COLUMN "active" SET DEFAULT true;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not set default on PHIAssignment.active: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PHIAssignment" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not set default on PHIAssignment.createdAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "DailyCleaningEvaluation" ALTER COLUMN "occurrenceKey" SET DEFAULT 'default';
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not set default on DailyCleaningEvaluation.occurrenceKey: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "DailyCleaningEvaluation" ALTER COLUMN "remark" DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not make DailyCleaningEvaluation.remark nullable: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "DailyCleaningEvaluation" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not set default on DailyCleaningEvaluation.createdAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "DailyCleaningEvaluation" ALTER COLUMN "finalizedAt" DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not make DailyCleaningEvaluation.finalizedAt nullable: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "DailyCleaningEvaluation" ALTER COLUMN "lockedAt" DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not make DailyCleaningEvaluation.lockedAt nullable: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "WorkerAttendance" ALTER COLUMN "remark" DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not make WorkerAttendance.remark nullable: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "WorkerAttendance" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not set default on WorkerAttendance.createdAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "WorkerAttendance" ALTER COLUMN "finalizedAt" DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not make WorkerAttendance.finalizedAt nullable: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "WorkerAttendance" ALTER COLUMN "lockedAt" DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not make WorkerAttendance.lockedAt nullable: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "DailyAttendanceEvaluation" ALTER COLUMN "remark" DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not make DailyAttendanceEvaluation.remark nullable: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "DailyAttendanceEvaluation" ALTER COLUMN "finalized" SET DEFAULT false;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not set default on DailyAttendanceEvaluation.finalized: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "DailyAttendanceEvaluation" ALTER COLUMN "finalizedAt" DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not make DailyAttendanceEvaluation.finalizedAt nullable: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "DailyAttendanceEvaluation" ALTER COLUMN "lockedAt" DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not make DailyAttendanceEvaluation.lockedAt nullable: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "DailyAttendanceEvaluation" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not set default on DailyAttendanceEvaluation.createdAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "MonthlyEvaluationReport" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not set default on MonthlyEvaluationReport.status: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "MonthlyEvaluationReport" ALTER COLUMN "isComplete" SET DEFAULT true;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not set default on MonthlyEvaluationReport.isComplete: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "MonthlyEvaluationReport" ALTER COLUMN "processingError" DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not make MonthlyEvaluationReport.processingError nullable: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "MonthlyEvaluationReport" ALTER COLUMN "attendanceHistory" DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not make MonthlyEvaluationReport.attendanceHistory nullable: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "MonthlyEvaluationReport" ALTER COLUMN "generatedAt" DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not make MonthlyEvaluationReport.generatedAt nullable: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "MonthlyEvaluationReport" ALTER COLUMN "submittedAt" DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not make MonthlyEvaluationReport.submittedAt nullable: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "MonthlyEvaluationReport" ALTER COLUMN "resubmittedAt" DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not make MonthlyEvaluationReport.resubmittedAt nullable: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "MonthlyEvaluationReport" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not set default on MonthlyEvaluationReport.createdAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PhiMonthlyAttendanceReport" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not set default on PhiMonthlyAttendanceReport.status: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PhiMonthlyAttendanceReport" ALTER COLUMN "processingError" DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not make PhiMonthlyAttendanceReport.processingError nullable: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PhiMonthlyAttendanceReport" ALTER COLUMN "grandTotal" SET DEFAULT 0;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not set default on PhiMonthlyAttendanceReport.grandTotal: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PhiMonthlyAttendanceReport" ALTER COLUMN "generatedAt" DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not make PhiMonthlyAttendanceReport.generatedAt nullable: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PhiMonthlyAttendanceReport" ALTER COLUMN "submittedAt" DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not make PhiMonthlyAttendanceReport.submittedAt nullable: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PhiMonthlyAttendanceReport" ALTER COLUMN "resubmittedAt" DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not make PhiMonthlyAttendanceReport.resubmittedAt nullable: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PhiMonthlyAttendanceReport" ALTER COLUMN "finalizedAt" DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not make PhiMonthlyAttendanceReport.finalizedAt nullable: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PhiMonthlyAttendanceReport" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not set default on PhiMonthlyAttendanceReport.createdAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PhiMonthlyAttendanceSummary" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not set default on PhiMonthlyAttendanceSummary.createdAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PhiMonthlyAttendanceReview" ALTER COLUMN "remarks" DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not make PhiMonthlyAttendanceReview.remarks nullable: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PhiMonthlyAttendanceReview" ALTER COLUMN "reviewedAt" SET DEFAULT CURRENT_TIMESTAMP;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not set default on PhiMonthlyAttendanceReview.reviewedAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PhiMonthlyAttendanceReview" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not set default on PhiMonthlyAttendanceReview.createdAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "MonthlyTaskSummary" ALTER COLUMN "recommendedAmount" DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not make MonthlyTaskSummary.recommendedAmount nullable: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "MonthlyTaskSummary" ALTER COLUMN "expectedOccurrences" SET DEFAULT 0;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not set default on MonthlyTaskSummary.expectedOccurrences: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "MonthlyTaskSummary" ALTER COLUMN "passedOccurrences" SET DEFAULT 0;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not set default on MonthlyTaskSummary.passedOccurrences: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "MonthlyTaskSummary" ALTER COLUMN "failedOccurrences" SET DEFAULT 0;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not set default on MonthlyTaskSummary.failedOccurrences: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "MonthlyTaskSummary" ALTER COLUMN "notApplicableOccurrences" SET DEFAULT 0;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not set default on MonthlyTaskSummary.notApplicableOccurrences: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "MonthlyTaskSummary" ALTER COLUMN "missingOccurrences" SET DEFAULT 0;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not set default on MonthlyTaskSummary.missingOccurrences: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "MonthlyTaskSummary" ALTER COLUMN "evaluationHistory" DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not make MonthlyTaskSummary.evaluationHistory nullable: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "MonthlyTaskSummary" ALTER COLUMN "taskRemarks" DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not make MonthlyTaskSummary.taskRemarks nullable: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "MonthlyTaskSummary" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not set default on MonthlyTaskSummary.createdAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "MonthlyWorkerSummary" ALTER COLUMN "presentWorkingDays" SET DEFAULT 0;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not set default on MonthlyWorkerSummary.presentWorkingDays: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "MonthlyWorkerSummary" ALTER COLUMN "absentWorkingDays" SET DEFAULT 0;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not set default on MonthlyWorkerSummary.absentWorkingDays: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "MonthlyWorkerSummary" ALTER COLUMN "missingAttendanceOccurrences" SET DEFAULT 0;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not set default on MonthlyWorkerSummary.missingAttendanceOccurrences: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "MonthlyWorkerSummary" ALTER COLUMN "attendanceHistory" DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not make MonthlyWorkerSummary.attendanceHistory nullable: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "MonthlyWorkerSummary" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not set default on MonthlyWorkerSummary.createdAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "AdministrationReview" ALTER COLUMN "remarks" DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not make AdministrationReview.remarks nullable: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "AdministrationReview" ALTER COLUMN "reviewedAt" SET DEFAULT CURRENT_TIMESTAMP;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not set default on AdministrationReview.reviewedAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "AdministrationReview" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not set default on AdministrationReview.createdAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PaymentRecommendation" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not set default on PaymentRecommendation.status: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PaymentRecommendation" ALTER COLUMN "version" SET DEFAULT 1;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not set default on PaymentRecommendation.version: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PaymentRecommendation" ALTER COLUMN "sentToVcAt" DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not make PaymentRecommendation.sentToVcAt nullable: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PaymentRecommendation" ALTER COLUMN "submittedByUserId" DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not make PaymentRecommendation.submittedByUserId nullable: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PaymentRecommendation" ALTER COLUMN "remarks" DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not make PaymentRecommendation.remarks nullable: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PaymentRecommendation" ALTER COLUMN "finalizedAt" DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not make PaymentRecommendation.finalizedAt nullable: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PaymentRecommendation" ALTER COLUMN "finalizedByUserId" DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not make PaymentRecommendation.finalizedByUserId nullable: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PaymentRecommendation" ALTER COLUMN "finalizationRemarks" DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not make PaymentRecommendation.finalizationRemarks nullable: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PaymentRecommendation" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not set default on PaymentRecommendation.createdAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PaymentTaskCalculation" ALTER COLUMN "changedById" DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not make PaymentTaskCalculation.changedById nullable: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PaymentTaskCalculation" ALTER COLUMN "changedAt" DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not make PaymentTaskCalculation.changedAt nullable: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PaymentTaskCalculation" ALTER COLUMN "changeReason" DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not make PaymentTaskCalculation.changeReason nullable: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PaymentTaskCalculation" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not set default on PaymentTaskCalculation.createdAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PaymentWorkerCalculation" ALTER COLUMN "changedById" DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not make PaymentWorkerCalculation.changedById nullable: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PaymentWorkerCalculation" ALTER COLUMN "changedAt" DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not make PaymentWorkerCalculation.changedAt nullable: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PaymentWorkerCalculation" ALTER COLUMN "changeReason" DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not make PaymentWorkerCalculation.changeReason nullable: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "PaymentWorkerCalculation" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not set default on PaymentWorkerCalculation.createdAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "AdditionalCleaningTask" ALTER COLUMN "remark" DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not make AdditionalCleaningTask.remark nullable: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "AdditionalCleaningTask" ALTER COLUMN "isAdditional" SET DEFAULT true;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not set default on AdditionalCleaningTask.isAdditional: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "AdditionalCleaningTask" ALTER COLUMN "createdByUserId" DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not make AdditionalCleaningTask.createdByUserId nullable: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "AdditionalCleaningTask" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not set default on AdditionalCleaningTask.createdAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "VCApproval" ALTER COLUMN "remarks" DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not make VCApproval.remarks nullable: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "VCApproval" ALTER COLUMN "decidedAt" SET DEFAULT CURRENT_TIMESTAMP;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not set default on VCApproval.decidedAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "VCApproval" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not set default on VCApproval.createdAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "ActivityLog" ALTER COLUMN "timestamp" SET DEFAULT CURRENT_TIMESTAMP;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not set default on ActivityLog.timestamp: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "ActivityLog" ALTER COLUMN "description" DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not make ActivityLog.description nullable: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "ActivityLog" ALTER COLUMN "metadata" DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not make ActivityLog.metadata nullable: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "Notification" ALTER COLUMN "dedupeKey" DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not make Notification.dedupeKey nullable: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "Notification" ALTER COLUMN "readAt" DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not make Notification.readAt nullable: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "Notification" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not set default on Notification.createdAt: %', SQLERRM;
END $$;
DO $$ BEGIN
  ALTER TABLE "Notification" ALTER COLUMN "metadata" DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not make Notification.metadata nullable: %', SQLERRM;
END $$;

-- ---------------------------------------------------------------------------
-- 4. Missing indexes (unique indexes fail with a WARNING if duplicates exist)
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not create index User_email_key: %', SQLERRM;
END $$;
DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS "Location_code_key" ON "Location"("code");
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not create index Location_code_key: %', SQLERRM;
END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "LocationTask_locationId_idx" ON "LocationTask"("locationId");
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not create index LocationTask_locationId_idx: %', SQLERRM;
END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "LocationTask_taskId_idx" ON "LocationTask"("taskId");
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not create index LocationTask_taskId_idx: %', SQLERRM;
END $$;
DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS "LocationTask_locationId_taskId_key" ON "LocationTask"("locationId", "taskId");
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not create index LocationTask_locationId_taskId_key: %', SQLERRM;
END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "WorkerLocationAssignment_locationId_idx" ON "WorkerLocationAssignment"("locationId");
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not create index WorkerLocationAssignment_locationId_idx: %', SQLERRM;
END $$;
DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS "WorkerLocationAssignment_workerId_locationId_key" ON "WorkerLocationAssignment"("workerId", "locationId");
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not create index WorkerLocationAssignment_workerId_locationId_key: %', SQLERRM;
END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "EvaluatingOfficerAssignment_locationId_idx" ON "EvaluatingOfficerAssignment"("locationId");
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not create index EvaluatingOfficerAssignment_locationId_idx: %', SQLERRM;
END $$;
DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS "EvaluatingOfficerAssignment_userId_locationId_key" ON "EvaluatingOfficerAssignment"("userId", "locationId");
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not create index EvaluatingOfficerAssignment_userId_locationId_key: %', SQLERRM;
END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "PHIAssignment_locationId_idx" ON "PHIAssignment"("locationId");
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not create index PHIAssignment_locationId_idx: %', SQLERRM;
END $$;
DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS "PHIAssignment_userId_locationId_key" ON "PHIAssignment"("userId", "locationId");
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not create index PHIAssignment_userId_locationId_key: %', SQLERRM;
END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "DailyCleaningEvaluation_locationId_idx" ON "DailyCleaningEvaluation"("locationId");
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not create index DailyCleaningEvaluation_locationId_idx: %', SQLERRM;
END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "DailyCleaningEvaluation_evaluatingOfficerId_idx" ON "DailyCleaningEvaluation"("evaluatingOfficerId");
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not create index DailyCleaningEvaluation_evaluatingOfficerId_idx: %', SQLERRM;
END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "DailyCleaningEvaluation_evaluationDate_idx" ON "DailyCleaningEvaluation"("evaluationDate");
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not create index DailyCleaningEvaluation_evaluationDate_idx: %', SQLERRM;
END $$;
DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS "DailyCleaningEvaluation_locationTaskId_evaluationDate_occur_key" ON "DailyCleaningEvaluation"("locationTaskId", "evaluationDate", "occurrenceKey");
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not create index DailyCleaningEvaluation_locationTaskId_evaluationDate_occur_key: %', SQLERRM;
END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "WorkerAttendance_locationId_idx" ON "WorkerAttendance"("locationId");
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not create index WorkerAttendance_locationId_idx: %', SQLERRM;
END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "WorkerAttendance_workerId_idx" ON "WorkerAttendance"("workerId");
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not create index WorkerAttendance_workerId_idx: %', SQLERRM;
END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "WorkerAttendance_attendanceDate_idx" ON "WorkerAttendance"("attendanceDate");
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not create index WorkerAttendance_attendanceDate_idx: %', SQLERRM;
END $$;
DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS "WorkerAttendance_workerId_locationId_attendanceDate_key" ON "WorkerAttendance"("workerId", "locationId", "attendanceDate");
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not create index WorkerAttendance_workerId_locationId_attendanceDate_key: %', SQLERRM;
END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "DailyAttendanceEvaluation_locationId_idx" ON "DailyAttendanceEvaluation"("locationId");
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not create index DailyAttendanceEvaluation_locationId_idx: %', SQLERRM;
END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "DailyAttendanceEvaluation_phiUserId_idx" ON "DailyAttendanceEvaluation"("phiUserId");
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not create index DailyAttendanceEvaluation_phiUserId_idx: %', SQLERRM;
END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "DailyAttendanceEvaluation_attendanceDate_idx" ON "DailyAttendanceEvaluation"("attendanceDate");
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not create index DailyAttendanceEvaluation_attendanceDate_idx: %', SQLERRM;
END $$;
DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS "DailyAttendanceEvaluation_locationId_attendanceDate_key" ON "DailyAttendanceEvaluation"("locationId", "attendanceDate");
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not create index DailyAttendanceEvaluation_locationId_attendanceDate_key: %', SQLERRM;
END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "MonthlyEvaluationReport_month_year_idx" ON "MonthlyEvaluationReport"("month", "year");
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not create index MonthlyEvaluationReport_month_year_idx: %', SQLERRM;
END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "MonthlyEvaluationReport_status_idx" ON "MonthlyEvaluationReport"("status");
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not create index MonthlyEvaluationReport_status_idx: %', SQLERRM;
END $$;
DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS "MonthlyEvaluationReport_locationId_month_year_key" ON "MonthlyEvaluationReport"("locationId", "month", "year");
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not create index MonthlyEvaluationReport_locationId_month_year_key: %', SQLERRM;
END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "PhiMonthlyAttendanceReport_month_year_idx" ON "PhiMonthlyAttendanceReport"("month", "year");
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not create index PhiMonthlyAttendanceReport_month_year_idx: %', SQLERRM;
END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "PhiMonthlyAttendanceReport_status_idx" ON "PhiMonthlyAttendanceReport"("status");
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not create index PhiMonthlyAttendanceReport_status_idx: %', SQLERRM;
END $$;
DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS "PhiMonthlyAttendanceReport_phiUserId_month_year_key" ON "PhiMonthlyAttendanceReport"("phiUserId", "month", "year");
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not create index PhiMonthlyAttendanceReport_phiUserId_month_year_key: %', SQLERRM;
END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "PhiMonthlyAttendanceSummary_reportId_idx" ON "PhiMonthlyAttendanceSummary"("reportId");
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not create index PhiMonthlyAttendanceSummary_reportId_idx: %', SQLERRM;
END $$;
DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS "PhiMonthlyAttendanceSummary_reportId_category_key" ON "PhiMonthlyAttendanceSummary"("reportId", "category");
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not create index PhiMonthlyAttendanceSummary_reportId_category_key: %', SQLERRM;
END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "PhiMonthlyAttendanceReview_reportId_idx" ON "PhiMonthlyAttendanceReview"("reportId");
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not create index PhiMonthlyAttendanceReview_reportId_idx: %', SQLERRM;
END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "PhiMonthlyAttendanceReview_reviewerId_idx" ON "PhiMonthlyAttendanceReview"("reviewerId");
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not create index PhiMonthlyAttendanceReview_reviewerId_idx: %', SQLERRM;
END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "PhiMonthlyAttendanceReview_decision_idx" ON "PhiMonthlyAttendanceReview"("decision");
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not create index PhiMonthlyAttendanceReview_decision_idx: %', SQLERRM;
END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "MonthlyTaskSummary_locationTaskId_idx" ON "MonthlyTaskSummary"("locationTaskId");
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not create index MonthlyTaskSummary_locationTaskId_idx: %', SQLERRM;
END $$;
DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS "MonthlyTaskSummary_reportId_locationTaskId_key" ON "MonthlyTaskSummary"("reportId", "locationTaskId");
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not create index MonthlyTaskSummary_reportId_locationTaskId_key: %', SQLERRM;
END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "MonthlyWorkerSummary_workerLocationAssignmentId_idx" ON "MonthlyWorkerSummary"("workerLocationAssignmentId");
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not create index MonthlyWorkerSummary_workerLocationAssignmentId_idx: %', SQLERRM;
END $$;
DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS "MonthlyWorkerSummary_reportId_workerId_key" ON "MonthlyWorkerSummary"("reportId", "workerId");
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not create index MonthlyWorkerSummary_reportId_workerId_key: %', SQLERRM;
END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "AdministrationReview_reportId_idx" ON "AdministrationReview"("reportId");
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not create index AdministrationReview_reportId_idx: %', SQLERRM;
END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "AdministrationReview_reviewerId_idx" ON "AdministrationReview"("reviewerId");
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not create index AdministrationReview_reviewerId_idx: %', SQLERRM;
END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "AdministrationReview_decision_idx" ON "AdministrationReview"("decision");
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not create index AdministrationReview_decision_idx: %', SQLERRM;
END $$;
DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS "PaymentRecommendation_reportId_key" ON "PaymentRecommendation"("reportId");
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not create index PaymentRecommendation_reportId_key: %', SQLERRM;
END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "PaymentRecommendation_status_idx" ON "PaymentRecommendation"("status");
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not create index PaymentRecommendation_status_idx: %', SQLERRM;
END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "PaymentRecommendation_createdByUserId_idx" ON "PaymentRecommendation"("createdByUserId");
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not create index PaymentRecommendation_createdByUserId_idx: %', SQLERRM;
END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "PaymentRecommendation_finalizedByUserId_idx" ON "PaymentRecommendation"("finalizedByUserId");
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not create index PaymentRecommendation_finalizedByUserId_idx: %', SQLERRM;
END $$;
DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS "PaymentTaskCalculation_monthlyTaskSummaryId_key" ON "PaymentTaskCalculation"("monthlyTaskSummaryId");
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not create index PaymentTaskCalculation_monthlyTaskSummaryId_key: %', SQLERRM;
END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "PaymentTaskCalculation_locationTaskId_idx" ON "PaymentTaskCalculation"("locationTaskId");
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not create index PaymentTaskCalculation_locationTaskId_idx: %', SQLERRM;
END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "PaymentTaskCalculation_changedById_idx" ON "PaymentTaskCalculation"("changedById");
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not create index PaymentTaskCalculation_changedById_idx: %', SQLERRM;
END $$;
DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS "PaymentTaskCalculation_recommendationId_locationTaskId_key" ON "PaymentTaskCalculation"("recommendationId", "locationTaskId");
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not create index PaymentTaskCalculation_recommendationId_locationTaskId_key: %', SQLERRM;
END $$;
DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS "PaymentWorkerCalculation_monthlyWorkerSummaryId_key" ON "PaymentWorkerCalculation"("monthlyWorkerSummaryId");
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not create index PaymentWorkerCalculation_monthlyWorkerSummaryId_key: %', SQLERRM;
END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "PaymentWorkerCalculation_workerLocationAssignmentId_idx" ON "PaymentWorkerCalculation"("workerLocationAssignmentId");
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not create index PaymentWorkerCalculation_workerLocationAssignmentId_idx: %', SQLERRM;
END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "PaymentWorkerCalculation_changedById_idx" ON "PaymentWorkerCalculation"("changedById");
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not create index PaymentWorkerCalculation_changedById_idx: %', SQLERRM;
END $$;
DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS "PaymentWorkerCalculation_recommendationId_workerId_key" ON "PaymentWorkerCalculation"("recommendationId", "workerId");
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not create index PaymentWorkerCalculation_recommendationId_workerId_key: %', SQLERRM;
END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "AdditionalCleaningTask_recommendationId_idx" ON "AdditionalCleaningTask"("recommendationId");
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not create index AdditionalCleaningTask_recommendationId_idx: %', SQLERRM;
END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "AdditionalCleaningTask_locationId_idx" ON "AdditionalCleaningTask"("locationId");
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not create index AdditionalCleaningTask_locationId_idx: %', SQLERRM;
END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "VCApproval_recommendationId_idx" ON "VCApproval"("recommendationId");
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not create index VCApproval_recommendationId_idx: %', SQLERRM;
END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "VCApproval_vcUserId_idx" ON "VCApproval"("vcUserId");
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not create index VCApproval_vcUserId_idx: %', SQLERRM;
END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "VCApproval_decision_idx" ON "VCApproval"("decision");
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not create index VCApproval_decision_idx: %', SQLERRM;
END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "ActivityLog_userId_idx" ON "ActivityLog"("userId");
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not create index ActivityLog_userId_idx: %', SQLERRM;
END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "ActivityLog_action_idx" ON "ActivityLog"("action");
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not create index ActivityLog_action_idx: %', SQLERRM;
END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "ActivityLog_entityType_entityId_idx" ON "ActivityLog"("entityType", "entityId");
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not create index ActivityLog_entityType_entityId_idx: %', SQLERRM;
END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "ActivityLog_timestamp_idx" ON "ActivityLog"("timestamp");
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not create index ActivityLog_timestamp_idx: %', SQLERRM;
END $$;
DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS "Notification_dedupeKey_key" ON "Notification"("dedupeKey");
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not create index Notification_dedupeKey_key: %', SQLERRM;
END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "Notification_recipientUserId_readAt_idx" ON "Notification"("recipientUserId", "readAt");
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not create index Notification_recipientUserId_readAt_idx: %', SQLERRM;
END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "Notification_event_idx" ON "Notification"("event");
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not create index Notification_event_idx: %', SQLERRM;
END $$;
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "Notification_entityType_entityId_idx" ON "Notification"("entityType", "entityId");
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not create index Notification_entityType_entityId_idx: %', SQLERRM;
END $$;

-- ---------------------------------------------------------------------------
-- 5. Missing foreign keys (fail with a WARNING if orphaned rows exist)
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LocationTask_locationId_fkey') THEN
    ALTER TABLE "LocationTask" ADD CONSTRAINT "LocationTask_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add foreign key LocationTask_locationId_fkey: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LocationTask_taskId_fkey') THEN
    ALTER TABLE "LocationTask" ADD CONSTRAINT "LocationTask_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "CleaningTask"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add foreign key LocationTask_taskId_fkey: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WorkerLocationAssignment_workerId_fkey') THEN
    ALTER TABLE "WorkerLocationAssignment" ADD CONSTRAINT "WorkerLocationAssignment_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "CleaningWorker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add foreign key WorkerLocationAssignment_workerId_fkey: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WorkerLocationAssignment_locationId_fkey') THEN
    ALTER TABLE "WorkerLocationAssignment" ADD CONSTRAINT "WorkerLocationAssignment_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add foreign key WorkerLocationAssignment_locationId_fkey: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EvaluatingOfficerAssignment_userId_fkey') THEN
    ALTER TABLE "EvaluatingOfficerAssignment" ADD CONSTRAINT "EvaluatingOfficerAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add foreign key EvaluatingOfficerAssignment_userId_fkey: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EvaluatingOfficerAssignment_locationId_fkey') THEN
    ALTER TABLE "EvaluatingOfficerAssignment" ADD CONSTRAINT "EvaluatingOfficerAssignment_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add foreign key EvaluatingOfficerAssignment_locationId_fkey: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PHIAssignment_userId_fkey') THEN
    ALTER TABLE "PHIAssignment" ADD CONSTRAINT "PHIAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add foreign key PHIAssignment_userId_fkey: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PHIAssignment_locationId_fkey') THEN
    ALTER TABLE "PHIAssignment" ADD CONSTRAINT "PHIAssignment_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add foreign key PHIAssignment_locationId_fkey: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DailyCleaningEvaluation_locationId_fkey') THEN
    ALTER TABLE "DailyCleaningEvaluation" ADD CONSTRAINT "DailyCleaningEvaluation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add foreign key DailyCleaningEvaluation_locationId_fkey: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DailyCleaningEvaluation_locationTaskId_fkey') THEN
    ALTER TABLE "DailyCleaningEvaluation" ADD CONSTRAINT "DailyCleaningEvaluation_locationTaskId_fkey" FOREIGN KEY ("locationTaskId") REFERENCES "LocationTask"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add foreign key DailyCleaningEvaluation_locationTaskId_fkey: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DailyCleaningEvaluation_evaluatingOfficerId_fkey') THEN
    ALTER TABLE "DailyCleaningEvaluation" ADD CONSTRAINT "DailyCleaningEvaluation_evaluatingOfficerId_fkey" FOREIGN KEY ("evaluatingOfficerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add foreign key DailyCleaningEvaluation_evaluatingOfficerId_fkey: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WorkerAttendance_workerId_fkey') THEN
    ALTER TABLE "WorkerAttendance" ADD CONSTRAINT "WorkerAttendance_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "CleaningWorker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add foreign key WorkerAttendance_workerId_fkey: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WorkerAttendance_locationId_fkey') THEN
    ALTER TABLE "WorkerAttendance" ADD CONSTRAINT "WorkerAttendance_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add foreign key WorkerAttendance_locationId_fkey: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WorkerAttendance_phiUserId_fkey') THEN
    ALTER TABLE "WorkerAttendance" ADD CONSTRAINT "WorkerAttendance_phiUserId_fkey" FOREIGN KEY ("phiUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add foreign key WorkerAttendance_phiUserId_fkey: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DailyAttendanceEvaluation_locationId_fkey') THEN
    ALTER TABLE "DailyAttendanceEvaluation" ADD CONSTRAINT "DailyAttendanceEvaluation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add foreign key DailyAttendanceEvaluation_locationId_fkey: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DailyAttendanceEvaluation_phiUserId_fkey') THEN
    ALTER TABLE "DailyAttendanceEvaluation" ADD CONSTRAINT "DailyAttendanceEvaluation_phiUserId_fkey" FOREIGN KEY ("phiUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add foreign key DailyAttendanceEvaluation_phiUserId_fkey: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MonthlyEvaluationReport_locationId_fkey') THEN
    ALTER TABLE "MonthlyEvaluationReport" ADD CONSTRAINT "MonthlyEvaluationReport_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add foreign key MonthlyEvaluationReport_locationId_fkey: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PhiMonthlyAttendanceReport_phiUserId_fkey') THEN
    ALTER TABLE "PhiMonthlyAttendanceReport" ADD CONSTRAINT "PhiMonthlyAttendanceReport_phiUserId_fkey" FOREIGN KEY ("phiUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add foreign key PhiMonthlyAttendanceReport_phiUserId_fkey: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PhiMonthlyAttendanceSummary_reportId_fkey') THEN
    ALTER TABLE "PhiMonthlyAttendanceSummary" ADD CONSTRAINT "PhiMonthlyAttendanceSummary_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "PhiMonthlyAttendanceReport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add foreign key PhiMonthlyAttendanceSummary_reportId_fkey: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PhiMonthlyAttendanceReview_reportId_fkey') THEN
    ALTER TABLE "PhiMonthlyAttendanceReview" ADD CONSTRAINT "PhiMonthlyAttendanceReview_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "PhiMonthlyAttendanceReport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add foreign key PhiMonthlyAttendanceReview_reportId_fkey: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PhiMonthlyAttendanceReview_reviewerId_fkey') THEN
    ALTER TABLE "PhiMonthlyAttendanceReview" ADD CONSTRAINT "PhiMonthlyAttendanceReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add foreign key PhiMonthlyAttendanceReview_reviewerId_fkey: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MonthlyTaskSummary_reportId_fkey') THEN
    ALTER TABLE "MonthlyTaskSummary" ADD CONSTRAINT "MonthlyTaskSummary_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "MonthlyEvaluationReport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add foreign key MonthlyTaskSummary_reportId_fkey: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MonthlyTaskSummary_locationTaskId_fkey') THEN
    ALTER TABLE "MonthlyTaskSummary" ADD CONSTRAINT "MonthlyTaskSummary_locationTaskId_fkey" FOREIGN KEY ("locationTaskId") REFERENCES "LocationTask"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add foreign key MonthlyTaskSummary_locationTaskId_fkey: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MonthlyWorkerSummary_reportId_fkey') THEN
    ALTER TABLE "MonthlyWorkerSummary" ADD CONSTRAINT "MonthlyWorkerSummary_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "MonthlyEvaluationReport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add foreign key MonthlyWorkerSummary_reportId_fkey: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MonthlyWorkerSummary_workerId_fkey') THEN
    ALTER TABLE "MonthlyWorkerSummary" ADD CONSTRAINT "MonthlyWorkerSummary_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "CleaningWorker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add foreign key MonthlyWorkerSummary_workerId_fkey: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MonthlyWorkerSummary_workerLocationAssignmentId_fkey') THEN
    ALTER TABLE "MonthlyWorkerSummary" ADD CONSTRAINT "MonthlyWorkerSummary_workerLocationAssignmentId_fkey" FOREIGN KEY ("workerLocationAssignmentId") REFERENCES "WorkerLocationAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add foreign key MonthlyWorkerSummary_workerLocationAssignmentId_fkey: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AdministrationReview_reportId_fkey') THEN
    ALTER TABLE "AdministrationReview" ADD CONSTRAINT "AdministrationReview_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "MonthlyEvaluationReport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add foreign key AdministrationReview_reportId_fkey: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AdministrationReview_reviewerId_fkey') THEN
    ALTER TABLE "AdministrationReview" ADD CONSTRAINT "AdministrationReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add foreign key AdministrationReview_reviewerId_fkey: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PaymentRecommendation_reportId_fkey') THEN
    ALTER TABLE "PaymentRecommendation" ADD CONSTRAINT "PaymentRecommendation_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "MonthlyEvaluationReport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add foreign key PaymentRecommendation_reportId_fkey: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PaymentRecommendation_createdByUserId_fkey') THEN
    ALTER TABLE "PaymentRecommendation" ADD CONSTRAINT "PaymentRecommendation_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add foreign key PaymentRecommendation_createdByUserId_fkey: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PaymentRecommendation_submittedByUserId_fkey') THEN
    ALTER TABLE "PaymentRecommendation" ADD CONSTRAINT "PaymentRecommendation_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add foreign key PaymentRecommendation_submittedByUserId_fkey: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PaymentRecommendation_finalizedByUserId_fkey') THEN
    ALTER TABLE "PaymentRecommendation" ADD CONSTRAINT "PaymentRecommendation_finalizedByUserId_fkey" FOREIGN KEY ("finalizedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add foreign key PaymentRecommendation_finalizedByUserId_fkey: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PaymentTaskCalculation_recommendationId_fkey') THEN
    ALTER TABLE "PaymentTaskCalculation" ADD CONSTRAINT "PaymentTaskCalculation_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "PaymentRecommendation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add foreign key PaymentTaskCalculation_recommendationId_fkey: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PaymentTaskCalculation_monthlyTaskSummaryId_fkey') THEN
    ALTER TABLE "PaymentTaskCalculation" ADD CONSTRAINT "PaymentTaskCalculation_monthlyTaskSummaryId_fkey" FOREIGN KEY ("monthlyTaskSummaryId") REFERENCES "MonthlyTaskSummary"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add foreign key PaymentTaskCalculation_monthlyTaskSummaryId_fkey: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PaymentTaskCalculation_locationTaskId_fkey') THEN
    ALTER TABLE "PaymentTaskCalculation" ADD CONSTRAINT "PaymentTaskCalculation_locationTaskId_fkey" FOREIGN KEY ("locationTaskId") REFERENCES "LocationTask"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add foreign key PaymentTaskCalculation_locationTaskId_fkey: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PaymentTaskCalculation_changedById_fkey') THEN
    ALTER TABLE "PaymentTaskCalculation" ADD CONSTRAINT "PaymentTaskCalculation_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add foreign key PaymentTaskCalculation_changedById_fkey: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PaymentWorkerCalculation_recommendationId_fkey') THEN
    ALTER TABLE "PaymentWorkerCalculation" ADD CONSTRAINT "PaymentWorkerCalculation_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "PaymentRecommendation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add foreign key PaymentWorkerCalculation_recommendationId_fkey: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PaymentWorkerCalculation_monthlyWorkerSummaryId_fkey') THEN
    ALTER TABLE "PaymentWorkerCalculation" ADD CONSTRAINT "PaymentWorkerCalculation_monthlyWorkerSummaryId_fkey" FOREIGN KEY ("monthlyWorkerSummaryId") REFERENCES "MonthlyWorkerSummary"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add foreign key PaymentWorkerCalculation_monthlyWorkerSummaryId_fkey: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PaymentWorkerCalculation_workerId_fkey') THEN
    ALTER TABLE "PaymentWorkerCalculation" ADD CONSTRAINT "PaymentWorkerCalculation_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "CleaningWorker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add foreign key PaymentWorkerCalculation_workerId_fkey: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PaymentWorkerCalculation_workerLocationAssignmentId_fkey') THEN
    ALTER TABLE "PaymentWorkerCalculation" ADD CONSTRAINT "PaymentWorkerCalculation_workerLocationAssignmentId_fkey" FOREIGN KEY ("workerLocationAssignmentId") REFERENCES "WorkerLocationAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add foreign key PaymentWorkerCalculation_workerLocationAssignmentId_fkey: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PaymentWorkerCalculation_changedById_fkey') THEN
    ALTER TABLE "PaymentWorkerCalculation" ADD CONSTRAINT "PaymentWorkerCalculation_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add foreign key PaymentWorkerCalculation_changedById_fkey: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AdditionalCleaningTask_recommendationId_fkey') THEN
    ALTER TABLE "AdditionalCleaningTask" ADD CONSTRAINT "AdditionalCleaningTask_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "PaymentRecommendation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add foreign key AdditionalCleaningTask_recommendationId_fkey: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AdditionalCleaningTask_locationId_fkey') THEN
    ALTER TABLE "AdditionalCleaningTask" ADD CONSTRAINT "AdditionalCleaningTask_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add foreign key AdditionalCleaningTask_locationId_fkey: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AdditionalCleaningTask_createdByUserId_fkey') THEN
    ALTER TABLE "AdditionalCleaningTask" ADD CONSTRAINT "AdditionalCleaningTask_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add foreign key AdditionalCleaningTask_createdByUserId_fkey: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'VCApproval_recommendationId_fkey') THEN
    ALTER TABLE "VCApproval" ADD CONSTRAINT "VCApproval_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "PaymentRecommendation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add foreign key VCApproval_recommendationId_fkey: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'VCApproval_vcUserId_fkey') THEN
    ALTER TABLE "VCApproval" ADD CONSTRAINT "VCApproval_vcUserId_fkey" FOREIGN KEY ("vcUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add foreign key VCApproval_vcUserId_fkey: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ActivityLog_userId_fkey') THEN
    ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add foreign key ActivityLog_userId_fkey: %', SQLERRM;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Notification_recipientUserId_fkey') THEN
    ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not add foreign key Notification_recipientUserId_fkey: %', SQLERRM;
END $$;

