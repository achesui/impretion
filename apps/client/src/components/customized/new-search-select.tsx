import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useEffect, useState } from "react";

export default function NewSearchSelect({
  defaultValue,
  content = [{ options: [] }], // Provide a default empty content
  placeholder,
  onChange,
  className,
}: {
  defaultValue?: { label: string; value: string };
  content?: {
    groupName?: string;
    options: { item: string; value: string }[];
  }[];
  placeholder?: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(defaultValue?.value || "");

  useEffect(() => {
    setValue(defaultValue?.value || "");
  }, [defaultValue?.value]);

  const handleValueChange = (newValue: string) => {
    setValue(newValue);
    onChange(newValue);
  };

  // Create a flat list of all options for display when no groupName is provided
  const hasGroups = content.some((group) => group.groupName);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-10 justify-between text-slate-500 hover:text-slate-600",
            className
          )}
        >
          {value
            ? content
                .find((group) =>
                  group.options.find((option) => option.value === value)
                )
                ?.options.find((option) => option.value === value)?.item
            : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className={cn("p-0 text-slate-500", className)}
      >
        <Command onValueChange={handleValueChange}>
          <CommandInput placeholder={placeholder} />
          <CommandList>
            <CommandEmpty>No se encontraron elementos.</CommandEmpty>
            {hasGroups ? (
              // Render with groups if at least one group has a groupName
              content.map((group) => (
                <CommandGroup
                  key={group.groupName || "default"}
                  heading={
                    group.options.length > 0 ? group.groupName : undefined
                  }
                >
                  {group.options.map((option) => (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      onSelect={(currentValue) => {
                        setValue(currentValue);
                        setOpen(false);
                        onChange(currentValue);
                      }}
                      className="w-full cursor-pointer text-slate-500 hover:text-slate-600"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === option.value ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {option.item}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))
            ) : (
              // Render a simple list without groups
              <CommandGroup>
                {content
                  .flatMap((group) => group.options)
                  .map((option) => (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      onSelect={(currentValue) => {
                        setValue(currentValue);
                        setOpen(false);
                        onChange(currentValue);
                      }}
                      className="w-full cursor-pointer text-slate-500 hover:text-slate-600"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === option.value ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {option.item}
                    </CommandItem>
                  ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
