class ICal {
  constructor(calendars) {
    this.calendars = calendars;
  }

  #getBetween(str, substr1, substr2) {
    const newStr = str.slice(str.search(substr1)).replace(substr1, '');
    return newStr.slice(0, newStr.search(substr2));
  }

  #parseIcsStringIntoEvents(icalStr) {
    let allEventsArr = [];

    const eventsArr = icalStr.split('BEGIN:VEVENT\r\n').filter((item) => item.search('SUMMARY') > -1);

    for (let event of eventsArr) {
      let eventObj = {
        dtstamp: this.#getBetween(event, 'DTSTAMP:', '\r\n'),
        dtstart: this.#getBetween(event, 'DTSTART;VALUE=DATE:', '\r\n'),
        name: this.#getBetween(event, 'SUMMARY:', '\r\n'),
        id: this.#getBetween(event, 'UID:', '\r\n'),
        description: this.#getBetween(event, 'DESCRIPTION:', '\r\n'),
        sequence: this.#getBetween(event, 'SEQUENCE:', '\r\n'),
        tzid: this.#getBetween(event, 'TZID:', '\r\n')
      };

      allEventsArr.push(eventObj);
    }

    return allEventsArr;
  }

  getEventsFromIcsCalendar(cal) {
    let icalStr = '';

    const url = cal.replace('webcal://', 'https://');
    const urlResponse = UrlFetchApp.fetch(url, { validateHttpsCertificates: false, muteHttpExceptions: true });
    if (urlResponse.getResponseCode() == 200) {
      let urlContent = RegExp('(BEGIN:VCALENDAR.*?END:VCALENDAR)', 's').exec(urlResponse.getContentText());
      if (urlContent == null) {
        throw new Error('[ERROR] Incorrect ics/ical URL: ' + url);
      } else {
        icalStr = urlContent[0];
      }
    } else {
      throw new Error('Error: Encountered HTTP error ' + urlResponse.getResponseCode() + ' when accessing ' + url);
    }

    const eventsArr = this.#parseIcsStringIntoEvents(icalStr);
    return eventsArr;
  }

  getEventsFromAllCalendars() {
    let allEvents = [];
    for (let cal of this.calendars) {
      const curEvents = this.getEventsFromIcsCalendar(cal);
      allEvents = allEvents.concat(curEvents);
    }
    return allEvents;
  }
}

this.ICal = ICal;
