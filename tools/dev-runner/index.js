// Ejecuta en cadena un worker junto con sus service bindings automaticamente.
// Version que preserva colores y formato original de Wrangler

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

// --- CAMBIO: Usar un parser de JSONC es más robusto ---
const jsonc = require("jsonc-parser");

// Colores ANSI para diferenciar workers
const WORKER_COLORS = [
  "\x1b[36m", // Cyan
  "\x1b[35m", // Magenta
  "\x1b[33m", // Yellow
  "\x1b[32m", // Green
  "\x1b[34m", // Blue
  "\x1b[31m", // Red
];
const RESET_COLOR = "\x1b[0m";

class WorkerChain {
  constructor(rootDir = process.cwd()) {
    this.rootDir = rootDir;
    this.workersDir = path.join(rootDir, "apps");
    this.workers = new Map();
    this.runningProcesses = new Map();
    this.colorIndex = 0;
  }

  // Descubre todos los workers en la carpeta 'apps'
  discoverWorkers() {
    if (!fs.existsSync(this.workersDir)) {
      console.error(`❌ Workers directory not found: ${this.workersDir}`);
      return;
    }

    const workerDirs = fs
      .readdirSync(this.workersDir, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);

    for (const dirName of workerDirs) {
      const workerPath = path.join(this.workersDir, dirName);
      const wranglerPath = path.join(workerPath, "wrangler.jsonc");
      const packagePath = path.join(workerPath, "package.json");

      if (fs.existsSync(wranglerPath) && fs.existsSync(packagePath)) {
        try {
          const wranglerConfig = jsonc.parse(
            fs.readFileSync(wranglerPath, "utf8")
          );
          const packageConfig = JSON.parse(
            fs.readFileSync(packagePath, "utf8")
          );

          this.workers.set(dirName, {
            dirName: dirName,
            pkgName: packageConfig.name,
            path: workerPath,
            config: wranglerConfig,
            dependencies: this.extractServiceBindings(wranglerConfig),
            color: WORKER_COLORS[this.colorIndex % WORKER_COLORS.length],
          });
          this.colorIndex++;
        } catch (error) {
          console.warn(
            `⚠️ Error parsing config for ${dirName}:`,
            error.message
          );
        }
      }
    }
  }

  // Extrae service bindings del config de wrangler.jsonc
  extractServiceBindings(config) {
    if (!config.services) return [];
    return config.services.map((binding) => binding.service);
  }

  // Resuelve la cadena de dependencias
  resolveDependencyChain(startWorker) {
    const sorted = [];
    const visited = new Set();
    const visiting = new Set();

    const visit = (workerName) => {
      if (!this.workers.has(workerName)) {
        console.warn(
          `❓ Worker dependency '${workerName}' not found. Skipping.`
        );
        return;
      }
      if (sorted.includes(workerName)) return;

      if (visiting.has(workerName)) {
        console.warn(
          `🔁 Circular dependency detected involving '${workerName}'. Breaking loop.`
        );
        return;
      }
      visiting.add(workerName);

      const worker = this.workers.get(workerName);
      for (const dep of worker.dependencies) {
        visit(dep);
      }

      visiting.delete(workerName);
      if (!visited.has(workerName)) {
        visited.add(workerName);
        sorted.push(workerName);
      }
    };

    visit(startWorker);
    return sorted;
  }

  // Detecta la plataforma y comando correcto para pnpm
  getPnpmCommand() {
    const isWindows = process.platform === "win32";

    if (isWindows) {
      try {
        require("child_process").execSync("where pnpm.cmd", {
          stdio: "ignore",
        });
        return "pnpm.cmd";
      } catch {
        try {
          require("child_process").execSync("where pnpm", { stdio: "ignore" });
          return "pnpm";
        } catch {
          throw new Error(
            "pnpm no encontrado en PATH. Asegúrate de que pnpm esté instalado."
          );
        }
      }
    }

    return "pnpm";
  }

  // Crear un prefijo coloreado para cada worker
  createWorkerPrefix(worker) {
    return `${worker.color}[${worker.dirName}]${RESET_COLOR}`;
  }

  // Procesa una línea preservando códigos ANSI y agregando prefijo
  processLine(line, prefix) {
    if (!line.trim()) return "";
    return `${prefix} ${line}`;
  }

