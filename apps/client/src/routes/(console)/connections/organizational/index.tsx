import { createFileRoute, Link } from "@tanstack/react-router";
import whatsappLogo from "../../../../assets/logos/whatsapp-business.svg";

export const Route = createFileRoute("/(console)/connections/organizational/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="p-4">
      <Link to="/connections/organizational/whatsapp">
        <div className="border-border flex items-center w-2/4 gap-2 border p-2 bg-soft-surface rounded-md">
          <img className="w-10 h-10" src={whatsappLogo}></img>
          <div>
            <p className="text-text-primary font-semibold">
              Conecta tu Número de Whatsapp de negocios.
            </p>
            <p className="text-sm text-text-secondary">
              Conecta o crea un número existente a nuestra plataforma, asignale
              un asistente y asi de facil el asistente comenzara a atender tus
              clientes.
            </p>
          </div>
        </div>
      </Link>
    </div>
  );
}
