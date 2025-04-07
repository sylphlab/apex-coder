// uno.config.ts
import { defineConfig, presetUno, presetAttributify, presetIcons } from 'unocss';

export default defineConfig({
  presets: [
    presetUno(), // Basic Tailwind/Windi CSS utilities
    presetAttributify(), // Enables Valueless Attributify Mode
    presetIcons({ // Enables Iconify integration
      // Optional: Add options here, e.g., scale, prefix, collections
      // scale: 1.2,
      // warn: true,
    }),
  ],
  // Optional: Add custom rules, shortcuts, themes, etc.
  // shortcuts: {
  //   'btn': 'py-2 px-4 font-semibold rounded-lg shadow-md',
  //   'btn-green': 'text-white bg-green-500 hover:bg-green-700',
  // },
});
