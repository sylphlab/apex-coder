// uno.config.ts
import { defineConfig, presetUno, presetAttributify, presetIcons } from 'unocss';

export default defineConfig({
  presets: [
    presetUno(), // Basic Tailwind/Windi CSS utilities
    presetAttributify(), // Enables Valueless Attributify Mode
    presetIcons({ // Enables Iconify integration
      scale: 1.2,
      warn: true,
    }),
  ],
  theme: {
    colors: {
      // VS Code theme-based color palette
      nordic: {
        // Primary colors - using VS Code theme variables
        primary: 'var(--vscode-button-background, #0A84FF)', // Primary button color
        secondary: 'var(--vscode-button-secondaryBackground, #5E81AC)', // Secondary button color
        accent: 'var(--vscode-activityBarBadge-background, #88C0D0)', // Accent color
        
        // Neutral colors
        bg: {
          light: 'var(--vscode-editor-background, #ECEFF4)', // Light background
          DEFAULT: 'var(--vscode-sideBar-background, #E5E9F0)', // Default background
          dark: 'var(--vscode-dropdown-background, #D8DEE9)', // Darker background
        },
        
        // Dark mode colors - these will adapt automatically with VS Code theme
        dark: {
          bg: {
            light: 'var(--vscode-editor-background, #3B4252)', // Light dark mode background
            DEFAULT: 'var(--vscode-sideBar-background, #2E3440)', // Default dark mode background
            dark: 'var(--vscode-dropdown-background, #242933)', // Darker dark mode background
          },
          text: 'var(--vscode-editor-foreground, #ECEFF4)', // Dark mode text
        },
        
        // Text colors
        text: {
          primary: 'var(--vscode-editor-foreground, #2E3440)', // Primary text color
          secondary: 'var(--vscode-descriptionForeground, #4C566A)', // Secondary text color
          muted: 'var(--vscode-disabledForeground, #7B88A1)', // Muted text color
        },
        
        // Status colors
        success: 'var(--vscode-testing-iconPassed, #A3BE8C)', // Green for success states
        warning: 'var(--vscode-editorWarning-foreground, #EBCB8B)', // Yellow for warning states
        error: 'var(--vscode-editorError-foreground, #BF616A)', // Red for error states
        info: 'var(--vscode-editorInfo-foreground, #81A1C1)', // Blue for info states
      },
    },
    boxShadow: {
      // Using more subtle shadows that will work with both light and dark themes
      'nordic-sm': '0 1px 2px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1)',
      'nordic': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      'nordic-md': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      'nordic-lg': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      'nordic-xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    },
  },
  shortcuts: {
    // Layout shortcuts
    'nordic-container': 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
    'nordic-section': 'py-6 sm:py-8 lg:py-12',
    
    // Button shortcuts - using VS Code button styles
    'btn-nordic': 'py-2.5 px-4 rounded-lg transition-all duration-200 font-medium text-sm focus:outline-none',
    'btn-nordic-primary': 'btn-nordic bg-nordic-primary text-[var(--vscode-button-foreground,white)] hover:bg-opacity-90 focus:ring-2 focus:ring-nordic-primary focus:ring-opacity-50',
    'btn-nordic-secondary': 'btn-nordic bg-nordic-secondary text-[var(--vscode-button-secondaryForeground,white)] hover:bg-opacity-90 focus:ring-2 focus:ring-nordic-secondary focus:ring-opacity-50',
    'btn-nordic-ghost': 'btn-nordic bg-transparent hover:bg-nordic-bg-light text-nordic-text-primary',
    
    // Card shortcuts - using VS Code editor background with border for better visibility
    'card-nordic': 'bg-[var(--vscode-editor-background,white)] border border-[var(--vscode-panel-border,#D8DEE9)] rounded-xl shadow-nordic p-5 transition-all duration-200',
    'card-nordic-hover': 'card-nordic hover:shadow-nordic-md',
    
    // Input shortcuts
    'input-nordic': 'w-full py-2.5 px-3.5 rounded-lg bg-[var(--vscode-input-background,white)] text-[var(--vscode-input-foreground,black)] border border-[var(--vscode-input-border,#D8DEE9)] focus:outline-none focus:ring-2 focus:ring-nordic-primary focus:ring-opacity-50 transition-all duration-200',
    
    // Text shortcuts
    'text-nordic-title': 'text-nordic-text-primary font-medium',
    'text-nordic-body': 'text-nordic-text-secondary',
    'text-nordic-muted': 'text-nordic-text-muted text-sm',
    
    // Animation shortcuts
    'animate-nordic-fade-in': 'animate-fade-in',
    'animate-nordic-slide-up': 'animate-slide-up',
    'animate-nordic-pulse': 'animate-pulse',
  },
  rules: [
    // Custom animation rules
    [/^animate-fade-in$/, () => ({
      animation: 'fadeIn 0.3s ease-in-out'
    })],
    [/^animate-slide-up$/, () => ({
      animation: 'slideUp 0.4s ease-out'
    })],
  ],
  preflights: [
    {
      getCSS: () => `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUp {
          from { transform: translateY(10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        
        :root {
          --transition-base: all 0.2s ease-in-out;
        }
        
        * {
          transition: var(--transition-base);
        }
      `
    }
  ]
});
