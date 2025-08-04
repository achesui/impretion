import { getCollectionsQO } from "@/services/queries";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { FilesIcon } from "lucide-react";
import { CreateCollection } from "./-components/create-collection";
import { authUserData } from "@/lib/auth-handler";

export const Route = createFileRoute("/(console)/knowledge-base")({
  loader: async ({ context: { queryClient, auth } }) => {
    const userData = await authUserData(auth);

    await queryClient.ensureQueryData(
      getCollectionsQO({
        userData,
        type: "knowledgeBase",
        query: {
          method: "getCollections",
          data: {},
        },
      })
    );

    return userData;
  },
  component: KnowledgeBaseLayout,
});

function KnowledgeBaseLayout() {
  const userData = Route.useLoaderData();

  const { data: collections } = useSuspenseQuery(
    getCollectionsQO({
      userData,
      type: "knowledgeBase",
      query: {
        method: "getCollections",
        data: {},
      },
    })
  );

  return (
    <div className="flex h-full flex-col items-center rounded-md">
      <div className="flex h-full max-h-full w-full overflow-hidden rounded-md text-slate-500">
        <aside className="flex w-72 flex-col m-2">
          <div className="h-full rounded-lg border border-slate-300 bg-white">
            <div className="flex justify-center border-b p-4">
              <CreateCollection {...userData} />
            </div>

            <div className="flex h-full flex-col overflow-y-auto">
              {collections.length > 0 ? (
                <nav className="p-2">
                  {collections.map((collection) => (
                    <div key={collection.id}>
                      <Link
                        to="/knowledge-base/$collectionId"
                        params={{ collectionId: collection.id }}
                        className="block p-2 rounded-md hover:bg-slate-100 text-sm"
                        activeProps={{
                          className:
                            "bg-blue-50 text-blue-700 border-l-2 border-blue-500",
                        }}
                      >
                        <p className="truncate">{collection.name}</p>
                      </Link>
                    </div>
                  ))}
                </nav>
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-4">
                  <FilesIcon size={25} />
                  <p className="text-xs">No has creado ninguna colección.</p>
                </div>
              )}
            </div>
          </div>
        </aside>

        <main className="flex-1 border ml-0 m-2 rounded-lg bg-white">
          {/* Aquí se renderiza el contenido de las rutas hijas */}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
