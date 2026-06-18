/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        mercury: {
          primary: '#18181B',
          secondary: '#3F3F46',
          cta: '#2563EB',
          background: '#FAFAFA',
          text: '#09090B',
        },
      },
      fontFamily: {
        heading: ['Caveat', 'cursive'],
        body: ['Quicksand', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
        modal: '16px',
      },
      boxShadow: {
        'mercury-sm': '0 1px 2px rgba(0, 0, 0, 0.05)',
        'mercury-md': '0 4px 6px rgba(0, 0, 0, 0.1)',
        'mercury-lg': '0 10px 15px rgba(0, 0, 0, 0.1)',
        'mercury-xl': '0 20px 25px rgba(0, 0, 0, 0.15)',
      },
    },
  },
  plugins: [],
};
