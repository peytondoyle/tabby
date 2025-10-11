/**
 * Custom ESLint plugin for Tabby UI style conventions
 */

import { rule as noHardcodedStyles } from './no-hardcoded-styles.js';
import { rule as noHardcodedColors } from './no-hardcoded-colors.js';

export default {
  rules: {
    'no-hardcoded-styles': noHardcodedStyles,
    'no-hardcoded-colors': noHardcodedColors,
  },
  configs: {
    recommended: {
      plugins: ['tabby-ui'],
      rules: {
        'tabby-ui/no-hardcoded-styles': 'error',
        'tabby-ui/no-hardcoded-colors': 'error',
      },
    },
  },
};