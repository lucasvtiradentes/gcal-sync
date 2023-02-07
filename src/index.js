function exportFile(){
  return {
    checkForUpdate,
    startSync,

    condenseCalendarMap,
    fetchSourceCalendars,
    setupTargetCalendar,
    callWithBackoff,
    parseResponses,
    processEvent,
    createEvent
  }
}

/* ========================================================================== */

/**
 * Checks for a new version of the script at https://github.com/derekantrican/GAS-ICS-Sync/releases.
 * Will notify the user once if a new version was released.
 */
function checkForUpdate() {
  // No need to check if we can't alert anyway
  if (email == "") return;

  var lastAlertedVersion = PropertiesService.getScriptProperties().getProperty(
    "alertedForNewVersion"
  );
  try {
    var thisVersion = 5.7;
    var latestVersion = getLatestVersion();

    if (latestVersion > thisVersion && latestVersion != lastAlertedVersion) {
      MailApp.sendEmail(
        email,
        `Version ${latestVersion} of GAS-ICS-Sync is available! (You have ${thisVersion})`,
        "You can see the latest release here: https://github.com/derekantrican/GAS-ICS-Sync/releases"
      );

      PropertiesService.getScriptProperties().setProperty(
        "alertedForNewVersion",
        latestVersion
      );
    }
  } catch (e) {}

  function getLatestVersion() {
    var json_encoded = UrlFetchApp.fetch(
      "https://api.github.com/repos/derekantrican/GAS-ICS-Sync/releases?per_page=1"
    );
    var json_decoded = JSON.parse(json_encoded);
    var version = json_decoded[0]["tag_name"];
    return Number(version);
  }
}

function startSync(){

  /*
  if (PropertiesService.getUserProperties().getProperty('LastRun') > 0 && (new Date().getTime() - PropertiesService.getUserProperties().getProperty('LastRun')) < 360000) {
    Logger.log("Another iteration is currently running! Exiting...");
    return;
  }
  PropertiesService.getUserProperties().setProperty('LastRun', new Date().getTime());
  */

  /*
  if (onlyFutureEvents) startUpdateTime = new ICAL.Time.fromJSDate(new Date());
  emailSummary = emailSummary && email != "";  //Disable email notification if no mail adress is provided
  */

  sourceCalendars = condenseCalendarMap(sourceCalendars);
  for (var calendar of sourceCalendars){
    //------------------------ Reset globals ------------------------
    calendarEvents = [];
    calendarEventsIds = [];
    icsEventsIds = [];
    calendarEventsMD5s = [];
    recurringEvents = [];

    targetCalendarName = calendar[0];
    var sourceCalendarURLs = calendar[1];
    var vevents;

    //------------------------ Fetch URL items ------------------------
    var responses = fetchSourceCalendars(sourceCalendarURLs);
    console.log(responses)
    Logger.log("Syncing " + responses.length + " calendars to " + targetCalendarName);

    //------------------------ Get target calendar information------------------------
    var targetCalendar = setupTargetCalendar(targetCalendarName);
    targetCalendarId = targetCalendar.id;
    Logger.log("Working on calendar: " + targetCalendarId);

    //------------------------ Parse existing events --------------------------
    if(addEventsToCalendar || modifyExistingEvents || removeEventsFromCalendar){
      var eventList =
        callWithBackoff(function(){
            return Calendar.Events.list(targetCalendarId, {showDeleted: false, privateExtendedProperty: "fromGAS=true", maxResults: 2500});
        }, defaultMaxRetries);
      calendarEvents = [].concat(calendarEvents, eventList.items);
      //loop until we received all events
      while(typeof eventList.nextPageToken !== 'undefined'){
        eventList = callWithBackoff(function(){
          return Calendar.Events.list(targetCalendarId, {showDeleted: false, privateExtendedProperty: "fromGAS=true", maxResults: 2500, pageToken: eventList.nextPageToken});
        }, defaultMaxRetries);

        if (eventList != null)
          calendarEvents = [].concat(calendarEvents, eventList.items);
      }
      Logger.log("Fetched " + calendarEvents.length + " existing events from " + targetCalendarName);
      for (var i = 0; i < calendarEvents.length; i++){
        if (calendarEvents[i].extendedProperties != null){
          calendarEventsIds[i] = calendarEvents[i].extendedProperties.private["rec-id"] || calendarEvents[i].extendedProperties.private["id"];
          calendarEventsMD5s[i] = calendarEvents[i].extendedProperties.private["MD5"];
        }
      }

      //------------------------ Parse ical events --------------------------
      vevents = parseResponses(responses, icsEventsIds);
      Logger.log("Parsed " + vevents.length + " events from ical sources");
    }

    //------------------------ Process ical events ------------------------
    if (addEventsToCalendar || modifyExistingEvents){
      Logger.log("Processing " + vevents.length + " events");
      var calendarTz =
        callWithBackoff(function(){
          return Calendar.Settings.get("timezone").value;
        }, defaultMaxRetries);

      vevents.forEach(function(e){
        processEvent(e, calendarTz);
      });

      Logger.log("Done processing events");
    }

    //------------------------ Remove old events from calendar ------------------------
    if(removeEventsFromCalendar){
      Logger.log("Checking " + calendarEvents.length + " events for removal");
      processEventCleanup();
      Logger.log("Done checking events for removal");
    }

    //------------------------ Process Tasks ------------------------
    if (addTasks){
      processTasks(responses);
    }

    //------------------------ Add Recurring Event Instances ------------------------
    Logger.log("Processing " + recurringEvents.length + " Recurrence Instances!");
    for (var recEvent of recurringEvents){
      processEventInstance(recEvent);
    }
  }

  if ((addedEvents.length + modifiedEvents.length + removedEvents.length) > 0 && emailSummary){
    sendSummary();
  }
  Logger.log("Sync finished!");
  /*
    PropertiesService.getUserProperties().setProperty('LastRun', 0);
  */
}

