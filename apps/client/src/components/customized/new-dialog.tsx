import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Loader2 } from "lucide-react";
import { ReactNode } from "react";
import { UseFormReturn } from "react-hook-form";
import { cn } from "@/lib/utils"; // Asegúrate de tener una función cn para manejar clases dinámicas

export function NewDialog({
  children,
  title,
  trigger,
  description,
  className,
  onSubmit,
  saveBtnText = "Guardar",
  cancelBtnText = "Cancelar",
  removeSaveBtn,
  disableSave,
  form,
  isLoading,
  isOpen,
  onOpenChange,
}: {
  children: ReactNode;
  title: ReactNode;
  trigger?: ReactNode;
  description?: ReactNode;
  className?: string;
  onSubmit?: () => void;
  saveBtnText?: string;
  cancelBtnText?: string;
  removeSaveBtn?: boolean;
  disableSave?: boolean;
  form?: UseFormReturn<any>;
  isLoading?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    onSubmit?.();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent
        className={cn("flex flex-col w/2/4 max-h-full bg-white", className)}
      >
        <AlertDialogHeader>
          <AlertDialogTitle className="text-text-primary">
            {title}
          </AlertDialogTitle>
          {description && (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        {form ? (
          <Form {...form}>
            <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
              <div className="flex-grow overflow-auto min-h-0">{children}</div>
              <AlertDialogFooter className="mt-3 flex-shrink-0">
                <AlertDialogCancel>{cancelBtnText}</AlertDialogCancel>
                <p>{isLoading}</p>
                <Button
                  type="submit"
                  className="flex gap-2 bg-text-primary hover:bg-text-primary/90 text-white hover:text-white cursor-pointer"
                  disabled={disableSave || isLoading}
                >
                  {saveBtnText}
                  {isLoading && <Loader2 className="animate-spin" />}
                </Button>
              </AlertDialogFooter>
            </form>
          </Form>
        ) : (
          <div className="flex flex-col min-h-0">
            <div className="flex-grow overflow-auto min-h-0">{children}</div>
            <AlertDialogFooter className="mt-3">
              <AlertDialogCancel>{cancelBtnText}</AlertDialogCancel>
              {!removeSaveBtn && (
                <Button
                  onClick={handleSubmit}
                  className="flex gap-2 bg-text-primary text-white hover:bg-surface hover:text-text-primary cursor-pointer"
                  disabled={disableSave || isLoading}
                >
                  {saveBtnText}
                  {isLoading && <Loader2 className="animate-spin" />}
                </Button>
              )}
            </AlertDialogFooter>
          </div>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
