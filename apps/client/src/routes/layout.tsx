import { createFileRoute, Link, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/layout")({
  component: PublicLayout,
});

function PublicLayout() {
  return (
    <>
      {/* Esta es tu barra de navegación pública */}
      <div className="p-2 flex gap-2 border-b">
        <Link to="/" className="[&.active]:font-bold">
          Home
        </Link>
        <Link to="/about" className="[&.active]:font-bold">
          About
        </Link>
        {/* Podemos hacer este enlace más inteligente en el futuro */}
        <Link to="/assistants" className="[&.active]:font-bold">
          Console
        </Link>
      </div>
      <hr />
      <Outlet />
    </>
  );
}
