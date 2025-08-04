import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useUpsertCollectionMutation } from "@/services/queries";
import { useState } from "react";
import { Save } from "lucide-react";
import { UserData } from "@base/shared-types";

interface HeaderProps {
  collectionId: string;
  userData: UserData;
  initialName?: string;
  initialDescription?: string;
}

export function Header({
  collectionId,
  userData,
  initialName = "",
  initialDescription = "",
}: HeaderProps) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);

  const { mutate, isPending } = useUpsertCollectionMutation({
    onSuccess: () => {},
    onError: (error) => {
      console.error("Update error:", error);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    mutate({
      type: "knowledgeBase",
      query: {
        method: "createOrUpdateCollection",
        data: {
          operation: "update",
          id: collectionId,
          values: {
            name: name.trim(),
            description: description.trim(),
          },
        },
      },
      userData,
    });
  };

  const hasChanges =
    name.trim() !== initialName || description.trim() !== initialDescription;

  return (
    <form onSubmit={handleSubmit} className="flex-col gap-2 flex">
      <div className="flex gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre de la colección"
          className="focus-visible:ring-0 focus-visible:ring-offset-0 flex-1"
        />
        <button
          type="submit"
          disabled={!hasChanges || isPending}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
            ${
              hasChanges && !isPending
                ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg"
                : "text-slate-400 cursor-not-allowed"
            }
          `}
        >
          <Save size={14} />
          {isPending ? "Guardando..." : "Guardar"}
        </button>
      </div>
      <Textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        cols={2}
        placeholder="Describe que tipo de archivos hay en esta colección"
        className="focus-visible:ring-0 focus-visible:ring-offset-0"
      />
    </form>
  );
}
