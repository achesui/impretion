import NewOTPInput from "@/components/customized/new-otp-input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { UseFormReturn } from "react-hook-form";

export default function VerifyCode({
  goBackToPhone,
  isLoading,
  codeForm,
  onSubmitCode,
  resendCode,
  verifyCodeMutation,
  createConnectionMutation,
  phoneNumber,
}: {
  goBackToPhone: () => void;
  isLoading: boolean;
  codeForm: UseFormReturn<
    { verificationCode: string },
    any,
    { verificationCode: string }
  >;
  onSubmitCode: (values: any) => void;
  resendCode: () => void;
  verifyCodeMutation: any;
  createConnectionMutation: any;
  phoneNumber: string;
}) {
  console.log("codeFormcodeForm ", codeForm.formState.errors);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between space-x-3 mb-4">
        <button
          onClick={goBackToPhone}
          className="p-1 hover:bg-soft-surface rounded-full transition-colors"
          disabled={isLoading}
        >
          <ArrowLeft className="w-5 h-5 text-text-primary" />
        </button>
        <h3 className="text-center font-semibold text-xl text-text-primary">
          Verifica tu código
        </h3>
      </div>

      <div className="bg-green-50 border border-[#075e54] rounded-lg p-3">
        <p className="text-[#075e54] text-sm">
          Enviamos un código de 6 dígitos a <strong>{phoneNumber}</strong>
        </p>
      </div>

      <form
        onSubmit={codeForm.handleSubmit(onSubmitCode)}
        className="space-y-4"
      >
        <div>
          <label
            htmlFor="verificationCode"
            className="text-center block text-sm font-medium mb-3 text-gray-700"
          >
            Código de verificación
          </label>
          <div className="flex justify-center">
            <NewOTPInput
              maxLength={6}
              groups={[3, 3]}
              value={codeForm.watch("verificationCode") || ""}
              onChange={(value) => codeForm.setValue("verificationCode", value)}
            />
          </div>
          {codeForm.formState.errors.verificationCode && (
            <p className="text-red-500 text-sm mt-2 text-center flex items-center justify-center space-x-1">
              <span>{codeForm.formState.errors.verificationCode.message}</span>
            </p>
          )}
        </div>

        <Button
          type="submit"
          disabled={
            isLoading ||
            !codeForm.watch("verificationCode") ||
            codeForm.watch("verificationCode")?.length !== 6
          }
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-3 rounded-lg transition-colors duration-200 font-medium flex items-center justify-center space-x-2"
        >
          {verifyCodeMutation.isPending ? (
            <>
              <Loader2 className="animate-spin w-4 h-4" />
              <span>Verificando</span>
            </>
          ) : createConnectionMutation.isPending ? (
            <>
              <Loader2 className="animate-spin w-4 h-4" />
              <span>Guardando conexión...</span>
            </>
          ) : (
            <>
              <span>✓</span>
              <span>Verificar código</span>
            </>
          )}
        </Button>

        <div className="text-center">
          <button
            type="button"
            onClick={resendCode}
            disabled={isLoading}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium disabled:text-gray-400 transition-colors"
          >
            ¿No recibiste el código? Reenviar
          </button>
        </div>
      </form>
    </div>
  );
}
