module.exports = {
  ci: {
    collect: {
      // Start the server before running Lighthouse
      startServerCommand: 'npm run dev',
      startServerReadyPattern: 'Local:',
      startServerReadyTimeout: 30000,
      // URLs to test
      url: [
        'http://localhost:5173/profile',
        'http://localhost:5173/share/test-share-id'
      ],
      // Number of runs per URL
      numberOfRuns: 3,
      // Mobile emulation
      settings: {
        emulatedFormFactor: 'mobile',
        throttling: {
          rttMs: 150,
          throughputKbps: 1638.4,
          cpuSlowdownMultiplier: 4
        },
        screenEmulation: {
          mobile: true,
          width: 375,
          height: 667,
          deviceScaleFactor: 2
        }
      }
    },
    assert: {
      // Performance assertions
      assertions: {
        // Time to Interactive should be under 3.5s on mobile
        'first-contentful-paint': ['error', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'speed-index': ['error', { maxNumericValue: 3000 }],
        'interactive': ['error', { maxNumericValue: 3500 }],
        'total-blocking-time': ['error', { maxNumericValue: 300 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        
        // Bundle size assertions
        'resource-summary': [
          'error',
          {
            'resourceCounts': [
              { 'resourceType': 'script', 'maxCount': 20 },
              { 'resourceType': 'stylesheet', 'maxCount': 5 }
            ],
            'resourceSizes': [
              { 'resourceType': 'script', 'maxTotalSizeBytes': 300000 }, // 300KB gzipped
              { 'resourceType': 'stylesheet', 'maxTotalSizeBytes': 50000 } // 50KB
            ]
          }
        ],
        
        // Accessibility assertions
        'color-contrast': 'warn',
        'image-alt': 'warn',
        'label': 'warn',
        'link-name': 'warn',
        'button-name': 'warn',
        
        // Best practices
        'uses-https': 'warn',
        'is-on-https': 'warn',
        'no-vulnerable-libraries': 'warn',
        'csp-xss': 'warn'
      }
    },
    upload: {
      // Upload results to Lighthouse CI server (optional)
      target: 'temporary-public-storage'
    }
  }
}
