import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes } from "react";

interface SubmitButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
  loaderClassName?: string;
  children?: React.ReactNode;
}

export default function NewSubmitButton({
  className,
  loaderClassName,
  children,
  ...props
}: SubmitButtonProps) {
  const { pending: isSubmitting } = useFormStatus();

  const defaultButtonStyles =
    "px-4 rounded transition-colors duration-200 disabled:opacity-50 bg-slate-900 hover:bg-blue-700 text-white";
  const defaultLoaderStyles = "w-5 h-5";

  return (
    <button
      className={cn(defaultButtonStyles, className)}
      disabled={isSubmitting}
      {...props}
    >
      {isSubmitting ? (
        <Loader2
          className={cn("animate-spin", defaultLoaderStyles, loaderClassName)}
        />
      ) : (
        children || "Submit"
      )}
    </button>
  );
}