function condenseCalendarMap(calendarMap) {
  var result = [];
  for (var mapping of calendarMap) {
    var index = -1;
    for (var i = 0; i < result.length; i++) {
      if (result[i][0] == mapping[1]) {
        index = i;
        break;
      }
    }

    if (index > -1) result[index][1].push([mapping[0], mapping[2]]);
    else result.push([mapping[1], [[mapping[0], mapping[2]]]]);
  }

  return result;
}

/**
 * Gets the ressource from the specified URLs.
 *
 * @param {Array.string} sourceCalendarURLs - Array with URLs to fetch
 * @return {Array.string} The ressources fetched from the specified URLs
 */
function fetchSourceCalendars(sourceCalendarURLs) {
  var result = [];
  for (var source of sourceCalendarURLs) {
    var url = source[0].replace("webcal://", "https://");
    var colorId = source[1];

    callWithBackoff(function () {
      var urlResponse = UrlFetchApp.fetch(url, {
        validateHttpsCertificates: false,
        muteHttpExceptions: true
      });
      if (urlResponse.getResponseCode() == 200) {
        var urlContent = RegExp("(BEGIN:VCALENDAR.*?END:VCALENDAR)", "s").exec(
          urlResponse.getContentText()
        );
        if (urlContent == null) {
          Logger.log("[ERROR] Incorrect ics/ical URL: " + url);
          return;
        } else {
          result.push([urlContent[0], colorId]);
          return;
        }
      } else {
        //Throw here to make callWithBackoff run again
        throw (
          "Error: Encountered HTTP error " +
          urlResponse.getResponseCode() +
          " when accessing " +
          url
        );
      }
    }, defaultMaxRetries);
  }

  return result;
}

/**
 * Gets the user's Google Calendar with the specified name.
 * A new Calendar will be created if the user does not have a Calendar with the specified name.
 *
 * @param {string} targetCalendarName - The name of the calendar to return
 * @return {Calendar} The calendar retrieved or created
 */
function setupTargetCalendar(targetCalendarName) {
  var targetCalendar = Calendar.CalendarList.list({
    showHidden: true,
    maxResults: 250
  }).items.filter(function (cal) {
    return (
      (cal.summaryOverride || cal.summary) == targetCalendarName &&
      (cal.accessRole == "owner" || cal.accessRole == "writer")
    );
  })[0];

  if (targetCalendar == null) {
    Logger.log("Creating Calendar: " + targetCalendarName);
    targetCalendar = Calendar.newCalendar();
    targetCalendar.summary = targetCalendarName;
    targetCalendar.description = "Created by GAS";
    targetCalendar.timeZone = Calendar.Settings.get("timezone").value;
    targetCalendar = Calendar.Calendars.insert(targetCalendar);
  }

  return targetCalendar;
}

/**
 * Runs the specified function with exponential backoff and returns the result.
 * Will return null if the function did not succeed afterall.
 *
 * @param {function} func - The function that should be executed
 * @param {Number} maxRetries - How many times the function should try if it fails
 * @return {?Calendar.Event} The Calendar.Event that was added in the calendar, null if func did not complete successfully
 */

