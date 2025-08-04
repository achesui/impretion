import { InfoIcon } from "lucide-react";
import { ReactNode, CSSProperties } from "react";

interface NewInfoProps {
  children: ReactNode;
  style?: {
    container?: CSSProperties;
    text?: CSSProperties;
    iconSize?: number;
  };
}

export default function NewInfo({ children, style = {} }: NewInfoProps) {
  const { container = {}, text = {}, iconSize = 18 } = style;

  return (
    <div
      className="p-1 flex items-center bg-slate-50 border border-slate-200 rounded-md"
      style={container}
    >
      <div className="flex-shrink-0">
        <InfoIcon size={iconSize} className="text-slate-400" />
      </div>
      <div className="ml-3" style={text}>
        <p className="text-sm text-slate-500">{children}</p>
      </div>
    </div>
  );
}
