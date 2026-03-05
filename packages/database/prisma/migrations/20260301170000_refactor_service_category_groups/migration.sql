-- Refactor ServiceCategory from specific professions to grouped categories.
-- This migration preserves existing Service rows by mapping old enum values.

ALTER TYPE "public"."ServiceCategory" RENAME TO "ServiceCategory_old";

CREATE TYPE "public"."ServiceCategory" AS ENUM (
  'HomeMaintenance',
  'ConstructionInstallation',
  'HealthWellness',
  'BeautyPersonalCare',
  'EventsMedia',
  'FoodCatering',
  'DigitalCreative',
  'LegalFinance',
  'EducationCoaching',
  'AutomotiveTransport',
  'Other'
);

-- Preserve old specific category as type when type is empty.
UPDATE "public"."Service"
SET "type" = "serviceCategory"::text
WHERE "type" IS NULL OR btrim("type") = '';

ALTER TABLE "public"."Service"
ALTER COLUMN "serviceCategory" TYPE "public"."ServiceCategory"
USING (
  CASE "serviceCategory"::text
    WHEN 'Lawyer' THEN 'LegalFinance'
    WHEN 'Doctor' THEN 'HealthWellness'
    WHEN 'Education' THEN 'EducationCoaching'
    WHEN 'Architect' THEN 'ConstructionInstallation'
    WHEN 'Plumber' THEN 'HomeMaintenance'
    WHEN 'Electrician' THEN 'HomeMaintenance'
    WHEN 'Mason' THEN 'ConstructionInstallation'
    WHEN 'Mechanic' THEN 'AutomotiveTransport'
    WHEN 'Accountant' THEN 'LegalFinance'
    WHEN 'Esthetician' THEN 'BeautyPersonalCare'
    WHEN 'Cleaning' THEN 'HomeMaintenance'
    ELSE 'Other'
  END
)::"public"."ServiceCategory";

DROP TYPE "public"."ServiceCategory_old";
