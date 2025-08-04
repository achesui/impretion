const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Detecta archivos cambiados
const changedFiles = execSync("git diff --name-only HEAD~1 HEAD", {
  encoding: "utf8",
})
  .split("\n")
  .filter(Boolean);

// Lista todos los workers
const workersDir = path.join(__dirname, "../../apps");
const allWorkers = fs
  .readdirSync(workersDir)
  .filter((dir) => fs.statSync(path.join(workersDir, dir)).isDirectory());

// Detecta workers afectados
const affectedWorkers = new Set();

changedFiles.forEach((file) => {
  // Si cambió un worker específico
  const workerMatch = file.match(/^apps\/([^\/]+)\//);
  if (workerMatch) {
    affectedWorkers.add(workerMatch[1]);
  }

  // Si cambió shared packages, afecta a todos
  if (
    file.startsWith("packages/shared/") ||
    file.startsWith("packages/types/")
  ) {
    allWorkers.forEach((worker) => affectedWorkers.add(worker));
  }
});

console.log(JSON.stringify([...affectedWorkers]));
