import GcalSync from '../src/GcalSync';
import { configs } from './configs';

const gcalsync = new GcalSync(configs);
console.log(gcalsync);

// gcalsync.sync();
// gcalsync.showTodayEventsStats();
// gcalsync.cleanTodayEventsStats();
// gcalsync.installGcalSync();
// gcalsync.uninstallGcalSync();
