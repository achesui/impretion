-- wrangler d1 execute logs --file=./d1-database/controller/schemas/0000_create_generations_table.sql --local --persist-to=../SHARED_DATA
-- Sentencia para crear la tabla 'generations' con optimizaciones y tipos correctos
CREATE TABLE IF NOT EXISTS generations (
    -- Clave Primaria Autoincremental
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Clave de Idempotencia: Un hash único de la línea de log para prevenir duplicados.
    -- La restricción UNIQUE es la clave para que la idempotencia funcione.
    idempotency_key TEXT UNIQUE NOT NULL,
    
    -- Métricas de la Generación (Almacenados como enteros para precisión)
    input_tokens INTEGER NOT NULL,
    output_tokens INTEGER NOT NULL,
    cost INTEGER NOT NULL,
    
    -- Detalles de la Petición
    model TEXT NOT NULL,
    connection_type TEXT,
    "to" TEXT,
    "from" TEXT,
    
    -- Relaciones, Estado y Control de Procesamiento
    organization_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    processing_batch_id TEXT, -- Columna para reclamar trabajos de forma atómica
    
    -- Timestamps
    created_at TEXT NOT NULL
);

-- --- ÍNDICES ESENCIALES ---

-- Índice para el Orquestador: encontrar trabajos PENDIENTES de forma ultra-rápida.
CREATE INDEX IF NOT EXISTS idx_generations_status ON generations (status);

-- Índice para filtrar rápidamente por organización (para lógica de negocio y facturación)
CREATE INDEX IF NOT EXISTS idx_generations_organizationId ON generations (organization_id);

-- Índice para purgar eficientemente los logs antiguos por fecha
CREATE INDEX IF NOT EXISTS idx_generations_createdAt ON generations (created_at);

-- Índice compuesto para consultas eficientes que filtran por organización Y fecha
CREATE INDEX IF NOT EXISTS idx_generations_org_time ON generations (organization_id, created_at);