function callWithBackoff(func, maxRetries) {

  var backoffRecoverableErrors = [
    "service invoked too many times in a short time",
    "rate limit exceeded",
    "internal error"
  ];
  var tries = 0;
  var result;
  while (tries <= maxRetries) {
    tries++;
    try {
      result = func();
      return result;
    } catch (err) {
      err = err.message || err;
      if (err.includes("HTTP error")) {
        Logger.log(err);
        return null;
      } else if (
        err.includes("is not a function") ||
        !backoffRecoverableErrors.some(function (e) {
          return err.toLowerCase().includes(e);
        })
      ) {
        throw err;
      } else if (tries > maxRetries) {
        Logger.log(
          `Error, giving up after trying ${maxRetries} times [${err}]`
        );
        return null;
      } else {
        Logger.log("Error, Retrying... [" + err + "]");
        Utilities.sleep(Math.pow(2, tries) * 100) +
          Math.round(Math.random() * 100);
      }
    }
  }
  return null;
}

/**
 * Parses all sources using ical.js.
 * Registers all found timezones with TimezoneService.
 * Creates an Array with all events and adds the event-ids to the provided Array.
 *
 * @param {Array.string} responses - Array with all ical sources
 * @return {Array.ICALComponent} Array with all events found
 */
function parseResponses(responses) {
  var result = [];
  for (var itm of responses) {
    var resp = itm[0];
    var colorId = itm[1];
    var jcalData = ICAL.parse(resp);
    var component = new ICAL.Component(jcalData);

    ICAL.helpers.updateTimezones(component);
    var vtimezones = component.getAllSubcomponents("vtimezone");
    for (var tz of vtimezones) {
      ICAL.TimezoneService.register(tz);
    }

    var allEvents = component.getAllSubcomponents("vevent");
    if (colorId != undefined)
      allEvents.forEach(function (event) {
        event.addPropertyWithValue("color", colorId);
      });

    var calName =
      component.getFirstPropertyValue("x-wr-calname") ||
      component.getFirstPropertyValue("name");
    if (calName != null)
      allEvents.forEach(function (event) {
        event.addPropertyWithValue("parentCal", calName);
      });

    result = [].concat(allEvents, result);
  }

  if (onlyFutureEvents) {
    result = result.filter(function (event) {
      try {
        if (
          event.hasProperty("recurrence-id") ||
          event.hasProperty("rrule") ||
          event.hasProperty("rdate") ||
          event.hasProperty("exdate")
        ) {
          //Keep recurrences to properly filter them later on
          return true;
        }
        var eventEnde;
        eventEnde = new ICAL.Time.fromString(
          event.getFirstPropertyValue("dtend").toString(),
          event.getFirstProperty("dtend")
        );
        return eventEnde.compare(startUpdateTime) >= 0;
      } catch (e) {
        return true;
      }
    });
  }

  //No need to process calcelled events as they will be added to gcal's trash anyway
  result = result.filter(function (event) {
    try {
      return (
        event.getFirstPropertyValue("status").toString().toLowerCase() !=
        "cancelled"
      );
    } catch (e) {
      return true;
    }
  });

  result.forEach(function (event) {
    if (!event.hasProperty("uid")) {
      event.updatePropertyWithValue(
        "uid",
        Utilities.computeDigest(
          Utilities.DigestAlgorithm.MD5,
          event.toString()
        ).toString()
      );
    }
    if (event.hasProperty("recurrence-id")) {
      var recID = new ICAL.Time.fromString(
        event.getFirstPropertyValue("recurrence-id").toString(),
        event.getFirstProperty("recurrence-id")
      );
      var recUTC = recID
        .convertToZone(ICAL.TimezoneService.get("UTC"))
        .toString();

      icsEventsIds.push(
        event.getFirstPropertyValue("uid").toString() + "_" + recUTC
      );
    } else {
      icsEventsIds.push(event.getFirstPropertyValue("uid").toString());
    }
  });

  return result;
}

/**
 * Creates a Google Calendar event and inserts it to the target calendar.
 *
 * @param {ICAL.Component} event - The event to process
 * @param {string} calendarTz - The timezone of the target calendar
 */
