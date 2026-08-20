import { rm } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const targets = [resolve(root, ".next", "types"), resolve(root, ".next", "dev", "types")];

for (const target of targets) {
  if (!target.startsWith(resolve(root, ".next"))) {
    throw new Error(`Refusing to clean an unexpected path: ${target}`);
  }

  await rm(target, { recursive: true, force: true });
}
