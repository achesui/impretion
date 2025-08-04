import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGeneralMutation } from "@/services/queries";
import { Loader2 } from "lucide-react";
import { UseFormReturn } from "react-hook-form";

export default function AddPhone({
  phoneForm,
  sendCodeMutation,
  onSubmitPhone,
  resetProcess,
}: {
  phoneForm: UseFormReturn<{ phone: string }, any, { phone: string }>;
  sendCodeMutation: ReturnType<typeof useGeneralMutation>;
  onSubmitPhone: (data: any) => void;
  resetProcess: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-lg text-text-primary">
          Ingresa tu número
        </h3>
        <button
          onClick={resetProcess}
          className="text-text-secondary cursor-pointer hover:bg-soft-surface px-2 py-1 rounded-md transition-colors duration-200 font-medium hover:text-text-primary text-sm"
        >
          Cancelar
        </button>
      </div>

      <form
        onSubmit={phoneForm.handleSubmit(onSubmitPhone)}
        className="space-y-4"
      >
        <div>
          <label
            htmlFor="phone"
            className="text-text-primary block text-sm font-medium mb-2"
          >
            Número de WhatsApp
          </label>
          <Input
            id="phone"
            type="tel"
            placeholder="300 123 4567"
            className="text-text-primary bg-white w-full border border-border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            {...phoneForm.register("phone")}
            disabled={sendCodeMutation.isPending}
          />
          {phoneForm.formState.errors.phone && (
            <p className="text-red-500 text-sm mt-1">
              {phoneForm.formState.errors.phone.message}
            </p>
          )}
        </div>

        <div className="flex space-x-3">
          <Button
            type="submit"
            disabled={sendCodeMutation.isPending}
            className="bg-[#075e54] hover:bg-[#075e54] disabled:bg-[#075e54] text-white px-4 py-2 rounded-md transition-colors duration-200 font-medium flex items-center space-x-2"
          >
            {sendCodeMutation.isPending ? (
              <div className="flex items-center gap-2">
                <Loader2 className="animate-spin w-4 h-4" />
                <span>Enviando</span>
              </div>
            ) : (
              "Enviar código"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
