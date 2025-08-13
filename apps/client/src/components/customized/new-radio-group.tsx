import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export function NewRadioGroup({
  defaultValue,
  items,
  onChange,
}: {
  defaultValue?: string;
  items: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const onValueChange = (value: string) => {
    onChange(value);
  };

  return (
    <RadioGroup defaultValue={defaultValue} onValueChange={onValueChange}>
      {items.map((item, index) => (
        <div key={item.value} className="flex items-center space-x-2">
          <RadioGroupItem value={item.value} id={`${item.value}-${index}`} />
          <Label
            className="text-text-primary"
            htmlFor={`${item.value}-${index}`}
          >
            {item.label}
          </Label>
        </div>
      ))}
    </RadioGroup>
  );
}
