#!/usr/bin/env node

const { spawn } = require("child_process");
const { which } = require("child_process");

// Función para encontrar el comando pnpm correcto
function findPnpmCommand() {
  const possibleCommands = ["pnpm", "pnpm.cmd", "pnpm.exe"];

  for (const cmd of possibleCommands) {
    try {
      require("child_process").execSync(`${cmd} --version`, {
        stdio: "ignore",
      });
      return cmd;
    } catch (error) {
      // Continuar con el siguiente comando
    }
  }

  return null;
}

// Obtener argumentos de la línea de comandos
const services = process.argv.slice(2);

if (services.length === 0) {
  console.log("❌ Debes especificar al menos un servicio");
  console.log("📝 Uso: pnpm run dev <servicio1> [servicio2] [servicio3]...");
  console.log("📋 Ejemplo: pnpm run dev core-service apis-gateway");
  process.exit(1);
}

// Mapear nombres de servicios a sus nombres completos de workspace
const serviceMap = {
  "core-service": "@worker/core-service",
  "apis-gateway": "@worker/apis-gateway",
  client: "@worker/dashboard",
  "channel-services": "@worker/channel-services",
  "consumer-billing-balance": "@worker/consumer-billing-balance",
  "etl-log-processor": "@worker/etl-log-processor",
  "integrations-gateway": "@worker/integrations-gateway",
  generator: "@worker/generator",
  "producer-billing-orchestrator": "@worker/producer-billing-orchestrator",
  "crypto-service": "@worker/crypto-service",
};

// Construir los filtros
const filters = services.map((service) => {
  const fullName = serviceMap[service];
  if (!fullName) {
    console.log(`❌ Servicio desconocido: ${service}`);
    console.log(
      `📋 Servicios disponibles: ${Object.keys(serviceMap).join(", ")}`,
    );
    process.exit(1);
  }
  return `--filter=${fullName}`;
});

// Encontrar el comando pnpm correcto
const pnpmCommand = findPnpmCommand();
if (!pnpmCommand) {
  console.log("❌ No se pudo encontrar pnpm. Asegúrate de que esté instalado.");
  process.exit(1);
}

// Determinar el comando correcto según el OS
const isWindows = process.platform === "win32";
const args = ["turbo", "run", "dev", ...filters];

console.log(`🚀 Ejecutando: pnpm ${args.join(" ")}`);
console.log(`📦 Servicios: ${services.join(", ")}`);

// Ejecutar el comando
const child = spawn(pnpmCommand, args, {
  stdio: "inherit",
  cwd: process.cwd(),
  shell: isWindows, // Usar shell en Windows para mejor compatibilidad
});

child.on("error", (error) => {
  console.error(`❌ Error ejecutando comando: ${error.message}`);
  process.exit(1);
});

child.on("close", (code) => {
  process.exit(code);
});
