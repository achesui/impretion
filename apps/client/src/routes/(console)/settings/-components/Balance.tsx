import { NewDialog } from "@/components/customized/new-dialog";
import { useGeneralMutation } from "@/services/queries";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  FileClock,
  Info,
  Loader2,
  Plus,
  RefreshCw,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { UserData } from "@base/shared-types";
import NewTooltip from "@/components/customized/new-tooltip";

type BalanceDisplayProps = {
  amount: number;
  rate: number;
  currency: string;
  userData: UserData;
  refetch: () => void;
};

type FormData = {
  amount: number;
};

// Mapeo de configuraciones de moneda
const currencyConfig = {
  COP: {
    locale: "es-CO",
    decimals: 0, // Pesos colombianos no usan decimales
    symbol: "COP",
  },
  // Futuras monedas se pueden agregar aquí
  // PEN: {
  //   locale: "es-PE",
  //   decimals: 2,
  //   symbol: "PEN"
  // },
  // ARS: {
  //   locale: "es-AR",
  //   decimals: 2,
  //   symbol: "ARS"
  // }
};

function CardHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-component text-white">
        {icon}
      </div>
      <h2 className="text-lg font-semibold text-slate-700 tracking-wide">
        {title}
      </h2>
    </div>
  );
}

export default function Balance({
  amount,
  rate,
  currency,
  userData,
  refetch,
}: BalanceDisplayProps) {
  const [showRecharge, setShowRecharge] = useState(false);
  const [isRefetching, setIsRefetching] = useState(false);
  const [showMessage, setShowMessage] = useState(false);

  const generalMutation = useGeneralMutation({
    onSuccess: (data: { initPoint: string }) => {
      const { initPoint } = data;
      window.open(initPoint, "_blank", "noopener,noreferrer");
      setShowMessage(true);
    },
    onError: (err) => {
      console.log(err);
    },
  });

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    setError,
  } = useForm<FormData>({
    defaultValues: { amount: undefined },
  });

  // Obtener configuración de la moneda
  const config =
    currencyConfig[currency as keyof typeof currencyConfig] ||
    currencyConfig.COP;

  // Convertir centavos USD a dólares
  const amountInDollars = amount / 100;

  // Convertir dólares a moneda local usando el rate
  const amountInLocalCurrency = amountInDollars / rate;

  // Formatear según la configuración de la moneda
  const localCurrencyFormatter = new Intl.NumberFormat(config.locale, {
    style: "decimal",
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  });

  const formattedBalance = localCurrencyFormatter.format(amountInLocalCurrency);

  const handleRechargeClick = () => setShowRecharge(true);

  const handleBackClick = () => {
    setShowRecharge(false);
    setShowMessage(false);
    reset();
  };

  const handleRefreshBalance = async () => {
    setIsRefetching(true);
    try {
      await refetch();
    } finally {
      setIsRefetching(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    const { amount } = data;
    generalMutation.mutate({
      route: "/mercadopago/create-preference",
      data: {
        userData,
        amount,
      },
      workerUrl: "https://296f7d9870fb.ngrok-free.app",
    });
    try {
    } catch (err: any) {
      setError("root.serverError", {
        type: "manual",
        message: err.message || "Error inesperado.",
      });
    }
  };

  return (
    <div className="relative w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6">
      <div className="absolute inset-0 rounded-xl bg-gradient-to-tr bg-white opacity-30"></div>

      <div className="relative z-10 flex flex-col">
        {!showRecharge ? (
          <div className="flex justify-between items-center gap-3">
            <CardHeader
              icon={<Wallet size={20} strokeWidth={2.5} />}
              title="Saldo Actual"
            />
            <div className="flex items-center gap-1">
              <button
                onClick={handleRefreshBalance}
                disabled={isRefetching}
                className="cursor-pointer flex items-center justify-center w-8 h-8 rounded-full hover:bg-slate-100 transition-colors disabled:opacity-50"
                title="Actualizar saldo"
              >
                <RefreshCw
                  size={16}
                  className={`text-slate-600 ${isRefetching ? "animate-spin" : ""}`}
                />
              </button>
              <NewTooltip
                content={
                  <div className="w-60">
                    <p>
                      Tu saldo real siempre está en USD y nunca cambia. La
                      moneda local solo se muestra con fines visuales; no
                      representa tu saldo ni se usa en las transacciones.
                    </p>
                  </div>
                }
              >
                <Info size={17} className="text-component" />
              </NewTooltip>
            </div>
          </div>
        ) : (
          <CardHeader
            icon={<Plus size={20} strokeWidth={2.5} />}
            title="Recargar Saldo"
          />
        )}

        <div
          className={`flex flex-1 flex-col justify-center ${showMessage ? "min-h-[120px]" : "min-h-[140px]"}`}
        >
          {!showRecharge ? (
            <div className="flex flex-col items-center gap-1">
              {/* Saldo en moneda local */}
              <div className="flex items-baseline gap-2 justify-center">
                <p className="text-4xl font-bold text-text-primary tracking-tight">
                  ${amountInDollars.toFixed(2)} USD
                </p>
              </div>

              {/* Equivalente en USD (más pequeño) */}
              <div className="flex items-baseline gap-1 justify-center mt-1">
                <p className="text-sm text-text-secondary font-semibold">
                  ≈{formattedBalance}
                </p>
                <p className="text-sm font-semibold text-text-secondary">
                  {config.symbol}
                </p>
              </div>
            </div>
          ) : (
            <form id="recharge-form" onSubmit={handleSubmit(onSubmit)}>
              <div className="space-y-1">
                <Controller
                  name="amount"
                  control={control}
                  rules={{
                    required: "El saldo es obligatorio.",
                    min: {
                      value: 10000,
                      message: "El monto mínimo es 10.000 COP.",
                    },
                  }}
                  render={({
                    field: { onChange, value },
                    fieldState: { error },
                  }) => (
                    <>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="0"
                          value={
                            value ? localCurrencyFormatter.format(value) : ""
                          }
                          onChange={(e) => {
                            const rawValue = e.target.value.replace(/\D/g, "");
                            const numericValue = parseInt(rawValue, 10);
                            onChange(
                              isNaN(numericValue) ? undefined : numericValue
                            );
                          }}
                          className={`w-full px-4 py-2 text-2xl font-bold text-slate-700 bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all text-center ${error ? "border-red-500 focus:ring-red-500" : "border-slate-200 focus:ring-indigo-500"}`}
                        />
                        <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-lg font-semibold text-slate-500">
                          {config.symbol}
                        </span>
                      </div>
                      {error && (
                        <div className="flex items-center gap-2 text-xs text-red-600 px-1 pt-0.5">
                          <AlertCircle size={14} /> <span>{error.message}</span>
                        </div>
                      )}
                      {errors.root?.serverError && (
                        <div className="flex items-center gap-2 text-xs text-red-600 px-1 pt-0.5">
                          <AlertCircle size={14} />{" "}
                          <span>{errors.root.serverError.message}</span>
                        </div>
                      )}
                    </>
                  )}
                />
              </div>
            </form>
          )}
        </div>

        <div className="flex h-10 items-center border-t border-slate-200 pt-4 mt-auto">
          {!showRecharge ? (
            <div className="flex w-full justify-between">
              <button
                onClick={handleRechargeClick}
                className="hover:bg-soft-surface px-3 py-2 rounded-md cursor-pointer text-sm font-semibold text-component transition-colors"
              >
                Recargar saldo →
              </button>
              <NewDialog
                trigger={
                  <a
                    href="#"
                    className="text-sm font-semibold text-component transition-colors flex gap-1 items-center cursor-pointer"
                  >
                    <FileClock size={16} /> Historial
                  </a>
                }
                title="Historial de Recargas"
              >
                imp
              </NewDialog>
            </div>
          ) : (
            <div className="flex w-full items-center gap-3">
              <button
                type="button"
                onClick={handleBackClick}
                className="flex-shrink-0 flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ArrowLeft size={16} /> Volver
              </button>
              <button
                type="submit"
                form="recharge-form"
                disabled={generalMutation.isPending}
                className={`${generalMutation.isPending && "opacity-50"} cursor-pointer h-full flex-1 flex justify-center items-center px-2 py-2 text-sm font-semibold text-white bg-component disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg transition-colors`}
              >
                {generalMutation.isPending ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  "Recargar"
                )}
              </button>
            </div>
          )}
        </div>

        {showMessage && (
          <div className="mt-4 p-2 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start gap-2">
              <CheckCircle
                size={16}
                className="text-green-600 mt-0.5 flex-shrink-0"
              />
              <div className="text-sm text-green-800">
                <p className="font-medium mb-1 text-sm">
                  El pago ha sido iniciado
                </p>
                <p className="text-green-700 text-xs">
                  Se abrió una nueva pestaña para completar tu pago. Una vez
                  finalizado da clic en{" "}
                  <span className="font-semibold underline">volver</span> y el{" "}
                  <span className="font-semibold underline">
                    ícono de refrescar
                  </span>{" "}
                  para ver tu saldo actualizado.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
