# Performance Testing Guide

This guide explains how to use the comprehensive performance testing suite to ensure Tabby meets performance budgets for large item lists and mobile devices.

## Quick Start

### Run Performance Tests
```bash
# Run all performance tests
npm run test:performance

# Run Lighthouse tests
npm run test:lighthouse

# Run Lighthouse CI
npm run lighthouse:ci
```

## Performance Budgets

### Frame Rate Budgets
- **Smooth (60fps)**: For critical interactions like scrolling and selection
- **Acceptable (30fps)**: For complex operations with large datasets
- **Critical (20fps)**: Minimum acceptable performance for any interaction

### Bundle Size Budgets
- **Total Bundle**: < 350KB
- **JavaScript**: < 300KB
- **CSS**: < 50KB
- **Script Files**: < 20 files
- **Style Files**: < 5 files

### Mobile Performance Budgets
- **First Contentful Paint**: < 2.0s
- **Largest Contentful Paint**: < 2.5s
- **Speed Index**: < 3.0s
- **Time to Interactive**: < 3.5s
- **Total Blocking Time**: < 300ms
- **Cumulative Layout Shift**: < 0.1

## Test Suites

### 1. Playwright Performance Tests (`tests/performance.spec.ts`)

#### Test Cases
- **150-item fixture scrolling**: Tests smooth scrolling through large item lists
- **Item selection performance**: Tests selecting 10 items with 60fps budget
- **Assignment workflow**: Tests complete item assignment workflow
- **Keyboard navigation**: Tests keyboard navigation performance
- **Memory usage**: Monitors memory consumption during interactions
- **Bundle size verification**: Ensures bundle size stays within limits

#### Performance Utilities (`tests/utils/performance.ts`)
- **Frame rate monitoring**: Real-time FPS measurement
- **Performance budgets**: Predefined budgets for different scenarios
- **Memory usage tracking**: JavaScript heap size monitoring
- **Bundle size analysis**: Network request size measurement

### 2. Lighthouse Tests (`tests/lighthouse-share.spec.ts`)

#### Mobile Emulation Tests
- **Share page performance**: Tests TTI < 3.5s on mobile
- **Bundle size analysis**: Verifies bundle size limits
- **150-item fixture performance**: Tests large dataset performance

### 3. Lighthouse CI (`lighthouserc.js`)

#### Automated Performance Audits
- **Mobile emulation**: iPhone 12 Pro viewport and throttling
- **Performance metrics**: FCP, LCP, SI, TTI, TBT, CLS
- **Bundle analysis**: Script and stylesheet size limits
- **Accessibility checks**: Color contrast, alt text, labels
- **Best practices**: HTTPS, security, CSP

## Test Configuration

### Playwright Performance Config (`playwright.performance.config.ts`)
```typescript
export default defineConfig({
  testDir: './tests',
  testMatch: '**/performance.spec.ts',
  timeout: 60000, // 60 seconds for performance tests
  workers: process.env.CI ? 1 : undefined, // Sequential on CI
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure'
  }
})
```

### Performance Budgets
```typescript
const PERFORMANCE_BUDGETS = {
  SMOOTH: {
    minFps: 60,
    maxSlowFrames: 0,
    maxFrameTime: 16.67, // 60fps
    maxAverageFrameTime: 16.67
  },
  ACCEPTABLE: {
    minFps: 30,
    maxSlowFrames: 2,
    maxFrameTime: 33.33, // 30fps
    maxAverageFrameTime: 25
  },
  CRITICAL: {
    minFps: 20,
    maxSlowFrames: 5,
    maxFrameTime: 50, // 20fps
    maxAverageFrameTime: 40
  }
}
```

## Running Tests

### Local Development
```bash
# Start development server
npm run dev

# In another terminal, run performance tests
npm run test:performance

# Run specific test
npx playwright test tests/performance.spec.ts --grep "150-item fixture performance"

# Run with debug mode
npx playwright test tests/performance.spec.ts --debug
```

### CI/CD Pipeline
```bash
# GitHub Actions workflow runs automatically on:
# - Push to main/develop branches
# - Pull requests
# - Daily at 2 AM UTC

# Manual CI run
npm run test:performance
npm run test:lighthouse
npm run lighthouse:ci
```

## Test Data

### 150-Item Fixture
- **Realistic restaurant items**: Appetizers, mains, desserts, beverages
- **Proper pricing**: $5-50 range with realistic distribution
- **Categories and emojis**: Visual variety for testing
- **8 people**: For assignment testing
- **Performance metadata**: Generation timestamps and counts

