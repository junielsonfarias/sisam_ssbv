import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class', // Permite controle manual via classe 'dark' no <html>
  theme: {
    extend: {
      colors: {
        // Cores semânticas que mudam com o tema
        background: 'var(--bg-primary)',
        foreground: 'var(--text-primary)',
        // Cores de background
        'bg-primary': 'var(--bg-primary)',
        'bg-card': 'var(--bg-card)',
        'bg-hover': 'var(--bg-hover)',
        'bg-input': 'var(--bg-input)',
        'bg-sidebar': 'var(--bg-sidebar)',
        // Cores de texto
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        // Cores de borda
        'border-default': 'var(--border-default)',
        'border-focus': 'var(--border-focus)',
        // Cores de accent/brand
        'accent-primary': 'var(--accent-primary)',
        'accent-hover': 'var(--accent-hover)',
        // Cores de status
        'status-success': 'var(--status-success)',
        'status-warning': 'var(--status-warning)',
        'status-error': 'var(--status-error)',
        'status-info': 'var(--status-info)',
      },
      backgroundColor: {
        'theme-primary': 'var(--bg-primary)',
        'theme-card': 'var(--bg-card)',
        'theme-hover': 'var(--bg-hover)',
        'theme-input': 'var(--bg-input)',
        'theme-sidebar': 'var(--bg-sidebar)',
      },
      textColor: {
        'theme-primary': 'var(--text-primary)',
        'theme-secondary': 'var(--text-secondary)',
        'theme-muted': 'var(--text-muted)',
      },
      borderColor: {
        'theme-default': 'var(--border-default)',
        'theme-focus': 'var(--border-focus)',
      },
    },
  },
  plugins: [],
}
export default config

