export function formatDateValue(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

export const TODAY = formatDateValue(new Date());

export function toDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function daysBetween(from: string, to: string) {
  const fromDate = toDate(from);
  const toDateValue = toDate(to);
  const diff = toDateValue.getTime() - fromDate.getTime();
  return Math.round(diff / 86_400_000);
}

export function daysLeftText(date?: string) {
  if (!date) {
    return "今天";
  }

  const days = daysBetween(TODAY, date);
  if (days === 0) return "今天";
  if (days === 1) return "明天";
  if (days === 2) return "后天";
  if (days > 0 && days <= 6) return `${days}天后`;
  if (days > 0) return `${days}天后`;
  return "已过期";
}

export function formatChineseDate(date: string) {
  const value = toDate(date);
  const weekdays = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
  return `${value.getMonth() + 1}月${value.getDate()}日 ${weekdays[value.getDay()]}`;
}

export function getWeekdayLabel(date: string) {
  const labels = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"] as const;
  return labels[toDate(date).getDay()];
}

export function sameDay(dateA: string, dateB: string) {
  return dateA === dateB;
}

export function minutesToText(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}分钟`;
  if (rest === 0) return `${hours}小时`;
  return `${hours}小时${rest}分钟`;
}

export function getMonthDays(year: number, month: number) {
  const first = new Date(year, month - 1, 1);
  const startWeekday = (first.getDay() + 6) % 7;
  const totalDays = new Date(year, month, 0).getDate();
  const days: Array<string | null> = Array.from({ length: startWeekday }, () => null);

  for (let day = 1; day <= totalDays; day += 1) {
    days.push(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
  }

  while (days.length % 7 !== 0) {
    days.push(null);
  }

  return days;
}
