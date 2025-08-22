// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./node_modules/@heroui/theme/dist/components/(button|card|ripple|spinner).js",
  ],
  theme: {
    extend: {},
  },
  
};