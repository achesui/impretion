import {
  queryOptions,
  useMutation,
  UseMutationOptions,
  useQueryClient,
} from "@tanstack/react-query";
import { serverDatabaseHandler, serverGeneralDataHandler } from "./fetch";
import {
  CollectionContentMutationSchema,
  CreateOrDeleteAssistantLinkedAction,
  QueryDatabaseSchema,
  QueryGeneralSchema,
  UpdateAssistantPromptMutationSchema,
  UpsertCollectionMutation,
} from "../../types";
import type {
  GetActionByIdResponse,
  GetConnectionResponse,
  GetCollectionsResponse,
  GetCollectionContentsResponse,
  GetUserDataResponse,
  GetAssistantsResponse,
  GetBalanceResponse,
  GetActionResultsResponse,
} from "@core-service/types";
import {
  SelectAssistantSchema,
  SelectCollectionContentSchema,
} from "../../../core-service/postgres-database/controller/validations";

// ==== ORGANIZATION (administrative) ====

export const useCreateOrganizationMutation = (
  options?: Omit<
    UseMutationOptions<any, Error, QueryDatabaseSchema, unknown>,
    "mutationFn"
  >
) => {
  return useMutation<any, Error, any, unknown>({
    mutationFn: async (formData: any) => {
      return serverDatabaseHandler(formData);
    },
    onError: (error) => {
      console.error("Mutation error:", error);
    },
    onSuccess: () => {},
    ...options,
  });
};

export const getOrganizationBalanceQO = (body: QueryDatabaseSchema) =>
  queryOptions<GetBalanceResponse>({
    queryKey: ["organizations", "balance", body] as const,
    queryFn: () => serverDatabaseHandler(body),
    refetchOnWindowFocus: true,
    staleTime: 600000,
  });

// ==== ASSISTANTS ====

export const getAssistantQO = (body: QueryDatabaseSchema) =>
  queryOptions<GetAssistantsResponse>({
    queryKey: ["assistants", "detail", body] as const,
    queryFn: () => serverDatabaseHandler(body),
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });

export const getInstructionsQO = (body: QueryDatabaseSchema) =>
  queryOptions({
    queryKey: ["instructions", "detail", body] as const,
    queryFn: () => serverDatabaseHandler(body),
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });

type AssistantMutationContext = {
  previousAssistant?: SelectAssistantSchema;
  queryKey: readonly ["assistants", "detail", any];
};

export const useUpdateAssistantConfigurationMutation = (
  options?: Omit<
    UseMutationOptions<any, Error, QueryDatabaseSchema, unknown>,
    "mutationFn"
  >
) => {
  return useMutation<any, Error, any, unknown>({
    mutationFn: async (formData: any) => {
      return serverDatabaseHandler(formData);
    },
    onError: (error) => {
      console.error("Mutation error:", error);
    },
    onSuccess: () => {},
    ...options,
  });
};

