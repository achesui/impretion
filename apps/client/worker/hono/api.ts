import { Hono } from "hono";
import { cors } from "hono/cors";
import { ServiceResponse } from "@base/shared-types";

export const app = new Hono<{ Bindings: Env }>();

// Configuración de CORS
app.use(
  "*",
  cors({
    origin: "https://impretion.com",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.get("/api/test-webhook", (c) => {
  const mode = c.req.query("hub.mode");
  const challenge = c.req.query("hub.challenge");
  const token = c.req.query("hub.verify_token");

  if (mode === "subscribe" && token === "123") {
    console.log(c.req.queries());
    console.log("RETO...");
    return c.text(challenge || "", 200, {
      "Content-Type": "text/plain",
    });
  }

  return c.json({}, 403);
});

app.post("/api/test-webhook", async (c) => {
  const timestamp = new Date().toISOString().replace("T", " ").slice(0, 19);
  console.log(`\n\nWebhook received ${timestamp}\n`);

  // Parsear el body según su tipo (JSON, form, texto, etc.)
  let parsed;
  try {
    parsed = await c.req.json();
  } catch {
    parsed = await c.req.text();
  }

  console.log(JSON.stringify(parsed, null, 2));

  return c.text("", 200);
});

app.post("/api/query", async (c) => {
  try {
    const { body } = await c.req.json();
    const queryResponse = await c.env.CORE_SERVICE.mainDatabaseHandler(body);
    if (!queryResponse.success) {
      return c.json({}, 400);
    }

    return c.json(queryResponse.data, 200);
  } catch (error) {
    return c.json({ message: "Internal Server Error" }, 500);
  }
});

// Llamadas externas a otros workers
// No utilizamos 'fetch' desde el cliente para garantizar el auth header hacia los workers
// Lista de workers que se pueden llamar y rutas:
/**
 * - twilio (verification)
 */
// El cuerpo tiene la siguiente estructura:
app.post("/api/general", async (c) => {
  try {
    const { body } = await c.req.json();
    // El workerName en desarrollo es la url completa del worker, en produccion es el subdominio del worker, ej: twilio.impretion
    const { workerUrl, data, route } = body;

    console.log(data);
    const response = await fetch(`${workerUrl}${route}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer 123",
      },
      body: JSON.stringify(data),
    });

    console.log("resposhta => ", response);
    const workerResponse = await response.json<ServiceResponse<any, any>>();

    if (!workerResponse.success) {
      return c.json({ error: workerResponse.error }, 500);
    }

    return c.json(workerResponse.data, 200);
  } catch (error) {
    return c.json({}, 500);
  }
});

/**
 * Ruta única para subir archivos a r2 para la funcionalidad RAG
 */
app.post("/api/upload-to-r2", async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get("file") as File;
    const key = formData.get("key") as string;
    console.log("archivo ======> ", file);

    console.log("key ======> ", key);
    //const ragFile = await c.env.RAG.put(key, file.stream());
    //console.log("El archivo rag => ", ragFile);

    return c.json({}, 200);
  } catch (error) {}
});
