// src/routes/(public)/callback.tsx

import { authUserData } from "@/lib/auth-handler";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

// Un esquema para manejar posibles errores que Auth0 pueda devolver en la URL.
const searchSchema = z.object({
  error: z.string().optional(),
  error_description: z.string().optional(),
});

export const Route = createFileRoute("/(public)/callback")({
  validateSearch: searchSchema,

  loader: async ({ context }) => {
    const { auth } = context;
    let organizationId = null; // Variable para guardar el resultado

    // Paso 1: Bloque 'try...catch' ultra específico.
    // Su ÚNICO trabajo es obtener el claim de forma segura.
    try {
      organizationId = (await authUserData(auth)).organizationId;
    } catch (error) {
      // Si falla la obtención del token, lo registramos y redirigimos a la raíz.
      console.error("Fallo crítico al OBTENER el token post-login:", error);
      throw redirect({ to: "/", replace: true });
    }

    // Paso 2: Lógica de redirección.
    // Esta parte se ejecuta solo si el try tuvo éxito.
    // Ahora, el 'throw redirect' no será capturado por nuestro propio 'catch'.
    if (organizationId) {
      // El usuario tiene una organización.
      throw redirect({ to: "/assistants", replace: true });
    } else {
      // El usuario NO tiene organización.
      throw redirect({ to: "/create-organization", replace: true });
    }
  },

  component: () => (
    <div className="p-4 text-center">
      <p>Procesando inicio de sesión...</p>
    </div>
  ),
});
