import { useState, useEffect } from "react";
import { cn } from "@/lib/utils"; // Asegúrate de tener una función cn() que fusione clases, por ejemplo usando tailwind-merge y clsx.
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface NewSelectProps {
  placeholder?: string;
  content: Array<{ label: string; value: string }>;
  defaultValue: { label: string; value: string };
  onChange: (value: string) => void;
  value: string;
  // Propiedades opcionales para sobrescribir clases por defecto
  triggerClassName?: string;
  contentClassName?: string;
  itemClassName?: string;
}

export function NewSelect({
  placeholder,
  content,
  defaultValue,
  onChange,
  value,
  triggerClassName,
  contentClassName,
  itemClassName,
}: NewSelectProps) {
  const [selectedValue, setSelectedValue] = useState<string>(
    value || defaultValue.value
  );

  useEffect(() => {
    setSelectedValue(value);
  }, [value, defaultValue.value]);

  const handleValueChange = (value: string) => {
    setSelectedValue(value);
    onChange(value);
  };

  return (
    <Select value={selectedValue} onValueChange={handleValueChange}>
      <SelectTrigger
        className={cn(
          "w-full text-sm border focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none",
          triggerClassName
        )}
      >
        <SelectValue placeholder={placeholder}>
          {content.find((item) => item.value === selectedValue)?.label || ""}
        </SelectValue>
      </SelectTrigger>
      <SelectContent
        className={cn(
          "focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0",
          contentClassName
        )}
      >
        <SelectGroup>
          {content.map((object, index) => (
            <SelectItem
              key={index}
              value={object.value}
              className={cn(
                "focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0",
                itemClassName
              )}
            >
              {object.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
