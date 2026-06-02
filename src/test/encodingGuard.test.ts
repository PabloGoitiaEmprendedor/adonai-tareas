import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SRC_ROOT = path.resolve(process.cwd(), "src");
const INCLUDED_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".css", ".html"]);
const IGNORED_PATH_SEGMENTS = ["src/integrations/supabase/types.ts", "src/integrations/supabase/types_new.ts"];
const SUSPICIOUS_SEQUENCES = [
  String.fromCharCode(194),
  String.fromCharCode(195),
  String.fromCharCode(65533),
];

function collectFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath));
      continue;
    }

    const normalizedPath = fullPath.replace(/\\/g, "/");

    if (
      INCLUDED_EXTENSIONS.has(path.extname(entry.name)) &&
      !IGNORED_PATH_SEGMENTS.some((segment) => normalizedPath.endsWith(segment))
    ) {
      files.push(fullPath);
    }
  }

  return files;
}

describe("encoding guard", () => {
  it("rejects mojibake sequences in src files", () => {
    const offenders: string[] = [];

    for (const file of collectFiles(SRC_ROOT)) {
      const contents = fs.readFileSync(file, "utf8");
      const matchedSequence = SUSPICIOUS_SEQUENCES.find((sequence) => contents.includes(sequence));

      if (matchedSequence) {
        offenders.push(`${path.relative(process.cwd(), file)} -> ${matchedSequence}`);
      }
    }

    expect(
      offenders,
      `Found suspicious text encoding sequences:\n${offenders.join("\n")}`,
    ).toEqual([]);
  });
});
