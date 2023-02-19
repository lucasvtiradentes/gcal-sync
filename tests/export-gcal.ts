import { readFileSync } from 'fs';

const globalAny: any = global;

const gcalSyncContent = readFileSync('./dist/GcalSync.min.js', { encoding: 'utf-8' });
eval(`globalAny.GcalSync = ${gcalSyncContent}`);

export default globalAny.GcalSync;
