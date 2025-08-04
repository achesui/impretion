import { ActionProcessing, DatabaseQueryArgs } from "../../../src/types";
import { newGeneration } from "../../../lib/generation-handler/new-generation";

export const databaseQuery = async <TAgentContext>({
  helpers,
  functionType,
  functionArguments,
  assistantId,
  actionConfiguration,
  metadata, // Los metadatos tienen el tipo de conexión (únicamente Whatsapp en la primera versión)
  directConnections,
  userId,
  env,
}: ActionProcessing<TAgentContext, DatabaseQueryArgs>): Promise<
  string | null
> => {
  console.log("args de func => ", functionArguments);
  const { naturalLanguageQuery } = functionArguments;
  /**
   * Petición agentica sobre consultas en la base de datos del usuario de forma generica.
   * connectedWith - Número del usuario haciendo la petición.
   * organizationId - Id de la organización del usuario.
   */
  const { organizationId } = metadata;
  const response = await newGeneration({
    helpers,
    env,
    body: {
      connectedWith: "",
      connectionType: "agentic",
      message: naturalLanguageQuery,
      organizationId,
      directConnections: [],
      subscribedToAssistant: "",
      from: null,
      isInternal: true,
      source: "databaseQuery",
      userId,
    },
    connection: "",
  });

  console.log("respuesta de la nueva generacion => ", response);

  if (!response.success) return null;

  const { query } = JSON.parse(response.data.content);
  const queryResultResponse = await env.CORE_SERVICE.mainDatabaseHandler({
    type: "organizations",
    query: {
      data: { query },
      method: "customQuery",
    },
    userData: {
      organizationId,
      userId,
    },
  });

  console.log("respuesta de core-service => ", queryResultResponse);

  if (!queryResultResponse.success) return "Ha ocurrido un error.";
  const queryResult = queryResultResponse.data as string;
  console.log("respuesta del query result => ", queryResult);

  return queryResult;
};

/**
 * ------ DATABASEQUERY ------
 * SCHEMA: Se encarga de realizar consultas a la base de datos validando de esta forma un JWT para identificacion del usuario actual.
 */
export function databaseQueryTool() {
  return {
    name: "databaseQuery",
    description: "Detects when a user wants to make a query in the database",
    strict: true,
    parameters: {
      type: "object",
      required: ["naturalLanguageQuery"],
      properties: {
        naturalLanguageQuery: {
          type: "string",
          description: "A detailed but concise query that the user made",
        },
      },
      additionalProperties: false,
    },
  };
}

/**
 * PROMPT: Se encarga de declararle al asistente que debe convertir de lenguaje natural a consulta de SQL. (Esto al ejecutar la Tool.)
 */
