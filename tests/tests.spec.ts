import { configs } from '../resources/configs';
import { ERRORS } from '../src/consts/errors';
import GcalSync from '../src/index';

it('should throw an error when initializing without configs', () => {
  expect(() => {
    const configs = undefined as any;
    new GcalSync(configs);
  }).toThrow(ERRORS.invalid_configs);
});

it('should throw an error when initializing without invalid configs', () => {
  expect(() => {
    const newConfigs = {} as any;
    new GcalSync(newConfigs);
  }).toThrow(ERRORS.invalid_configs);
});

it('should not run on non-GAS environment', () => {
  expect(() => {
    new GcalSync(configs);
  }).toThrow(ERRORS.production_only);
});
