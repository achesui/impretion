import { useUpsertCollectionMutation } from "@/services/queries";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, PlusCircle } from "lucide-react";
import { UserData } from "@base/shared-types";

export function CreateCollection(userData: UserData) {
  const navigate = useNavigate();
  const { mutate, isPending } = useUpsertCollectionMutation({
    onSuccess(data) {
      if (data.id) {
        navigate({
          to: "/knowledge-base/$collectionId",
          params: { collectionId: data.id },
        });
      }
    },
    onError() {},
  });

  const handleNewCollection = () => {
    mutate({
      userData,
      type: "knowledgeBase",
      query: {
        method: "createOrUpdateCollection",
        data: {
          operation: "create",
          values: {
            name: "Nueva colección",
            description: "Descripción de la colección",
          },
        },
      },
    });
  };

  return (
    <button
      onClick={handleNewCollection}
      type="button"
      disabled={isPending}
      className={`${isPending ? "cursor-not-allowed" : ""} bg-white flex w-full items-center gap-2 rounded-md border p-2 text-sm text-slate-500 hover:bg-slate-100`}
    >
      <PlusCircle size={17} />
      Crear nueva colección
      <div className="ml-auto">
        {isPending && <Loader2 className="animate-spin" size={17}></Loader2>}
      </div>
    </button>
  );
}
