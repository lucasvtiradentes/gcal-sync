function install(){
  //Delete any already existing triggers so we don't create excessive triggers
  deleteAllTriggers();

  //Schedule sync routine to explicitly repeat and schedule the initial sync
  ScriptApp.newTrigger("startSync").timeBased().everyMinutes(getValidTriggerFrequency(howFrequent)).create();
  ScriptApp.newTrigger("startSync").timeBased().after(1000).create();

  //Schedule sync routine to look for update once per day
  ScriptApp.newTrigger("checkForUpdate").timeBased().everyDays(1).create();
}

function uninstall(){
  deleteAllTriggers();
}

/**
 * Removes all triggers for the script's 'startSync' and 'install' function.
 */
function deleteAllTriggers(){
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++){
    if (["startSync","install","main","checkForUpdate"].includes(triggers[i].getHandlerFunction())){
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
}

/**
 * Takes an intended frequency in minutes and adjusts it to be the closest
 * acceptable value to use Google "everyMinutes" trigger setting (i.e. one of
 * the following values: 1, 5, 10, 15, 30).
 *
 * @param {?integer} The manually set frequency that the user intends to set.
 * @return {integer} The closest valid value to the intended frequency setting. Defaulting to 15 if no valid input is provided.
 */
function getValidTriggerFrequency(origFrequency) {
  if (!origFrequency > 0) {
    Logger.log("No valid frequency specified. Defaulting to 15 minutes.");
    return 15;
  }

  var adjFrequency = Math.round(origFrequency/5) * 5; // Set the number to be the closest divisible-by-5
  adjFrequency = Math.max(adjFrequency, 1); // Make sure the number is at least 1 (0 is not valid for the trigger)
  adjFrequency = Math.min(adjFrequency, 15); // Make sure the number is at most 15 (will check for the 30 value below)

  if((adjFrequency == 15) && (Math.abs(origFrequency-30) < Math.abs(origFrequency-15)))
    adjFrequency = 30; // If we adjusted to 15, but the original number is actually closer to 30, set it to 30 instead

  Logger.log("Intended frequency = "+origFrequency+", Adjusted frequency = "+adjFrequency);
  return adjFrequency;
}

/**
 * Checks for a new version of the script at https://github.com/derekantrican/GAS-ICS-Sync/releases.
 * Will notify the user once if a new version was released.
 */
function checkForUpdate(){
  // No need to check if we can't alert anyway
  if (email == "")
    return;

  var lastAlertedVersion = PropertiesService.getScriptProperties().getProperty("alertedForNewVersion");
  try {
    var thisVersion = 5.7;
    var latestVersion = getLatestVersion();

    if (latestVersion > thisVersion && latestVersion != lastAlertedVersion){
      MailApp.sendEmail(email,
        `Version ${latestVersion} of GAS-ICS-Sync is available! (You have ${thisVersion})`,
        "You can see the latest release here: https://github.com/derekantrican/GAS-ICS-Sync/releases");

      PropertiesService.getScriptProperties().setProperty("alertedForNewVersion", latestVersion);
    }
  }
  catch (e){}

  function getLatestVersion(){
    var json_encoded = UrlFetchApp.fetch("https://api.github.com/repos/derekantrican/GAS-ICS-Sync/releases?per_page=1");
    var json_decoded = JSON.parse(json_encoded);
    var version = json_decoded[0]["tag_name"];
    return Number(version);
  }
}