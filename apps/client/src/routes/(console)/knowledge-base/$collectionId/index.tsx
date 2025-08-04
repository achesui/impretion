import {
  getCollectionContentsQO,
  getCollectionsQO,
  useUpsertCollectionContentMutation,
} from "@/services/queries";
import { useSuspenseQueries } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { FilesUploader } from "./-components/files-uploader";
import { Header } from "./-components/header";
import { authUserData } from "@/lib/auth-handler";
import { FolderX } from "lucide-react";

export const Route = createFileRoute(
  "/(console)/knowledge-base/$collectionId/"
)({
  loader: async ({ context: { auth } }) => {
    const userData = await authUserData(auth);

    return userData;
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { collectionId } = Route.useParams();
  const userData = Route.useLoaderData();

  const { mutate } = useUpsertCollectionContentMutation({
    onSuccess: () => {},
    onError: (error) => {
      console.error("Upload error:", error);
    },
  });

  const [{ data: collectionContents }, { data: collections }] =
    useSuspenseQueries({
      queries: [
        getCollectionContentsQO({
          type: "knowledgeBase",
          query: {
            method: "getCollectionContents",
            data: {
              collectionId,
            },
          },
          userData,
        }),
        getCollectionsQO({
          type: "knowledgeBase",
          query: {
            method: "getCollections",
            data: {
              collectionId,
            },
          },
          userData,
        }),
      ],
    });

  console.log(collectionContents);

  const collectionDetails = collections[0];

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  console.log("detalles de coleccion => ", collectionDetails);

  return (
    <div className="p-2 gap-2 flex flex-col">
      <Header
        collectionId={collectionId}
        userData={userData}
        initialDescription={collectionDetails.description}
        initialName={collectionDetails.name}
      />

      <div className="border-b"></div>

      <FilesUploader
        userData={userData}
        collectionId={collectionId}
        collectionTotalSize={collectionDetails.totalSize}
        collectionTotalFiles={collectionDetails.fileCount}
      />

      <div className="border p-2 rounded-md h-full">
        {collectionContents.length > 0 ? (
          collectionContents.map((content) => (
            <div key={content.id} className="flex justify-between gap-2 p-2">
              <div className="flex justify-between w-full">
                <p>{content.name}</p>
                <p>{content.mimeType}</p>
                <p>{new Date(content.createdAt).toLocaleDateString()}</p>
                <p>{formatFileSize(content.size)}</p>
              </div>
              <button
                onClick={() =>
                  mutate({
                    type: "knowledgeBase",
                    query: {
                      method: "createOrDeleteCollectionContent",
                      data: {
                        operation: "delete",
                        id: content.id,
                      },
                    },
                    userData: {
                      organizationId: "",
                    },
                  })
                }
              >
                Eliminar
              </button>
            </div>
          ))
        ) : (
          <div className="flex gap-2 rounded-md p-2 h-full items-center justify-center">
            <FolderX size={20} />
            <p>No tienes archivos en esta colección</p>
          </div>
        )}
      </div>
    </div>
  );
}
