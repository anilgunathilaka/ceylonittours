export function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function startOfDay(d: Date) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function formatDisplayDate(value: string) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export const weekdayLabels = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export interface CalendarCell {
  date: Date;
  inMonth: boolean;
}

export function getMonthGrid(year: number, month: number): CalendarCell[] {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: CalendarCell[] = [];
  for (let i = 0; i < firstWeekday; i++) {
    cells.push({ date: new Date(year, month, i - firstWeekday + 1), inMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), inMonth: true });
  }
  while (cells.length < 42) {
    const lastDate = cells[cells.length - 1].date;
    cells.push({ date: new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate() + 1), inMonth: false });
  }
  return cells;
}
