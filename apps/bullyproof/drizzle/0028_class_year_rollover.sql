-- Annual school-year rollover: an archived (inactive) class releases its
-- name and code so the new year's class can reuse them. Delivery history
-- stays on the archived class row, retrievable per year.
DROP INDEX "ux_classes_school_name";
CREATE UNIQUE INDEX "ux_classes_school_name" ON "classes" USING btree ("school_id", lower("name")) WHERE "active";

ALTER TABLE "classes" DROP CONSTRAINT "classes_school_code_unique";
CREATE UNIQUE INDEX "classes_school_code_unique" ON "classes" USING btree ("school_id", "code") WHERE "active";

-- Delivered lesson history must survive: deleting a class that has lessons
-- attached is blocked (archive it instead).
ALTER TABLE "lesson_classes" DROP CONSTRAINT "lesson_classes_class_id_fkey";
ALTER TABLE "lesson_classes" ADD CONSTRAINT "lesson_classes_class_id_fkey"
  FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
