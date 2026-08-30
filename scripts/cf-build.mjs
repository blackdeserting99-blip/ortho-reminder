import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const appRoot = process.cwd();
const workspaceRoot = path.resolve(appRoot, "..", "..");
const nextPackage = path.join(appRoot, "node_modules", "next");
const workspaceNextPackage = path.join(workspaceRoot, "node_modules", "next");
const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";
const nextCli = path.join(appRoot, "node_modules", "next", "dist", "bin", "next");

rmSync(path.join(appRoot, ".next"), { recursive: true, force: true });

function restoreNextPackage() {
  if (existsSync(workspaceNextPackage)) {
    rmSync(nextPackage, { recursive: true, force: true });
    cpSync(workspaceNextPackage, nextPackage, { recursive: true });
  }
}

function normalizeStyledJsxEntrypoint() {
  const packagePaths = [
    path.join(appRoot, "node_modules", "styled-jsx", "index.js"),
    path.join(workspaceRoot, "node_modules", "styled-jsx", "index.js"),
    path.join(appRoot, ".next", "standalone", "node_modules", "styled-jsx", "index.js"),
  ];

  const sourceEntry = path.join(workspaceRoot, "node_modules", "styled-jsx", "dist", "index", "index.js");
  if (!existsSync(sourceEntry)) return;

  const source = readFileSync(sourceEntry, "utf8");
  for (const packagePath of packagePaths) {
    if (!existsSync(packagePath)) continue;
    writeFileSync(packagePath, source);
  }
}

restoreNextPackage();
normalizeStyledJsxEntrypoint();

function run(command, args, env = {}) {
  const result = spawnSync(command, args, {
    cwd: appRoot,
    stdio: "inherit",
    shell: process.platform === "win32" && command === npxCommand,
    env: { ...process.env, ...env },
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run(process.execPath, [nextCli, "build"], {
  NEXT_PRIVATE_STANDALONE: "true",
  NEXT_PRIVATE_OUTPUT_TRACE_ROOT: workspaceRoot,
});

normalizeStyledJsxEntrypoint();
restoreNextPackage();

rmSync(path.join(appRoot, ".open-next"), { recursive: true, force: true });

run(npxCommand, ["opennextjs-cloudflare", "build", "--skipNextBuild"]);
