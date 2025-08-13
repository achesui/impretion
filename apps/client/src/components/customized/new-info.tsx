import { cn } from "@/lib/utils";
import { InfoIcon } from "lucide-react";
import { ReactNode, CSSProperties } from "react";

interface NewInfoProps {
  children: ReactNode;
  style?: {
    container?: CSSProperties;
    text?: CSSProperties;
    iconSize?: number;
  };
  className: string;
}

export default function NewInfo({
  children,
  style = {},
  className,
}: NewInfoProps) {
  const { container = {}, text = {}, iconSize = 18 } = style;

  return (
    <div
      className={cn(
        "p-1 flex items-center bg-slate-50 border border-slate-200 rounded-md",
        className,
      )}
      style={container}
    >
      <div className="flex-shrink-0">
        <InfoIcon size={iconSize} className="text-text-primary" />
      </div>
      <div className="ml-1" style={text}>
        <p className={"text-sm text-text-primary"}>{children}</p>
      </div>
    </div>
  );
}
