// src/services/api.ts
import axios from "axios";

const apiClient = axios.create({
  baseURL: import.meta.env.CLIENT_GATEWAY,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Esto hace que los errores sean más fáciles de manejar en tus hooks de query.
    console.error("API Error:", error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default apiClient;