function processEvent(event, calendarTz) {
  //------------------------ Create the event object ------------------------
  var newEvent = createEvent(event, calendarTz);
  if (newEvent == null) return;

  var index = calendarEventsIds.indexOf(
    newEvent.extendedProperties.private["id"]
  );
  var needsUpdate = index > -1;

  //------------------------ Save instance overrides ------------------------
  //----------- To make sure the parent event is actually created -----------
  if (event.hasProperty("recurrence-id")) {
    Logger.log("Saving event instance for later: " + newEvent.recurringEventId);
    recurringEvents.push(newEvent);
    return;
  } else {
    //------------------------ Send event object to gcal ------------------------
    if (needsUpdate) {
      if (modifyExistingEvents) {
        Logger.log(
          "Updating existing event " + newEvent.extendedProperties.private["id"]
        );
        newEvent = callWithBackoff(function () {
          return Calendar.Events.update(
            newEvent,
            targetCalendarId,
            calendarEvents[index].id
          );
        }, defaultMaxRetries);
        if (newEvent != null && emailSummary) {
          modifiedEvents.push([
            [newEvent.summary, newEvent.start.date || newEvent.start.dateTime],
            targetCalendarName
          ]);
        }
      }
    } else {
      if (addEventsToCalendar) {
        Logger.log(
          "Adding new event " + newEvent.extendedProperties.private["id"]
        );
        newEvent = callWithBackoff(function () {
          return Calendar.Events.insert(newEvent, targetCalendarId);
        }, defaultMaxRetries);
        if (newEvent != null && emailSummary) {
          addedEvents.push([
            [newEvent.summary, newEvent.start.date || newEvent.start.dateTime],
            targetCalendarName
          ]);
        }
      }
    }
  }
}

/**
 * Creates a Google Calendar Event based on the specified ICALEvent.
 * Will return null if the event has not changed since the last sync.
 * If onlyFutureEvents is set to true:
 * -It will return null if the event has already taken place.
 * -Past instances of recurring events will be removed
 *
 * @param {ICAL.Component} event - The event to process
 * @param {string} calendarTz - The timezone of the target calendar
 * @return {?Calendar.Event} The Calendar.Event that will be added to the target calendar
 */
