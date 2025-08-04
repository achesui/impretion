// src/routes/(public)/route.tsx

import { authUserData } from "@/lib/auth-handler";
import { useAuth0 } from "@auth0/auth0-react";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppWindow, LogIn } from "lucide-react";

// ¡REGLA DE ORO! Llama a createFileRoute() sin argumentos.
export const Route = createFileRoute("/(public)")({
  loader: async ({ context: { auth } }) => {
    const userData = await authUserData(auth);

    return {
      userData,
    };
  },
  component: PublicLayout,
});

function PublicLayout() {
  const { userData } = Route.useLoaderData();

  const { loginWithRedirect } = useAuth0();

  return (
    <>
      <header className="p-2 flex justify-between items-center gap-2 bg-white">
        <nav className="container mx-auto px-6">
          <div className="flex items-center justify-between text-text-primary">
            <div className="flex items-center space-x-3">
              <span className="text-2xl font-bold text-gradient">
                IMPRETION
              </span>
            </div>

            {userData.organizationId ? (
              <button
                onClick={() => loginWithRedirect()}
                className="flex items-center gap-2 border-border border hover:bg-soft-surface py-2 px-4 rounded-md cursor-pointer"
              >
                <AppWindow size={15} />
                <span>Ir a la consola</span>
              </button>
            ) : (
              <button
                onClick={() => loginWithRedirect()}
                className="flex items-center gap-2 border-border border hover:bg-soft-surface py-2 px-4 rounded-md cursor-pointer"
              >
                <LogIn size={15} />
                <span>Acceder</span>
              </button>
            )}
          </div>
        </nav>
      </header>
      <Outlet />
    </>
  );
}
