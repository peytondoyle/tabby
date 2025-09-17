import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { globalIgnores } from 'eslint/config'
import tabbyUiRules from './eslint-rules/index.js'

export default tseslint.config([
  {
    ignores: [
      'dist/**',
      'src/deprecated/**',
      'scripts/**',
      'supabase/migrations/**',
      'node_modules/**',
      'build/**',
      '.next/**',
      'coverage/**'
    ]
  },
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'tabby-ui': tabbyUiRules,
    },
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', {
        'argsIgnorePattern': '^_',
        'varsIgnorePattern': '^_'
      }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      'tabby-ui/no-hardcoded-styles': ['error', {
        allowedFiles: [
          '**/theme.css',
          '**/global.css', 
          '**/styles/theme.*',
          '**/tailwind.config.*',
          '**/eslint-rules/**',
          '**/exportUtils.ts',
          '**/lib/export*',
        ],
        allowedColors: ['#ffffff', '#fff', '#000000', '#000', 'transparent']
      }],
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['api/**', '../api/**', '../../api/**', '../../../api/**'],
            message: 'Frontend code must not import from backend /api/** folders. Use frontend schemas from @/lib/schemas instead.'
          },
          {
            group: ['**/api/_utils/**', '../api/_utils/**', '../../api/_utils/**'],
            message: 'Do not import backend utilities like api/_utils/schemas. Use frontend schemas from @/lib/schemas instead.'
          }
        ]
      }]
    }
  },
])
