# AI Scanning Performance Optimization Plan

## Current Bottlenecks Analysis

### 1. OpenAI API Latency (2-5 seconds)
- **Issue**: GPT-4o Vision API is slow for real-time processing
- **Impact**: 80% of total scan time
- **Solutions**: Model optimization, caching, streaming

### 2. Image Processing Pipeline (500ms-1s)
- **Issue**: Heavy image normalization in Web Worker
- **Impact**: 15% of total scan time
- **Solutions**: Optimize compression, reduce processing steps

### 3. Network Round-trips (200-500ms)
- **Issue**: Multiple API calls, large uploads
- **Impact**: 5% of total scan time
- **Solutions**: CDN, compression, connection pooling

## Optimization Strategies

### Phase 1: Immediate Wins (1-2 days)

#### 1.1 Optimize OpenAI API Calls
```typescript
// Use faster model for initial processing
const response = await openai.chat.completions.create({
  model: "gpt-4o-mini", // 3x faster than gpt-4o
  messages: [...],
  max_tokens: 500, // Reduce from 1000
  temperature: 0, // Reduce from 0.1
  stream: true // Enable streaming for faster perceived performance
});
```

#### 1.2 Optimize Image Processing
```typescript
// Reduce image dimensions for faster processing
const downscaledDimensions = downscaleImage(canvas, ctx, 1200) // Reduce from 2000
const compressedBlob = await compressImage(canvas, 2 * 1024 * 1024, 0.7) // Reduce from 4MB
```

#### 1.3 Implement Progressive Loading
```typescript
// Show partial results as they come in
const streamResponse = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  stream: true,
  // ... other options
});

// Process chunks as they arrive
for await (const chunk of streamResponse) {
  const content = chunk.choices[0]?.delta?.content;
  if (content) {
    // Update UI with partial results
    updatePartialResults(content);
  }
}
```

### Phase 2: Advanced Optimizations (3-5 days)

#### 2.1 Implement Smart Caching
```typescript
// Cache similar receipts
const cacheKey = generateImageHash(normalizedImage);
const cachedResult = await getCachedResult(cacheKey);
if (cachedResult) {
  return cachedResult;
}
```

#### 2.2 Parallel Processing
```typescript
// Process image normalization and API health check in parallel
const [normalizedFile, isHealthy] = await Promise.all([
  normalizeFile(file),
  ensureApiHealthy({ tries: 1, delayMs: 200 })
]);
```

#### 2.3 Optimize Prompt Engineering
```typescript
// Shorter, more focused prompt
const prompt = `Extract receipt data as JSON:
{
  "place": "store name",
  "items": [{"label": "item", "price": number}],
  "subtotal": number,
  "tax": number,
  "total": number
}`;
```

### Phase 3: Advanced Architecture (1-2 weeks)

#### 3.1 Implement Edge Processing
```typescript
// Use Vercel Edge Functions for faster processing
export const config = {
  runtime: 'edge',
  regions: ['iad1', 'sfo1'] // Deploy to multiple regions
};
```

#### 3.2 Add Fallback OCR Providers
```typescript
// Try multiple OCR providers in parallel
const providers = [
  () => processWithOpenAI(imageBuffer),
  () => processWithGoogleVision(imageBuffer),
  () => processWithAzureVision(imageBuffer)
];

const results = await Promise.allSettled(providers.map(p => p()));
const bestResult = results.find(r => r.status === 'fulfilled')?.value;
```

#### 3.3 Implement Smart Retry Logic
```typescript
// Exponential backoff with circuit breaker
const retryWithBackoff = async (fn, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
};
```

## Implementation Priority

### High Impact, Low Effort
1. **Switch to gpt-4o-mini** (3x faster, 10x cheaper)
2. **Reduce image dimensions** (1200px max)
3. **Optimize prompt** (shorter, focused)
4. **Enable streaming** (perceived performance)

### High Impact, Medium Effort
1. **Implement caching** (similar receipts)
2. **Parallel processing** (image + health check)
3. **Smart retry logic** (exponential backoff)
4. **Progressive loading** (partial results)

### High Impact, High Effort
1. **Edge functions** (faster processing)
2. **Multiple OCR providers** (redundancy)
3. **Advanced caching** (Redis, CDN)
4. **Real-time streaming** (WebSocket)

## Expected Performance Gains

- **Current**: 3-6 seconds total
- **Phase 1**: 1-2 seconds (60% improvement)
- **Phase 2**: 0.5-1 second (80% improvement)
- **Phase 3**: 0.2-0.5 seconds (90% improvement)

## Monitoring & Metrics

```typescript
// Add performance monitoring
const performanceMetrics = {
  imageProcessing: 0,
  apiLatency: 0,
  totalTime: 0,
  cacheHitRate: 0,
  errorRate: 0
};

// Track and log metrics
console.log('[performance]', performanceMetrics);
```

## Cost Optimization

- **gpt-4o-mini**: 10x cheaper than gpt-4o
- **Reduced tokens**: 50% fewer tokens per request
- **Caching**: 80% reduction in API calls
- **Edge functions**: 30% faster, lower latency
