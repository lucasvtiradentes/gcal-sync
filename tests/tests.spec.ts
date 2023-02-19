import GcalSync from './export-gcal';
import { gcalSyncConfig } from './gcal-config';

it('should throw an error when initializing without configs', () => {
  expect(() => {
    new GcalSync();
  }).toThrow('You must specify the settings when starting the class');
});

it('should not throw an error when initializing with valid configs', () => {
  expect(new GcalSync(gcalSyncConfig)).toHaveProperty('APPNAME');
});
