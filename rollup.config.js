/* eslint-disable @typescript-eslint/no-var-requires */

const typescript = require('@rollup/plugin-typescript');
// const typescript = require('rollup-plugin-typescript2');
const terser = require('@rollup/plugin-terser');
const replace = require('@rollup/plugin-replace');
const packageVersion = require('./package').version;

const baseConfigs = {
  input: 'src/index.ts',
  output: {
    file: 'dist/index.js',
    format: 'umd',
    name: 'GcalSync'
  }
};

const basePlugins = [
  replace({
    __ROLL_UP_REPLACE_BUILD_TIME__: new Date().toLocaleString('pt-BR', { timeZone: 'America/Belem' }).replace(', ', ' '),
    __ROLL_UP_REPLACE_BUILD_VERSION__: packageVersion,
    preventAssignment: true
  }),
  typescript()
];

module.exports = [
  {
    ...baseConfigs,
    plugins: basePlugins
  },
  {
    input: baseConfigs.input,
    output: {
      ...baseConfigs.output,
      file: 'dist/index.min.js'
    },
    plugins: [...basePlugins, terser()]
  }
];
