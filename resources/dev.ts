import GcalSync from '../src/index';
import { configs } from './configs';

const gcalsync = new GcalSync(configs);
console.log(gcalsync);

// gcalsync.sync();
// gcalsync.install();
// gcalsync.uninstall();
// gcalsync.clearTodayEvents();
// gcalsync.showTodayStats();
