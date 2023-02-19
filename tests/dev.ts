import GcalSync from './export-gcal';
import { gcalSyncConfig } from './gcal-config';

const gcalsync = new GcalSync(gcalSyncConfig);
console.log(gcalsync);

// gcalsync.syncEvents();
// gcalsync.showTodayEventsStats();
// gcalsync.cleanTodayEventsStats();
// gcalsync.installTickSync();
// gcalsync.uninstallTickSync();
