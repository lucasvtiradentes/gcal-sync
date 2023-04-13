import GcalSync from '../src/GcalSync';
import { configs } from '../resources/configs';

it('should throw an error when initializing without configs', () => {
  expect(() => {
    const configs = undefined as any;
    new GcalSync(configs);
  }).toThrow('You must specify the settings when starting the class');
});

it('should not throw an error when initializing with valid configs', () => {
  expect(new GcalSync(configs)).toHaveProperty('APPNAME');
});
