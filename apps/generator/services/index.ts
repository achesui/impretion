import { ActionResponse, FunctionCallingProps } from "../src/types";
import { appointment } from "./functions/appointment";

const orders = () => {};

const functionMap: Record<string, Function> = {
  appointment,
  orders,
  //databaseQuery,
  //editActionConfiguration,
  //rag,
};

export default async function functionCalling<TAgentContext>({
  stateHelpers,
  functionType,
  functionArguments,
  assistantId,
  actionConfiguration,
  userData,
  from,
  to,
  env,
}: FunctionCallingProps<TAgentContext, any>): Promise<ActionResponse> {
  const func = functionMap[functionType] as <T>(
    args: FunctionCallingProps<T, any>,
  ) => Promise<ActionResponse>;
  if (func) {
    console.log("keki => ", functionMap[functionType]);
    return func<TAgentContext>({
      stateHelpers,
      functionType,
      functionArguments,
      assistantId,
      actionConfiguration,
      userData,
      from,
      to,
      env,
    });
  } else {
    throw new Error(`Función "${functionType}" no encontrada.`);
  }
}
