declare module 'eslint-plugin-import' {
  import { ESLint } from 'eslint';
  const plugin: ESLint.Plugin;
  export default plugin;
}

declare module 'eslint-config-prettier' {
  import { ESLint } from 'eslint';
  const config: ESLint.ConfigData;
  export default config;
}