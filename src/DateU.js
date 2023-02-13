// https://bobbyhadz.com/blog/javascript-initialize-date-with-timezone

class DateU {
  getParseDate(date, resultInUTC) {
    return {
      date: resultInUTC ? date.getUTCDate() : date.getDate(),
      month: resultInUTC ? date.getUTCMonth() : date.getMonth(),
      year: resultInUTC ? date.getUTCFullYear() : date.getFullYear(),
      hour: resultInUTC ? date.getUTCHours() : date.getHours(),
      minute: resultInUTC ? date.getUTCMinutes() : date.getMinutes(),
      second: resultInUTC ? date.getUTCSeconds() : date.getSeconds(),
      miliseconds: resultInUTC ? date.getUTCMilliseconds() : date.getMilliseconds()
    };
  }

  convertDateToTimezone(date, timeZone) {
    // 'America/Belem'
    return new Date(date.toLocaleString('en-us', { timeZone }));
  }

  createDateAsUTC(date) {
    return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds()));
  }

  convertDateToUTC(date) {
    return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds());
  }

  parseDatetimeToBrasiliaTimezone(date) {
    return date.toLocaleString('pt-br').replace(', ', '');
  }
}
