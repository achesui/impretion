import { authUserData } from "@/lib/auth-handler";
import { getCollectionsQO } from "@/services/queries";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/(console)/knowledge-base/")({
  beforeLoad: async ({ context }) => {
    const { queryClient, auth } = context;
    const userData = await authUserData(auth);

    const collections = await queryClient.ensureQueryData(
      getCollectionsQO({
        type: "knowledgeBase",
        query: {
          method: "getCollections",
          data: {},
        },
        userData,
      })
    );

    // Si hay colecciones, redirigimos a la primera ANTES de renderizar
    if (collections && collections.length > 0) {
      throw redirect({
        to: "/knowledge-base/$collectionId",
        params: { collectionId: collections[0].id },
        replace: true,
      });
    }

    return { userData };
  },
  component: KnowledgeBaseIndex,
});

function KnowledgeBaseIndex() {
  // Este componente solo se renderiza si NO hay colecciones
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-text-primary mb-4">
          Base de Conocimiento
        </h1>
        <p className="text-text-primary text-sm mb-4">
          No hay colecciones disponibles aún.
        </p>
      </div>
    </div>
  );
}
