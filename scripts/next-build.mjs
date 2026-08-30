import { rmSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const appRoot = process.cwd();
const nextCli = path.join(appRoot, "node_modules", "next", "dist", "bin", "next");
const workspaceRoot = path.resolve(appRoot, "../..");

rmSync(path.join(appRoot, ".next"), { recursive: true, force: true });

const result = spawnSync(process.execPath, [nextCli, "build"], {
  cwd: appRoot,
  stdio: "inherit",
  env: {
    ...process.env,
    NEXT_PRIVATE_STANDALONE: "true",
    NEXT_PRIVATE_OUTPUT_TRACE_ROOT: workspaceRoot,
  },
});

process.exit(result.status ?? 1);
