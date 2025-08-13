import NewTooltip from "@/components/customized/new-tooltip";
import { Input } from "@/components/ui/input";
import { createFileRoute } from "@tanstack/react-router";
import { Info, Unlink2 } from "lucide-react";

export const Route = createFileRoute(
  "/(console)/connections/organizational/website/$connectionId/",
)({
  beforeLoad: ({ params }) => {
    return {
      connectionId: params.connectionId || "null",
    };
  },
  component: RouteComponent,
});

const gradients = [
  {
    id: 1,
    className: "bg-gradient-to-r from-purple-700 to-purple-900",
  },
  {
    id: 2,
    className: "bg-gradient-to-r from-red-700 to-red-900",
  },
  {
    id: 3,
    className: "bg-gradient-to-r from-indigo-600 to-indigo-900",
  },
  {
    id: 4,
    className: "bg-gradient-to-r from-emerald-600 to-emerald-800",
  },
  {
    id: 5,
    className: "bg-gradient-to-r from-cyan-500 to-cyan-700",
  },
  {
    id: 6,
    className: "bg-gradient-to-r from-teal-500 to-teal-700",
  },
  {
    id: 7,
    className: "bg-gradient-to-r from-rose-500 to-rose-700",
  },
  {
    id: 8,
    className: "bg-gradient-to-r from-pink-500 to-pink-700",
  },
  {
    id: 9,
    className: "bg-gradient-to-r from-amber-500 to-amber-700",
  },
  {
    id: 10,
    className: "bg-gradient-to-r from-slate-500 to-slate-700",
  },
  {
    id: 11,
    className: "bg-gradient-to-r from-violet-600 to-violet-800",
  },
  {
    id: 12,
    className: "bg-gradient-to-r from-fuchsia-600 to-fuchsia-800",
  },
  {
    id: 13,
    className: "bg-gradient-to-r from-sky-500 to-sky-700",
  },
  {
    id: 14,
    className: "bg-gradient-to-r from-lime-500 to-lime-700",
  },
  {
    id: 15,
    className: "bg-gradient-to-r from-neutral-500 to-neutral-700",
  },
  // Nuevos colores para mejor cobertura de branding
  {
    id: 16,
    className: "bg-gradient-to-r from-black to-gray-800",
  },
  {
    id: 17,
    className: "bg-gradient-to-r from-blue-600 to-blue-800",
  },
  {
    id: 18,
    className: "bg-gradient-to-r from-green-600 to-green-800",
  },
  {
    id: 19,
    className: "bg-gradient-to-r from-yellow-500 to-yellow-700",
  },
  {
    id: 20,
    className: "bg-gradient-to-r from-orange-500 to-orange-700",
  },
  {
    id: 21,
    className: "bg-gradient-to-r from-gray-600 to-gray-800",
  },
  {
    id: 22,
    className: "bg-gradient-to-r from-red-500 to-red-600",
  },
  {
    id: 23,
    className: "bg-gradient-to-r from-blue-500 to-purple-600",
  },
  {
    id: 24,
    className: "bg-gradient-to-r from-green-500 to-teal-600",
  },
  {
    id: 25,
    className: "bg-gradient-to-r from-pink-400 to-red-500",
  },
  {
    id: 26,
    className: "bg-gradient-to-r from-yellow-400 to-orange-500",
  },
  {
    id: 27,
    className: "bg-gradient-to-r from-purple-500 to-pink-500",
  },
  {
    id: 28,
    className: "bg-gradient-to-r from-indigo-500 to-blue-600",
  },
  {
    id: 29,
    className: "bg-gradient-to-r from-emerald-400 to-cyan-400",
  },
  {
    id: 30,
    className: "bg-gradient-to-r from-rose-400 to-pink-400",
  },
  {
    id: 31,
    className: "bg-gradient-to-r from-stone-600 to-stone-800",
  },
  {
    id: 32,
    className: "bg-gradient-to-r from-zinc-600 to-zinc-800",
  },
  {
    id: 33,
    className: "bg-gradient-to-r from-slate-400 to-slate-600",
  },
  {
    id: 34,
    className: "bg-gradient-to-r from-amber-400 to-yellow-500",
  },
  {
    id: 35,
    className: "bg-gradient-to-r from-lime-400 to-green-500",
  },
  {
    id: 36,
    className: "bg-gradient-to-r from-cyan-400 to-blue-500",
  },
];

function RouteComponent() {
  const { connectionId } = Route.useParams();
  let connectionData;

  console.log(connectionId);

  return (
    <div className="flex w-full p-4 gap-2 h-full">
      <div className="flex gap-3 flex-col border-border h-full w-full border rounded-md p-2">
        <label className="text-text-primary bg-gray-50 p-2 rounded-md font-semibold">
          <span className="text-text-secondary text-xs">
            Sitio web donde ira este chatbot
          </span>
          <div className="flex items-center gap-2">
            <NewTooltip
              content={
                <div className="w-40">
                  <p>Únicamente en este sitio web se renderizara el chatbot.</p>
                </div>
              }
            >
              <Info size={17} className="text-text-primary" />
            </NewTooltip>
            <Input
              placeholder="Sitio web"
              className="text-text-primary placeholder:text-text-secondary"
            ></Input>
          </div>
        </label>

        <div className="text-text-primary font-semibold bg-gray-50 p-2 rounded-md">
          <span className="text-text-secondary text-xs">
            Elige los colores que mejor se adapten a tu sitio web.
          </span>
          <div className="flex gap-2 mt-2 flex-wrap">
            {gradients.map((g) => (
              <div
                key={g.id}
                className={`h-8 w-8 rounded-full cursor-pointer hover:scale-110 transition-transform ${g.className}`}
              ></div>
            ))}
          </div>
        </div>
      </div>
      <div className="border-border w-full border rounded-md p-2">
        <p>as</p>
      </div>
    </div>
  );
}
