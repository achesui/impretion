import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(public)/about")({
  component: Analytics,
});

function Analytics() {
  return <div className="p-2">about</div>;
}
