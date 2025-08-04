//import { NewDialog } from "@/components/customized/new-dialog";
import { Link } from "@tanstack/react-router";
//import { CurrentConnectionComponent } from "./current-connection";

export function Header() {
  return (
    <div>
      <nav className="border-b">
        <div className="flex space-x-4">
          <Link
            to="/connections/direct"
            className="px-3 py-2 text-sm font-medium text-text-primary"
            activeProps={{ className: "border-b-2 border-blue-500" }}
          >
            Conexión directa
          </Link>
          <Link
            to="/connections/organizational"
            className="px-3 py-2 text-sm font-medium text-text-primary"
            activeProps={{ className: "border-b-2 border-blue-500" }}
          >
            Conexiones de tu empresa
          </Link>
          <Link
            to="/connections/integrations"
            className="px-3 py-2 text-sm font-medium text-text-primary"
            activeProps={{ className: "border-b-2 border-blue-500" }}
          >
            Integraciones
          </Link>
        </div>
      </nav>
    </div>
  );
}
