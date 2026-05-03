"use client"

import * as React from "react"
import { ChevronDown, Calendar as CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CalendarRac } from "@/components/ui/calendar-rac"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { format } from "date-fns"
import { parseDate, CalendarDate } from "@internationalized/date"

export function CalendarDatePicker({ 
  date, 
  onSelect, 
  label = "Seleccionar fecha" 
}: { 
  date?: string; 
  onSelect: (date: string) => void;
  label?: string;
}) {
  const [open, setOpen] = React.useState(false)
  
  // Convert string date (YYYY-MM-DD) to CalendarDate for react-aria-components
  const selectedDate = React.useMemo(() => {
    if (!date) return undefined;
    try {
      return parseDate(date);
    } catch (e) {
      return undefined;
    }
  }, [date]);

  return (
    <div className="flex flex-col gap-2">
      {label && <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">{label}</Label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between font-bold rounded-xl h-12 border-white/10 bg-white/5 hover:bg-white/10 transition-all"
          >
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-primary" />
              {date ? format(new Date(date + 'T12:00:00'), "PPP") : "Seleccionar fecha"}
            </div>
            <ChevronDown className="w-4 h-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 border-none shadow-2xl" align="center">
          <CalendarRac
            value={selectedDate}
            onChange={(d) => {
              onSelect(d.toString())
              setOpen(false)
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
