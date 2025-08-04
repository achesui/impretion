import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Header } from "./-components/header";

export const Route = createFileRoute("/(console)/connections")({
  component: ConnectionsLayout,
});

function ConnectionsLayout() {
  return (
    <div className="h-full flex flex-col">
      <Header />
      <div className="flex-1 flex flex-col min-h-0">
        <Outlet />
      </div>
    </div>
  );
}
