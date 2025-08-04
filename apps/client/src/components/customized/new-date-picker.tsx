import { es } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";

interface DatePickerProps {
  value?: string; // Ahora es un string en formato YYYY-MM-DD
  onChange: (value: string | undefined) => void;
  isBefore: boolean;
}

export function NewDatePicker({ value, onChange, isBefore }: DatePickerProps) {
  const timeZone = "America/Bogota"; // Zona horaria para Bogotá
  const today = formatInTimeZone(new Date(), timeZone, "yyyy-MM-dd"); // Obtener la fecha de hoy en formato 'YYYY-MM-DD' en la zona horaria de Bogotá

  const [date, setDate] = useState<string | undefined>(value || today);

  // Sincronizar el estado local con la prop `value`
  useEffect(() => {
    if (value) {
      setDate(value);
    } else {
      setDate(today); // Asignar la fecha de hoy si `value` es undefined
      onChange(today); // Asegurar que el valor por defecto se envíe
    }
  }, [value, today, onChange]);

  // Manejar la selección de la fecha
  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      const zonedDate = toZonedTime(selectedDate, timeZone); // Convertir a la zona horaria de Bogotá
      const formattedDate = format(zonedDate, "yyyy-MM-dd"); // Formatear a 'YYYY-MM-DD'
      setDate(formattedDate);
      onChange(formattedDate);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-fit justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? (
            <span className="text-slate-500">{date}</span>
          ) : (
            <span>Elije una fecha</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date ? parseISO(date) : undefined}
          onSelect={handleDateSelect}
          disabled={isBefore && { before: parseISO(today) }}
          initialFocus
          locale={es}
        />
      </PopoverContent>
    </Popover>
  );
}
