import { createFileRoute, Link } from "@tanstack/react-router";
import { CirclePlus } from "lucide-react";

export const Route = createFileRoute(
  "/(console)/connections/organizational/website/",
)({
  component: RouteComponent,
});

export default function RouteComponent() {
  return (
    <div className="p-4">
      <Link
        to="/connections/organizational/website/$connectionId"
        params={{ connectionId: "null" }}
      >
        <div className="text-text-primary font-semibold border-border flex items-center w-fit px-4 gap-2 border p-2 bg-soft-surface rounded-md">
          <CirclePlus />
          <p>Crear nuevo Chatbot</p>
        </div>
      </Link>
      <div className="p-4 border-border mt-4 border rounded-md">
        <p>Chatbots actuais</p>
      </div>
    </div>
  );
}
