//import { NewDialog } from "@/components/customized/new-dialog";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
//import { CurrentConnectionComponent } from "./current-connection";

export function Header({ assistantId }: { assistantId: string }) {
  return (
    <div>
      <nav className="flex items-center justify-between border-b">
        <Link to="/assistants" className="flex items-center">
          <div className="flex items-center cursor-pointer hover:cursor-pointer p-2">
            <ArrowLeft className="text-text-primary" />
          </div>
        </Link>
        <div className="flex space-x-4">
          <Link
            to="/assistants/$assistantId/prompt"
            params={{ assistantId }}
            className="px-3 py-2 text-sm font-medium text-text-primary"
            activeProps={{ className: "border-b-2 border-blue-500" }}
          >
            Prompt
          </Link>
          <Link
            to="/assistants/$assistantId/acciones"
            params={{ assistantId }}
            className="px-3 py-2 text-sm font-medium text-text-primary"
            activeProps={{ className: "border-b-2 border-blue-500" }}
          >
            Acciones
          </Link>
          <Link
            to="/assistants/$assistantId/configuracion"
            params={{ assistantId }}
            className="px-3 py-2 text-sm font-medium text-text-primary"
            activeProps={{ className: "border-b-2 border-blue-500" }}
          >
            Configuración
          </Link>
        </div>
      </nav>
    </div>
  );
}