// Enlaza o elimina un nuevo enlace de acción.
export const useCreateOrDeleteLinkedActionMutation = (
  options?: Omit<
    UseMutationOptions<
      GetAssistantsResponse, // Ahora devuelve un array
      Error,
      CreateOrDeleteAssistantLinkedAction,
      AssistantMutationContext
    >,
    "mutationFn"
  >
) => {
  const queryClient = useQueryClient();

  return useMutation<
    GetAssistantsResponse, // Ahora devuelve un array
    Error,
    CreateOrDeleteAssistantLinkedAction,
    AssistantMutationContext
  >({
    mutationFn: (variables: CreateOrDeleteAssistantLinkedAction) => {
      return serverDatabaseHandler(variables);
    },
    onMutate: async (variables) => {
      const { userData } = variables;
      const { data: mutationData } = variables.query;

      /* ---------- CREATE ---------- */
      if (mutationData.operation === "create") {
        const { assistantId, actionId } = mutationData.values;

        const actionsQueryKey = getActionsQO({
          type: "actions",
          query: { method: "getActions", data: {} },
          userData: { organizationId: userData.organizationId },
        }).queryKey;

        const allActions =
          queryClient.getQueryData<GetActionResultsResponse>(actionsQueryKey);
        if (!allActions) return;

        const actionSchemaToLink = allActions.find(
          (a: any) => a.action.id === actionId
        );
        if (!actionSchemaToLink) return;

        const assistantQueryKeyPattern = ["assistants", "detail"];
        const assistantQueries =
          queryClient.getQueriesData<SelectAssistantSchema>({
            // Cambio: ahora es SelectAssistantSchema individual
            queryKey: assistantQueryKeyPattern,
          });
        const targetQuery = assistantQueries.find(
          ([_, data]) => data?.id === assistantId
        );
        if (!targetQuery) return;

        const queryKey = targetQuery[0] as readonly [
          "assistants",
          "detail",
          any,
        ];
        await queryClient.cancelQueries({ queryKey });
        const previousAssistant =
          queryClient.getQueryData<SelectAssistantSchema>(queryKey); // Cambio: individual

        const tempLinkedActionId = `temp-${Date.now()}-${Math.random()}`;
        queryClient.setQueryData<SelectAssistantSchema>(queryKey, (oldData) => {
          if (!oldData) return undefined;
          return {
            ...oldData,
            linkedActions: [
              ...(oldData.linkedActions || []),
              {
                linkedActionId: tempLinkedActionId,
                action: actionSchemaToLink.action,
              },
            ],
          };
        });

        return { previousAssistant, queryKey };
      }

      /* ---------- DELETE ---------- */
      if (mutationData.operation === "delete") {
        const linkedActionIdToDelete = mutationData.id;

        const assistantQueryKeyPattern = ["assistants", "detail"];
        const assistantQueries =
          queryClient.getQueriesData<SelectAssistantSchema>({
            // Cambio: individual
            queryKey: assistantQueryKeyPattern,
          });

        const targetQuery = assistantQueries.find(([_, data]) =>
          data?.linkedActions?.some(
            (la) => la.linkedActionId === linkedActionIdToDelete
          )
        );
        if (!targetQuery) return;

        const queryKey = targetQuery[0] as readonly [
          "assistants",
          "detail",
          any,
        ];
        await queryClient.cancelQueries({ queryKey });
        const previousAssistant =
          queryClient.getQueryData<SelectAssistantSchema>(queryKey); // Cambio: individual

        queryClient.setQueryData<SelectAssistantSchema>(queryKey, (oldData) => {
          if (!oldData) return undefined;
          return {
            ...oldData,
            linkedActions: oldData.linkedActions?.filter(
              (la) => la.linkedActionId !== linkedActionIdToDelete
            ),
          };
        });

        return { previousAssistant, queryKey };
      }
    },

    onError: (_error, _variables, context) => {
      if (context?.previousAssistant) {
        queryClient.setQueryData(context.queryKey, context.previousAssistant);
      }
    },

    onSettled: (data, _error, variables) => {
      if (variables.query.data.operation === "create") {
        const assistantId = variables.query.data.values.assistantId;

        // Actualizamos la caché con el asistente devuelto por la API
        if (data && data.length > 0) {
          const updatedAssistant = data.find(
            (assistant) => assistant.id === assistantId
          );
          if (updatedAssistant) {
            queryClient.setQueryData(
              [
                "assistants",
                "detail",
                { query: { data: { id: assistantId } } },
              ],
              updatedAssistant
            );
          }
        }

        queryClient.invalidateQueries({
          queryKey: ["assistants", "detail"],
          predicate: (query) =>
            (query.queryKey[2] as any)?.query?.data?.id === assistantId,
        });
      }
      if (variables.query.data.operation === "delete") {
        // Para delete, actualizamos con el primer asistente del array (debería ser el único)
        if (data && data.length > 0) {
          const updatedAssistant = data[0];
          queryClient.setQueryData(
            [
              "assistants",
              "detail",
              { query: { data: { id: updatedAssistant.id } } },
            ],
            updatedAssistant
          );
        }

        queryClient.invalidateQueries({
          queryKey: ["assistants", "detail"],
          predicate: (query) => (query.queryKey[2] as any)?.query?.data?.id,
        });
      }
    },

    ...options,
  });
};

