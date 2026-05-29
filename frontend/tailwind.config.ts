import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        accent: '#00e5a0',
        'accent-dark': '#00b87a',
        'bg-base': '#0a0a0f',
        'bg-2': '#111118',
        'bg-3': '#1a1a24',
        'bg-4': '#222230',
        'text-muted': '#6b7280',
        'text-dim': '#9090a8',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config
