import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

// Este layout protege todas las rutas dentro de (onboarding)
export const Route = createFileRoute("/(onboarding)/create-organization")({
  beforeLoad: ({ context, location }) => {
    // Si no está autenticado, no debería estar aquí.
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: "/", search: { redirect: location.href } });
    }
  },
  component: () => <Outlet />,
});
