-- lesson_slide_notes: add surrogate id, make topic_slide_id nullable, FK ON DELETE SET NULL
ALTER TABLE "lesson_slide_notes" ADD COLUMN "id" uuid DEFAULT gen_random_uuid() NOT NULL;
ALTER TABLE "lesson_slide_notes" DROP CONSTRAINT "lesson_slide_notes_pkey";
ALTER TABLE "lesson_slide_notes" ADD PRIMARY KEY ("id");
ALTER TABLE "lesson_slide_notes" DROP CONSTRAINT "lesson_slide_notes_topic_slide_id_fkey";
ALTER TABLE "lesson_slide_notes" ALTER COLUMN "topic_slide_id" DROP NOT NULL;
ALTER TABLE "lesson_slide_notes" ADD CONSTRAINT "lesson_slide_notes_topic_slide_id_fkey" FOREIGN KEY ("topic_slide_id") REFERENCES "public"."topic_slides"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- teacher_slide_notes: add surrogate id, make topic_slide_id nullable, FK ON DELETE SET NULL
ALTER TABLE "teacher_slide_notes" ADD COLUMN "id" uuid DEFAULT gen_random_uuid() NOT NULL;
ALTER TABLE "teacher_slide_notes" DROP CONSTRAINT "teacher_slide_notes_pkey";
ALTER TABLE "teacher_slide_notes" ADD PRIMARY KEY ("id");
ALTER TABLE "teacher_slide_notes" DROP CONSTRAINT "teacher_slide_notes_topic_slide_id_fkey";
ALTER TABLE "teacher_slide_notes" ALTER COLUMN "topic_slide_id" DROP NOT NULL;
ALTER TABLE "teacher_slide_notes" ADD CONSTRAINT "teacher_slide_notes_topic_slide_id_fkey" FOREIGN KEY ("topic_slide_id") REFERENCES "public"."topic_slides"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
