import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Header } from "./-components/header";

// OPCIÓN 1: Layout sin path específico (recomendado)
export const Route = createFileRoute("/(console)/assistants/$assistantId")({
  component: AssistantNavigationLayout,
});

function AssistantNavigationLayout() {
  const { assistantId } = Route.useParams();

  return (
    <div className="h-screen flex flex-col">
      <Header assistantId={assistantId} />

      <main className="flex-1 p-4 bg-white overflow-hidden min-h-0">
        <div className="bg-white rounded-md border border-border h-full flex flex-col">
          <div className="flex-1 flex flex-col min-h-0">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
