"use client";

import React, { useState } from "react";
import { CalendarIcon, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { Button } from "@/components/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/popover";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  startOfWeek,
  endOfWeek,
  parseISO,
} from "date-fns";

interface Comp41DatePickerProps {
  maxDate: string; // YYYY-MM-DD
  onSelectDate: (dateStr: string) => void;
  onCancel: () => void;
}

export function Comp41DatePicker({ maxDate, onSelectDate, onCancel }: Comp41DatePickerProps) {
  const maxDateObj = maxDate ? parseISO(maxDate) : new Date();
  const [selectedDateStr, setSelectedDateStr] = useState("");
  const [currentMonth, setCurrentMonth] = useState<Date>(maxDateObj);
  const [isOpen, setIsOpen] = useState(false);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const handleDayClick = (day: Date) => {
    const formatted = format(day, "yyyy-MM-dd");
    if (formatted <= maxDate) {
      setSelectedDateStr(formatted);
      setIsOpen(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDateStr && selectedDateStr <= maxDate) {
      onSelectDate(selectedDateStr);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-3.5 border border-border rounded-2xl bg-card shadow-xl space-y-3.5 animate-in fade-in zoom-in-95 duration-150 w-full max-w-[280px]">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <CalendarIcon size={14} className="text-primary" />
          Select Past Date
        </label>
        <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-md border border-border">
          Max: {maxDate}
        </span>
      </div>

      {/* Date Trigger Popover */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="w-full h-9 px-3 text-xs justify-between bg-background border-input rounded-xl text-foreground font-normal shadow-xs hover:bg-accent hover:text-accent-foreground"
          >
            <span className={selectedDateStr ? "text-foreground font-medium" : "text-muted-foreground"}>
              {selectedDateStr ? format(parseISO(selectedDateStr), "MMM d, yyyy") : "Pick a date..."}
            </span>
            <CalendarIcon size={14} className="text-muted-foreground" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-64 p-3 bg-card border border-border rounded-2xl shadow-2xl z-50 space-y-2" align="center">
          {/* Calendar Month Navigation */}
          <div className="flex items-center justify-between px-1 py-0.5">
            <span className="text-xs font-bold text-foreground">
              {format(currentMonth, "MMMM yyyy")}
            </span>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="h-6 w-6 p-0 rounded-lg hover:bg-accent"
              >
                <ChevronLeft size={14} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="h-6 w-6 p-0 rounded-lg hover:bg-accent"
              >
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 text-center">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((dayName) => (
              <span key={dayName} className="text-[10px] font-semibold text-muted-foreground py-1 uppercase">
                {dayName}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const formattedDay = format(day, "yyyy-MM-dd");
              const isSelected = selectedDateStr === formattedDay;
              const isDisabled = formattedDay > maxDate;
              const isCurrentMonth = isSameMonth(day, currentMonth);

              return (
                <button
                  key={day.toString()}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleDayClick(day)}
                  className={`size-7 rounded-lg text-xs font-medium flex items-center justify-center transition-all ${
                    isSelected
                      ? "bg-primary text-primary-foreground font-bold shadow-sm"
                      : isDisabled
                      ? "opacity-30 cursor-not-allowed text-muted-foreground"
                      : isCurrentMonth
                      ? "text-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer"
                      : "text-muted-foreground/50 hover:bg-accent/50 cursor-pointer"
                  }`}
                >
                  {format(day, "d")}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      {/* Footer Actions */}
      <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/50">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="h-7 text-[11px] px-2.5 rounded-lg text-muted-foreground hover:text-foreground"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="default"
          size="sm"
          disabled={!selectedDateStr || selectedDateStr > maxDate}
          className="h-7 text-[11px] px-3 gap-1 rounded-lg shadow-xs"
        >
          <Check size={12} />
          Open Journal
        </Button>
      </div>
    </form>
  );
}
