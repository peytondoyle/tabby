# Performance Profiling Guide

This guide explains how to use the performance profiling tools to analyze the performance of large item lists in Tabby.

## Quick Start

### 1. Start Profile Mode
```bash
# Option 1: Use the convenience script (recommended)
npm run profile:start

# Option 2: Manual start
npm run profile
# Then navigate to http://localhost:5173/profile
```

### 2. Open React DevTools
1. Install React DevTools browser extension if not already installed
2. Open browser DevTools (F12)
3. Go to the "Profiler" tab
4. Click the record button (circle) to start profiling

### 3. Interact with the App
- Toggle between 150-item and 10-item fixtures
- Switch between keyboard and mouse modes
- Select items, assign to people, etc.
- Watch the console for performance markers

### 4. Stop Profiling
- Click the stop button in React DevTools Profiler
- View the flame graph and performance metrics
- Generate a performance report using the "Generate Report" button

## Features

### Performance Monitoring
- **Automatic markers**: All major interactions are automatically timed
- **React Profiler integration**: Wraps components for detailed render analysis
- **Console logging**: Real-time performance feedback
- **Report generation**: Comprehensive performance summary

### Test Fixtures
- **150-item fixture**: Large bill with realistic restaurant items
- **10-item fixture**: Small bill for comparison
- **Realistic data**: Proper pricing, categories, and emojis
- **Performance metadata**: Item counts, totals, generation timestamps

### Profiling Modes
- **Profile mode**: `vite --mode profile` with optimizations for debugging
- **Development mode**: Basic profiling in dev environment
- **Production mode**: Profiling disabled for performance

## Performance Markers

The following operations are automatically profiled:

### Item Operations
- `load-fixture`: Loading test data
- `toggle-item-selection`: Selecting/deselecting items
- `clear-selection`: Clearing all selections
- `assign-item`: Assigning item to person
- `unassign-item`: Unassigning item from person

### Person Operations
- `person-click`: Clicking on a person
- `person-total-click`: Clicking on person total
- `assign-selected-items`: Bulk assignment

### System Operations
- `generate-report`: Creating performance report
- `main-assign-screen`: Main component render

## React Profiler Integration

### ProfilerWrapper Component
```tsx
<ProfilerWrapper id="main-assign-screen">
  <YourComponent />
</ProfilerWrapper>
```

### Automatic Profiling
- Components are automatically wrapped in development/profile modes
- Render times are logged for components taking >16ms
- Detailed metrics include mount/update phases

## Performance Report

The generated report includes:

### Metrics
- Total renders and slow renders (>16ms)
- Average and maximum render times
- Total marker execution time
- Component performance breakdown

### Sample Output
```
📊 Performance Report
====================
Total Renders: 45
Slow Renders (>16ms): 3
Average Render Time: 8.23ms
Max Render Time: 24.56ms
Total Marker Time: 156.78ms

Markers:
  load-fixture: 45.23ms
  toggle-item-selection: 2.34ms
  assign-item: 1.89ms

Slowest Components:
  ItemRow: 24.56ms
  PeopleDock: 18.23ms
  TotalsPanel: 12.45ms
```

## Configuration

### Vite Profile Mode
- Function names preserved for better profiling
- Environment variable `PROFILE_MODE` set to true
- Source maps enabled for debugging

### Performance Monitor
- Enabled in profile and development modes
- Automatic marker management
- Console logging with metadata

## Best Practices

### Profiling Large Lists
1. Start with 10-item fixture to establish baseline
2. Switch to 150-item fixture for stress testing
3. Test both keyboard and mouse interactions
4. Monitor console for slow operations

### React DevTools Usage
1. Record during specific interactions (not entire session)
2. Focus on user-triggered actions (clicks, selections)
3. Look for components with high render times
4. Check for unnecessary re-renders

### Performance Optimization
1. Identify slow components from profiler
2. Look for patterns in render times
3. Consider memoization for expensive components
4. Optimize state updates and selectors

## Troubleshooting

### Common Issues
- **Profiler not opening**: Ensure React DevTools extension is installed
- **No markers in console**: Check that profile mode is enabled
- **Slow performance**: Try reducing fixture size or disabling animations
- **Memory issues**: Clear performance data regularly

### Debug Mode
Enable additional logging by setting:
```javascript
localStorage.setItem('debug', 'performance')
```

## Integration with Existing Code

### Adding New Markers
```typescript
import { usePerformanceMonitor } from '@/lib/performance'

const { startMarker, endMarker } = usePerformanceMonitor()

const handleOperation = () => {
  startMarker('my-operation', { metadata: 'value' })
  // ... do work ...
  endMarker('my-operation')
}
```

### Wrapping Components
```tsx
import { ProfilerWrapper } from '@/lib/performance'

<ProfilerWrapper id="my-component">
  <MyComponent />
</ProfilerWrapper>
```

## Performance Targets

### Render Times
- **Target**: <16ms per component (60fps)
- **Warning**: >16ms logged to console
- **Critical**: >50ms should be investigated

### Interaction Times
- **Selection**: <5ms
- **Assignment**: <10ms
- **Navigation**: <20ms

### Memory Usage
- **Baseline**: <50MB for 150 items
- **Growth**: <10MB per 100 additional items
- **Leaks**: Monitor for increasing memory usage over time
