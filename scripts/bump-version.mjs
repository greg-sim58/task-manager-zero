import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const pkgPath = path.join(root, "package.json");
const versionPath = path.join(root, "src", "lib", "version.ts");

const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
const [major, minor, patch] = pkg.version.split(".").map((n) => parseInt(n, 10));
const nextVersion = `${major}.${minor}.${patch + 1}`;

pkg.version = nextVersion;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

writeFileSync(versionPath, `export const APP_VERSION = "${nextVersion}";\n`);

console.log(`Bumped version to ${nextVersion}`);
