import type { StorybookConfig } from '@storybook/react-vite';
import path from 'path';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: ['@storybook/addon-a11y'],
  framework: '@storybook/react-vite',
  viteFinal: async (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...config.resolve.alias,
      '@shared/types': path.resolve(__dirname, '../../packages/shared/dist'),
    };
    config.optimizeDeps = config.optimizeDeps || {};
    config.optimizeDeps.include = [
      ...(config.optimizeDeps.include || []),
      '@shared/types',
    ];
    config.build = config.build || {};
    config.build.commonjsOptions = {
      ...config.build.commonjsOptions,
      include: [/shared/, /node_modules/],
    };
    return config;
  },
};
export default config;
