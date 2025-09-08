/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'diogenes-primary': '#8B4513',
        'diogenes-secondary': '#D2691E',
        'diogenes-accent': '#CD853F',
      },
    },
  },
  plugins: [],
}