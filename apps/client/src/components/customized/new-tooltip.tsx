import { ReactNode } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { cn } from "@/lib/utils"; // Ajusta la ruta según tu proyecto

interface NewTooltipProps {
  children: ReactNode;
  content: string | ReactNode;
  delayDuration?: number;
  className?: string;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  sideOffset?: number;
}

export default function NewTooltip({
  children,
  delayDuration = 300,
  content,
  className,
  side = "top",
  align = "center",
  sideOffset = 4,
}: NewTooltipProps) {
  return (
    <TooltipProvider delayDuration={delayDuration}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent
          className={cn(className)}
          side={side}
          align={align}
          sideOffset={sideOffset}
        >
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
