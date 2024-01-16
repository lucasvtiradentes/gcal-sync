export function getDateFixedByTimezone(timeZoneIndex) {
    const date = new Date();
    date.setHours(date.getHours() + timeZoneIndex);
    return date;
}
