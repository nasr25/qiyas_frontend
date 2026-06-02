/** @type {import('tailwindcss').Config} */

/**
 * Government-grade design system.
 *
 * Brand colors (single source of truth):
 *   Primary Dark  → #000A05  (primary-950)
 *   Primary Green → #00281E  (primary-900)
 *
 * The 50–950 scales below are generated as tints/shades of those two anchors.
 * Semantic surface / content / border / brand tokens are driven by CSS
 * variables (see src/assets/main.css) so the SAME utility classes resolve to
 * the correct value in both light and dark themes — no hardcoded colors in
 * components. `<alpha-value>` keeps Tailwind opacity modifiers (e.g.
 * `bg-surface/80`) working with the variable-based tokens.
 */
const withVar = (name) => `rgb(var(${name}) / <alpha-value>)`

export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    // Responsive breakpoints: mobile-first, with explicit small-phone,
    // large-monitor and ultra-wide stops.
    screens: {
      xs:   '375px',  // small phones
      sm:   '640px',  // large phones
      md:   '768px',  // tablets
      lg:   '1024px', // laptops
      xl:   '1280px', // desktops
      '2xl':'1536px', // large monitors
      '3xl':'1920px', // full-HD / wide
      '4xl':'2560px', // ultra-wide / QHD+
    },
    extend: {
      colors: {
        // ---- Brand: Primary (derived from #00281E / #000A05) ----
        primary: {
          50:  '#ecf6f2',
          100: '#cfe9e0',
          200: '#a1d3c3',
          300: '#6bb7a1',
          400: '#3e9a82',
          500: '#1e7d66',
          600: '#136352',
          700: '#0e4f43',
          800: '#0a3a30',
          900: '#00281e', // Primary Green (brand)
          950: '#000a05', // Primary Dark (brand)
        },
        // ---- Brand: Secondary (derived accent, same green family) ----
        secondary: {
          50:  '#ecfaf4',
          100: '#cff1e3',
          200: '#a1e3cb',
          300: '#67cdac',
          400: '#34b28d',
          500: '#149674',
          600: '#0b785e',
          700: '#0c5f4c',
          800: '#0d4b3d',
          900: '#0b3e34',
          950: '#03241e',
        },
        // ---- Muted semantic status colors (government, non-bright) ----
        success: {
          50: '#ecfdf3', 100: '#d1fadf', 200: '#a6f4c5', 300: '#6ce9a6',
          400: '#32d583', 500: '#12b76a', 600: '#039855', 700: '#027a48',
          800: '#05603a', 900: '#054f31', 950: '#053321',
        },
        warning: {
          50: '#fffaeb', 100: '#fef0c7', 200: '#fedf89', 300: '#fec84b',
          400: '#fdb022', 500: '#f79009', 600: '#dc6803', 700: '#b54708',
          800: '#93370d', 900: '#7a2e0e', 950: '#4e1d09',
        },
        danger: {
          50: '#fef3f2', 100: '#fee4e2', 200: '#fecdca', 300: '#fda29b',
          400: '#f97066', 500: '#f04438', 600: '#d92d20', 700: '#b42318',
          800: '#912018', 900: '#7a271a', 950: '#55160c',
        },
        info: {
          50: '#eff8ff', 100: '#d1e9ff', 200: '#b2ddff', 300: '#84caff',
          400: '#53b1fd', 500: '#2e90fa', 600: '#1570ef', 700: '#175cd3',
          800: '#1849a9', 900: '#194185', 950: '#102a56',
        },
        // ---- Theme-aware semantic tokens (CSS-variable driven) ----
        // Resolve differently in light vs .dark — use these for app chrome.
        surface: {
          DEFAULT: withVar('--surface'),
          muted:   withVar('--surface-muted'),
          raised:  withVar('--surface-raised'),
          inset:   withVar('--surface-inset'),
        },
        content: {
          DEFAULT: withVar('--content'),
          muted:   withVar('--content-muted'),
          subtle:  withVar('--content-subtle'),
          inverse: withVar('--content-inverse'),
        },
        line: {
          DEFAULT: withVar('--line'),
          strong:  withVar('--line-strong'),
        },
        brand: {
          DEFAULT:  withVar('--brand'),
          hover:    withVar('--brand-hover'),
          contrast: withVar('--brand-contrast'),
          subtle:   withVar('--brand-subtle'),
        },
      },
      fontFamily: {
        sans:   ['"IBM Plex Sans Arabic"', '"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        arabic: ['"IBM Plex Sans Arabic"', 'Tahoma', 'Arial', 'sans-serif'],
      },
      borderColor: {
        DEFAULT: withVar('--line'),
      },
      ringColor: {
        DEFAULT: withVar('--ring'),
      },
      maxWidth: {
        // Cap content width on ultra-wide displays so lines stay readable.
        content: '1600px',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
