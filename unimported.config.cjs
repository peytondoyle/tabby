module.exports = {
  entry: [
    'src/**/*.{js,ts,jsx,tsx}',
    '!src/**/*.test.{js,ts,jsx,tsx}',
    '!src/**/*.spec.{js,ts,jsx,tsx}',
    '!src/deprecated/**/*'
  ],
  extensions: ['.js', '.ts', '.jsx', '.tsx'],
  ignorePatterns: [
    'node_modules/**',
    'dist/**',
    'build/**',
    '.next/**',
    'coverage/**',
    'src/deprecated/**'
  ],
  aliases: {
    '@/*': ['src/*']
  }
}