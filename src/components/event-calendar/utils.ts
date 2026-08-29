import { isSameDay, isWithinInterval } from "date-fns";
import type { CalendarEvent, EventColor } from "./types";

export const getEventColorClasses = (color?: EventColor | string) => {
  switch (color) {
    case "amber":
      return "bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/30";
    case "violet":
      return "bg-violet-500/20 text-violet-300 border-violet-500/30 hover:bg-violet-500/30";
    case "rose":
      return "bg-rose-500/20 text-rose-300 border-rose-500/30 hover:bg-rose-500/30";
    case "emerald":
      return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30";
    case "orange":
      return "bg-orange-500/20 text-orange-300 border-orange-500/30 hover:bg-orange-500/30";
    case "sky":
    default:
      return "bg-sky-500/20 text-sky-300 border-sky-500/30 hover:bg-sky-500/30";
  }
};

export const getEventsForDay = (events: CalendarEvent[], day: Date): CalendarEvent[] => {
  return events.filter((event) => {
    const start = new Date(event.start);
    const end = new Date(event.end);
    return isSameDay(day, start) || isSameDay(day, end) || isWithinInterval(day, { start, end });
  });
};
