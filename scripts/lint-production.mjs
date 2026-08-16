import { spawnSync } from 'node:child_process'

const eslint = process.platform === 'win32' ? 'npx.cmd' : 'npx'
const targets = [
  'api',
  'shared/computeTotals.ts',
  'shared/receiptItemNormalization.ts',
  'src/main.tsx',
  'src/App.tsx',
  'src/components/ErrorBoundary.tsx',
  'src/components/HomeButton/index.tsx',
  'src/components/AuthModal/index.tsx',
  'src/components/ShareCard/index.tsx',
  'src/components/ShareReceiptModal/index.tsx',
  'src/components/UnifiedEditModal/index.tsx',
  'src/pages/SharePage.tsx',
  'src/pages/ReceiptPage.tsx',
  'src/pages/MyReceiptsPage.tsx',
  'src/tabby-ui-simple/TabbySimple.tsx',
  'src/components/design-system/ProgressSteps.tsx',
  'src/lib/accessibility.ts',
  'src/lib/apiClient.ts',
  'src/lib/authContext.tsx',
  'src/lib/clerkAuthProvider.tsx',
  'src/lib/computeTotals.ts',
  'src/lib/errorLogger.ts',
  'src/lib/imageNormalizer.ts',
  'src/lib/pdfConverter.ts',
  'src/lib/queryClient.ts',
  'src/lib/queryClientInstance.ts',
  'src/lib/receiptHistory.ts',
  'src/lib/receipts.ts',
  'src/lib/receiptScanning.ts',
  'src/lib/supabaseClient.ts',
  'src/lib/types.ts',
  'src/lib/useBillTotals.ts',
  'src/lib/venmo.ts',
  'src/types/domain.ts',
]

const result = spawnSync(eslint, ['eslint', ...targets, '--max-warnings=0'], {
  stdio: 'inherit',
})

process.exit(result.status ?? 1)
