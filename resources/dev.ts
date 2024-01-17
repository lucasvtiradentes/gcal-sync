import GcalSync from '../src/index';
import { configs } from './configs';

const gcalsync = new GcalSync(configs);
gcalsync.sync();

// gcalsync.sync();
// gcalsync.showTodayEventsStats();
// gcalsync.cleanTodayEventsStats();
// gcalsync.installGcalSync();
// gcalsync.uninstallGcalSync();
