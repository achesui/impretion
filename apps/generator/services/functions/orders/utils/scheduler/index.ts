/**
 * Maneja todos los tipos de programación de las ordenes
 */
export const orderScheduler = async (
  scheduleType: string,
  payload: Record<string, any>
) => {
  console.log("orden de schedul...");
  console.log("scheduleType: ", scheduleType);
  console.log("payload: ", payload);
};
