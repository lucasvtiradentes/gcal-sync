class GCal {
  getAllCalendars(onlyNames) {
    const calendars = Calendar.CalendarList.list({ showHidden: true }).items;
    return onlyNames ? calendars.map((cal) => cal.summary) : calendars;
  }

  getAllOwnedCalendars(onlyNames) {
    const owenedCalendars = this.getAllCalendars().filter((cal) => cal.accessRole === 'owner');
    return onlyNames ? owenedCalendars.map((cal) => cal.summary) : owenedCalendars;
  }

  getDefaultCalendar() {
    const defaultCalendar = this.getAllOwnedCalendars().find((cal) => cal.primary === true);
    return defaultCalendar;
  }

  getCalendarByName(calName) {
    const calendar = this.getAllCalendars().find((cal) => cal.summary === calName);
    return calendar;
  }

  getCalendarById(calId) {
    const calendar = this.getAllCalendars().find((cal) => cal.id === calId);
    return calendar;
  }

  createCalendar(calName) {
    if (this.getAllOwnedCalendars(true).includes(calName)) {
      throw new Error(`calendar ${calName} already exists!`);
    }

    let tmpCalendar = Calendar.newCalendar();
    tmpCalendar.summary = calName;
    tmpCalendar.description = 'Created by GAS';
    tmpCalendar.timeZone = Calendar.Settings.get('timezone').value;

    const calendar = Calendar.Calendars.insert(tmpCalendar);
    console.log(`Created the calendar ${calendar.summary}, with the ID ${calendar.id}`);

    return calendar;
  }

  getAllEventsFromCalendar(calendar, parseEvents) {
    const allEvents = Calendar.Events.list(calendar.id, {}).items;
    return parseEvents ? this.parseEvents(allEvents) : allEvents;
  }

  getEventById(calendar, eventId) {
    const event = this.getAllEventsFromCalendar(calendar).find((ev) => ev.id === eventId);
    // const event = Calendar.Events.get(calendar.id, eventId);
    return event;
  }

  addEventToCalendar(calendar, event) {
    const eventObj = {
      summary: event.summary ?? '',
      location: event.location ?? '',
      description: event.description ?? '',
      start: event.start,
      end: event.end,
      attendees: event.attendees ? event.attendees.map((em) => ({ email: em })) : [],
      // prettier-ignore
      reminders: event.reminders.length > 0 ? { useDefault: false, overrides: event.reminders } : { useDefault: true },
      extendedProperties: event.extendedProperties ?? {}
    };

    const eventFinal = Calendar.Events.insert(eventObj, calendar.id);
    console.log(`event ${eventFinal.summary} was added to calendar ${calendar.summary}`);

    return eventFinal;
  }

  moveEventToOtherCalendar(calendar, event, newCalendar) {
    Calendar.Events.move(calendar.id, event.id, newCalendar.id);
    console.log(`event ${event.summary} was moved!`);
  }

  deleteEventFromCalendar(calendar, event) {
    Calendar.Events.remove(calendar.id, event.id);
    console.log(`event ${event.summary} was deleted!`);
  }

  updateEventFromCalendar(calendar, event, updatedProps) {
    let finalObj = {
      ...event,
      ...updatedProps
    };
    console.log(finalObj);
    Calendar.Events.update(finalObj, calendar.id, event.id);
    console.log(`event ${event.summary} was updated!`);
  }

  parseEvents(eventsArr) {
    const parsedEventsArr = eventsArr.map((ev) => this.parseEvent(ev));
    return parsedEventsArr;
  }

  parseEvent(ev) {
    return {
      id: ev.id,
      summary: ev.summary,
      description: ev.description ?? '',
      link: ev.htmlLink,
      attendees: ev.attendees.length > 0 ? ev.attendees : [],
      visibility: ev.visibility,
      dateStart: ev.start,
      dateEnd: ev.end,
      dateCreated: ev.created,
      dateLastUpdated: ev.updated,
      extendedProperties: ev.extendedProperties ?? {}
    };
  }
}

this.GCal = GCal;

// { date: '2023-02-17' }
// { date: '2023-02-18' }
// {
//   private: {
//     MD5: '112,46,65,106,-25,6,82,29,7,-23,57,17,-33,-94,50,62',
//     fromGAS: 'true',
//     id: '63e0f42f107c420a049282f5@calendar.ticktick.com'
//   }
// }
// [
//   { method: 'email', minutes: 24 * 60 },
//   { method: 'popup', minutes: 10 }
// ]

/*

  getAllCalendars(onlyNames) {
    const calendars = CalendarApp.getAllCalendars();
    return onlyNames ? calendars.map((cal) => cal.getName()) : calendars;
  }

  getAllOwnedCalendars(onlyNames) {
    const calendars = this.getAllCalendars();
    return onlyNames ? calendars.map((cal) => cal.getName()) : calendars;
  }

  getDefaultCalendar() {
    return CalendarApp.getDefaultCalendar();
  }

  createCalendar(calName) {
    if (this.getAllOwnedCalendars(true).includes(calName)) {
      throw new Error(`calendar ${calName} already exists!`);
    }

    const calendar = CalendarApp.createCalendar(calName);
    console.log(`Created the calendar ${calendar.getName()}, with the ID ${calendar.getId()}`);
  }

  addEventToCalendar(calendar, event) {
    const eventOptions = {
      location: event.location ?? '',
      description: event.description ?? '',
      guests: event.guests.join(',') ?? '',
      sendInvites: true
    };

    calendar.createEvent(event.name, event.startDate, event.endDate, eventOptions);
  }

  getEventsFromCalendar(calendar, startDate, endDate, parseEvents) {
    const events = calendar.getEvents(startDate, endDate);
    return parseEvents ? this.parseEvents(events) : events;
  }

  parseEvents(eventsArr) {
    const parsedEvents = eventsArr.map((ev) => ({
      id: ev.getId(),
      name: ev.getSummary(),
      description: ev.getDescription(),
      startTime: ev.getStartTime(),
      endTime: ev.getEndTime(),
      location: ev.getLocation(),
      color: ev.getColor(),
      reminders: {
        email: ev.getEmailReminders(),
        sms: ev.getSmsReminders(),
        popup: ev.getPopupReminders()
      },
      guests: ev.getGuests(),
      dateCreated: ev.getDateCreated(),
      dateLastUpdate: ev.getLastUpdated(),
      isRecurring: ev.isRecurringEvent(),
      isAllDayEvent: ev.isAllDayEvent()
    }));

    return parsedEvents;
  }

*/
