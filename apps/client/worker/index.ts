import { app } from "./hono/api";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      return app.fetch(request, env, ctx);
    }
    if (url.pathname.startsWith("/legal/")) {
      return env.ASSETS.fetch(request);
    }
    // De resto, servir assets fallback para SPA
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
