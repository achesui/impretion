// src/router.tsx
import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { QueryClient } from "@tanstack/react-query";
import type { Auth0ContextInterface } from "@auth0/auth0-react";

import { routeTree } from "./routeTree.gen";

// Define los tipos aquí mismo para evitar imports del worker
export interface RouterContext {
  auth: Auth0ContextInterface;
  queryClient: QueryClient;
}

export const queryClient = new QueryClient();

export function createRouter() {
  return createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: "intent",
    context: {
      queryClient,
      auth: undefined!, // Se sobrescribirá en main.tsx
    } as RouterContext,
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createRouter>;
  }
}
