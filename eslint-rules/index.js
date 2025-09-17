/**
 * Custom ESLint plugin for Tabby UI style conventions
 */

import { rule as noHardcodedStyles } from './no-hardcoded-styles.js';

export default {
  rules: {
    'no-hardcoded-styles': noHardcodedStyles,
  },
  configs: {
    recommended: {
      plugins: ['tabby-ui'],
      rules: {
        'tabby-ui/no-hardcoded-styles': 'error',
      },
    },
  },
};