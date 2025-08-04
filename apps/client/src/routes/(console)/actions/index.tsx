import actionSchemas from "@/modules/actions";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/(console)/actions/")({
  component: RouteComponent,
});

const actions = ["appointment"];

function RouteComponent() {
  return (
    <div>
      {actions.map((type) => {
        const schema = actionSchemas[type as keyof typeof actionSchemas];
        const definitions = schema.renderer.metadata.definitions;

        return (
          <div key={type}>
            <Link
              key={type}
              to={`/actions/$actionType`}
              params={{ actionType: type }}
              className="flex items-center gap-2 border-border border rounded-md w-2/6 bg-slate-50 p-2 m-2"
            >
              <div>{definitions.icon}</div>
              <div className="">
                <p className="text-text-primary font-semibold">
                  {definitions.type}
                </p>
                <p className="text-text-secondary">{definitions.description}</p>
              </div>
            </Link>
          </div>
        );
      })}
    </div>
  );
}
