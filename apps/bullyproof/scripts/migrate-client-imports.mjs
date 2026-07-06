#!/usr/bin/env node
/**
 * One-off Phase 2 import migration: server seams → lib/types in client code.
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

const clientRoots = [
  "entities",
  "components",
  "hooks",
  path.join("app", "(main)"),
];

const tableToRow = {
  lessons: "LessonRow",
  topics: "TopicRow",
  topicSlides: "TopicSlideRow",
  curriculumStages: "CurriculumStageRow",
  certificationCourses: "CertificationCourseRow",
  courseTopics: "CourseTopicRow",
  courseTopicSlides: "CourseTopicSlideRow",
  courseTopicQuizzes: "CourseTopicQuizRow",
  quizQuestions: "QuizQuestionRow",
  quizAnswers: "QuizAnswerRow",
  classes: "ClassRow",
  roles: "RoleRow",
  states: "StateRow",
  schoolYears: "SchoolYearRow",
  schoolLevels: "SchoolLevelRow",
  schoolSectors: "SchoolSectorRow",
  schoolLicences: "SchoolLicenceRow",
  schoolInvites: "SchoolInviteRow",
  schools: "SchoolRow",
  vSchoolsReadable: "SchoolReadableRow",
  vSchoolsEnriched: "SchoolEnrichedRow",
  vUserProfileExpanded: "UserProfileExpandedRow",
};

function walkFiles(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) walkFiles(full, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

function migrateFile(filePath) {
  let content = readFileSync(filePath, "utf8");
  const original = content;

  content = content.replaceAll(
    "@/server/lib/fractional-position",
    "@/lib/fractional-position"
  );

  const importPattern =
    /import\s+(type\s+)?\{([^}]+)\}\s+from\s+"@\/(?:server\/db|drizzle)\/schema";?\r?\n/g;

  const tablesUsed = new Set();

  content = content.replace(importPattern, (match, _typeKeyword, namesBlock) => {
    const names = namesBlock
      .split(",")
      .map((n) => n.trim())
      .filter(Boolean);

    for (const name of names) {
      if (!tableToRow[name]) {
        console.warn(
          `Unmapped schema symbol in ${path.relative(root, filePath)}: ${name}`
        );
        return match;
      }
      tablesUsed.add(name);
    }
    return "";
  });

  for (const [table, row] of Object.entries(tableToRow)) {
    content = content.replaceAll(`typeof ${table}.$inferSelect`, row);
  }

  content = content.replace(
    /^import type \{[^}]+\} from "@\/types\/db";\r?\n/gm,
    ""
  );

  if (tablesUsed.size > 0) {
    const rowTypes = [...tablesUsed].map((t) => tableToRow[t]).sort();
    const importLine = `import type { ${rowTypes.join(", ")} } from "@/types/db";\n`;
    content = importLine + content;
  }

  if (content !== original) {
    writeFileSync(filePath, content);
    console.log(`Updated ${path.relative(root, filePath)}`);
  }
}

for (const rel of clientRoots) {
  const dir = path.join(root, rel);
  for (const file of walkFiles(dir)) {
    migrateFile(file);
  }
}

console.log("Done.");