export function databaseQueryPrompt() {
  return `
  # Esquema de Base de Datos - Guía para Asistente IA

## Tipos ENUM Disponibles
\`\`\`sql
-- Estados de organización
organization_status: 'active', 'inactive', 'suspended'

-- Tipos de conexión
connection_type: 'direct', 'external'

-- Estados de resultados de acciones
action_result_status: 'pending', 'running', 'completed', 'failed', 'cancelled'

-- Tipos de transacciones financieras
transaction_type: 'usage_fee', 'membership_fee', 'refund', 'manual_adjustment', 'promotion_credit'

-- Estados de asistentes
assistant_status: 'active', 'inactive'
\`\`\`

## Tablas Principales

### 1. ORGANIZATIONS (Organizaciones)
**Descripción**: Entidad principal que agrupa usuarios y recursos. Cada organización tiene su propio espacio aislado.

**Campos importantes**:
- \\\`id\\\` (PK): Identificador único de texto
- \\\`display_name\\\`: Nombre visible (máx 40 caracteres)
- \\\`name\\\`: Nombre interno (máx 40 caracteres)
- \\\`status\\\`: Estado de la organización (active/inactive/suspended)
- \\\`subscription_tier\\\`: Nivel de suscripción

**Relaciones**: Es padre de TODAS las demás tablas (excepto algunas referencias opcionales)

### 2. USERS (Usuarios)
**Descripción**: Usuarios del sistema, pertenecen a una organización específica.

**Campos importantes**:
- \\\`id\\\` (PK): Identificador único de texto
- \\\`email\\\`: Email único en todo el sistema
- \\\`name\\\`: Nombre del usuario
- \\\`organization_id\\\` (FK): Referencia a organizations.id

**Relaciones**:
- Pertenece a: organizations
- Tiene muchos: connections, integrations
- Creador de: collections, actions, assistants, etc.

### 3. ASSISTANTS (Asistentes de IA)
**Descripción**: Asistentes virtuales configurables que pueden ejecutar acciones y acceder a colecciones.

**Campos importantes**:
- \\\`id\\\` (PK): UUID único
- \\\`name\\\`: Nombre del asistente
- \\\`description\\\`: Descripción detallada
- \\\`status\\\`: Estado del asistente (active/inactive)
- \\\`is_public\\\`: Si es público o privado
- \\\`organization_id\\\` (FK): Organización propietaria

**Relaciones**:
- Pertenece a: organizations
- Tiene muchos: instructions, linked_actions, linked_collections
- Ejecuta: action_results

### 4. COLLECTIONS (Colecciones de Archivos)
**Descripción**: Agrupaciones de archivos/documentos que pueden ser utilizados por los asistentes.

**Campos importantes**:
- \\\`id\\\` (PK): UUID único
- \\\`name\\\`: Nombre de la colección
- \\\`total_size\\\`: Tamaño total en bytes
- \\\`file_count\\\`: Número de archivos
- \\\`organization_id\\\` (FK): Organización propietaria

**Relaciones**:
- Pertenece a: organizations
- Tiene muchos: collection_content
- Vinculado a: assistants (mediante linked_collections)

### 5. COLLECTION_CONTENT (Contenido de Colecciones)
**Descripción**: Archivos individuales dentro de las colecciones.

**Campos importantes**:
- \\\`id\\\` (PK): UUID único
- \\\`file_type\\\`: Tipo de archivo
- \\\`name\\\`: Nombre del archivo
- \\\`key\\\`: Clave única para almacenamiento
- \\\`size\\\`: Tamaño en bytes
- \\\`mime_type\\\`: Tipo MIME
- \\\`collection_id\\\` (FK): Colección contenedora

### 6. ACTIONS (Acciones)
**Descripción**: Funciones/herramientas que pueden ser ejecutadas por los asistentes.

**Campos importantes**:
- \\\`id\\\` (PK): UUID único
- \\\`type\\\`: Tipo de acción
- \\\`returns\\\`: Si la acción devuelve un valor
- \\\`organization_id\\\` (FK): Organización propietaria

**Relaciones**:
- Pertenece a: organizations
- Tiene uno: action_structure, action_configuration
- Genera: action_results
- Vinculado a: assistants (mediante linked_actions)

### 7. ACTION_STRUCTURE (Estructura de Acciones)
**Descripción**: Define el esquema y estructura de cada acción.

**Campos importantes**:
- \\\`action_schema\\\` (JSONB): Esquema JSON de la acción
- \\\`action_id\\\` (FK): Acción asociada

### 8. ACTION_CONFIGURATION (Configuración de Acciones)
**Descripción**: Configuración específica para cada acción.

**Campos importantes**:
- \\\`configuration\\\` (JSONB): Configuración JSON
- \\\`action_id\\\` (FK): Acción asociada

### 9. ACTION_RESULTS (Resultados de Acciones)
**Descripción**: Historial de ejecuciones de acciones por parte de los asistentes.

**Campos importantes**:
- \\\`status\\\`: Estado de la ejecución (pending/running/completed/failed/cancelled)
- \\\`result\\\` (JSONB): Resultado de la ejecución
- \\\`metadata\\\` (JSONB): Metadatos adicionales
- \\\`action_id\\\` (FK): Acción ejecutada
- \\\`assistant_id\\\` (FK): Asistente que ejecutó

### 10. CONNECTIONS (Conexiones)
**Descripción**: Conexiones externas o directas de usuarios con servicios.

**Campos importantes**:
- \\\`type\\\`: Tipo de conexión (direct/external)
- \\\`provider\\\`: Proveedor del servicio
- \\\`connected_with\\\`: Con qué está conectado
- \\\`metadata\\\` (JSONB): Metadatos de la conexión
- \\\`subscribed_to_assistant\\\` (FK): Asistente al que está suscrito

### 11. INSTRUCTIONS (Instrucciones)
**Descripción**: Prompts e instrucciones para los asistentes.

**Campos importantes**:
- \\\`prompt\\\`: Texto del prompt (máx 5000 caracteres)
- \\\`prompt_name\\\`: Nombre del prompt
- \\\`is_default\\\`: Si es una instrucción por defecto
- \\\`assistant_id\\\` (FK): Asistente asociado

### 12. LINKED_ACTIONS (Acciones Vinculadas)
**Descripción**: Tabla de relación muchos-a-muchos entre asistentes y acciones.

**Campos importantes**:
- \\\`assistant_id\\\` (FK): Asistente
- \\\`action_id\\\` (FK): Acción
- **Restricción**: Combinación única de assistant_id + action_id

### 13. LINKED_COLLECTIONS (Colecciones Vinculadas)
**Descripción**: Tabla de relación muchos-a-muchos entre asistentes y colecciones.

**Campos importantes**:
- \\\`assistant_id\\\` (FK): Asistente
- \\\`collection_id\\\` (FK): Colección
- **Restricción**: Combinación única de assistant_id + collection_id

### 14. INTEGRATIONS (Integraciones)
**Descripción**: Integraciones OAuth con servicios externos por usuario.

**Campos importantes**:
- \\\`service\\\`: Nombre del servicio
- \\\`access_token\\\`: Token de acceso
- \\\`refresh_token\\\`: Token de actualización
- \\\`expires_at\\\`: Fecha de expiración
- \\\`user_id\\\` (FK): Usuario propietario

### 15. BALANCES (Balances)
**Descripción**: Balance financiero actual de cada organización.

**Campos importantes**:
- \\\`balance_in_usd_cents\\\`: Saldo en centavos de USD
- \\\`organization_id\\\` (FK): Organización (relación 1:1)

### 16. BALANCE_TRANSACTIONS (Transacciones de Balance)
**Descripción**: Historial completo de transacciones financieras.

**Campos importantes**:
- \\\`type\\\`: Tipo de transacción (credit/debit/refund/adjustment/recharge)
- \\\`amount_in_usd_cents\\\`: Monto neto en centavos de USD
- \\\`remaining_in_usd_cents\\\`: Saldo restante para recargas
- \\\`fee_in_usd_cents\\\`: Comisión del procesador
- \\\`original_payment_currency\\\`: Moneda original del pago
- \\\`original_payment_amount\\\`: Monto en moneda original
- \\\`fx_rate_used\\\`: Tasa de cambio utilizada
- \\\`job_id\\\`: ID del trabajo (para transacciones automáticas)
- \\\`batch_id\\\`: ID del lote (para transacciones en lote)

## Relaciones Clave para Queries

### Jerarquía Principal
\`\`\`
organizations (1) -> (muchos) users, assistants, collections, actions, balances
\`\`\`

### Relaciones de Asistentes
\`\`\`
assistants (1) -> (muchos) instructions, action_results
assistants (muchos) <-> (muchos) actions [mediante linked_actions]
assistants (muchos) <-> (muchos) collections [mediante linked_collections]
\`\`\`

### Relaciones de Acciones
\`\`\`
actions (1) -> (1) action_structure, action_configuration
actions (1) -> (muchos) action_results
actions (muchos) <-> (muchos) assistants [mediante linked_actions]
\`\`\`

### Relaciones de Colecciones
\`\`\`
collections (1) -> (muchos) collection_content
collections (muchos) <-> (muchos) assistants [mediante linked_collections]
\`\`\`

### Relaciones Financieras
\`\`\`
organizations (1) -> (1) balances
balances (1) -> (muchos) balance_transactions
\`\`\`

---

A tener en cuenta:

- La fecha actual es jueves, 03/07/2025
- La hora actual es 11:24 p.m
- Aunque es una aplicacion multitenant, no filtres por organización, la aplicación ya cuenta con un sistema RLS para filtrar automáticamente las organizaciones. 
- Tú unico trabajo es hacer realizar una query segun la petición del usuario teniendo en cuenta esta estrucutra de base de datos.
`;
}

/**
 * JSON SCHEMA RESPONSE: Formato de respuesta del asistente, responde simplemente con un objeto con una query lista para ser procesada.
 */
export function databaseQuerySchemaResponse() {
  return {
    type: "json_schema",
    json_schema: {
      name: "postgresql_query",
      strict: true,
      schema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "A single, complete PostgreSQL query ready for execution. Must be a valid SQL statement without explanations, comments, or formatting separators. NEVER include organization_id filters in WHERE clauses - the RLS (Row Level Security) system handles organization isolation automatically. Focus only on the business logic filters requested by the user. The query must be returned as a single continuous line without line breaks, extra spaces, or newline characters. The query should be production-ready and executable as-is.",
          },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
  } as const;
}