  // OPCIÓN 1: Mantener colores originales con prefijos por worker
  async startWorkerWithPrefix(workerName) {
    const worker = this.workers.get(workerName);
    if (!worker || !worker.pkgName) {
      throw new Error(
        `Worker '${workerName}' o su package.json no fue encontrado.`
      );
    }

    const prefix = this.createWorkerPrefix(worker);
    console.log(
      `\n🚀 Starting ${worker.color}${worker.pkgName}${RESET_COLOR}...`
    );

    const pnpmCmd = this.getPnpmCommand();
    const args = ["run", "dev", "--filter", worker.pkgName];

    console.log(`   ${prefix} Ejecutando: ${pnpmCmd} ${args.join(" ")}\n`);

    const spawnOptions = {
      cwd: this.rootDir,
      stdio: ["pipe", "pipe", "pipe"], // Capturar para procesar con prefijos
      shell: process.platform === "win32",
      env: {
        ...process.env,
        FORCE_COLOR: "1", // Forzar colores aunque se capture stdio
        NO_COLOR: undefined,
      },
    };

    const processHandle = spawn(pnpmCmd, args, spawnOptions);

    processHandle.on("error", (error) => {
      console.error(`❌ ${prefix} Error starting:`, error.message);
      throw error;
    });

    // Procesar stdout manteniendo colores ANSI
    processHandle.stdout.on("data", (data) => {
      const lines = data.toString().split("\n");
      lines.forEach((line) => {
        if (line.trim()) {
          process.stdout.write(this.processLine(line, prefix) + "\n");
        }
      });
    });

    // Procesar stderr manteniendo colores ANSI
    processHandle.stderr.on("data", (data) => {
      const lines = data.toString().split("\n");
      lines.forEach((line) => {
        if (line.trim()) {
          process.stderr.write(this.processLine(line, prefix) + "\n");
        }
      });
    });

    processHandle.on("close", (code) => {
      if (code !== 0) {
        console.log(`\n❌ ${prefix} Process exited with code ${code}`);
      }
      this.runningProcesses.delete(workerName);
    });

    this.runningProcesses.set(workerName, processHandle);
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  // OPCIÓN 2: Mantener terminal original completamente
  async startWorkerInherit(workerName) {
    const worker = this.workers.get(workerName);
    if (!worker || !worker.pkgName) {
      throw new Error(
        `Worker '${workerName}' o su package.json no fue encontrado.`
      );
    }

    console.log(
      `\n🚀 Starting ${worker.color}${worker.pkgName}${RESET_COLOR}...`
    );

    const pnpmCmd = this.getPnpmCommand();
    const args = ["run", "dev", "--filter", worker.pkgName];

    console.log(`   Ejecutando: ${pnpmCmd} ${args.join(" ")}`);
    console.log(`   ⏱️  Waiting for worker to stabilize...\n`);

    const spawnOptions = {
      cwd: this.rootDir,
      stdio: "inherit", // Terminal original completa
      shell: process.platform === "win32",
      env: {
        ...process.env,
        FORCE_COLOR: "1",
        NO_COLOR: undefined,
      },
      // CRÍTICO: En Windows, detach ayuda a evitar conflictos de terminal
      detached: process.platform !== "win32",
    };

    const processHandle = spawn(pnpmCmd, args, spawnOptions);

    processHandle.on("error", (error) => {
      console.error(`❌ Error starting ${worker.pkgName}:`, error.message);
      throw error;
    });

    processHandle.on("close", (code) => {
      if (code !== 0) {
        console.log(`\n❌ ${worker.pkgName} exited with code ${code}`);
      }
      this.runningProcesses.delete(workerName);
    });

    this.runningProcesses.set(workerName, processHandle);

    // CRÍTICO: Esperar más tiempo para que el worker se estabilice completamente
    // Wrangler necesita tiempo para inicializar y tomar control de la terminal
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Dar un respiro adicional entre workers para evitar conflictos de terminal
    console.log(`\n✅ ${worker.pkgName} is stabilizing...`);
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  // Inicia la cadena completa de workers (sin flag --original, siempre comportamiento limpio)
  async startChain(entryWorker) {
    console.log("🔍 Discovering workers inside ./apps...");
    this.discoverWorkers();

    if (this.workers.size === 0) {
      console.error("❌ No workers found in ./apps directory.");
      return;
    }

    if (!this.workers.has(entryWorker)) {
      console.error(`❌ Entry worker '${entryWorker}' not found.`);
      console.log(
        "Available workers:",
        Array.from(this.workers.keys()).join(", ")
      );
      return;
    }

    console.log(`📊 Found ${this.workers.size} workers.`);
    console.log(`🔗 Resolving dependency chain for '${entryWorker}'...`);

    const chain = this.resolveDependencyChain(entryWorker);

    if (chain.length === 0) {
      console.error(
        `❌ Could not resolve any workers to start for '${entryWorker}'.`
      );
      return;
    }

    const executionOrder = chain.reverse();
    console.log(`📋 Execution order: ${executionOrder.join(" -> ")}`);
    console.log(
      `⚠️  Workers will start sequentially to avoid terminal conflicts.\n`
    );

    for (let i = 0; i < executionOrder.length; i++) {
      const workerName = executionOrder[i];

      try {
        // Mostrar progreso
        console.log(
          `\n[${i + 1}/${executionOrder.length}] Preparing to start next worker...`
        );

        // Usar solo el método inherit (terminal original)
        await this.startWorkerInherit(workerName);

        // Mensaje de progreso entre workers
        if (i < executionOrder.length - 1) {
          console.log(`\n🔄 Moving to next worker in chain...`);
        }
      } catch (error) {
        console.error(
          `❌ Failed to start worker '${workerName}':`,
          error.message
        );
        this.stopAllWorkers();
        return;
      }
    }

    console.log(
      `\n✅ All workers in the dependency chain are now running! (${this.runningProcesses.size} processes)`
    );
    console.log("📝 All logs displayed in original Wrangler format.");
    console.log("⚡ Press Ctrl+C to shut down all workers.\n");
  }

  // Método para detener todos los workers
  stopAllWorkers() {
    console.log("\n🛑 Shutting down all workers...");
    for (const [name, proc] of this.runningProcesses) {
      console.log(`   Terminating ${name}...`);
      if (process.platform === "win32") {
        proc.kill("SIGKILL");
      } else {
        proc.kill("SIGINT");
      }
    }
    this.runningProcesses.clear();
  }

  // Muestra el árbol de dependencias
  showDependencies() {
    this.discoverWorkers();

    if (this.workers.size === 0) {
      console.log("❌ No workers found in ./apps directory.");
      return;
    }

    console.log("\n🌳 Worker Dependencies Tree:");
    for (const [name, worker] of this.workers) {
      console.log(`\n${worker.color}${worker.pkgName}${RESET_COLOR} (${name})`);
      if (worker.dependencies.length > 0) {
        worker.dependencies.forEach((dep) => {
          const depWorker = this.workers.get(dep);
          const depColor = depWorker ? depWorker.color : "";
          const resetColor = depWorker ? RESET_COLOR : "";
          console.log(
            `  └─> ${depColor}${depWorker ? depWorker.pkgName : dep}${resetColor} ${depWorker ? "✅" : "❌ (not found)"}`
          );
        });
      } else {
        console.log("  (No service binding dependencies)");
      }
    }
  }
}

// Lógica de la CLI
const main = async () => {
  const args = process.argv.slice(2);
  const command = args[0];
  const runner = new WorkerChain();

  if (command === "--deps" || command === "-d") {
    runner.showDependencies();
  } else if (command) {
    // Manejo de señales de terminación
    const cleanup = () => {
      runner.stopAllWorkers();
      process.exit(0);
    };

    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);

    if (process.platform === "win32") {
      process.on("SIGBREAK", cleanup);
    }

    await runner.startChain(command);
  } else {
    console.log(`
🔗 Cloudflare Workers Auto Dev Chain (Monorepo Edition)

Usage:
  node tools/dev-runner/index.js <worker-directory-name>
  node tools/dev-runner/index.js --deps

Examples:
  node tools/dev-runner/index.js apis-gateway
  node tools/dev-runner/index.js core-service
  node tools/dev-runner/index.js --deps
  
Features:
  ✅ Automatically resolves and starts service binding dependencies
  ✅ Maintains original Wrangler terminal colors and behavior
  ✅ Sequential startup to avoid terminal conflicts
  ✅ Proper cleanup on Ctrl+C
  
Requirements:
  - pnpm debe estar instalado globalmente
  - Cada worker debe tener wrangler.jsonc y package.json
  - La estructura debe ser: apps/<worker-name>/
  `);
  }
};

main().catch((err) => {
  console.error("\nAn unexpected error occurred:", err);
  process.exit(1);
});
