import { useCreateOrganizationMutation } from "@/services/queries";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";

export const Route = createFileRoute("/(onboarding)/create-organization/")({
  loader: async ({ context: { auth } }) => {
    const currentUser = {
      userId: auth.user?.sub,
      userEmail: auth.user?.email,
      userName: auth.user?.name,
    };

    return {
      currentUser,
    };
  },
  component: CreateOrganizationPage,
});

type FormValues = {
  organizationName: string;
};
function CreateOrganizationPage() {
  const { currentUser } = Route.useLoaderData();
  const { userId } = currentUser;
  const { register, handleSubmit } = useForm<FormValues>({});
  //const auth0 = useAuth0();

  const createOrganizationMutation = useCreateOrganizationMutation({
    onSuccess: async () => {
      window.location.href = "/assistants";
    },
    onError: (error) => {
      console.error("Error al guardar la conexión en base de datos:", error);
    },
  });

  const onSubmit = (data: FormValues) => {
    const { organizationName } = data;

    createOrganizationMutation.mutate({
      type: "organizations",
      query: {
        method: "createOrganization",
        data: {
          organizationDisplayName: organizationName,
        },
      },
      userData: {
        organizationId: "",
        userId,
      },
    });
  };

  const isLoading = createOrganizationMutation.isPending;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="p-8 rounded-lg w-full max-w-md">
        <h2 className="text-2xl text-text-primary font-bold text-center mb-6">
          Crea tu Organización
        </h2>
        <p className="text-center mb-6 text-text-primary">
          ¡Bienvenido! Para empezar, necesitas crear tu espacio de trabajo.
        </p>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="mb-4">
            <label
              htmlFor="org-name"
              className="block text-sm font-medium text-text-primary"
            >
              Nombre de la Organización
            </label>
            <input
              type="text"
              {...register("organizationName")}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Mi Increíble Compañía"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className={`${isLoading && "opacity-50 cursor-progress"} cursor-pointer flex items-center justify-center gap-2 w-full px-4 py-2 font-semibold text-white bg-component rounded-md hover:bg-blue-700`}
          >
            Crear
            {isLoading && <Loader2 className="animate-spin" />}
          </button>
        </form>
      </div>
    </div>
  );
}