export const useUpdateAssistantPromptMutation = (
  options?: Omit<
    UseMutationOptions<
      SelectAssistantSchema, // React‑Query verá UN asistente
      Error,
      UpdateAssistantPromptMutationSchema,
      AssistantMutationContext
    >,
    "mutationFn"
  >
) => {
  const queryClient = useQueryClient();

  return useMutation<
    SelectAssistantSchema, // el return de mutationFn es un solo asistente
    Error,
    UpdateAssistantPromptMutationSchema,
    AssistantMutationContext
  >({
    // 1) mutationFn: llama a serverDatabaseHandler() (array)
    //    y filtra el asistente con el id correcto
    mutationFn: async (variables): Promise<SelectAssistantSchema> => {
      const all: GetAssistantsResponse = await serverDatabaseHandler(variables);
      const assistantId = variables.query.data.id;

      const found: SelectAssistantSchema | undefined = all.find(
        (a: SelectAssistantSchema) => a.id === assistantId
      );

      if (!found) {
        throw new Error(`Assistant with id=${assistantId} not found`);
      }
      return found;
    },

    // 2) onMutate: exacto igual que antes, trabaja con SelectAssistantSchema
    onMutate: async (variables) => {
      const {
        id,
        assistantPrompt: updatedFields,
        linkedCollections,
      } = variables.query.data;
      const baseKey = ["assistants", "detail"] as const;

      // busca la query que coincida con este id
      const queries = queryClient.getQueriesData<SelectAssistantSchema>({
        queryKey: baseKey,
      });
      const target = queries.find(([, data]) => data?.id === id);

      if (!target) {
        const defaultKey = [...baseKey, { query: { data: { id } } }] as const;
        return { previousAssistant: undefined, queryKey: defaultKey };
      }

      const queryKey = target[0] as readonly ["assistants", "detail", any];
      await queryClient.cancelQueries({ queryKey });

      const previousAssistant =
        queryClient.getQueryData<SelectAssistantSchema>(queryKey);

      queryClient.setQueryData<SelectAssistantSchema>(queryKey, (old: any) => {
        if (!old) return undefined;
        return {
          ...old,
          ...(updatedFields || {}),
          linkedCollections:
            linkedCollections !== undefined
              ? linkedCollections.map((lc) => ({
                  id: crypto.randomUUID(),
                  collectionId: lc,
                  createdAt: new Date(),
                  assistantId: id,
                  createdBy: null,
                  organizationId: old.organizationId,
                }))
              : old.linkedCollections,
        };
      });

      return { previousAssistant, queryKey };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.previousAssistant) {
        queryClient.setQueryData(ctx.queryKey, ctx.previousAssistant);
      }
    },

    // 3) onSettled: actualiza el detalle con el asistente filtrado
    onSettled: (data, _err, variables) => {
      const assistantId = variables.query.data.id;
      const detailKey = [
        "assistants",
        "detail",
        { query: { data: { id: assistantId } } },
      ];

      if (data) {
        queryClient.setQueryData(detailKey, data);
      }
      queryClient.invalidateQueries({ queryKey: detailKey });
      queryClient.invalidateQueries({ queryKey: ["assistants", "list"] });
    },

    ...options,
  });
};
// ==== ACTIONS ====

export const getActionsQO = (body: QueryDatabaseSchema) =>
  queryOptions<GetActionResultsResponse>({
    queryKey: ["actions", "type", body] as const,
    queryFn: () => serverDatabaseHandler(body),
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });

export const getActionByIdQO = (body: QueryDatabaseSchema) =>
  queryOptions<GetActionByIdResponse>({
    queryKey: ["action", "detail", body] as const,
    queryFn: () => serverDatabaseHandler(body),
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });

// Creación de una nueva o actualización de acción.
export const useUpsertActionMutation = (
  options?: Omit<UseMutationOptions<any, Error, any, unknown>, "mutationFn">
) => {
  return useMutation<any, Error, any, unknown>({
    mutationFn: async (formData: any) => {
      return serverDatabaseHandler(formData);
    },
    onError: (error) => {
      console.error("Mutation error:", error);
    },
    onSuccess: () => {},
    ...options,
  });
};

// ==== CONNECTIONS ====

export const getConnectionsQO = (body: QueryDatabaseSchema) =>
  queryOptions<GetConnectionResponse[]>({
    queryKey: ["connection", body] as const,
    queryFn: () => serverDatabaseHandler(body),
    refetchOnWindowFocus: true,
    staleTime: Infinity,
  });

export const useUpsertConnectionMutation = (
  options?: Omit<
    UseMutationOptions<any, Error, QueryDatabaseSchema, unknown>,
    "mutationFn"
  >
) => {
  return useMutation<any, Error, QueryDatabaseSchema, unknown>({
    mutationFn: async (body: QueryDatabaseSchema) => {
      return serverDatabaseHandler(body);
    },
    ...options,
  });
};

