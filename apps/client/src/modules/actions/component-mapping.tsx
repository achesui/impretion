import { lazy } from "react";
import { ComponentProps } from "./component-props";

// Define the component type
type ComponentType = React.ComponentType<ComponentProps>;

// Mapeo estático que Vite puede analizar correctamente
const componentMap = {
  TimeZone: lazy(() =>
    import("../../modules/actions/components").then((c) => ({
      default: c.TimeZone,
    }))
  ),
  MaxAppointmentsPerDay: lazy(() =>
    import("../../modules/actions/components").then((c) => ({
      default: c.MaxAppointmentsPerDay,
    }))
  ),
  Schedule: lazy(() =>
    import("../../modules/actions/components").then((c) => ({
      default: c.Schedule,
    }))
  ),
  StartDate: lazy(() =>
    import("../../modules/actions/components").then((c) => ({
      default: c.StartDate,
    }))
  ),
  SlotInterval: lazy(() =>
    import("../../modules/actions/components").then((c) => ({
      default: c.SlotInterval,
    }))
  ),
  Integrations: lazy(() =>
    import("../../modules/actions/components").then((c) => ({
      default: c.Integrations,
    }))
  ),
} as const;

export type ComponentKey = keyof typeof componentMap;

export const getComponent = (
  componentName: string
): React.LazyExoticComponent<ComponentType> | null => {
  const key = `${componentName}` as ComponentKey;
  return componentMap[key] || null;
};
