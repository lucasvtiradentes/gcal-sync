class TickSync {
  #ICAL_KEYS = ['Time', 'parse', 'Component', 'helpers', 'TimezoneService', 'Event', 'RecurExpansion'];
  #CONFIG_KEYS = ['email', 'githubUsername', 'icsTasksCalendars', 'gcalCompletedTasksCalendar', 'options'];
  #OPTIONS_KEYS = [
    'getOnlyFutureEvents',
    'defaultMaxRetries',
    'addEventsToCalendar',
    'modifyExistingEvents',
    'removeEventsFromCalendar',
    'emailSummary',
    'addAttendees',
    'defaultAllDayReminder',
    'overrideVisibility',
    'addTasks',
    'addAlerts',
    'addOrganizerToTitle',
    'descriptionAsTitles',
    'addCalToTitle'
  ];

  #TZIDS = this.#getTzidsArr();
  #TZID_REPLACE = this.#getTzidReplaceArr();

  constructor(configs, icalLib) {
    this.#validateConfigs(configs);
    this.#validateIcalLib(icalLib);

    this.ical = icalLib;
    this.configs = configs;
    this.startUpdateTime = this.configs.options.getOnlyFutureEvents ? new this.ical.Time.fromJSDate(new Date()) : '';
  }

  #validateIcalLib(icalLib) {
    this.#ICAL_KEYS.forEach((key) => {
      if (Object.keys(icalLib).findIndex((configKey) => configKey === key) === -1) {
        throw new Error(`missing ical key: [${key}]`);
      }
    });
  }

  #validateConfigs(configs) {
    this.#CONFIG_KEYS.forEach((key) => {
      if (Object.keys(configs).findIndex((configKey) => configKey === key) === -1) {
        throw new Error(`missing config key: [${key}]`);
      }
    });

    const options = configs['options'];
    this.#OPTIONS_KEYS.forEach((key) => {
      if (Object.keys(options).findIndex((optionKey) => optionKey === key) === -1) {
        throw new Error(`missing option key: [${key}]`);
      }
    });
  }

  /* ============================================================================================ */

  #condenseCalendarMap(calendarMap) {
    let result = [];

    for (let mapping of calendarMap) {
      let index = -1;

      for (let i = 0; i < result.length; i++) {
        if (result[i][0] == mapping[1]) {
          index = i;
          break;
        }
      }

      if (index > -1) {
        result[index][1].push([mapping[0], mapping[2]]);
      } else {
        result.push([mapping[1], [[mapping[0], mapping[2]]]]);
      }
    }

    return result;
  }

  #fetchSourceCalendars(sourceCalendarURLs) {
    let result = [];
    for (let source of sourceCalendarURLs) {
      let url = source[0].replace('webcal://', 'https://');
      let colorId = source[1];

      this.#callWithBackoff(function () {
        let urlResponse = UrlFetchApp.fetch(url, {
          validateHttpsCertificates: false,
          muteHttpExceptions: true
        });
        if (urlResponse.getResponseCode() == 200) {
          let urlContent = RegExp('(BEGIN:VCALENDAR.*?END:VCALENDAR)', 's').exec(urlResponse.getContentText());
          if (urlContent == null) {
            console.log('[ERROR] Incorrect ics/ical URL: ' + url);
            return;
          } else {
            result.push([urlContent[0], colorId]);
            return;
          }
        } else {
          //Throw here to make callWithBackoff run again
          throw 'Error: Encountered HTTP error ' + urlResponse.getResponseCode() + ' when accessing ' + url;
        }
      }, this.configs.options.defaultMaxRetries);
    }

    return result;
  }

  #callWithBackoff(func, maxRetries) {
    const backoffRecoverableErrors = ['service invoked too many times in a short time', 'rate limit exceeded', 'internal error'];
    var tries = 0;
    var result;
    while (tries <= maxRetries) {
      tries++;
      try {
        result = func();
        return result;
      } catch (err) {
        const error = err.message; // || err;
        if (error.indexOf('HTTP error') > -1) {
          console.log(error);
          return null;
        } else if (
          error.indexOf('is not a function') > -1 ||
          !backoffRecoverableErrors.some(function (e) {
            return err.toLowerCase().indexOf(e) > -1;
          })
        ) {
          throw err;
        } else if (tries > maxRetries) {
          console.log(`Error, giving up after trying ${maxRetries} times [${err}]`);
          return null;
        } else {
          console.log('Error, Retrying... [' + err + ']');
          Utilities.sleep(Math.pow(2, tries) * 100) + Math.round(Math.random() * 100);
        }
      }
    }
    return null;
  }

  #setupTargetCalendar(targetCalendarName) {
    var targetCalendar = Calendar.CalendarList.list({
      showHidden: true,
      maxResults: 250
    }).items.filter(function (cal) {
      return (cal.summaryOverride || cal.summary) == targetCalendarName && (cal.accessRole == 'owner' || cal.accessRole == 'writer');
    })[0];

    if (targetCalendar == null) {
      console.log('Creating Calendar: ' + targetCalendarName);
      targetCalendar = Calendar.newCalendar();
      targetCalendar.summary = targetCalendarName;
      targetCalendar.description = 'Created by GAS';
      targetCalendar.timeZone = Calendar.Settings.get('timezone').value;
      targetCalendar = Calendar.Calendars.insert(targetCalendar);
    }

    return targetCalendar;
  }

  #parseResponses(responses) {
    let icsEventsIds = [];
    var result = [];

    for (var itm of responses) {
      var resp = itm[0];
      var colorId = itm[1];
      var jcalData = this.ical.parse(resp);
      var component = new this.ical.Component(jcalData);

      this.ical.helpers.updateTimezones(component);
      var vtimezones = component.getAllSubcomponents('vtimezone');
      for (var tz of vtimezones) {
        this.ical.TimezoneService.register(tz);
      }

      var allEvents = component.getAllSubcomponents('vevent');
      if (colorId != undefined)
        allEvents.forEach(function (event) {
          event.addPropertyWithValue('color', colorId);
        });

      var calName = component.getFirstPropertyValue('x-wr-calname') || component.getFirstPropertyValue('name');
      if (calName != null)
        allEvents.forEach(function (event) {
          event.addPropertyWithValue('parentCal', calName);
        });

      result = [].concat(allEvents, result);
    }

    if (this.configs.options.getOnlyFutureEvents) {
      result = result.filter(function (event) {
        try {
          if (event.hasProperty('recurrence-id') || event.hasProperty('rrule') || event.hasProperty('rdate') || event.hasProperty('exdate')) {
            //Keep recurrences to properly filter them later on
            return true;
          }
          var eventEnde;
          eventEnde = new this.ical.Time.fromString(event.getFirstPropertyValue('dtend').toString(), event.getFirstProperty('dtend'));
          return eventEnde.compare(this.startUpdateTime) >= 0;
        } catch (e) {
          return true;
        }
      });
    }

    //No need to process calcelled events as they will be added to gcal's trash anyway
    result = result.filter(function (event) {
      try {
        return event.getFirstPropertyValue('status').toString().toLowerCase() != 'cancelled';
      } catch (e) {
        return true;
      }
    });

    result.forEach(function (event) {
      if (!event.hasProperty('uid')) {
        event.updatePropertyWithValue('uid', Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, event.toString()).toString());
      }
      if (event.hasProperty('recurrence-id')) {
        var recID = new this.ical.Time.fromString(event.getFirstPropertyValue('recurrence-id').toString(), event.getFirstProperty('recurrence-id'));
        var recUTC = recID.convertToZone(this.ical.TimezoneService.get('UTC')).toString();

        icsEventsIds.push(event.getFirstPropertyValue('uid').toString() + '_' + recUTC);
      } else {
        icsEventsIds.push(event.getFirstPropertyValue('uid').toString());
      }
    });

    return [result, icsEventsIds];
  }

  #processEvent(event, calendarTz, curCalendarObj) {
    let addEventsArr = [];
    let modifiedEventsArr = [];

    //------------------------ Create the event object ------------------------
    var newEvent = this.#createEvent(event, calendarTz, curCalendarObj);
    if (!newEvent) return [[], []];

    var index = curCalendarObj.calendarEventsIds.indexOf(newEvent.extendedProperties.private['id']);
    var needsUpdate = index > -1;

    //------------------------ Save instance overrides ------------------------
    //----------- To make sure the parent event is actually created -----------
    if (event.hasProperty('recurrence-id')) {
      console.log('Saving event instance for later: ' + newEvent.recurringEventId);
      curCalendarObj.recurringEvents.push(newEvent);
      return [[], []];
    } else {
      //------------------------ Send event object to gcal ------------------------
      if (needsUpdate) {
        if (this.configs.options.modifyExistingEvents) {
          console.log('Updating existing event ' + newEvent.extendedProperties.private['id']);
          newEvent = this.#callWithBackoff(function () {
            return Calendar.Events.update(newEvent, curCalendarObj.targetCalendarId, curCalendarObj.calendarEvents[index].id);
          }, this.configs.options.defaultMaxRetries);

          if (newEvent !== null && this.configs.options.emailSummary) {
            modifiedEventsArr.push([[newEvent.summary, newEvent.start.date || newEvent.start.dateTime], curCalendarObj.targetCalendarName]);
          }
        }
      } else {
        if (this.configs.options.addEventsToCalendar) {
          console.log('Adding new event ' + newEvent.extendedProperties.private['id']);
          newEvent = this.#callWithBackoff(function () {
            return Calendar.Events.insert(newEvent, curCalendarObj.targetCalendarId);
          }, this.configs.options.defaultMaxRetries);

          if (newEvent !== null && this.configs.options.emailSummary) {
            addEventsArr.push([[newEvent.summary, newEvent.start.date || newEvent.start.dateTime], curCalendarObj.targetCalendarName]);
          }
        }
      }
    }

    return [addEventsArr, modifiedEventsArr];
  }

  #createEvent(event, calendarTz, curCalendarObj) {
    event.removeProperty('dtstamp');
    var icalEvent = new this.ical.Event(event, { strictExceptions: true });
    if (this.configs.options.getOnlyFutureEvents && this.#checkSkipEvent(event, icalEvent, curCalendarObj)) {
      return;
    }

    var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, icalEvent.toString()).toString();

    if (curCalendarObj.calendarEventsMD5s.indexOf(digest) >= 0) {
      console.log('Skipping unchanged Event ' + event.getFirstPropertyValue('uid').toString());
      return;
    }

    var newEvent = this.#callWithBackoff(function () {
      return Calendar.newEvent();
    }, this.configs.options.defaultMaxRetries);

    if (icalEvent.startDate.isDate) {
      //All-day event
      if (icalEvent.startDate.compare(icalEvent.endDate) == 0) {
        //Adjust dtend in case dtstart equals dtend as this is not valid for allday events
        icalEvent.endDate = icalEvent.endDate.adjust(1, 0, 0, 0);
      }

      newEvent = {
        start: { date: icalEvent.startDate.toString() },
        end: { date: icalEvent.endDate.toString() }
      };
    } else {
      //Normal (not all-day) event
      var tzid = icalEvent.startDate.timezone;
      if (this.#TZIDS.indexOf(tzid) == -1) {
        var oldTzid = tzid;
        if (tzid in this.#TZID_REPLACE) {
          tzid = this.#TZID_REPLACE[tzid];
        } else {
          //floating time
          tzid = calendarTz;
        }

        console.log('Converting ICS timezone ' + oldTzid + ' to Google Calendar (IANA) timezone ' + tzid);
      }

      newEvent = {
        start: {
          dateTime: icalEvent.startDate.toString(),
          timeZone: tzid
        },
        end: {
          dateTime: icalEvent.endDate.toString(),
          timeZone: tzid
        }
      };
    }

    if (this.configs.options.addAttendees && event.hasProperty('attendee')) {
      newEvent.attendees = [];
      for (var att of icalEvent.attendees) {
        var mail = this.#parseAttendeeMail(att.toICALString());
        if (mail != null) {
          var newAttendee = { email: mail };

          var name = this.#parseAttendeeName(att.toICALString());
          if (name != null) newAttendee['displayName'] = name;

          var resp = this.#parseAttendeeResp(att.toICALString());
          if (resp != null) newAttendee['responseStatus'] = resp;

          newEvent.attendees.push(newAttendee);
        }
      }
    }

    if (event.hasProperty('status')) {
      var status = event.getFirstPropertyValue('status').toString().toLowerCase();
      if (['confirmed', 'tentative', 'cancelled'].indexOf(status) > -1) newEvent.status = status;
    }

    if (event.hasProperty('url') && event.getFirstPropertyValue('url').toString().substring(0, 4) == 'http') {
      newEvent.source = this.#callWithBackoff(function () {
        return Calendar.newEventSource();
      }, this.configs.options.defaultMaxRetries);
      newEvent.source.url = event.getFirstPropertyValue('url').toString();
      newEvent.source.title = 'link';
    }

    if (event.hasProperty('sequence')) {
      //newEvent.sequence = icalEvent.sequence; Currently disabled as it is causing issues with recurrence exceptions
    }

    if (this.configs.options.descriptionAsTitles && event.hasProperty('description')) newEvent.summary = icalEvent.description;
    else if (event.hasProperty('summary')) newEvent.summary = icalEvent.summary;

    if (this.configs.options.addOrganizerToTitle && event.hasProperty('organizer')) {
      var organizer = event.getFirstProperty('organizer').getParameter('cn').toString();
      if (organizer != null) newEvent.summary = organizer + ': ' + newEvent.summary;
    }

    if (this.configs.options.addCalToTitle && event.hasProperty('parentCal')) {
      var calName = event.getFirstPropertyValue('parentCal');
      newEvent.summary = '(' + calName + ') ' + newEvent.summary;
    }

    if (event.hasProperty('description')) newEvent.description = icalEvent.description;

    if (event.hasProperty('location')) newEvent.location = icalEvent.location;

    var validVisibilityValues = ['default', 'public', 'private', 'confidential'];
    if (validVisibilityValues.includes(this.configs.options.overrideVisibility.toLowerCase())) {
      newEvent.visibility = this.configs.options.overrideVisibility.toLowerCase();
    } else if (event.hasProperty('class')) {
      var classString = event.getFirstPropertyValue('class').toString().toLowerCase();
      if (validVisibilityValues.includes(classString)) newEvent.visibility = classString;
    }

    if (event.hasProperty('transp')) {
      var transparency = event.getFirstPropertyValue('transp').toString().toLowerCase();
      if (['opaque', 'transparent'].indexOf(transparency) > -1) newEvent.transparency = transparency;
    }

    if (icalEvent.startDate.isDate) {
      if (0 <= this.configs.options.defaultAllDayReminder && this.configs.options.defaultAllDayReminder <= 40320) {
        newEvent.reminders = {
          useDefault: false,
          overrides: [{ method: 'popup', minutes: this.configs.options.defaultAllDayReminder }]
        }; //reminder as defined by the user
      } else {
        newEvent.reminders = { useDefault: false, overrides: [] }; //no reminder
      }
    } else {
      newEvent.reminders = { useDefault: true, overrides: [] }; //will set the default reminders as set at calendar.google.com
    }

    switch (this.configs.options.addAlerts) {
      case 'yes':
        var valarms = event.getAllSubcomponents('valarm');
        if (valarms.length > 0) {
          var overrides = [];
          for (var valarm of valarms) {
            var trigger = valarm.getFirstPropertyValue('trigger').toString();
            try {
              var alarmTime = new this.ical.Time.fromString(trigger);
              trigger = alarmTime.subtractDateTz(icalEvent.startDate).toString();
            } catch (e) {
              console.log(`error1: ${e.message}`);
            }
            if (overrides.length < 5) {
              //Google supports max 5 reminder-overrides
              var timer = this.#parseNotificationTime(trigger);
              if (0 <= timer && timer <= 40320) overrides.push({ method: 'popup', minutes: timer });
            }
          }

          if (overrides.length > 0) {
            newEvent.reminders = {
              useDefault: false,
              overrides: overrides
            };
          }
        }
        break;
      case 'no':
        newEvent.reminders = {
          useDefault: false,
          overrides: []
        };
        break;
      default:
      case 'default':
        newEvent.reminders = {
          useDefault: true,
          overrides: []
        };
        break;
    }

    if (icalEvent.isRecurring()) {
      // Calculate targetTZ's UTC-Offset
      var calendarUTCOffset = 0;
      var jsTime = new Date();
      var utcTime = new Date(Utilities.formatDate(jsTime, 'Etc/GMT', 'HH:mm:ss MM/dd/yyyy'));
      var tgtTime = new Date(Utilities.formatDate(jsTime, calendarTz, 'HH:mm:ss MM/dd/yyyy'));
      calendarUTCOffset = tgtTime - utcTime;
      newEvent.recurrence = this.#parseRecurrenceRule(event, calendarUTCOffset);
    }

    newEvent.extendedProperties = {
      private: { MD5: digest, fromGAS: 'true', id: icalEvent.uid }
    };

    if (event.hasProperty('recurrence-id')) {
      var recID = new this.ical.Time.fromString(event.getFirstPropertyValue('recurrence-id').toString(), event.getFirstProperty('recurrence-id'));
      newEvent.recurringEventId = recID.convertToZone(this.ical.TimezoneService.get('UTC')).toString();
      newEvent.extendedProperties.private['rec-id'] = newEvent.extendedProperties.private['id'] + '_' + newEvent.recurringEventId;
    }

    if (event.hasProperty('color')) {
      newEvent.colorId = event.getFirstPropertyValue('color').toString();
    }

    return newEvent;
  }

  #parseNotificationTime(notificationString) {
    //https://www.kanzaki.com/docs/ical/duration-t.html
    var reminderTime = 0;

    //We will assume all notifications are BEFORE the event
    if (notificationString[0] == '+' || notificationString[0] == '-') notificationString = notificationString.substr(1);

    notificationString = notificationString.substr(1); //Remove "P" character

    var minuteMatch = RegExp('\\d+M', 'g').exec(notificationString);
    var hourMatch = RegExp('\\d+H', 'g').exec(notificationString);
    var dayMatch = RegExp('\\d+D', 'g').exec(notificationString);
    var weekMatch = RegExp('\\d+W', 'g').exec(notificationString);

    if (weekMatch != null) {
      reminderTime += parseInt(weekMatch[0].slice(0, -1)) & (7 * 24 * 60); //Remove the "W" off the end

      return reminderTime; //Return the notification time in minutes
    } else {
      if (minuteMatch != null) reminderTime += parseInt(minuteMatch[0].slice(0, -1)); //Remove the "M" off the end

      if (hourMatch != null) reminderTime += parseInt(hourMatch[0].slice(0, -1)) * 60; //Remove the "H" off the end

      if (dayMatch != null) reminderTime += parseInt(dayMatch[0].slice(0, -1)) * 24 * 60; //Remove the "D" off the end

      return reminderTime; //Return the notification time in minutes
    }
  }

  #parseAttendeeResp(veventString) {
    var respMatch = RegExp('(partstat=)([^;$:]*)', 'gi').exec(veventString);
    if (respMatch != null && respMatch.length > 1) {
      if (['NEEDS-ACTION'].indexOf(respMatch[2].toUpperCase()) > -1) {
        respMatch[2] = 'needsAction';
      } else if (['ACCEPTED', 'COMPLETED'].indexOf(respMatch[2].toUpperCase()) > -1) {
        respMatch[2] = 'accepted';
      } else if (['DECLINED'].indexOf(respMatch[2].toUpperCase()) > -1) {
        respMatch[2] = 'declined';
      } else if (['DELEGATED', 'IN-PROCESS', 'TENTATIVE'].indexOf(respMatch[2].toUpperCase())) {
        respMatch[2] = 'tentative';
      } else {
        respMatch[2] = null;
      }
      return respMatch[2];
    } else {
      return null;
    }
  }

  #parseAttendeeName(veventString) {
    var nameMatch = RegExp('(cn=)([^;$:]*)', 'gi').exec(veventString);
    if (nameMatch != null && nameMatch.length > 1) return nameMatch[2];
    else return null;
  }

  #parseAttendeeMail(veventString) {
    var mailMatch = RegExp('(:mailto:)([^;$:]*)', 'gi').exec(veventString);
    if (mailMatch != null && mailMatch.length > 1) return mailMatch[2];
    else return null;
  }

  #checkSkipEvent(event, icalEvent, curCalendarObj) {
    if (icalEvent.isRecurrenceException()) {
      if (icalEvent.startDate.compare(this.startUpdateTime) < 0 && icalEvent.recurrenceId.compare(this.startUpdateTime) < 0) {
        console.log('Skipping past recurrence exception');
        return true;
      }
    } else if (icalEvent.isRecurring()) {
      var skip = false; //Indicates if the recurring event and all its instances are in the past
      if (icalEvent.endDate.compare(this.startUpdateTime) < 0) {
        //Parenting recurring event is in the past
        var dtstart = event.getFirstPropertyValue('dtstart');
        var expand = new this.ical.RecurExpansion({
          component: event,
          dtstart: dtstart
        });
        var next;
        var newStartDate;
        var countskipped = 0;
        while ((next = expand.next())) {
          const diff = next.subtractDate(icalEvent.startDate);
          var tempEnd = icalEvent.endDate.clone();
          tempEnd.addDuration(diff);
          if (tempEnd.compare(this.startUpdateTime) < 0) {
            countskipped++;
            continue;
          }

          newStartDate = next;
          break;
        }

        if (newStartDate != null) {
          //At least one instance is in the future
          newStartDate.timezone = icalEvent.startDate.timezone;
          const diff = newStartDate.subtractDate(icalEvent.startDate);
          icalEvent.endDate.addDuration(diff);
          var newEndDate = icalEvent.endDate;
          icalEvent.endDate = newEndDate;
          icalEvent.startDate = newStartDate;

          var rrule = event.getFirstProperty('rrule');
          var recur = rrule.getFirstValue();
          if (recur.isByCount()) {
            recur.count -= countskipped;
            rrule.setValue(recur);
          }

          var exDates = event.getAllProperties('exdate');
          exDates.forEach(function (e) {
            var ex = new this.ical.Time.fromString(e.getFirstValue().toString());
            if (ex < newStartDate) {
              event.removeProperty(e);
            }
          });

          var rdates = event.getAllProperties('rdate');
          rdates.forEach(function (r) {
            var vals = r.getValues();
            vals = vals.filter(function (v) {
              var valTime = new this.ical.Time.fromString(v.toString(), r);
              return valTime.compare(this.startUpdateTime) >= 0 && valTime.compare(icalEvent.startDate) > 0;
            });
            if (vals.length == 0) {
              event.removeProperty(r);
            } else if (vals.length == 1) {
              r.setValue(vals[0]);
            } else if (vals.length > 1) {
              r.setValues(vals);
            }
          });
          console.log('Adjusted RRule/RDate to exclude past instances');
        } else {
          //All instances are in the past
          skip = true;
        }
      }

      //Check and filter recurrence-exceptions
      for (let i = 0; i < icalEvent.except.length; i++) {
        //Exclude the instance if it was moved from future to past
        if (icalEvent.except[i].startDate.compare(this.startUpdateTime) < 0 && icalEvent.except[i].recurrenceId.compare(this.startUpdateTime) >= 0) {
          console.log('Creating EXDATE for exception at ' + icalEvent.except[i].recurrenceId.toString());
          icalEvent.component.addPropertyWithValue('exdate', icalEvent.except[i].recurrenceId.toString());
        } //Re-add the instance if it is moved from past to future
        else if (icalEvent.except[i].startDate.compare(this.startUpdateTime) >= 0 && icalEvent.except[i].recurrenceId.compare(this.startUpdateTime) < 0) {
          console.log('Creating RDATE for exception at ' + icalEvent.except[i].recurrenceId.toString());
          icalEvent.component.addPropertyWithValue('rdate', icalEvent.except[i].recurrenceId.toString());
          skip = false;
        }
      }

      if (skip) {
        //Completely remove the event as all instances of it are in the past
        curCalendarObj.icsEventsIds.splice(curCalendarObj.icsEventsIds.indexOf(event.getFirstPropertyValue('uid').toString()), 1);
        console.log('Skipping past recurring event ' + event.getFirstPropertyValue('uid').toString());
        return true;
      }
    } else {
      //normal events
      if (icalEvent.endDate.compare(this.startUpdateTime) < 0) {
        curCalendarObj.icsEventsIds.splice(curCalendarObj.icsEventsIds.indexOf(event.getFirstPropertyValue('uid').toString()), 1);
        console.log('Skipping previous event ' + event.getFirstPropertyValue('uid').toString());
        return true;
      }
    }
    return false;
  }

  #parseRecurrenceRule(vevent, utcOffset) {
    var recurrenceRules = vevent.getAllProperties('rrule');
    var exRules = vevent.getAllProperties('exrule'); //deprecated, for compatibility only
    var exDates = vevent.getAllProperties('exdate');
    var rDates = vevent.getAllProperties('rdate');

    var recurrence = [];
    for (var recRule of recurrenceRules) {
      var recIcal = recRule.toICALString();
      var adjustedTime;

      var untilMatch = RegExp('(.*)(UNTIL=)(\\d\\d\\d\\d)(\\d\\d)(\\d\\d)T(\\d\\d)(\\d\\d)(\\d\\d)(;.*|\\b)', 'g').exec(recIcal);
      if (untilMatch != null) {
        adjustedTime = new Date(Date.UTC(parseInt(untilMatch[3], 10), parseInt(untilMatch[4], 10) - 1, parseInt(untilMatch[5], 10), parseInt(untilMatch[6], 10), parseInt(untilMatch[7], 10), parseInt(untilMatch[8], 10)));
        adjustedTime = Utilities.formatDate(new Date(adjustedTime - utcOffset), 'etc/GMT', "YYYYMMdd'T'HHmmss'Z'");
        recIcal = untilMatch[1] + untilMatch[2] + adjustedTime + untilMatch[9];
      }

      recurrence.push(recIcal);
    }

    for (var exRule of exRules) {
      recurrence.push(exRule.toICALString());
    }

    for (var exDate of exDates) {
      recurrence.push(exDate.toICALString());
    }

    for (var rDate of rDates) {
      recurrence.push(rDate.toICALString());
    }

    return recurrence;
  }

  #processEventCleanup(curCalendarObj) {
    let removedEventsArr = [];

    for (let i = 0; i < curCalendarObj.calendarEvents.length; i++) {
      let currentID = curCalendarObj.calendarEventsIds[i];
      let feedIndex = curCalendarObj.icsEventsIds.indexOf(currentID);

      if (feedIndex == -1 && curCalendarObj.calendarEvents[i].recurringEventId == null) {
        console.log('Deleting old event ' + currentID);
        this.#callWithBackoff(function () {
          Calendar.Events.remove(curCalendarObj.targetCalendarId, curCalendarObj.calendarEvents[i].id);
        }, this.configs.options.defaultMaxRetries);

        if (this.configs.options.emailSummary) {
          removedEventsArr.push([[curCalendarObj.calendarEvents[i].summary, curCalendarObj.calendarEvents[i].start.date || curCalendarObj.calendarEvents[i].start.dateTime], curCalendarObj.targetCalendarName]);
        }
      }
    }

    return removedEventsArr;
  }

  #processTasks(responses) {
    var taskLists = Tasks.Tasklists.list().items;
    var taskList = taskLists[0];

    var existingTasks = Tasks.Tasks.list(taskList.id).items || [];
    var existingTasksIds = [];
    console.log('Fetched ' + existingTasks.length + ' existing tasks from ' + taskList.title);
    for (var i = 0; i < existingTasks.length; i++) {
      existingTasksIds[i] = existingTasks[i].id;
    }

    var icsTasksIds = [];
    var vtasks = [];

    for (var resp of responses) {
      var jcalData = this.ical.parse(resp);
      var component = new this.ical.Component(jcalData);

      vtasks = [].concat(component.getAllSubcomponents('vtodo'), vtasks);
    }

    vtasks.forEach(function (task) {
      icsTasksIds.push(task.getFirstPropertyValue('uid').toString());
    });

    console.log('\tProcessing ' + vtasks.length + ' tasks');
    for (var task of vtasks) {
      var newtask = Tasks.newTask();
      newtask.id = task.getFirstPropertyValue('uid').toString();
      newtask.title = task.getFirstPropertyValue('summary').toString();
      var dueDate = task.getFirstPropertyValue('due').toJSDate();
      newtask.due =
        dueDate.getFullYear() +
        '-' +
        ('0' + (dueDate.getMonth() + 1)).slice(-2) +
        '-' +
        ('0' + dueDate.getDate()).slice(-2) +
        'T' +
        ('0' + dueDate.getHours()).slice(-2) +
        ':' +
        ('0' + dueDate.getMinutes()).slice(-2) +
        ':' +
        ('0' + dueDate.getSeconds()).slice(-2) +
        'Z';

      Tasks.Tasks.insert(newtask, taskList.id);
    }
    console.log('\tDone processing tasks');

    //-------------- Remove old Tasks -----------
    // ID can't be used as identifier as the API reassignes a random id at task creation
    if (this.configs.options.removeEventsFromCalendar) {
      console.log('Checking ' + existingTasksIds.length + ' tasks for removal');
      for (let i = 0; i < existingTasksIds.length; i++) {
        var currentID = existingTasks[i].id;
        var feedIndex = icsTasksIds.indexOf(currentID);

        if (feedIndex == -1) {
          console.log('Deleting old task ' + currentID);
          Tasks.Tasks.remove(taskList.id, currentID);
        }
      }

      console.log('Done removing tasks');
    }
    //----------------------------------------------------------------
  }

  #processEventInstance(recEvent, curCalendarObj) {
    console.log('ID: ' + recEvent.extendedProperties.private['id'] + ' | Date: ' + recEvent.recurringEventId);

    var eventInstanceToPatch = this.#callWithBackoff(function () {
      return Calendar.Events.list(curCalendarObj.targetCalendarId, {
        singleEvents: true,
        // privateExtendedProperty: 'fromGAS=true',
        privateExtendedProperty: 'rec-id=' + recEvent.extendedProperties.private['id'] + '_' + recEvent.recurringEventId
      }).items;
    }, this.configs.options.defaultMaxRetries);

    if (eventInstanceToPatch == null || eventInstanceToPatch.length == 0) {
      if (recEvent.recurringEventId.length == 10) {
        recEvent.recurringEventId += 'T00:00:00Z';
      } else if (recEvent.recurringEventId.substr(-1) !== 'Z') {
        recEvent.recurringEventId += 'Z';
      }
      eventInstanceToPatch = this.#callWithBackoff(function () {
        return Calendar.Events.list(curCalendarObj.targetCalendarId, {
          singleEvents: true,
          orderBy: 'startTime',
          maxResults: 1,
          timeMin: recEvent.recurringEventId,
          // privateExtendedProperty: 'fromGAS=true',
          privateExtendedProperty: 'id=' + recEvent.extendedProperties.private['id']
        }).items;
      }, this.configs.options.defaultMaxRetries);
    }

    if (eventInstanceToPatch !== null && eventInstanceToPatch.length == 1) {
      console.log('Updating existing event instance');
      this.#callWithBackoff(function () {
        Calendar.Events.update(recEvent, curCalendarObj.targetCalendarId, eventInstanceToPatch[0].id);
      }, this.configs.options.defaultMaxRetries);
    } else {
      console.log('No Instance matched, adding as new event!');
      this.#callWithBackoff(function () {
        Calendar.Events.insert(recEvent, curCalendarObj.targetCalendarId);
      }, this.configs.options.defaultMaxRetries);
    }
  }

  #sendSummary(curSession) {
    let parsedSession = {};
    let body = '';
    const subject = `GAS-ICS-Sync Execution Summary: ${curSession.addedEvents.length} new, ${curSession.modifiedEvents.length} modified, ${curSession.removedEvents.length} deleted`;
    parsedSession.addedEvents = this.#condenseCalendarMap(curSession.addedEvents);
    parsedSession.modifiedEvents = this.#condenseCalendarMap(curSession.modifiedEvents);
    parsedSession.removedEvents = this.#condenseCalendarMap(curSession.removedEvents);

    body = 'GAS-ICS-Sync made the following changes to your calendar:<br/>';
    for (var tgtCal of parsedSession.addedEvents) {
      body += `<br/>${tgtCal[0]}: ${tgtCal[1].length} added events<br/><ul>`;
      for (const event of tgtCal[1]) {
        const [task, datetime] = event[0];
        body += `<li>${task} at ${datetime}</li>`;
      }
      body += '</ul>';
    }

    for (const tgtCal of parsedSession.modifiedEvents) {
      body += `<br/>${tgtCal[0]}: ${tgtCal[1].length} modified events<br/><ul>`;
      for (const event of tgtCal[1]) {
        const [task, datetime] = event[0];
        body += `<li>${task} at ${datetime}</li>`;
      }
      body += '</ul>';
    }

    for (const tgtCal of parsedSession.removedEvents) {
      body += `<br/>${tgtCal[0]}: ${tgtCal[1].length} removed events<br/><ul>`;
      for (const event of tgtCal[1]) {
        const [task, datetime] = event[0];
        body += `<li>${task} at ${datetime}</li>`;
      }
      body += '</ul>';
    }

    body += "<br/>Do you have any problems or suggestions? Contact us at <a href='https://github.com/lucasvtiradentes/ticktick-gcal-sync'>github</a>.";
    var message = {
      to: this.configs.email,
      subject: subject,
      htmlBody: body,
      name: 'GAS-ICS-Sync'
    };

    MailApp.sendEmail(message);
  }

  /* ============================================================================================ */

  sync() {
    let curSession = {
      addedEvents: [],
      modifiedEvents: [],
      removedEvents: []
    };

    const finalSourceCalendars = this.#condenseCalendarMap(this.configs.icsTasksCalendars);

    for (let itCalendar of finalSourceCalendars) {
      //------------------------ Reset globals ------------------------
      let curCalendarObj = {
        calendarEvents: [],
        calendarEventsIds: [],
        icsEventsIds: [],
        calendarEventsMD5s: [],
        recurringEvents: [],
        targetCalendarName: itCalendar[0],
        targetCalendarId: ''
      };

      let vevents = [];
      //------------------------ Fetch URL items ------------------------
      let sourceCalendarURLs = itCalendar[1];
      let responses = this.#fetchSourceCalendars(sourceCalendarURLs);
      console.log('Syncing ' + responses.length + ' calendars to ' + curCalendarObj.targetCalendarName);

      //------------------------ Get target calendar information------------------------
      let targetCalendar = this.#setupTargetCalendar(curCalendarObj.targetCalendarName);
      curCalendarObj.targetCalendarId = targetCalendar.id;
      console.log('Working on calendar: ' + curCalendarObj.targetCalendarId);

      //------------------------ Parse existing events --------------------------
      if (this.configs.options.addEventsToCalendar || this.configs.options.modifyExistingEvents || this.configs.options.removeEventsFromCalendar) {
        var eventList = this.#callWithBackoff(function () {
          return Calendar.Events.list(curCalendarObj.targetCalendarId, {
            showDeleted: false,
            privateExtendedProperty: 'fromGAS=true',
            maxResults: 2500
          });
        }, this.configs.options.defaultMaxRetries);
        curCalendarObj.calendarEvents = [].concat(curCalendarObj.calendarEvents, eventList.items);
        //loop until we received all events
        while (typeof eventList.nextPageToken !== 'undefined') {
          eventList = this.#callWithBackoff(function () {
            return Calendar.Events.list(curCalendarObj.targetCalendarId, {
              showDeleted: false,
              privateExtendedProperty: 'fromGAS=true',
              maxResults: 2500,
              pageToken: eventList.nextPageToken
            });
          }, this.configs.options.defaultMaxRetries);

          if (eventList != null) {
            curCalendarObj.calendarEvents = [].concat(curCalendarObj.calendarEvents, eventList.items);
          }
        }
        console.log('Fetched ' + curCalendarObj.calendarEvents.length + ' existing events from ' + curCalendarObj.targetCalendarName);
        for (var i = 0; i < curCalendarObj.calendarEvents.length; i++) {
          if (curCalendarObj.calendarEvents[i].extendedProperties != null) {
            curCalendarObj.calendarEventsIds[i] = curCalendarObj.calendarEvents[i].extendedProperties.private['rec-id'] || curCalendarObj.calendarEvents[i].extendedProperties.private['id'];
            curCalendarObj.calendarEventsMD5s[i] = curCalendarObj.calendarEvents[i].extendedProperties.private['MD5'];
          }
        }

        //------------------------ Parse ical events --------------------------
        const [veventsTmp, tmpEventIds] = this.#parseResponses(responses, curCalendarObj.icsEventsIds);
        vevents = veventsTmp;
        curCalendarObj.icsEventsIds = tmpEventIds;
        console.log('Parsed ' + vevents.length + ' events from ical sources');
      }

      //------------------------ Process ical events ------------------------
      if (this.configs.options.addEventsToCalendar || this.configs.options.modifyExistingEvents) {
        console.log('Processing ' + vevents.length + ' events');
        var calendarTz = this.#callWithBackoff(function () {
          return Calendar.Settings.get('timezone').value;
        }, this.configs.options.defaultMaxRetries);

        vevents.forEach((e) => {
          const [addEventsArr, modifiedEventsArr] = this.#processEvent(e, calendarTz, curCalendarObj);
          curSession.addedEvents = curSession.addedEvents.concat(addEventsArr);
          curSession.modifiedEvents = curSession.modifiedEvents.concat(modifiedEventsArr);
        });

        console.log('Done processing events');
      }

      //------------------------ Remove old events from calendar ------------------------
      if (this.configs.options.removeEventsFromCalendar) {
        console.log('Checking ' + curCalendarObj.calendarEvents.length + ' events for removal');
        curSession.removedEvents = this.#processEventCleanup(curCalendarObj);
        console.log('Done checking events for removal');
      }

      //------------------------ Process Tasks ------------------------
      if (this.configs.options.addTasks) {
        this.#processTasks(responses);
      }

      //------------------------ Add Recurring Event Instances ------------------------
      console.log('Processing ' + curCalendarObj.recurringEvents.length + ' Recurrence Instances!');
      for (let recEvent of curCalendarObj.recurringEvents) {
        this.#processEventInstance(recEvent, curCalendarObj);
      }
    }

    if (curSession.addedEvents.length + curSession.modifiedEvents.length + curSession.removedEvents.length > 0 && this.configs.options.emailSummary) {
      this.#sendSummary(curSession);
    }

    console.log('Sync finished!');
  }

  /* ======================================================================== */

  #getTzidsArr() {
    const TZIDS = [
      'Africa/Abidjan',
      'Africa/Accra',
      'Africa/Addis_Ababa',
      'Africa/Algiers',
      'Africa/Asmara',
      'Africa/Bamako',
      'Africa/Bangui',
      'Africa/Banjul',
      'Africa/Bissau',
      'Africa/Blantyre',
      'Africa/Brazzaville',
      'Africa/Bujumbura',
      'Africa/Cairo',
      'Africa/Casablanca',
      'Africa/Ceuta',
      'Africa/Conakry',
      'Africa/Dakar',
      'Africa/Dar_es_Salaam',
      'Africa/Djibouti',
      'Africa/Douala',
      'Africa/El_Aaiun',
      'Africa/Freetown',
      'Africa/Gaborone',
      'Africa/Harare',
      'Africa/Johannesburg',
      'Africa/Juba',
      'Africa/Kampala',
      'Africa/Khartoum',
      'Africa/Kigali',
      'Africa/Kinshasa',
      'Africa/Lagos',
      'Africa/Libreville',
      'Africa/Lome',
      'Africa/Luanda',
      'Africa/Lubumbashi',
      'Africa/Lusaka',
      'Africa/Malabo',
      'Africa/Maputo',
      'Africa/Maseru',
      'Africa/Mbabane',
      'Africa/Mogadishu',
      'Africa/Monrovia',
      'Africa/Nairobi',
      'Africa/Ndjamena',
      'Africa/Niamey',
      'Africa/Nouakchott',
      'Africa/Ouagadougou',
      'Africa/Porto-Novo',
      'Africa/Sao_Tome',
      'Africa/Timbuktu',
      'Africa/Tripoli',
      'Africa/Tunis',
      'Africa/Windhoek',
      'America/Adak',
      'America/Anchorage',
      'America/Anguilla',
      'America/Antigua',
      'America/Araguaina',
      'America/Argentina/Buenos_Aires',
      'America/Argentina/Catamarca',
      'America/Argentina/ComodRivadavia',
      'America/Argentina/Cordoba',
      'America/Argentina/Jujuy',
      'America/Argentina/La_Rioja',
      'America/Argentina/Mendoza',
      'America/Argentina/Rio_Gallegos',
      'America/Argentina/Salta',
      'America/Argentina/San_Juan',
      'America/Argentina/San_Luis',
      'America/Argentina/Tucuman',
      'America/Argentina/Ushuaia',
      'America/Aruba',
      'America/Asuncion',
      'America/Atikokan',
      'America/Atka',
      'America/Bahia',
      'America/Bahia_Banderas',
      'America/Barbados',
      'America/Belem',
      'America/Belize',
      'America/Blanc-Sablon',
      'America/Boa_Vista',
      'America/Bogota',
      'America/Boise',
      'America/Buenos_Aires',
      'America/Cambridge_Bay',
      'America/Campo_Grande',
      'America/Cancun',
      'America/Caracas',
      'America/Catamarca',
      'America/Cayenne',
      'America/Cayman',
      'America/Chicago',
      'America/Chihuahua',
      'America/Coral_Harbour',
      'America/Cordoba',
      'America/Costa_Rica',
      'America/Creston',
      'America/Cuiaba',
      'America/Curacao',
      'America/Danmarkshavn',
      'America/Dawson',
      'America/Dawson_Creek',
      'America/Denver',
      'America/Detroit',
      'America/Dominica',
      'America/Edmonton',
      'America/Eirunepe',
      'America/El_Salvador',
      'America/Ensenada',
      'America/Fort_Nelson',
      'America/Fort_Wayne',
      'America/Fortaleza',
      'America/Glace_Bay',
      'America/Godthab',
      'America/Goose_Bay',
      'America/Grand_Turk',
      'America/Grenada',
      'America/Guadeloupe',
      'America/Guatemala',
      'America/Guayaquil',
      'America/Guyana',
      'America/Halifax',
      'America/Havana',
      'America/Hermosillo',
      'America/Indiana/Indianapolis',
      'America/Indiana/Knox',
      'America/Indiana/Marengo',
      'America/Indiana/Petersburg',
      'America/Indiana/Tell_City',
      'America/Indiana/Vevay',
      'America/Indiana/Vincennes',
      'America/Indiana/Winamac',
      'America/Indianapolis',
      'America/Inuvik',
      'America/Iqaluit',
      'America/Jamaica',
      'America/Jujuy',
      'America/Juneau',
      'America/Kentucky/Louisville',
      'America/Kentucky/Monticello',
      'America/Knox_IN',
      'America/Kralendijk',
      'America/La_Paz',
      'America/Lima',
      'America/Los_Angeles',
      'America/Louisville',
      'America/Lower_Princes',
      'America/Maceio',
      'America/Managua',
      'America/Manaus',
      'America/Marigot',
      'America/Martinique',
      'America/Matamoros',
      'America/Mazatlan',
      'America/Mendoza',
      'America/Menominee',
      'America/Merida',
      'America/Metlakatla',
      'America/Mexico_City',
      'America/Miquelon',
      'America/Moncton',
      'America/Monterrey',
      'America/Montevideo',
      'America/Montreal',
      'America/Montserrat',
      'America/Nassau',
      'America/New_York',
      'America/Nipigon',
      'America/Nome',
      'America/Noronha',
      'America/North_Dakota/Beulah',
      'America/North_Dakota/Center',
      'America/North_Dakota/New_Salem',
      'America/Ojinaga',
      'America/Panama',
      'America/Pangnirtung',
      'America/Paramaribo',
      'America/Phoenix',
      'America/Port_of_Spain',
      'America/Port-au-Prince',
      'America/Porto_Acre',
      'America/Porto_Velho',
      'America/Puerto_Rico',
      'America/Punta_Arenas',
      'America/Rainy_River',
      'America/Rankin_Inlet',
      'America/Recife',
      'America/Regina',
      'America/Resolute',
      'America/Rio_Branco',
      'America/Rosario',
      'America/Santa_Isabel',
      'America/Santarem',
      'America/Santiago',
      'America/Santo_Domingo',
      'America/Sao_Paulo',
      'America/Scoresbysund',
      'America/Shiprock',
      'America/Sitka',
      'America/St_Barthelemy',
      'America/St_Johns',
      'America/St_Kitts',
      'America/St_Lucia',
      'America/St_Thomas',
      'America/St_Vincent',
      'America/Swift_Current',
      'America/Tegucigalpa',
      'America/Thule',
      'America/Thunder_Bay',
      'America/Tijuana',
      'America/Toronto',
      'America/Tortola',
      'America/Vancouver',
      'America/Virgin',
      'America/Whitehorse',
      'America/Winnipeg',
      'America/Yakutat',
      'America/Yellowknife',
      'Antarctica/Casey',
      'Antarctica/Davis',
      'Antarctica/DumontDUrville',
      'Antarctica/Macquarie',
      'Antarctica/Mawson',
      'Antarctica/McMurdo',
      'Antarctica/Palmer',
      'Antarctica/Rothera',
      'Antarctica/South_Pole',
      'Antarctica/Syowa',
      'Antarctica/Troll',
      'Antarctica/Vostok',
      'Arctic/Longyearbyen',
      'Asia/Aden',
      'Asia/Almaty',
      'Asia/Amman',
      'Asia/Anadyr',
      'Asia/Aqtau',
      'Asia/Aqtobe',
      'Asia/Ashgabat',
      'Asia/Ashkhabad',
      'Asia/Atyrau',
      'Asia/Baghdad',
      'Asia/Bahrain',
      'Asia/Baku',
      'Asia/Bangkok',
      'Asia/Barnaul',
      'Asia/Beirut',
      'Asia/Bishkek',
      'Asia/Brunei',
      'Asia/Calcutta',
      'Asia/Chita',
      'Asia/Choibalsan',
      'Asia/Chongqing',
      'Asia/Chungking',
      'Asia/Colombo',
      'Asia/Dacca',
      'Asia/Damascus',
      'Asia/Dhaka',
      'Asia/Dili',
      'Asia/Dubai',
      'Asia/Dushanbe',
      'Asia/Famagusta',
      'Asia/Gaza',
      'Asia/Harbin',
      'Asia/Hebron',
      'Asia/Ho_Chi_Minh',
      'Asia/Hong_Kong',
      'Asia/Hovd',
      'Asia/Irkutsk',
      'Asia/Istanbul',
      'Asia/Jakarta',
      'Asia/Jayapura',
      'Asia/Jerusalem',
      'Asia/Kabul',
      'Asia/Kamchatka',
      'Asia/Karachi',
      'Asia/Kashgar',
      'Asia/Kathmandu',
      'Asia/Katmandu',
      'Asia/Khandyga',
      'Asia/Kolkata',
      'Asia/Krasnoyarsk',
      'Asia/Kuala_Lumpur',
      'Asia/Kuching',
      'Asia/Kuwait',
      'Asia/Macao',
      'Asia/Macau',
      'Asia/Magadan',
      'Asia/Makassar',
      'Asia/Manila',
      'Asia/Muscat',
      'Asia/Novokuznetsk',
      'Asia/Novosibirsk',
      'Asia/Omsk',
      'Asia/Oral',
      'Asia/Phnom_Penh',
      'Asia/Pontianak',
      'Asia/Pyongyang',
      'Asia/Qatar',
      'Asia/Qyzylorda',
      'Asia/Rangoon',
      'Asia/Riyadh',
      'Asia/Saigon',
      'Asia/Sakhalin',
      'Asia/Samarkand',
      'Asia/Seoul',
      'Asia/Shanghai',
      'Asia/Singapore',
      'Asia/Srednekolymsk',
      'Asia/Taipei',
      'Asia/Tashkent',
      'Asia/Tbilisi',
      'Asia/Tehran',
      'Asia/Tel_Aviv',
      'Asia/Thimbu',
      'Asia/Thimphu',
      'Asia/Tokyo',
      'Asia/Tomsk',
      'Asia/Ujung_Pandang',
      'Asia/Ulaanbaatar',
      'Asia/Ulan_Bator',
      'Asia/Urumqi',
      'Asia/Ust-Nera',
      'Asia/Vientiane',
      'Asia/Vladivostok',
      'Asia/Yakutsk',
      'Asia/Yangon',
      'Asia/Yekaterinburg',
      'Asia/Yerevan',
      'Atlantic/Azores',
      'Atlantic/Bermuda',
      'Atlantic/Canary',
      'Atlantic/Cape_Verde',
      'Atlantic/Faeroe',
      'Atlantic/Faroe',
      'Atlantic/Jan_Mayen',
      'Atlantic/Madeira',
      'Atlantic/Reykjavik',
      'Atlantic/South_Georgia',
      'Atlantic/St_Helena',
      'Atlantic/Stanley',
      'Australia/ACT',
      'Australia/Adelaide',
      'Australia/Brisbane',
      'Australia/Broken_Hill',
      'Australia/Canberra',
      'Australia/Currie',
      'Australia/Darwin',
      'Australia/Eucla',
      'Australia/Hobart',
      'Australia/LHI',
      'Australia/Lindeman',
      'Australia/Lord_Howe',
      'Australia/Melbourne',
      'Australia/North',
      'Australia/NSW',
      'Australia/Perth',
      'Australia/Queensland',
      'Australia/South',
      'Australia/Sydney',
      'Australia/Tasmania',
      'Australia/Victoria',
      'Australia/West',
      'Australia/Yancowinna',
      'Brazil/Acre',
      'Brazil/DeNoronha',
      'Brazil/East',
      'Brazil/West',
      'Canada/Atlantic',
      'Canada/Central',
      'Canada/Eastern',
      'Canada/Mountain',
      'Canada/Newfoundland',
      'Canada/Pacific',
      'Canada/Saskatchewan',
      'Canada/Yukon',
      'CET',
      'Chile/Continental',
      'Chile/EasterIsland',
      'CST6CDT',
      'Cuba',
      'EET',
      'Egypt',
      'Eire',
      'EST',
      'EST5EDT',
      'Etc/GMT',
      'Etc/GMT+0',
      'Etc/GMT+1',
      'Etc/GMT+10',
      'Etc/GMT+11',
      'Etc/GMT+12',
      'Etc/GMT+2',
      'Etc/GMT+3',
      'Etc/GMT+4',
      'Etc/GMT+5',
      'Etc/GMT+6',
      'Etc/GMT+7',
      'Etc/GMT+8',
      'Etc/GMT+9',
      'Etc/GMT0',
      'Etc/GMT-0',
      'Etc/GMT-1',
      'Etc/GMT-10',
      'Etc/GMT-11',
      'Etc/GMT-12',
      'Etc/GMT-13',
      'Etc/GMT-14',
      'Etc/GMT-2',
      'Etc/GMT-3',
      'Etc/GMT-4',
      'Etc/GMT-5',
      'Etc/GMT-6',
      'Etc/GMT-7',
      'Etc/GMT-8',
      'Etc/GMT-9',
      'Etc/Greenwich',
      'Etc/UCT',
      'Etc/Universal',
      'Etc/UTC',
      'Etc/Zulu',
      'Europe/Amsterdam',
      'Europe/Andorra',
      'Europe/Astrakhan',
      'Europe/Athens',
      'Europe/Belfast',
      'Europe/Belgrade',
      'Europe/Berlin',
      'Europe/Bratislava',
      'Europe/Brussels',
      'Europe/Bucharest',
      'Europe/Budapest',
      'Europe/Busingen',
      'Europe/Chisinau',
      'Europe/Copenhagen',
      'Europe/Dublin',
      'Europe/Gibraltar',
      'Europe/Guernsey',
      'Europe/Helsinki',
      'Europe/Isle_of_Man',
      'Europe/Istanbul',
      'Europe/Jersey',
      'Europe/Kaliningrad',
      'Europe/Kiev',
      'Europe/Kirov',
      'Europe/Lisbon',
      'Europe/Ljubljana',
      'Europe/London',
      'Europe/Luxembourg',
      'Europe/Madrid',
      'Europe/Malta',
      'Europe/Mariehamn',
      'Europe/Minsk',
      'Europe/Monaco',
      'Europe/Moscow',
      'Asia/Nicosia',
      'Europe/Oslo',
      'Europe/Paris',
      'Europe/Podgorica',
      'Europe/Prague',
      'Europe/Riga',
      'Europe/Rome',
      'Europe/Samara',
      'Europe/San_Marino',
      'Europe/Sarajevo',
      'Europe/Saratov',
      'Europe/Simferopol',
      'Europe/Skopje',
      'Europe/Sofia',
      'Europe/Stockholm',
      'Europe/Tallinn',
      'Europe/Tirane',
      'Europe/Tiraspol',
      'Europe/Ulyanovsk',
      'Europe/Uzhgorod',
      'Europe/Vaduz',
      'Europe/Vatican',
      'Europe/Vienna',
      'Europe/Vilnius',
      'Europe/Volgograd',
      'Europe/Warsaw',
      'Europe/Zagreb',
      'Europe/Zaporozhye',
      'Europe/Zurich',
      'GB',
      'GB-Eire',
      'GMT',
      'GMT+0',
      'GMT0',
      'GMT−0',
      'Hongkong',
      'HST',
      'Iceland',
      'Indian/Antananarivo',
      'Indian/Chagos',
      'Indian/Christmas',
      'Indian/Cocos',
      'Indian/Comoro',
      'Indian/Kerguelen',
      'Indian/Mahe',
      'Indian/Maldives',
      'Indian/Mauritius',
      'Indian/Mayotte',
      'Indian/Reunion',
      'Iran',
      'Israel',
      'Jamaica',
      'Japan',
      'Kwajalein',
      'Libya',
      'MET',
      'Mexico/BajaNorte',
      'Mexico/BajaSur',
      'Mexico/General',
      'MST',
      'MST7MDT',
      'Navajo',
      'NZ',
      'NZ-CHAT',
      'Pacific/Apia',
      'Pacific/Auckland',
      'Pacific/Bougainville',
      'Pacific/Chatham',
      'Pacific/Chuuk',
      'Pacific/Easter',
      'Pacific/Efate',
      'Pacific/Enderbury',
      'Pacific/Fakaofo',
      'Pacific/Fiji',
      'Pacific/Funafuti',
      'Pacific/Galapagos',
      'Pacific/Gambier',
      'Pacific/Guadalcanal',
      'Pacific/Guam',
      'Pacific/Honolulu',
      'Pacific/Johnston',
      'Pacific/Kiritimati',
      'Pacific/Kosrae',
      'Pacific/Kwajalein',
      'Pacific/Majuro',
      'Pacific/Marquesas',
      'Pacific/Midway',
      'Pacific/Nauru',
      'Pacific/Niue',
      'Pacific/Norfolk',
      'Pacific/Noumea',
      'Pacific/Pago_Pago',
      'Pacific/Palau',
      'Pacific/Pitcairn',
      'Pacific/Pohnpei',
      'Pacific/Ponape',
      'Pacific/Port_Moresby',
      'Pacific/Rarotonga',
      'Pacific/Saipan',
      'Pacific/Samoa',
      'Pacific/Tahiti',
      'Pacific/Tarawa',
      'Pacific/Tongatapu',
      'Pacific/Truk',
      'Pacific/Wake',
      'Pacific/Wallis',
      'Pacific/Yap',
      'Poland',
      'Portugal',
      'PRC',
      'PST8PDT',
      'ROC',
      'ROK',
      'Singapore',
      'Turkey',
      'UCT',
      'Universal',
      'US/Alaska',
      'US/Aleutian',
      'US/Arizona',
      'US/Central',
      'US/Eastern',
      'US/East-Indiana',
      'US/Hawaii',
      'US/Indiana-Starke',
      'US/Michigan',
      'US/Mountain',
      'US/Pacific',
      'US/Pacific-New',
      'US/Samoa',
      'UTC',
      'WET',
      'W-SU',
      'Zulu'
    ];

    return TZIDS;
  }

  #getTzidReplaceArr() {
    //Windows Timezone names to IANA, according https://github.com/unicode-org/cldr/blob/master/common/supplemental/windowsZones.xml
    const TZID_REPLACE = {
      'Dateline Standard Time': 'Etc/GMT+12',
      'UTC-11': 'Etc/GMT+11',
      'Aleutian Standard Time': 'America/Adak',
      'Hawaiian Standard Time': 'Pacific/Honolulu',
      'Marquesas Standard Time': 'Pacific/Marquesas',
      'Alaskan Standard Time': 'America/Anchorage',
      'UTC-09': 'Pacific/Gambier',
      'Pacific Standard Time (Mexico)': 'America/Tijuana',
      'UTC-08': 'Pacific/Pitcairn',
      'Pacific Standard Time': 'America/Los_Angeles',
      'US Mountain Standard Time': 'America/Phoenix',
      'Mountain Standard Time (Mexico)': 'America/Chihuahua',
      'Mountain Standard Time': 'America/Denver',
      'Central America Standard Time': 'America/Guatemala',
      'Central Standard Time': 'America/Chicago',
      'Easter Island Standard Time': 'Pacific/Easter',
      'Central Standard Time (Mexico)': 'America/Mexico_City',
      'Canada Central Standard Time': 'America/Regina',
      'SA Pacific Standard Time': 'America/Bogota',
      'Eastern Standard Time (Mexico)': 'America/Cancun',
      'Eastern Standard Time': 'America/New_York',
      'Haiti Standard Time': 'America/Port-au-Prince',
      'Cuba Standard Time': 'America/Havana',
      'US Eastern Standard Time': 'America/Indianapolis',
      'Paraguay Standard Time': 'America/Asuncion',
      'Atlantic Standard Time': 'America/Halifax',
      'Venezuela Standard Time': 'America/Caracas',
      'Central Brazilian Standard Time': 'America/Cuiaba',
      'SA Western Standard Time': 'America/La_Paz',
      'Pacific SA Standard Time': 'America/Santiago',
      'Turks And Caicos Standard Time': 'America/Grand_Turk',
      'Newfoundland Standard Time': 'America/St_Johns',
      'Tocantins Standard Time': 'America/Araguaina',
      'E. South America Standard Time': 'America/Sao_Paulo',
      'SA Eastern Standard Time': 'America/Cayenne',
      'Argentina Standard Time': 'America/Buenos_Aires',
      'Greenland Standard Time': 'America/Godthab',
      'Montevideo Standard Time': 'America/Montevideo',
      'Magallanes Standard Time': 'America/Punta_Arenas',
      'Saint Pierre Standard Time': 'America/Miquelon',
      'Bahia Standard Time': 'America/Bahia',
      'UTC-02': 'America/Noronha',
      'Azores Standard Time': 'Atlantic/Azores',
      'Cape Verde Standard Time': 'Atlantic/Cape_Verde',
      UTC: 'Etc/GMT',
      'GMT Standard Time': 'Europe/London',
      'Greenwich Standard Time': 'Atlantic/Reykjavik',
      'W. Europe Standard Time': 'Europe/Berlin',
      'Central Europe Standard Time': 'Europe/Budapest',
      'Romance Standard Time': 'Europe/Paris',
      'Morocco Standard Time': 'Africa/Casablanca',
      'Sao Tome Standard Time': 'Africa/Sao_Tome',
      'Central European Standard Time': 'Europe/Warsaw',
      'W. Central Africa Standard Time': 'Africa/Lagos',
      'Jordan Standard Time': 'Asia/Amman',
      'GTB Standard Time': 'Europe/Bucharest',
      'Middle East Standard Time': 'Asia/Beirut',
      'Egypt Standard Time': 'Africa/Cairo',
      'E. Europe Standard Time': 'Europe/Chisinau',
      'Syria Standard Time': 'Asia/Damascus',
      'West Bank Standard Time': 'Asia/Hebron',
      'South Africa Standard Time': 'Africa/Johannesburg',
      'FLE Standard Time': 'Europe/Kiev',
      'Israel Standard Time': 'Asia/Jerusalem',
      'Kaliningrad Standard Time': 'Europe/Kaliningrad',
      'Sudan Standard Time': 'Africa/Khartoum',
      'Libya Standard Time': 'Africa/Tripoli',
      'Namibia Standard Time': 'Africa/Windhoek',
      'Arabic Standard Time': 'Asia/Baghdad',
      'Turkey Standard Time': 'Europe/Istanbul',
      'Arab Standard Time': 'Asia/Riyadh',
      'Belarus Standard Time': 'Europe/Minsk',
      'Russian Standard Time': 'Europe/Moscow',
      'E. Africa Standard Time': 'Africa/Nairobi',
      'Iran Standard Time': 'Asia/Tehran',
      'Arabian Standard Time': 'Asia/Dubai',
      'Astrakhan Standard Time': 'Europe/Astrakhan',
      'Azerbaijan Standard Time': 'Asia/Baku',
      'Russia Time Zone 3': 'Europe/Samara',
      'Mauritius Standard Time': 'Indian/Mauritius',
      'Saratov Standard Time': 'Europe/Saratov',
      'Georgian Standard Time': 'Asia/Tbilisi',
      'Caucasus Standard Time': 'Asia/Yerevan',
      'Afghanistan Standard Time': 'Asia/Kabul',
      'West Asia Standard Time': 'Asia/Tashkent',
      'Ekaterinburg Standard Time': 'Asia/Yekaterinburg',
      'Pakistan Standard Time': 'Asia/Karachi',
      'India Standard Time': 'Asia/Calcutta',
      'Sri Lanka Standard Time': 'Asia/Colombo',
      'Nepal Standard Time': 'Asia/Katmandu',
      'Central Asia Standard Time': 'Asia/Almaty',
      'Bangladesh Standard Time': 'Asia/Dhaka',
      'Omsk Standard Time': 'Asia/Omsk',
      'Myanmar Standard Time': 'Asia/Rangoon',
      'SE Asia Standard Time': 'Asia/Bangkok',
      'Altai Standard Time': 'Asia/Barnaul',
      'W. Mongolia Standard Time': 'Asia/Hovd',
      'North Asia Standard Time': 'Asia/Krasnoyarsk',
      'N. Central Asia Standard Time': 'Asia/Novosibirsk',
      'Tomsk Standard Time': 'Asia/Tomsk',
      'China Standard Time': 'Asia/Shanghai',
      'North Asia East Standard Time': 'Asia/Irkutsk',
      'Singapore Standard Time': 'Asia/Singapore',
      'W. Australia Standard Time': 'Australia/Perth',
      'Taipei Standard Time': 'Asia/Taipei',
      'Ulaanbaatar Standard Time': 'Asia/Ulaanbaatar',
      'Aus Central W. Standard Time': 'Australia/Eucla',
      'Transbaikal Standard Time': 'Asia/Chita',
      'Tokyo Standard Time': 'Asia/Tokyo',
      'North Korea Standard Time': 'Asia/Pyongyang',
      'Korea Standard Time': 'Asia/Seoul',
      'Yakutsk Standard Time': 'Asia/Yakutsk',
      'Cen. Australia Standard Time': 'Australia/Adelaide',
      'AUS Central Standard Time': 'Australia/Darwin',
      'E. Australia Standard Time': 'Australia/Brisbane',
      'AUS Eastern Standard Time': 'Australia/Sydney',
      'West Pacific Standard Time': 'Pacific/Port_Moresby',
      'Tasmania Standard Time': 'Australia/Hobart',
      'Vladivostok Standard Time': 'Asia/Vladivostok',
      'Lord Howe Standard Time': 'Australia/Lord_Howe',
      'Bougainville Standard Time': 'Pacific/Bougainville',
      'Russia Time Zone 10': 'Asia/Srednekolymsk',
      'Magadan Standard Time': 'Asia/Magadan',
      'Norfolk Standard Time': 'Pacific/Norfolk',
      'Sakhalin Standard Time': 'Asia/Sakhalin',
      'Central Pacific Standard Time': 'Pacific/Guadalcanal',
      'Russia Time Zone 11': 'Asia/Kamchatka',
      'New Zealand Standard Time': 'Pacific/Auckland',
      'UTC+12': 'Pacific/Wallis',
      'Fiji Standard Time': 'Pacific/Fiji',
      'Chatham Islands Standard Time': 'Pacific/Chatham',
      'UTC+13': 'Pacific/Enderbury',
      'Tonga Standard Time': 'Pacific/Tongatapu',
      'Samoa Standard Time': 'Pacific/Apia',
      'Line Islands Standard Time': 'Pacific/Kiritimati',
      Z: 'Etc/GMT'
    };

    return TZID_REPLACE;
  }
}

this.TickSync = TickSync;
