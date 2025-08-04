import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/(public)/legal/privacy-policy")({
  component: RouteComponent,
});

function RouteComponent() {
  const [language, setLanguage] = useState<"es" | "en">("es");

  const toggleLanguage = () => {
    setLanguage(language === "es" ? "en" : "es");
  };

  const content = {
    es: {
      title: "Políticas de Privacidad de Impretion",
      lastUpdate: "Última actualización: 23 de julio de 2025",
      intro:
        "En Impretion, nos comprometemos a proteger su privacidad y a cumplir con las leyes de protección de datos personales vigentes en Colombia, incluyendo la Ley 1581 de 2012 y su Decreto Reglamentario 1377 de 2013. Esta política de privacidad describe cómo recopilamos, utilizamos, compartimos y protegemos su información personal cuando utiliza nuestra plataforma de inteligencia artificial para comunicaciones empresariales.",
      sections: {
        info: {
          title: "1. Información que Recopilamos",
          content: [
            "Recopilamos información personal que usted nos proporciona directamente al usar nuestra plataforma:",
            "• Información de registro: nombre, apellidos, dirección de correo electrónico, número de teléfono",
            "• Información empresarial: nombre de la empresa, cargo, sector industrial",
            "• Datos de WhatsApp Business: números de teléfono asociados, configuraciones de cuenta",
            "• Tokens de acceso y credenciales API (almacenados de forma encriptada)",
            "• Información de pago cuando corresponda",
            "",
            "También recopilamos información automáticamente:",
            "• Datos de uso de la plataforma y métricas de rendimiento",
            "• Conversaciones y mensajes procesados por nuestra IA (solo si está habilitado para métricas)",
            "• Información técnica: dirección IP, tipo de navegador, sistema operativo",
            "• Logs de actividad y errores del sistema",
          ],
        },
        use: {
          title: "2. Uso de la Información",
          content: [
            "Utilizamos su información personal para:",
            "• Proveer y mantener nuestros servicios de IA para comunicaciones empresariales",
            "• Facilitar la comunicación bidireccional entre usted y sus clientes a través de WhatsApp",
            "• Procesar y responder mensajes mediante nuestra inteligencia artificial",
            "• Generar métricas y análisis empresariales (solo si usted habilita esta función)",
            "• Procesar transacciones y pagos",
            "• Brindar soporte técnico y atención al cliente",
            "• Mejorar el contexto de la IA y la calidad del servicio",
            "• Cumplir con obligaciones legales y regulatorias colombianas",
          ],
        },
        sharing: {
          title: "3. Compartir Información y Proveedores de Servicios",
          content: [
            "No vendemos ni alquilamos su información personal. Compartimos información únicamente en los siguientes casos:",
            "",
            "Proveedores de servicios esenciales:",
            "• Twilio: Para el servicio de WhatsApp Business API y procesamiento de mensajes",
            "• Meta (WhatsApp): Para la integración con WhatsApp Business Platform",
            "",
            "Importante: Estos proveedores tienen sus propias políticas de privacidad:",
            "• Política de Privacidad de Twilio: https://www.twilio.com/en-us/privacy",
            "• Política de Privacidad de Meta: https://www.facebook.com/privacy/policy/",
            "",
            "Otras circunstancias de compartir información:",
            "• Cuando sea requerido por ley colombiana o para responder a procesos legales válidos",
            "• En caso de fusión, adquisición o venta de activos de la empresa",
            "• Para proteger nuestros derechos legales o la seguridad de nuestros usuarios",
          ],
        },
        b2b: {
          title: "4. Datos de Usuarios Finales (Clientes de Nuestros Clientes)",
          content: [
            "Como plataforma B2B, también procesamos información de los clientes de nuestros usuarios:",
            "• Números de teléfono y nombres de contactos",
            "• Contenido de conversaciones de WhatsApp",
            "• Preferencias de comunicación y historial de interacciones",
            "",
            "Esta información se utiliza exclusivamente para:",
            "• Facilitar la comunicación entre nuestros clientes y sus usuarios finales",
            "• Generar métricas y reportes cuando nuestro cliente lo solicite",
            "• Mejorar la experiencia de atención al cliente mediante IA",
            "",
            "Nuestros clientes son responsables de obtener el consentimiento necesario de sus usuarios finales y de cumplir con las leyes de protección de datos aplicables.",
          ],
        },
        rights: {
          title: "5. Sus Derechos como Titular de Datos",
          content: [
            "De acuerdo con la Ley 1581 de 2012, usted tiene derecho a:",
            "• Conocer, actualizar y rectificar su información personal",
            "• Solicitar prueba de la autorización otorgada para el tratamiento de sus datos",
            "• Ser informado sobre el uso que se ha dado a sus datos personales",
            "• Presentar quejas ante la Superintendencia de Industria y Comercio por infracciones",
            "• Revocar la autorización y/o solicitar la supresión de sus datos",
            "• Acceder de forma gratuita a sus datos personales objeto de tratamiento",
            "",
          ],
        },
        security: {
          title: "6. Seguridad de la Información",
          content: [
            "Implementamos medidas de seguridad técnicas y organizativas robustas:",
            "• Encriptación de extremo a extremo para tokens de acceso y credenciales sensibles",
            "• Protocolos de seguridad SSL/TLS para todas las transmisiones de datos",
            "• Controles de acceso estrictos y autenticación multifactor",
            "• Monitoreo continuo de seguridad y detección de amenazas",
            "• Auditorías regulares de seguridad y pruebas de penetración",
            "",
            "Sin embargo, ningún sistema es completamente seguro, por lo que no podemos garantizar la seguridad absoluta de su información.",
          ],
        },
        retention: {
          title: "7. Retención de Datos",
          content: [
            "Conservamos su información personal durante el tiempo necesario para:",
            "• Cumplir con los propósitos descritos en esta política",
            "• Satisfacer requerimientos legales y regulatorios",
            "• Resolver disputas y hacer cumplir nuestros acuerdos",
            "",
            "Los datos de conversaciones se conservan según la configuración que establezca cada cliente, con un máximo de 7 años para fines de métricas y análisis empresarial.",
          ],
        },
        changes: {
          title: "8. Cambios a esta Política",
          content: [
            "Nos reservamos el derecho de modificar esta política de privacidad para reflejar cambios en nuestros servicios o en la legislación aplicable. Le notificaremos sobre cualquier cambio significativo publicando la nueva política en nuestro sitio web con al menos 10 días de anticipación.",
            "",
            "Su uso continuado de nuestros servicios después de tales cambios constituirá su aceptación de la nueva política.",
          ],
        },
        contact: {
          title: "9. Información de Contacto",
          content: [
            "Para preguntas sobre esta política de privacidad o para ejercer sus derechos como titular de datos, puede contactarnos a través de nuestro sitio web oficial.",
            "",
            "Impretion se encuentra registrada y opera bajo la legislación colombiana.",
          ],
        },
      },
    },
    en: {
      title: "Impretion Privacy Policy",
      lastUpdate: "Last updated: July 23, 2025",
      intro:
        "At Impretion, we are committed to protecting your privacy and complying with personal data protection laws in force in Colombia, including Law 1581 of 2012 and its Regulatory Decree 1377 of 2013. This privacy policy describes how we collect, use, share, and protect your personal information when you use our artificial intelligence platform for business communications.",
      sections: {
        info: {
          title: "1. Information We Collect",
          content: [
            "We collect personal information that you provide directly when using our platform:",
            "• Registration information: name, surname, email address, phone number",
            "• Business information: company name, position, industry sector",
            "• WhatsApp Business data: associated phone numbers, account configurations",
            "• Access tokens and API credentials (stored in encrypted form)",
            "• Payment information when applicable",
            "",
            "We also automatically collect information:",
            "• Platform usage data and performance metrics",
            "• Conversations and messages processed by our AI (only if enabled for metrics)",
            "• Technical information: IP address, browser type, operating system",
            "• Activity logs and system errors",
          ],
        },
        use: {
          title: "2. Use of Information",
          content: [
            "We use your personal information to:",
            "• Provide and maintain our AI services for business communications",
            "• Facilitate bidirectional communication between you and your customers through WhatsApp",
            "• Process and respond to messages using our artificial intelligence",
            "• Generate business metrics and analytics (only if you enable this feature)",
            "• Process transactions and payments",
            "• Provide technical support and customer service",
            "• Improve our AI algorithms and service quality",
            "• Comply with Colombian legal and regulatory obligations",
          ],
        },
        sharing: {
          title: "3. Information Sharing and Service Providers",
          content: [
            "We do not sell or rent your personal information. We share information only in the following cases:",
            "",
            "Essential service providers:",
            "• Twilio: For WhatsApp Business API service and message processing",
            "• Meta (WhatsApp): For integration with WhatsApp Business Platform",
            "",
            "Important: These providers have their own privacy policies:",
            "• Twilio Privacy Policy: https://www.twilio.com/en-us/privacy",
            "• Meta Privacy Policy: https://www.facebook.com/privacy/policy/",
            "",
            "Other circumstances for sharing information:",
            "• When required by Colombian law or to respond to valid legal processes",
            "• In case of merger, acquisition, or sale of company assets",
            "• To protect our legal rights or the security of our users",
          ],
        },
        b2b: {
          title: "4. End User Data (Our Customers' Clients)",
          content: [
            "As a B2B platform, we also process information from our users' customers:",
            "• Phone numbers and contact names",
            "• WhatsApp conversation content",
            "• Communication preferences and interaction history",
            "",
            "This information is used exclusively to:",
            "• Facilitate communication between our clients and their end users",
            "• Generate metrics and reports when requested by our client",
            "• Improve customer service experience through AI",
            "",
            "Our clients are responsible for obtaining necessary consent from their end users and complying with applicable data protection laws.",
          ],
        },
        rights: {
          title: "5. Your Rights as a Data Subject",
          content: [
            "In accordance with Law 1581 of 2012, you have the right to:",
            "• Know, update, and rectify your personal information",
            "• Request proof of authorization granted for processing your data",
            "• Be informed about the use that has been given to your personal data",
            "• File complaints with the Superintendencia de Industria y Comercio for violations",
            "• Revoke authorization and/or request deletion of your data",
            "• Access your personal data subject to processing free of charge",
            "",
            "To exercise these rights, you can contact us through the email address provided in the contact section.",
          ],
        },
        security: {
          title: "6. Information Security",
          content: [
            "We implement robust technical and organizational security measures:",
            "• End-to-end encryption for access tokens and sensitive credentials",
            "• SSL/TLS security protocols for all data transmissions",
            "• Strict access controls and multi-factor authentication",
            "• Continuous security monitoring and threat detection",
            "• Regular security audits and penetration testing",
            "",
            "However, no system is completely secure, so we cannot guarantee absolute security of your information.",
          ],
        },
        retention: {
          title: "7. Data Retention",
          content: [
            "We retain your personal information for the time necessary to:",
            "• Fulfill the purposes described in this policy",
            "• Meet legal and regulatory requirements",
            "• Resolve disputes and enforce our agreements",
            "",
            "Conversation data is retained according to the configuration established by each client, with a maximum of 7 years for business metrics and analysis purposes.",
          ],
        },
        changes: {
          title: "8. Changes to This Policy",
          content: [
            "We reserve the right to modify this privacy policy to reflect changes in our services or applicable legislation. We will notify you of any significant changes by posting the new policy on our website at least 10 days in advance.",
            "",
            "Your continued use of our services after such changes will constitute your acceptance of the new policy.",
          ],
        },
        contact: {
          title: "9. Contact Information",
          content: [
            "For questions about this privacy policy or to exercise your rights as a data subject, you can contact us through our official website.",
            "",
            "Impretion is registered and operates under Colombian legislation.",
          ],
        },
      },
    },
  };

  const currentContent = content[language];

  return (
    <div className="max-w-4xl mx-auto p-8 text-gray-800">
      {/* Language Toggle Button */}
      <div className="flex justify-end mb-6">
        <button
          onClick={toggleLanguage}
          className="px-4 py-2 border border-text-primary cursor-pointer text-text-primary rounded-md hover:bg-text-primary hover:text-white transition-colors duration-200 font-medium"
        >
          {language === "es" ? "English" : "Español"}
        </button>
      </div>

      <h1 className="text-4xl font-bold mb-8 text-center text-gray-900">
        {currentContent.title}
      </h1>
      <p className="mb-4 text-sm text-gray-500 text-center">
        {currentContent.lastUpdate}
      </p>

      <p className="mb-6 text-gray-700 leading-relaxed">
        {currentContent.intro}
      </p>

      {Object.entries(currentContent.sections).map(([key, section]) => (
        <div key={key} className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-gray-900">
            {section.title}
          </h2>
          <div className="text-gray-700 leading-relaxed">
            {section.content.map((paragraph, index) => (
              <p
                key={index}
                className={paragraph.trim() === "" ? "mb-4" : "mb-2"}
              >
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      ))}

      {/* Footer with external links */}
      <div className="mt-12 pt-8 border-t border-gray-200">
        <h3 className="text-lg font-semibold mb-4 text-gray-900">
          {language === "es" ? "Enlaces de Terceros" : "Third-Party Links"}
        </h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <h4 className="font-medium text-gray-800 mb-2">Twilio</h4>
            <a
              href="https://www.twilio.com/en-us/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              {language === "es"
                ? "Política de Privacidad de Twilio"
                : "Twilio Privacy Policy"}
            </a>
          </div>
          <div>
            <h4 className="font-medium text-gray-800 mb-2">Meta/WhatsApp</h4>
            <a
              href="https://www.facebook.com/privacy/policy/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              {language === "es"
                ? "Política de Privacidad de Meta"
                : "Meta Privacy Policy"}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
