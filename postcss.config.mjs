// postcss.config.js
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {}, // <-- This is the crucial fix
    autoprefixer: {},
  },
}