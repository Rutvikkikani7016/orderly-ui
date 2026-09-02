/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#16181C',
        surface: '#F7F7F5',
        accent: {
          DEFAULT: '#185FA5',
          light: '#E6F1FB',
          dark: '#0C447C',
        },
        border: '#E4E3DD',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
