export function getDateFixedByTimezone(timeZoneIndex: number) {
  const date = new Date();
  date.setHours(date.getHours() + timeZoneIndex);
  return date;
}