function createEvent(event, calendarTz) {
  event.removeProperty("dtstamp");
  var icalEvent = new ICAL.Event(event, {strictExceptions: true});
  if (onlyFutureEvents && checkSkipEvent(event, icalEvent)) {
    return;
  }

  var digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.MD5,
    icalEvent.toString()
  ).toString();
  if (calendarEventsMD5s.indexOf(digest) >= 0) {
    Logger.log(
      "Skipping unchanged Event " +
        event.getFirstPropertyValue("uid").toString()
    );
    return;
  }

  var newEvent = callWithBackoff(function () {
    return Calendar.newEvent();
  }, defaultMaxRetries);
  if (icalEvent.startDate.isDate) {
    //All-day event
    if (icalEvent.startDate.compare(icalEvent.endDate) == 0) {
      //Adjust dtend in case dtstart equals dtend as this is not valid for allday events
      icalEvent.endDate = icalEvent.endDate.adjust(1, 0, 0, 0);
    }

    newEvent = {
      start: {date: icalEvent.startDate.toString()},
      end: {date: icalEvent.endDate.toString()}
    };
  } else {
    //Normal (not all-day) event
    var tzid = icalEvent.startDate.timezone;
    if (tzids.indexOf(tzid) == -1) {
      var oldTzid = tzid;
      if (tzid in tzidreplace) {
        tzid = tzidreplace[tzid];
      } else {
        //floating time
        tzid = calendarTz;
      }

      Logger.log(
        "Converting ICS timezone " +
          oldTzid +
          " to Google Calendar (IANA) timezone " +
          tzid
      );
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

  if (addAttendees && event.hasProperty("attendee")) {
    newEvent.attendees = [];
    for (var att of icalEvent.attendees) {
      var mail = parseAttendeeMail(att.toICALString());
      if (mail != null) {
        var newAttendee = {email: mail};

        var name = parseAttendeeName(att.toICALString());
        if (name != null) newAttendee["displayName"] = name;

        var resp = parseAttendeeResp(att.toICALString());
        if (resp != null) newAttendee["responseStatus"] = resp;

        newEvent.attendees.push(newAttendee);
      }
    }
  }

  if (event.hasProperty("status")) {
    var status = event.getFirstPropertyValue("status").toString().toLowerCase();
    if (["confirmed", "tentative", "cancelled"].indexOf(status) > -1)
      newEvent.status = status;
  }

  if (
    event.hasProperty("url") &&
    event.getFirstPropertyValue("url").toString().substring(0, 4) == "http"
  ) {
    newEvent.source = callWithBackoff(function () {
      return Calendar.newEventSource();
    }, defaultMaxRetries);
    newEvent.source.url = event.getFirstPropertyValue("url").toString();
    newEvent.source.title = "link";
  }

  if (event.hasProperty("sequence")) {
    //newEvent.sequence = icalEvent.sequence; Currently disabled as it is causing issues with recurrence exceptions
  }

  if (descriptionAsTitles && event.hasProperty("description"))
    newEvent.summary = icalEvent.description;
  else if (event.hasProperty("summary")) newEvent.summary = icalEvent.summary;

  if (addOrganizerToTitle && event.hasProperty("organizer")) {
    var organizer = event
      .getFirstProperty("organizer")
      .getParameter("cn")
      .toString();
    if (organizer != null)
      newEvent.summary = organizer + ": " + newEvent.summary;
  }

  if (addCalToTitle && event.hasProperty("parentCal")) {
    var calName = event.getFirstPropertyValue("parentCal");
    newEvent.summary = "(" + calName + ") " + newEvent.summary;
  }

  if (event.hasProperty("description"))
    newEvent.description = icalEvent.description;

  if (event.hasProperty("location")) newEvent.location = icalEvent.location;

  var validVisibilityValues = ["default", "public", "private", "confidential"];
  if (validVisibilityValues.includes(overrideVisibility.toLowerCase())) {
    newEvent.visibility = overrideVisibility.toLowerCase();
  } else if (event.hasProperty("class")) {
    var classString = event
      .getFirstPropertyValue("class")
      .toString()
      .toLowerCase();
    if (validVisibilityValues.includes(classString))
      newEvent.visibility = classString;
  }

  if (event.hasProperty("transp")) {
    var transparency = event
      .getFirstPropertyValue("transp")
      .toString()
      .toLowerCase();
    if (["opaque", "transparent"].indexOf(transparency) > -1)
      newEvent.transparency = transparency;
  }

  if (icalEvent.startDate.isDate) {
    if (0 <= defaultAllDayReminder && defaultAllDayReminder <= 40320) {
      newEvent.reminders = {
        useDefault: false,
        overrides: [{method: "popup", minutes: defaultAllDayReminder}]
      }; //reminder as defined by the user
    } else {
      newEvent.reminders = {useDefault: false, overrides: []}; //no reminder
    }
  } else {
    newEvent.reminders = {useDefault: true, overrides: []}; //will set the default reminders as set at calendar.google.com
  }

  switch (addAlerts) {
    case "yes":
      var valarms = event.getAllSubcomponents("valarm");
      if (valarms.length > 0) {
        var overrides = [];
        for (var valarm of valarms) {
          var trigger = valarm.getFirstPropertyValue("trigger").toString();
          try {
            var alarmTime = new ICAL.Time.fromString(trigger);
            trigger = alarmTime.subtractDateTz(icalEvent.startDate).toString();
          } catch (e) {}
          if (overrides.length < 5) {
            //Google supports max 5 reminder-overrides
            var timer = parseNotificationTime(trigger);
            if (0 <= timer && timer <= 40320)
              overrides.push({method: "popup", minutes: timer});
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
    case "no":
      newEvent.reminders = {
        useDefault: false,
        overrides: []
      };
      break;
    default:
    case "default":
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
    var utcTime = new Date(
      Utilities.formatDate(jsTime, "Etc/GMT", "HH:mm:ss MM/dd/yyyy")
    );
    var tgtTime = new Date(
      Utilities.formatDate(jsTime, calendarTz, "HH:mm:ss MM/dd/yyyy")
    );
    calendarUTCOffset = tgtTime - utcTime;
    newEvent.recurrence = parseRecurrenceRule(event, calendarUTCOffset);
  }

  newEvent.extendedProperties = {
    private: {MD5: digest, fromGAS: "true", id: icalEvent.uid}
  };

  if (event.hasProperty("recurrence-id")) {
    var recID = new ICAL.Time.fromString(
      event.getFirstPropertyValue("recurrence-id").toString(),
      event.getFirstProperty("recurrence-id")
    );
    newEvent.recurringEventId = recID
      .convertToZone(ICAL.TimezoneService.get("UTC"))
      .toString();
    newEvent.extendedProperties.private["rec-id"] =
      newEvent.extendedProperties.private["id"] +
      "_" +
      newEvent.recurringEventId;
  }

  if (event.hasProperty("color")) {
    newEvent.colorId = event.getFirstPropertyValue("color").toString();
  }

  return newEvent;
}
