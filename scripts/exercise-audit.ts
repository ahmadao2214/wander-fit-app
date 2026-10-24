import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { EXERCISES } from "../convex/seedData";
import {
  buildExerciseAudit,
  formatExerciseAuditMarkdown,
} from "../convex/exerciseMatching";

const outputPath = resolve(process.cwd(), "docs/exercise-equipment-audit.md");

const markdown = formatExerciseAuditMarkdown(buildExerciseAudit(EXERCISES));

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, markdown, "utf8");

console.log(`Wrote exercise audit to ${outputPath}`);
