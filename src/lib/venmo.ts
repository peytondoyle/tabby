/**
 * Venmo deep-link helpers.
 *
 * The payer (person who paid the bill) requests money from each friend via
 * `venmo://paycharge?txn=charge&...`. On desktop/non-iOS we fall back to the
 * universal link `https://venmo.com/{handle}?txn=charge&...`, which Venmo
 * redirects to the app if installed, and to their web paywall otherwise.
 */

export interface VenmoRequestParams {
  handle: string            // friend's Venmo username (without leading @)
  amount: number            // dollars
  note?: string             // e.g. restaurant name + "Tabby split"
}

const normalizeHandle = (raw: string): string =>
  raw.replace(/^@/, '').trim()

/**
 * Strip the `@`, clamp amount to cents, and return null when we can't build
 * a valid URL (no handle, non-positive amount). Callers should render the
 * button as disabled in that case.
 */
export function buildVenmoChargeUrl(
  params: VenmoRequestParams
): { appUrl: string; webUrl: string } | null {
  const handle = normalizeHandle(params.handle)
  if (!handle) return null

  const cents = Math.round((Number(params.amount) || 0) * 100)
  if (cents <= 0) return null

  const amount = (cents / 100).toFixed(2)
  const note = (params.note ?? 'Tabby split').trim()

  const query = new URLSearchParams({
    txn: 'charge',
    amount,
    note
  })

  return {
    // Native iOS deeplink (opens the app directly if installed).
    appUrl: `venmo://paycharge?recipients=${encodeURIComponent(handle)}&${query}`,
    // Universal web URL — works on desktop and as a safe fallback on mobile.
    webUrl: `https://venmo.com/${encodeURIComponent(handle)}?${query}`
  }
}

/**
 * Try the native deeplink first, fall back to web. Called on button click.
 * Uses a hidden iframe trick for iOS that avoids "safari can't find page"
 * when the app isn't installed, then kicks the user to the web URL.
 */
export function openVenmoRequest(params: VenmoRequestParams): boolean {
  const urls = buildVenmoChargeUrl(params)
  if (!urls) return false

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream

  if (isIOS) {
    // On iOS, attempt the app scheme via location, then fall back to web
    // after a short delay if the app didn't intercept.
    const fallback = setTimeout(() => {
      window.location.href = urls.webUrl
    }, 500)

    window.location.href = urls.appUrl

    // If the app takes over, page hides — cancel the fallback.
    const onHide = () => {
      clearTimeout(fallback)
      document.removeEventListener('visibilitychange', onHide)
    }
    document.addEventListener('visibilitychange', onHide)
  } else {
    // Desktop / Android — just open the web URL in a new tab.
    window.open(urls.webUrl, '_blank', 'noopener')
  }

  return true
}