export const useRemoveConnectionMutation = (
  options?: Omit<
    UseMutationOptions<any, Error, QueryDatabaseSchema, unknown>,
    "mutationFn"
  >
) => {
  return useMutation<any, Error, QueryDatabaseSchema, unknown>({
    mutationFn: async (body: QueryDatabaseSchema) => {
      return serverDatabaseHandler(body);
    },
    ...options,
  });
};

// ==== USERS ====

export const getUserDataQO = (body: QueryDatabaseSchema) =>
  queryOptions<GetUserDataResponse>({
    queryKey: ["integrations", "list", body] as const,
    queryFn: () => serverDatabaseHandler(body),
    refetchOnWindowFocus: false,
    //staleTime: Infinity,
  });

export const useUpsertIntegrationMutation = (
  options?: Omit<
    UseMutationOptions<any, Error, QueryDatabaseSchema, unknown>,
    "mutationFn"
  >
) => {
  return useMutation<any, Error, QueryDatabaseSchema, unknown>({
    mutationFn: async (body: QueryDatabaseSchema) => {
      return serverDatabaseHandler(body);
    },
    onError: (error) => {
      console.error("Connection mutation error:", error);
    },
    onSuccess: () => {},
    ...options,
  });
};

export const useRemoveIntegrationMutation = (
  options?: Omit<
    UseMutationOptions<any, Error, QueryDatabaseSchema, unknown>,
    "mutationFn"
  >
) => {
  return useMutation<any, Error, QueryDatabaseSchema, unknown>({
    mutationFn: async (body: QueryDatabaseSchema) => {
      return serverDatabaseHandler(body);
    },
    onError: (error) => {
      console.error("Connection mutation error:", error);
    },
    onSuccess: () => {},
    ...options,
  });
};

// ==== COLLECTIONS ====

export const getCollectionsQO = (body: QueryDatabaseSchema) =>
  queryOptions<GetCollectionsResponse[]>({
    queryKey: ["collections", "list", body] as const,
    queryFn: () => serverDatabaseHandler(body),
    refetchOnWindowFocus: false,
    //staleTime: Infinity,
  });

export const getCollectionContentsQO = (body: QueryDatabaseSchema) =>
  queryOptions<GetCollectionContentsResponse>({
    queryKey: ["collectionContent", "list", body] as const,
    queryFn: () => serverDatabaseHandler(body),
    refetchOnWindowFocus: false,
    //staleTime: Infinity,
  });

type MutationContext = {
  previousCollections: GetCollectionsResponse[] | undefined;
  queryKey: readonly ["collections", "list", QueryDatabaseSchema];
};

export const useUpsertCollectionMutation = (
  options?: Omit<
    UseMutationOptions<any, Error, QueryDatabaseSchema, MutationContext>,
    "mutationFn"
  >
) => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, UpsertCollectionMutation, MutationContext>({
    mutationFn: async (body: UpsertCollectionMutation) => {
      return serverDatabaseHandler(body);
    },
    onMutate: async (variables: UpsertCollectionMutation) => {
      if (
        variables.query.method === "createOrUpdateCollection" &&
        variables.query.data.operation === "create"
      ) {
        const queryKey = [
          "collections",
          "list",
          {
            userData: variables.userData,
            type: variables.type,
            query: {
              method: "getCollections",
              data: {},
            },
          },
        ] as const;

        // Cancelar queries pendientes
        await queryClient.cancelQueries({ queryKey });

        // Snapshot de los datos actuales
        const previousCollections =
          queryClient.getQueryData<GetCollectionsResponse[]>(queryKey);

        // Update optimista
        queryClient.setQueryData<any>(queryKey, (old = []) => [
          ...old,
          {
            name: variables.query.data.values.name,
            description: variables.query.data.values.description,
          },
        ]);

        return { previousCollections, queryKey };
      }

      // Si no es una operación de crear, retornar valores por defecto
      const defaultQueryKey = ["collections", "list", variables] as const;
      return {
        previousCollections: undefined,
        queryKey: defaultQueryKey,
      };
    },
    onError: (error, _, context) => {
      if (context?.previousCollections !== undefined && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousCollections);
      }
      console.error("Collection mutation error:", error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["collections", "list"],
        exact: false,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["collections"],
        exact: false,
      });
    },
    ...options,
  });
};

