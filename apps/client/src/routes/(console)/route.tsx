import {
  createFileRoute,
  Outlet,
  Link,
  redirect,
  useRouterState,
} from "@tanstack/react-router";
import { useAuth0 } from "@auth0/auth0-react";
import { ReactNode, Suspense } from "react";
import { ErrorBoundary } from "@/components/customized/error-boundary";
import { authUserData } from "@/lib/auth-handler";
import {
  BookOpen,
  Bot,
  Loader2,
  LogOut,
  RouteIcon,
  SlidersHorizontal,
  Unplug,
} from "lucide-react";

export const Route = createFileRoute("/(console)")({
  beforeLoad: async ({ context, location }) => {
    const { auth } = context;

    // Espera a que Auth0 haya cargado
    if (auth.isLoading) return;

    // Requiere autenticación
    if (!auth.isAuthenticated) {
      throw redirect({
        to: "/",
        search: { redirect: location.href },
      });
    }

    const { organizationId } = await authUserData(auth);

    if (!organizationId) {
      // Redirige si no tiene organización
      throw redirect({
        to: "/create-organization",
        search: { redirect: location.href },
      });
    }
  },
  component: ConsoleLayout,
});

function ConsoleLayout() {
  const { logout, user } = useAuth0();

  return (
    <div className="flex h-screen bg-[#F5F5F5] overflow-hidden">
      <div className="w-64 bg-white border-r border-border flex flex-col">
        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-3 justify-center">
            <span className="text-md font-semibold text-text-primary">
              IMPRETION
            </span>
          </div>
        </div>

        <nav className="flex-1 p-2">
          <div className="h-full flex flex-col justify-between">
            <div className="space-y-1 flex flex-col">
              <NavigationWrapper
                linkName="Asistentes"
                to="/assistants"
                basePath="/assistants"
                icon={<Bot className="w-5 h-5" />}
              />

              <NavigationWrapper
                linkName="Acciones"
                to="/actions"
                basePath="/actions"
                icon={<RouteIcon className="w-5 h-5" />}
              />

              <NavigationWrapper
                linkName="Conocimiento base"
                to="/knowledge-base"
                basePath="/knowledge-base"
                icon={<BookOpen className="w-5 h-5" />}
              />

              <NavigationWrapper
                linkName="Conexiones"
                to="/connections/direct"
                basePath="/connections"
                icon={<Unplug className="w-5 h-5" />}
              />
            </div>

            <div>
              <NavigationWrapper
                linkName="Configuración"
                to="/settings"
                basePath="/settings"
                icon={<SlidersHorizontal className="w-5 h-5" />}
              />
            </div>
          </div>
        </nav>

        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-component rounded-full flex items-center justify-center">
              {user?.picture ? (
                <img src={user?.picture} className="rounded-full"></img>
              ) : (
                <span className="text-white text-sm font-medium">
                  {user?.name?.charAt(0)?.toUpperCase() || "U"}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">
                {user?.name || "Usuario"}
              </p>
              <p className="text-xs text-text-secondary truncate">
                {user?.email || "usuario@example.com"}
              </p>
            </div>
            <button
              onClick={() =>
                logout({
                  logoutParams: { returnTo: window.location.origin },
                })
              }
              title="Cerrar Sesión"
              className="cursor-pointer"
            >
              <LogOut size={18} color="#808080" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area - Full Height */}
      <div className="flex-1 flex flex-col h-screen">
        {/* Top Header */}
        <header className="bg-white border-b p-1 border-border flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <h1 className="text-md font-semibold text-text-primary">
                Dashboard
              </h1>
            </div>
          </div>
        </header>

        {/* Main Dashboard Container - Takes remaining height */}
        <main className="flex-1 p-4 bg-soft-surface overflow-hidden">
          <div className="bg-white rounded-md border border-border h-full flex flex-col">
            {/* Outlet Container - Non-scrollable, provides full height context */}
            <div className="flex-1 flex flex-col min-h-0">
              <ErrorBoundary>
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <Loader2
                          className="animate-spin text-text-secondary"
                          size={30}
                        />
                      </div>
                    </div>
                  }
                >
                  <Outlet />
                </Suspense>
              </ErrorBoundary>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function NavigationWrapper({
  to,
  linkName,
  icon,
  basePath,
}: {
  to: string;
  linkName: string;
  icon: ReactNode;
  basePath: string;
}) {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  // Verificar si la ruta actual comienza con el basePath
  const isActive = currentPath.startsWith(basePath);

  return (
    <Link to={to}>
      <div
        className={`flex items-center gap-3 px-3 py-2 rounded-sm transition-colors ${
          isActive
            ? "bg-soft-surface text-text-primary font-medium"
            : "text-text-secondary hover:bg-soft-surface"
        }`}
      >
        {icon}
        {linkName}
      </div>
    </Link>
  );
}
