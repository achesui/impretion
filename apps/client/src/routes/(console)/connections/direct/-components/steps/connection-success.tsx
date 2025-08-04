import { CircleX, Phone } from "lucide-react";

export default function ConnectionSuccess({
  phoneNumber,
  removeConnectionMutation,
  onRemoveConnection,
  isLoading = false,
}: {
  phoneNumber: string;
  removeConnectionMutation: any;
  onRemoveConnection: () => void;
  isLoading?: boolean;
}) {
  return (
    <div className="text-center space-y-6 w-full max-w-md">
      <div className="w-20 h-20 bg-[#25d366] rounded-full flex items-center justify-center mx-auto border border-green-200">
        <svg
          className="w-10 h-10 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>
      <div>
        <h3 className="font-semibold text-xl text-[#075e54] mb-2">
          Número de Whatsapp conectado
        </h3>
        <p className="text-gray-600 text-sm leading-relaxed">
          ¡Tu número ha sido verificado y conectado! Ahora puedes chatear con un
          asistente por WhatsApp que te ayudará a gestionar tu empresa:
          recibirás notificaciones, podrás consultar información y dar
          instrucciones fácilmente, todo desde tu celular.
        </p>
      </div>
      <div className="border text-text-primary bg-soft-surface flex items-center justify-center gap-3 p-2 rounded-md text-sm">
        <Phone />
        <strong>{phoneNumber}</strong>
      </div>
      <button
        onClick={onRemoveConnection}
        disabled={isLoading || removeConnectionMutation.isPending}
        className="cursor-pointer text-text-primary flex items-center justify-center gap-2 bg-red-50 w-full p-2 rounded-md border-red-200 border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-100 transition-colors duration-200"
      >
        {isLoading || removeConnectionMutation.isPending ? (
          <>
            <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-red-400">Desconectando...</span>
          </>
        ) : (
          <>
            <CircleX size={17} className="text-red-400" />
            <span className="text-red-400">Desconectar</span>
          </>
        )}
      </button>
    </div>
  );
}
