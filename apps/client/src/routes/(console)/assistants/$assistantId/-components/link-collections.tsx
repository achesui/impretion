import { NewDialog } from "@/components/customized/new-dialog";
import { Button } from "@/components/ui/button";
import {
  getCollectionsQO,
  useUpdateAssistantPromptMutation,
} from "@/services/queries";
import { useQuery } from "@tanstack/react-query";
import { Link } from "lucide-react";
import { UserData } from "@base/shared-types";
import { NewCheckboxGroup } from "@/components/customized/new-checkbox-group";
import { Controller, useForm } from "react-hook-form";
import { GetAssistantsResponse } from "@core-service/types";
import { useMemo, useState } from "react";

type FormData = {
  collection: string[];
};

export default function LinkCollections({
  linkedAssistantCollections,
  assistantId,
  userData,
}: {
  linkedAssistantCollections: GetAssistantsResponse[0]["linkedCollections"];
  assistantId: string;
  userData: UserData;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const { organizationId } = userData;

  // Obtener los IDs de las colecciones ya enlazadas
  const linkedCollectionIds = useMemo(() => {
    return (
      linkedAssistantCollections?.map(
        (linkedCollection) => linkedCollection.collectionId
      ) || []
    );
  }, [linkedAssistantCollections]);

  const form = useForm<FormData>({
    defaultValues: {
      collection: linkedCollectionIds,
    },
  });

  const {
    control,
    handleSubmit,
    formState: { isDirty },
  } = form;

  const updateAssistantPromptMutation = useUpdateAssistantPromptMutation({});

  const { data: collections } = useQuery({
    ...getCollectionsQO({
      type: "knowledgeBase",
      query: {
        method: "getCollections",
        data: {},
      },
      userData: {
        organizationId,
      },
    }),
    enabled: isOpen,
  });

  const collectionItems = useMemo(
    () =>
      collections?.map((collection) => ({
        value: collection.id,
        label: collection.name,
      })) || [],
    [collections]
  );

  const onSubmit = (data: FormData) => {
    const collectionIds = data.collection || [];

    updateAssistantPromptMutation.mutate({
      type: "assistants",
      query: {
        method: "updateAssistantPrompt",
        data: {
          linkedCollections: collectionIds,
          id: assistantId,
        },
      },
      userData,
    });

    form.reset({
      collection: collectionIds,
    });
  };

  return (
    <NewDialog
      title={"Enlazar colecciones"}
      description={
        <p className="text-text-secondary">
          Asigna las colecciones creadas a este asistente para ampliar su base
          de conocimiento.
        </p>
      }
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      trigger={
        <Button
          type="button"
          className="bg-text-primary hover:bg-text-primary cursor-pointer"
        >
          <Link className="w-4 h-4" />
          Enlazar Colección
        </Button>
      }
      form={form}
      isLoading={updateAssistantPromptMutation.isPending}
      disableSave={!isDirty}
      onSubmit={handleSubmit(onSubmit)}
    >
      {collectionItems.length > 0 ? (
        <Controller
          control={control}
          name="collection"
          render={({ field }) => (
            <NewCheckboxGroup
              items={collectionItems}
              defaultValue={field.value}
              onChange={(values) => {
                field.onChange(values);
              }}
            />
          )}
        />
      ) : (
        <div className="border rounded-md p-2 bg-soft-surface text-text-primary">
          <p className="text-sm font-semibold">
            Aún no has creado ninguna colección. Crea tu primera en la pestaña{" "}
            <span className="font-semibold">Conocimiento Base</span>.
          </p>
        </div>
      )}
    </NewDialog>
  );
}
