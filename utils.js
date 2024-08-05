export function padNumberToString(date) {
  return date < 10 ? `0${date}` : date.toString();
}
