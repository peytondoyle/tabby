// Debug utility to test PDF handling directly
export const testPDFHandling = async () => {
  console.log('[PDF Debug] Starting PDF handling test...')

  // Test 1: Check File API support
  try {
    const testFile = new File(['test'], 'test.pdf', { type: 'application/pdf' })
    console.log('[PDF Debug] File API works:', {
      name: testFile.name,
      type: testFile.type,
      size: testFile.size
    })
  } catch (error) {
    console.error('[PDF Debug] File API error:', error)
  }

  // Test 2: Check if FileReader can read PDFs
  try {
    const blob = new Blob(['%PDF-1.4'], { type: 'application/pdf' })
    const file = new File([blob], 'test.pdf', { type: 'application/pdf' })
    const reader = new FileReader()

    reader.onload = () => {
      console.log('[PDF Debug] FileReader can read PDF files')
    }
    reader.onerror = (error) => {
      console.error('[PDF Debug] FileReader error:', error)
    }

    reader.readAsDataURL(file)
  } catch (error) {
    console.error('[PDF Debug] FileReader test failed:', error)
  }

  // Test 3: Check input accept attribute support
  const input = document.createElement('input')
  input.type = 'file'

  const acceptTests = [
    'application/pdf',
    '.pdf',
    'application/pdf,.pdf',
    '.pdf,application/pdf',
    'application/pdf,image/*',
    '.pdf,image/*',
    '*',
    ''
  ]

  console.log('[PDF Debug] Testing accept attributes:')
  acceptTests.forEach(accept => {
    input.accept = accept
    console.log(`[PDF Debug] accept="${accept}" -> computed: ${input.accept}`)
  })

  // Test 4: Check navigator.mimeTypes
  if (navigator.mimeTypes) {
    const pdfSupport = navigator.mimeTypes['application/pdf']
    console.log('[PDF Debug] Browser PDF MIME support:', !!pdfSupport)
    if (pdfSupport) {
      console.log('[PDF Debug] PDF plugin:', pdfSupport.description)
    }
  }

  // Test 5: Create a hidden file input with no restrictions
  const testInput = document.createElement('input')
  testInput.type = 'file'
  testInput.style.display = 'none'
  testInput.id = 'pdf-debug-input'

  testInput.onchange = (e) => {
    const target = e.target as HTMLInputElement
    const file = target.files?.[0]
    if (file) {
      console.log('[PDF Debug] File selected via test input:', {
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified
      })
    }
  }

  document.body.appendChild(testInput)
  console.log('[PDF Debug] Test input created with id: pdf-debug-input')
  console.log('[PDF Debug] You can test it with: document.getElementById("pdf-debug-input").click()')

  return {
    message: 'PDF debug utilities loaded. Check console for results.',
    testInputId: 'pdf-debug-input'
  }
}

// Export a window function for easy testing
if (typeof window !== 'undefined') {
  (window as any).testPDFHandling = testPDFHandling
}