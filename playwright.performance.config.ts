import { defineConfig, devices } from '@playwright/test'

/**
 * Performance testing configuration for Playwright
 * Focuses on 60fps budget and large dataset performance
 */
export default defineConfig({
  testDir: './tests',
  testMatch: '**/performance.spec.ts',
  
  // Run tests in parallel for faster execution
  fullyParallel: true,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter to use
  reporter: [
    ['html', { outputFolder: 'test-results/performance' }],
    ['json', { outputFile: 'test-results/performance-results.json' }],
    ['junit', { outputFile: 'test-results/performance-results.xml' }]
  ],
  
  // Global test timeout
  timeout: 60000, // 60 seconds for performance tests
  
  // Global setup
  globalSetup: require.resolve('./tests/global-setup.ts'),
  
  // Global teardown
  globalTeardown: require.resolve('./tests/global-teardown.ts'),
  
  use: {
    // Base URL for tests
    baseURL: 'http://localhost:5173',
    
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    
    // Record video for performance analysis
    video: 'retain-on-failure',
    
    // Take screenshot on failure
    screenshot: 'only-on-failure',
    
    // Performance monitoring
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },
  
  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Performance testing specific settings
        launchOptions: {
          args: [
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-features=TranslateUI',
            '--disable-ipc-flooding-protection',
            '--enable-precise-memory-info',
            '--max_old_space_size=4096'
          ]
        }
      },
    },
    
    {
      name: 'mobile-chrome',
      use: { 
        ...devices['Pixel 5'],
        // Mobile performance testing
        launchOptions: {
          args: [
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--enable-precise-memory-info'
          ]
        }
      },
    },
    
    {
      name: 'mobile-safari',
      use: { 
        ...devices['iPhone 12'],
        // iOS performance testing
      },
    },
  ],
  
  // Web server configuration
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000, // 2 minutes for server startup
  },
  
  // Performance-specific settings
  expect: {
    // Increase timeout for performance assertions
    timeout: 10000,
  },
})
