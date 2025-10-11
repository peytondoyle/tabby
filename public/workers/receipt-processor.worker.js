/**
 * Web Worker for on-device receipt processing
 * Uses TensorFlow.js for local AI processing
 */

// Import TensorFlow.js (would be loaded via importScripts in production)
// importScripts('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@latest/dist/tf.min.js');

let model = null;
let isModelLoaded = false;

// Simple receipt processing model (placeholder)
class SimpleReceiptModel {
  constructor() {
    this.patterns = [
      // Common receipt patterns
      {
        name: 'restaurant_standard',
        regex: /^(.+?)\s*\n.*?(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
        confidence: 0.9
      },
      {
        name: 'fast_food',
        regex: /^(.+?)\s*\n.*?(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
        confidence: 0.85
      }
    ];
    
    this.itemPatterns = [
      {
        regex: /^(.+?)\s+\$?(\d+\.?\d*)$/,
        confidence: 0.9
      },
      {
        regex: /^(\d+)x\s+(.+?)\s+\$?(\d+\.?\d*)$/,
        confidence: 0.85
      }
    ];
  }

  async process(imageData) {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Extract text from image (simplified)
    const extractedText = this.extractTextFromImage(imageData);
    
    // Parse receipt data
    const result = this.parseReceiptText(extractedText);
    
    return {
      ...result,
      confidence: this.calculateConfidence(result),
      processingTime: 100
    };
  }

  extractTextFromImage(imageData) {
    // This would use OCR in a real implementation
    // For now, return a sample receipt text
    return `McDonald's
123 Main St
Date: 12/15/2023

Big Mac $8.99
Fries $3.99
Coke $2.49

Subtotal: $15.47
Tax: $1.24
Total: $16.71`;
  }

  parseReceiptText(text) {
    const lines = text.split('\n');
    const result = {
      place: null,
      date: null,
      items: [],
      subtotal: null,
      tax: null,
      total: null
    };

    // Extract place name (first line)
    if (lines.length > 0) {
      result.place = lines[0].trim();
    }

    // Extract date
    const dateMatch = text.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})/);
    if (dateMatch) {
      result.date = dateMatch[1];
    }

    // Extract items
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Try different item patterns
      for (const pattern of this.itemPatterns) {
        const match = trimmedLine.match(pattern.regex);
        if (match) {
          let label, price;
          
          if (pattern.regex.source.includes('(\\d+)x')) {
            // Quantity format
            label = match[2].trim();
            price = parseFloat(match[3]);
          } else {
            // Standard format
            label = match[1].trim();
            price = parseFloat(match[2]);
          }
          
          if (price > 0 && price < 100) {
            result.items.push({ label, price });
            break;
          }
        }
      }
    }

    // Extract totals
    const subtotalMatch = text.match(/subtotal[:\s]*\$?(\d+\.?\d*)/i);
    if (subtotalMatch) {
      result.subtotal = parseFloat(subtotalMatch[1]);
    }

    const taxMatch = text.match(/tax[:\s]*\$?(\d+\.?\d*)/i);
    if (taxMatch) {
      result.tax = parseFloat(taxMatch[1]);
    }

    const totalMatch = text.match(/total[:\s]*\$?(\d+\.?\d*)/i);
    if (totalMatch) {
      result.total = parseFloat(totalMatch[1]);
    }

    return result;
  }

  calculateConfidence(result) {
    let confidence = 0;
    
    if (result.place) confidence += 0.2;
    if (result.date) confidence += 0.1;
    if (result.items.length > 0) confidence += Math.min(0.4, result.items.length * 0.1);
    if (result.total) confidence += 0.2;
    if (result.subtotal) confidence += 0.1;
    
    return Math.min(1, confidence);
  }
}

// Message handler
self.onmessage = async function(event) {
  const { type, data } = event.data;
  
  try {
    switch (type) {
      case 'load_model':
        await loadModel();
        break;
        
      case 'process_receipt':
        await processReceipt(data.imageData);
        break;
        
      default:
        self.postMessage({
          type: 'error',
          error: `Unknown message type: ${type}`
        });
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error.message
    });
  }
};

async function loadModel() {
  try {
    // Initialize the model
    model = new SimpleReceiptModel();
    isModelLoaded = true;
    
    self.postMessage({
      type: 'model_loaded',
      message: 'Model loaded successfully'
    });
  } catch (error) {
    self.postMessage({
      type: 'model_error',
      error: error.message
    });
  }
}

async function processReceipt(imageData) {
  if (!isModelLoaded || !model) {
    throw new Error('Model not loaded');
  }
  
  try {
    const startTime = Date.now();
    const result = await model.process(imageData);
    const processingTime = Date.now() - startTime;
    
    self.postMessage({
      type: 'processing_complete',
      result: {
        ...result,
        processingTime,
        model: 'on-device'
      }
    });
  } catch (error) {
    self.postMessage({
      type: 'processing_error',
      error: error.message
    });
  }
}

// Error handling
self.onerror = function(error) {
  self.postMessage({
    type: 'error',
    error: `Worker error: ${error.message}`
  });
};

self.onunhandledrejection = function(event) {
  self.postMessage({
    type: 'error',
    error: `Unhandled promise rejection: ${event.reason}`
  });
};
