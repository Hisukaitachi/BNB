/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}", // ensures admin files are scanned
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
