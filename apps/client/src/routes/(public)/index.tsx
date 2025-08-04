import { createFileRoute } from "@tanstack/react-router";
import { Brain, Share2, Smartphone, TrendingUpDown } from "lucide-react";

// El `createFileRoute` se queda igual. ¡No lo toques!
export const Route = createFileRoute("/(public)/")({
  component: HomeComponent,
});

function HomeComponent() {
  return (
    <div className="flex gap-4 flex-col min-h-screen w-full text-white bg-soft-surface overflow-x-hidden p-6">
      <section className="flex items-center justify-center rounded-md relative overflow-hidden">
        <div className="bg-white w-full p-5">
          <div className="flex flex-col">
            <h1 className="text-5xl text-center text-text-primary md:text-7xl font-bold mb-6 leading-tight">
              Haz que Tu Empresa Sea Parte Del
              <span className="text-gradient block mt-2 underline underline-offset-10">
                Futuro
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-center text-text-primary max-w-3xl mx-auto leading-relaxed">
              Integra tu negocio a la nueva era de la automatización con
              asistentes de inteligencia artificial capaces de tomar decisiones
              y actuar de forma autónoma.
            </p>

            {/* Hero Visual Element */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mt-10">
              <div className="flex gap-1 flex-col p-6 rounded-xl transition-all duration-300 hover:scale-105">
                <div className="w-16 h-16 bg-component rounded-lg flex items-center justify-center">
                  <Brain className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl text-text-primary font-semibold">
                  Conexión Fácil
                </h3>
                <p className="text-gray-400">
                  Vincular tus servicios es tan sencillo como hacer un clic.
                  Conecta tu WhatsApp Business y recibe mensajes de tus
                  asistentes automáticamente.
                </p>
              </div>

              <div className="flex gap-1 flex-col p-6 rounded-xl transition-all duration-300 hover:scale-105">
                <div className="w-16 h-16 bg-gradient-to-r bg-component rounded-lg flex items-center justify-center">
                  <TrendingUpDown className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl text-text-primary font-semibold">
                  Plataforma Dinámica
                </h3>
                <p className="text-gray-400">
                  Configura tus asistentes como tú quieras: asígnales una
                  personalidad y entrénalos con tus datos para que atiendan a
                  tus clientes sin problemas.
                </p>
              </div>

              <div className="flex gap-1 flex-col p-6 rounded-xl transition-all duration-300 hover:scale-105">
                <div className="w-16 h-16 bg-gradient-to-r bg-component rounded-lg flex items-center justify-center">
                  <Share2 className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl text-text-primary font-semibold">
                  Conexión Multiplataforma
                </h3>
                <p className="text-gray-400">
                  Integra aplicaciones de terceros para sincronizar tus horarios
                  y asegurar que el asistente agende citas respetando tu
                  disponibilidad.
                </p>
              </div>

              <div className="flex gap-1 flex-col p-6 rounded-xl transition-all duration-300 hover:scale-105">
                <div className="w-16 h-16 bg-component rounded-lg flex items-center justify-center">
                  <Smartphone className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl text-text-primary font-semibold">
                  Gestión desde WhatsApp
                </h3>
                <p className="text-gray-400">
                  Administra y configura tu empresa directamente desde WhatsApp,
                  sin necesidad de acceder a nuestra plataforma.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white rounded-md">
        <div className="container mx-auto px-6">
          <div className="glass-effect rounded-2xl p-12 text-center neon-glow">
            <h2 className="text-3xl text-text-primary md:text-4xl font-bold mb-6">
              ¿Listo para Transformar tu{" "}
              <span className="text-gradient">Experiencia con IA?</span>
            </h2>
            <p className="text-xl text-text-primary mb-8 max-w-2xl mx-auto">
              Únete a miles de innovadores que ya utilizan nuestra tecnología
              para expandir los límites de lo posible con la inteligencia
              artificial.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="cursor-pointer hover:bg-text-primary hover:text-white bg-white border border-text-primary text-text-primary px-8 py-4 rounded-lg text-lg font-semibold neon-glow transition-all duration-300 flex items-center justify-center space-x-2">
                Registra tu Empresa
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white text-text-primary rounded-md py-12">
        <div className="mx-auto px-6">
          <div className="flex justify-between">
            <div>
              <div className="flex items-center space-x-3">
                <span className="text-text-primary text-xl font-bold text-gradient">
                  Impretion
                </span>
              </div>
              <p className="text-text-primary">
                Pioneros en el futuro de la inteligencia artificial con
                soluciones de vanguardia en redes neuronales y machine learning.
              </p>
            </div>

            <div>
              <h3 className="text-text-primary text-lg font-semibold">Legal</h3>
              <ul className="">
                <li>
                  <a href="/legal/privacy-policy" className="text-text-primary">
                    Políticas de Privacidad
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
