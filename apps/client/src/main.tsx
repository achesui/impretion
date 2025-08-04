// src/main.tsx
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { Auth0Provider, useAuth0 } from "@auth0/auth0-react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createRouter, queryClient } from "./router";
import "./index.css";
import { Loader2 } from "lucide-react";

const router = createRouter();

// Componente que maneja el contexto y espera a que Auth0 esté listo
function AppWithContext() {
  const auth = useAuth0();
  // Muestra loading mientras Auth0 inicializa
  if (auth.isLoading) {
    return (
      <div className="flex text-text-primary flex-col items-center justify-center min-h-screen">
        <div className="p-4">Cargando sesión</div>
        <Loader2 className="animate-spin text-text-primary" />
      </div>
    );
  }

  console.log("autenticacion => ", auth);

  // Pasa el contexto completo al router
  return (
    <RouterProvider
      router={router}
      context={{
        auth,
        queryClient,
      }}
    />
  );
}

// Render the app con todos los providers
const rootElement = document.getElementById("root")!;
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <StrictMode>
      <Auth0Provider
        domain="dev-xw3cts5yn7mqyar7.us.auth0.com"
        clientId="lQbelMvWN7xDacexYy3fHVoBLY3XNsCj"
        authorizationParams={{
          redirect_uri: `${window.location.origin}/callback`,
          audience: "impretion.com",
        }}
      >
        <QueryClientProvider client={queryClient}>
          <AppWithContext />
        </QueryClientProvider>
      </Auth0Provider>
    </StrictMode>
  );
}
