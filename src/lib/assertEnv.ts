/**
 * Environment variable assertion utilities
 * Provides startup validation for required environment variables
 */

export interface EnvValidation {
  isValid: boolean
  missing: string[]
  warnings: string[]
}

/**
 * Validates that required environment variables are present
 * @param requiredVars - Array of required environment variable names
 * @param fallbackCheck - Optional function to check if fallbacks are enabled
 * @returns Validation result with missing vars and warnings
 */
export function validateEnvVars(
  requiredVars: string[],
  fallbackCheck?: () => boolean
): EnvValidation {
  const missing: string[] = []
  const warnings: string[] = []

  for (const varName of requiredVars) {
    const value = import.meta.env[varName]
    // Check if value exists and is not empty after trimming
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      missing.push(varName)
    }
  }

  // Check fallbacks in DEV mode
  if (import.meta.env.DEV && fallbackCheck && !fallbackCheck()) {
    warnings.push('Local fallbacks are not enabled (VITE_ALLOW_LOCAL_FALLBACK=1)')
  }

  return {
    isValid: missing.length === 0,
    missing,
    warnings
  }
}

/**
 * Asserts environment variables are present with appropriate error handling
 * @param requiredVars - Array of required environment variable names
 * @param fallbackCheck - Optional function to check if fallbacks are enabled
 * @throws Error in production if vars are missing
 */
export function assertEnvVars(
  requiredVars: string[],
  fallbackCheck?: () => boolean
): void {
  const validation = validateEnvVars(requiredVars, fallbackCheck)

  if (!validation.isValid) {
    const missingList = validation.missing.join(', ')
    const errorMsg = `Missing required environment variables: ${missingList}`

    if (import.meta.env.PROD) {
      throw new Error(errorMsg)
    } else {
      console.warn(`⚠️  ${errorMsg}`)
    }
  }

  if (validation.warnings.length > 0) {
    for (const warning of validation.warnings) {
      console.warn(`⚠️  ${warning}`)
    }
  }

  if (import.meta.env.DEV && validation.isValid) {
    console.info('✅ Environment variables validated successfully')
  }
}

/**
 * Helper to check if local fallbacks are enabled
 */
export function hasLocalFallbacks(): boolean {
  return import.meta.env.VITE_ALLOW_LOCAL_FALLBACK === '1'
}

