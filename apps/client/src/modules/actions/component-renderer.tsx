import { Skeleton } from "@/components/ui/skeleton";
import { Suspense } from "react";
import { getComponent } from "./component-mapping";
import { ComponentProps } from "./component-props";

const ErrorComponent = () => (
  <div className="text-red-400 p-2 border border-red-400 rounded bg-red-50">
    <h4 className="font-semibold text-sm">Componente no encontrado</h4>
  </div>
);

export const ComponentRenderer = ({
  componentName,
  props,
}: {
  componentName: string;
  props: ComponentProps;
}) => {
  const ComponentToRender = getComponent(componentName);

  if (!ComponentToRender) {
    return <ErrorComponent />;
  }

  return (
    <Suspense
      fallback={
        <div className="flex gap-2 flex-col">
          <Skeleton className="h-4 w-2/6" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      }
    >
      <ComponentToRender {...props} />
    </Suspense>
  );
};
