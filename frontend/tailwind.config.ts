import type { Config } from 'tailwindcss';
import forms from '@tailwindcss/forms';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      colors: {
        brand: {
          DEFAULT: '#6366F1',
          foreground: '#0B1120',
          accent: '#22D3EE'
        }
      }
    }
  },
  plugins: [forms()]
};

export default config;