type CollectionContentMutationContext = {
  previousCollectionContents: GetCollectionContentsResponse | undefined;
  queryKey: readonly ["collectionContent", "list", QueryDatabaseSchema];
};

export const useUpsertCollectionContentMutation = (
  options?: Omit<
    UseMutationOptions<
      any,
      Error,
      CollectionContentMutationSchema,
      CollectionContentMutationContext
    >,
    "mutationFn"
  >
) => {
  const queryClient = useQueryClient();

  return useMutation<
    any,
    Error,
    CollectionContentMutationSchema,
    CollectionContentMutationContext
  >({
    mutationFn: async (body: CollectionContentMutationSchema) => {
      return serverDatabaseHandler(body);
    },
    onMutate: async (variables: CollectionContentMutationSchema) => {
      // Solo hacer optimistic update para operaciones de crear
      if (variables.query.data.operation === "create") {
        const queryKey = [
          "collectionContent",
          "list",
          {
            userData: variables.userData,
            type: variables.type,
            query: {
              method: "getCollectionContents",
              data: {
                collectionId: variables.query.data.values.collectionId,
              },
            },
          },
        ] as const;

        // Cancelar queries pendientes
        await queryClient.cancelQueries({ queryKey });

        // Snapshot de los datos actuales
        const previousCollectionContents =
          queryClient.getQueryData<GetCollectionContentsResponse>(queryKey);

        // Crear el nuevo contenido optimista - usando solo los campos que existen en el tipo
        const newContent: SelectCollectionContentSchema = {
          id: crypto.randomUUID(), // ID temporal
          name: variables.query.data.values.name,
          key: variables.query.data.values.key,
          size: variables.query.data.values.size,
          mimeType: variables.query.data.values.mimeType,
          createdBy: variables.query.data.values.createdBy
            ? variables.query.data.values.createdBy
            : null,
          createdAt: new Date(),
          collectionId: variables.query.data.values.collectionId,
          organizationId: variables.userData.organizationId,
        };

        // Update optimista - asegurar que retornamos un array
        queryClient.setQueryData<GetCollectionContentsResponse>(
          queryKey,
          (old: GetCollectionContentsResponse | undefined) => {
            if (!old) return [newContent];
            return [...old, newContent];
          }
        );

        return { previousCollectionContents, queryKey };
      }

      // Si no es una operación de crear, retornar valores por defecto
      const defaultQueryKey = ["collectionContent", "list", variables] as const;
      return {
        previousCollectionContents: undefined,
        queryKey: defaultQueryKey,
      };
    },
    onError: (error, _, context) => {
      // Revertir el optimistic update en caso de error
      if (
        context?.previousCollectionContents !== undefined &&
        context?.queryKey
      ) {
        queryClient.setQueryData(
          context.queryKey,
          context.previousCollectionContents
        );
      }
      console.error("Collection content mutation error:", error);
    },
    onSuccess: () => {
      // Invalidar y refrescar las queries relacionadas
      queryClient.invalidateQueries({
        queryKey: ["collectionContent", "list"],
        exact: false,
      });

      // ESTE ES EL CAMBIO IMPORTANTE: Invalidar también las queries de colecciones
      // para que se actualicen inmediatamente el totalSize y fileCount
      queryClient.invalidateQueries({
        queryKey: ["collections", "list"],
        exact: false,
      });
    },
    onSettled: () => {
      // Asegurar que las queries se refresquen después de la mutación
      queryClient.invalidateQueries({
        queryKey: ["collectionContent"],
        exact: false,
      });

      // También invalidar las colecciones en onSettled para mayor seguridad
      queryClient.invalidateQueries({
        queryKey: ["collections"],
        exact: false,
      });
    },
    ...options,
  });
};

// == OBTENCION GENERAL DE DATOS (se realiza con 'fetch') ==
export function useGeneralMutation<
  TData = unknown,
  TError = Error,
  TContext = unknown,
>(
  options?: Omit<
    UseMutationOptions<TData, TError, QueryGeneralSchema, TContext>,
    "mutationFn"
  >
) {
  return useMutation<TData, TError, QueryGeneralSchema, TContext>({
    mutationFn: serverGeneralDataHandler,
    ...options,
  });
}
