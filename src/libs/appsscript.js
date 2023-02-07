function exportFile(){
  return {
    appsscript
  }
}

/* ========================================================================== */

function appsscript(){
  console.log("appsscript")
}

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

function deleteAllTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (
      ["startSync", "install", "main", "checkForUpdate"].includes(
        triggers[i].getHandlerFunction()
      )
    ) {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
}