### Test Scenarios
1. **Scrolling**: Smooth scrolling through 150 items
2. **Selection**: Selecting 10 items with visual feedback
3. **Assignment**: Assigning selected items to people
4. **Keyboard navigation**: Arrow keys and Enter/Space
5. **Memory stress**: Extended interactions to test memory usage

## Performance Monitoring

### Real-time Metrics
- **FPS measurement**: Using `requestAnimationFrame` API
- **Frame time analysis**: Individual frame duration tracking
- **Slow frame detection**: Frames > 50ms flagged
- **Memory usage**: JavaScript heap size monitoring
- **Bundle analysis**: Network request size tracking

### Test Reports
- **HTML reports**: Visual test results with screenshots
- **JSON reports**: Machine-readable test data
- **JUnit reports**: CI/CD integration format
- **Console logging**: Real-time performance feedback

## Debugging Performance Issues

### Common Issues
1. **Slow frames**: Look for expensive operations in render cycles
2. **Memory leaks**: Monitor memory usage over time
3. **Bundle bloat**: Check for unnecessary dependencies
4. **Layout thrashing**: Avoid frequent DOM mutations

### Debug Commands
```bash
# Run with verbose logging
npx playwright test tests/performance.spec.ts --reporter=line

# Run with trace
npx playwright test tests/performance.spec.ts --trace=on

# Run specific browser
npx playwright test tests/performance.spec.ts --project=chromium

# Run with headed mode
npx playwright test tests/performance.spec.ts --headed
```

### Performance Analysis
```bash
# Generate performance report
npm run profile:start
# Open http://localhost:5173/profile
# Click "Generate Report" button

# Analyze bundle
npm run analyze
# Open dist/stats.html in browser
```

## CI/CD Integration

### GitHub Actions Workflow
- **Performance tests**: Runs on every PR and push
- **Lighthouse CI**: Automated performance audits
- **Artifact upload**: Test results and reports
- **PR comments**: Performance results in pull requests

### Performance Gates
- **60fps budget**: All interactions must maintain 60fps
- **Bundle size**: JavaScript bundle < 300KB
- **Mobile TTI**: Time to Interactive < 3.5s
- **Memory usage**: < 50MB increase during interactions

## Best Practices

### Writing Performance Tests
1. **Use realistic data**: 150-item fixture for stress testing
2. **Test user interactions**: Scrolling, selection, assignment
3. **Monitor frame rates**: Ensure smooth 60fps performance
4. **Check memory usage**: Prevent memory leaks
5. **Verify bundle size**: Keep bundles under size limits

### Performance Optimization
1. **Virtualization**: Use `@tanstack/virtual` for large lists
2. **Memoization**: `React.memo` for expensive components
3. **Code splitting**: Lazy load non-critical components
4. **Bundle optimization**: Tree shaking and vendor splitting
5. **Animation optimization**: Respect `prefers-reduced-motion`

### Monitoring in Production
1. **Real User Monitoring**: Track actual performance metrics
2. **Core Web Vitals**: Monitor LCP, FID, CLS
3. **Bundle analysis**: Regular bundle size audits
4. **Performance budgets**: Set and enforce limits
5. **Alerting**: Notify on performance regressions

## Troubleshooting

### Test Failures
- **Check server status**: Ensure dev server is running
- **Verify test data**: 150-item fixture loaded correctly
- **Review performance logs**: Look for specific violations
- **Check browser compatibility**: Test on different browsers

### Performance Issues
- **Profile the app**: Use React DevTools Profiler
- **Analyze bundle**: Check for unnecessary dependencies
- **Monitor memory**: Look for memory leaks
- **Optimize animations**: Reduce motion for better performance

### CI/CD Issues
- **Check GitHub Actions**: Review workflow logs
- **Verify dependencies**: Ensure all packages installed
- **Test locally**: Reproduce issues in local environment
- **Update configurations**: Keep test configs up to date

## Performance Targets

### Desktop Performance
- **60fps**: All user interactions
- **< 100ms**: Click response time
- **< 500ms**: Page load time
- **< 1MB**: Total bundle size

### Mobile Performance
- **30fps**: Minimum acceptable frame rate
- **< 3.5s**: Time to Interactive
- **< 300KB**: Initial bundle size
- **< 50MB**: Memory usage increase

### Accessibility Performance
- **< 0.1**: Cumulative Layout Shift
- **< 300ms**: Total Blocking Time
- **< 2.5s**: Largest Contentful Paint
- **< 2.0s**: First Contentful Paint

This comprehensive performance testing suite ensures Tabby delivers excellent performance even with large datasets and on mobile devices! 🚀
