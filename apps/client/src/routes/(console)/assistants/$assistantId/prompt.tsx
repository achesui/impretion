import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  getAssistantQO,
  useUpdateAssistantPromptMutation,
} from "@/services/queries";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { AssistantUpdatePromptSchema } from "@core-service/types";
import { authUserData } from "@/lib/auth-handler";
import LinkCollections from "./-components/link-collections";

// Tipo específico para el formulario de esta página
type PromptPageFormData = AssistantUpdatePromptSchema;

export const Route = createFileRoute(
  "/(console)/assistants/$assistantId/prompt"
)({
  loader: async ({ context: { queryClient, auth }, params }) => {
    const userData = await authUserData(auth);
    const { assistantId } = params;

    await queryClient.ensureQueryData(
      getAssistantQO({
        type: "assistants",
        query: {
          method: "getAssistants",
          data: {
            id: assistantId,
            withLinkedCollections: true,
          },
        },
        userData,
      })
    );
    return { assistantId, userData };
  },
  component: AssistantPromptPage,
});

function AssistantPromptPage() {
  const { assistantId, userData } = Route.useLoaderData();

  const updateAssistantPrompt = useUpdateAssistantPromptMutation();

  const {
    data: [assistant],
  } = useSuspenseQuery(
    getAssistantQO({
      type: "assistants",
      query: {
        method: "getAssistants",
        data: {
          id: assistantId,
          withLinkedCollections: true,
        },
      },
      userData,
    })
  );

  const {
    register,
    handleSubmit,
    formState: { isDirty },
  } = useForm<PromptPageFormData>({
    defaultValues: {
      id: assistant.id,
      assistantPrompt: {
        prompt: assistant.prompt ?? "",
      },
    },
  });

  const onSubmit = (formData: PromptPageFormData) => {
    updateAssistantPrompt.mutate({
      type: "assistants",
      query: {
        method: "updateAssistantPrompt",
        data: formData,
      },
      userData,
    });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-1 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-md font-semibold text-text-primary">
              Instrucciones del asistente
            </h2>
            <p className="text-xs text-text-secondary">
              Dale contexto e instrucciones personalizadas a este asistente.
            </p>
          </div>
          <LinkCollections
            linkedAssistantCollections={assistant.linkedCollections}
            assistantId={assistantId}
            userData={userData}
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col p-4 min-h-0">
        <form className="h-full flex flex-col">
          <textarea
            {...register("assistantPrompt.prompt")}
            className="p-2 text-text-primary border-border border focus:ring-0 focus:border-none flex-1 resize-none min-h-0 whitespace-pre-wrap break-words"
          ></textarea>
        </form>
      </div>

      {/* Footer - fijo en la parte inferior */}
      <div className="px-4 py-3 border-t border-border flex-shrink-0">
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={updateAssistantPrompt.isPending || !isDirty}
            className="min-w-[120px] bg-text-primary hover:bg-text-primary cursor-pointer"
            onClick={handleSubmit(onSubmit)}
          >
            {updateAssistantPrompt.isPending
              ? "Guardando..."
              : "Guardar Cambios"}
          </Button>
        </div>
      </div>
    </div>
  );
}
{
  /*
        <div className="space-y-4 border-b border-humo pb-10">
          <Controller
            control={form.control}
            name="linkedCollections"
            render={({ field }) => (
              // Aquí deberías aplicar estilos a tu componente NewCheckboxGroup
              // para que coincida con la paleta.
                <NewCheckboxGroup
                  items={assistant.linkedCollections && assistant.linkedCollections.map((collection) => ({
                    value: collection.id,
                    label: collection.name,
                  }))}
                  defaultValue={field.value?.map((lc) => lc.collectionId)}
                  onChange={(selectedCollectionIds) => {
                    const newLinkedCollections = selectedCollectionIds.map(
                      (collectionId) => ({ collectionId })
                    );
                    field.onChange(newLinkedCollections);
                  }}
                />
            )}
          />
        </div>
                 */
}
