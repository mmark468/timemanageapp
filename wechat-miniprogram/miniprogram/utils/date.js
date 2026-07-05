const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

function pad(value) {
  return String(value).padStart(2, "0");
}

function formatDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function getToday() {
  return formatDate(new Date());
}

function getWeekdayLabel(dateText) {
  return weekdays[new Date(`${dateText}T00:00:00`).getDay()];
}

function getDaysUntil(dateText) {
  const today = new Date(`${getToday()}T00:00:00`);
  const target = new Date(`${dateText}T00:00:00`);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatMonthTitle(dateText) {
  const date = new Date(`${dateText}T00:00:00`);
  return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月`;
}

module.exports = {
  formatDate,
  formatMonthTitle,
  getDaysUntil,
  getToday,
  getWeekdayLabel,
};
