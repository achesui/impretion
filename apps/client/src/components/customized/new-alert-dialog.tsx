import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ReactNode } from "react";

type Styles = {
  width?: string | undefined;
  height?: string | undefined;
};

export function NewAlertDialog({
  children,
  title,
  trigger,
  description,
  dialogStyles,
  saveBtn,
  cancelBtn,
}: {
  children: ReactNode;
  title: ReactNode;
  trigger: ReactNode;
  description?: ReactNode;
  dialogStyles?: Styles;
  saveBtn?: ReactNode;
  cancelBtn?: ReactNode;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent
        className={`${dialogStyles?.width || "w-full"}`}
        style={{ maxWidth: "95%" }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <div>{children}</div>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelBtn || "Cancelar"}</AlertDialogCancel>
          <AlertDialogAction>{saveBtn || "Guardar"}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

{
  /*
  


export function NewAlertDialog {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        className={`${dialogStyles?.width || "sm:max-w-[725px]"} ${
          dialogStyles?.height || "h-60"
        }`}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">{children}</div>
        <DialogFooter className="">
          {saveBtn}
          <DialogClose>{cancelBtn}</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
  */
}
