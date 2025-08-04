import axios from "axios";
import { QueryDatabaseSchema, QueryGeneralSchema } from "../../types";

// Para base de datos.
export async function serverDatabaseHandler(body: QueryDatabaseSchema) {
  return axios
    .post("/api/query", {
      body,
    })
    .then((r) => r.data);
}

// Para datos generales.
export async function serverGeneralDataHandler(body: QueryGeneralSchema) {
  return axios
    .post("/api/general", {
      body,
    })
    .then((r) => r.data);
}
