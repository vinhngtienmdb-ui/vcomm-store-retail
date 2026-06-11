import { useMemo, useState } from "react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface DateTimePickerProps {
  value: Date | null;
  onChange: (next: Date | null) => void;
  placeholder?: string;
  minDate?: Date;
  testId?: string;
  disabled?: boolean;
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Chọn ngày giờ",
  minDate,
  testId,
  disabled,
}: DateTimePickerProps) {
  const [open, setOpen] = useState(false);

  const hour = value ? value.getHours() : 9;
  const minute = value ? value.getMinutes() : 0;

  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const minutes = useMemo(() => Array.from({ length: 12 }, (_, i) => i * 5), []);

  const handleSelectDate = (d: Date | undefined) => {
    if (!d) return;
    const next = new Date(d);
    next.setHours(hour, minute, 0, 0);
    onChange(next);
  };

  const handleHour = (h: string) => {
    const base = value ? new Date(value) : new Date();
    base.setHours(Number(h), minute, 0, 0);
    onChange(base);
  };

  const handleMinute = (m: string) => {
    const base = value ? new Date(value) : new Date();
    base.setHours(hour, Number(m), 0, 0);
    onChange(base);
  };

  const display = value
    ? format(value, "HH:mm — EEEE, dd/MM/yyyy", { locale: vi })
    : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal h-10",
            !value && "text-muted-foreground",
          )}
          data-testid={testId}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-primary" />
          <span className="truncate">{display}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value ?? undefined}
          onSelect={handleSelectDate}
          disabled={minDate ? { before: minDate } : undefined}
          locale={vi}
          weekStartsOn={1}
          initialFocus
        />
        <div className="border-t p-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-sm text-muted-foreground mr-1">Giờ</span>
          <Select value={String(hour)} onValueChange={handleHour}>
            <SelectTrigger className="h-9 w-[78px]" data-testid={testId ? `${testId}-hour` : undefined}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {hours.map((h) => (
                <SelectItem key={h} value={String(h)}>
                  {String(h).padStart(2, "0")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-muted-foreground">:</span>
          <Select value={String(minute - (minute % 5))} onValueChange={handleMinute}>
            <SelectTrigger className="h-9 w-[78px]" data-testid={testId ? `${testId}-minute` : undefined}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {minutes.map((m) => (
                <SelectItem key={m} value={String(m)}>
                  {String(m).padStart(2, "0")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="ml-auto"
            onClick={() => setOpen(false)}
          >
            Xong
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
