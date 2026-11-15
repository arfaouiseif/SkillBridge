-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('pending', 'accepted', 'declined', 'completed', 'cancelled');

-- CreateTable
CREATE TABLE "availabilities" (
    "id" SERIAL NOT NULL,
    "teacher_id" INTEGER NOT NULL,
    "weekday" INTEGER NOT NULL,
    "start_minute" INTEGER NOT NULL,
    "end_minute" INTEGER NOT NULL,

    CONSTRAINT "availabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" SERIAL NOT NULL,
    "teacher_id" INTEGER NOT NULL,
    "learner_id" INTEGER NOT NULL,
    "skill_id" INTEGER NOT NULL,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'pending',
    "message" TEXT,
    "meeting_link" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "availabilities_teacher_id_idx" ON "availabilities"("teacher_id");

-- CreateIndex
CREATE INDEX "sessions_teacher_id_start_at_idx" ON "sessions"("teacher_id", "start_at");

-- CreateIndex
CREATE INDEX "sessions_learner_id_start_at_idx" ON "sessions"("learner_id", "start_at");

-- AddForeignKey
ALTER TABLE "availabilities" ADD CONSTRAINT "availabilities_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_learner_id_fkey" FOREIGN KEY ("learner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
