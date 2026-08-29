export type CalendarView = "month" | "week" | "day" | "agenda";

export type EventColor = "sky" | "amber" | "violet" | "rose" | "emerald" | "orange";

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: Date | string;
  end: Date | string;
  allDay?: boolean;
  color?: EventColor | string;
  location?: string;
}
