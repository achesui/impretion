import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";
import baseConfig from "../../packages/shared-config/vitest.base.config";

// Unimos la configuración base con la específica de este worker
export default defineWorkersConfig({
  // Heredamos toda la configuración base
  ...baseConfig,
  test: {
    ...baseConfig.test,
    poolOptions: {
      ...baseConfig.test?.poolOptions,
      workers: {
        // Sobreescripción de la configuración wrangler.jsonc
        wrangler: {
          configPath: "./wrangler.jsonc",
        },
      },
    },
  },
});
