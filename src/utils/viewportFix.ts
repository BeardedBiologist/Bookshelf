/**
 * iOS standalone (home-screen) web apps can report a layout viewport that is
 * shorter than the physical screen (the area below is not drawable), while
 * still reporting the full safe-area-inset-bottom. Measure the missing height
 * and expose it as `--viewport-gap` so `--safe-bottom` can be reduced and
 * bottom UI sits at the edge of the drawable area instead of floating.
 */
export function installViewportGapFix() {
  if (typeof window === 'undefined') return

  const nav = window.navigator as Navigator & { standalone?: boolean }
  const isStandalone =
    nav.standalone === true || window.matchMedia('(display-mode: standalone)').matches
  const isIOS =
    /iPad|iPhone|iPod/.test(nav.userAgent) ||
    (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1)

  if (!isStandalone || !isIOS) return

  const root = document.documentElement

  const update = () => {
    const isPortrait = window.innerHeight >= window.innerWidth
    const screenHeight = isPortrait
      ? Math.max(screen.width, screen.height)
      : Math.min(screen.width, screen.height)
    const gap = screenHeight - window.innerHeight
    // Ignore implausible values (e.g. keyboard open, split view)
    const applied = gap > 0 && gap < 160 ? gap : 0
    root.style.setProperty('--viewport-gap', `${applied}px`)
  }

  update()
  window.addEventListener('resize', update)
  window.addEventListener('orientationchange', () => setTimeout(update, 250))
}
