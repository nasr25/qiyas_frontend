/**
 * Chart theming helper.
 *
 * Charts can't read Tailwind classes, so we resolve the same centralized CSS
 * variables (defined in main.css) at runtime. This keeps chart colors in sync
 * with the brand palette AND the active light/dark theme — no hardcoded hex in
 * chart components.
 */

/** Read a CSS variable (space-separated RGB channels) as an rgb()/rgba() string. */
export function cssVar(name, alpha = 1) {
  if (typeof window === 'undefined') return '#000'
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  if (!raw) return '#000'
  return alpha === 1 ? `rgb(${raw})` : `rgba(${raw} / ${alpha})`
}

/**
 * Theme-aware palette for the app's status charts and BI widgets.
 * Returns concrete colors resolved against the current theme.
 */
export function chartTheme() {
  return {
    // Document/status semantics (muted, government-grade)
    status: {
      approved:     cssVar('--c-approved'),
      under_review: cssVar('--c-review'),
      rejected:     cssVar('--c-rejected'),
      draft:        cssVar('--c-draft'),
      overdue:      cssVar('--c-overdue'),
    },
    // Sequential brand series for comparisons (departments, trends…)
    series: [
      cssVar('--brand'),
      cssVar('--c-approved'),
      cssVar('--c-review'),
      cssVar('--c-rejected'),
      cssVar('--c-draft'),
      cssVar('--c-overdue'),
    ],
    grid:        cssVar('--line'),
    ticks:       cssVar('--content-muted'),
    border:      cssVar('--surface-raised'), // arc separators blend with card
    tooltipBg:   cssVar('--content'),
    tooltipText: cssVar('--content-inverse'),
  }
}

/**
 * Sensible Chart.js defaults for responsive, theme-aware, RTL-aware charts.
 * Spread into a chart's `options`.
 */
export function baseChartOptions(isRTL = false) {
  const th = chartTheme()
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        rtl: isRTL,
        backgroundColor: th.tooltipBg,
        titleColor: th.tooltipText,
        bodyColor: th.tooltipText,
        padding: 10,
        cornerRadius: 8,
        displayColors: true,
      },
    },
  }
}
