// src/modules/preferences.js

/**
 * Initialize preferences and theme management
 */
export function initPreferences() {
  loadTheme();
  initThemeButtons();
  initPreferencesModal();
  
  // Listen for preferences menu command
  if (window.electronAPI.onOpenPreferences) {
    window.electronAPI.onOpenPreferences(() => {
      showPreferencesModal();
    });
  }
}

/**
 * Load saved theme on startup
 */
async function loadTheme() {
  try {
    const theme = await window.electronAPI.getTheme();
    applyTheme(theme);
  } catch (error) {
    console.error('Failed to load theme:', error);
    applyTheme('dark');
  }
}

/**
 * Apply theme to the application
 */
function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'light') {
    root.classList.add('light');
  } else {
    root.classList.remove('light');
  }
  updateThemeButtons(theme);
}

/**
 * Update theme button styling
 */
function updateThemeButtons(theme) {
  const darkBtn = document.getElementById('theme-dark');
  const lightBtn = document.getElementById('theme-light');
  
  if (darkBtn && lightBtn) {
    if (theme === 'dark') {
      darkBtn.classList.add('bg-blue-500');
      darkBtn.classList.remove('bg-neutral-700');
      lightBtn.classList.remove('bg-blue-500');
      lightBtn.classList.add('bg-neutral-700');
    } else {
      lightBtn.classList.add('bg-blue-500');
      lightBtn.classList.remove('bg-neutral-700');
      darkBtn.classList.remove('bg-blue-500');
      darkBtn.classList.add('bg-neutral-700');
    }
  }
}

/**
 * Initialize theme switching buttons
 */
function initThemeButtons() {
  const themeDarkBtn = document.getElementById('theme-dark');
  const themeLightBtn = document.getElementById('theme-light');

  if (themeDarkBtn) {
    themeDarkBtn.addEventListener('click', async () => {
      try {
        await window.electronAPI.setTheme('dark');
        applyTheme('dark');
      } catch (error) {
        console.error('Failed to set theme:', error);
      }
    });
  }

  if (themeLightBtn) {
    themeLightBtn.addEventListener('click', async () => {
      try {
        await window.electronAPI.setTheme('light');
        applyTheme('light');
      } catch (error) {
        console.error('Failed to set theme:', error);
      }
    });
  }
}

/**
 * Initialize preferences modal
 */
function initPreferencesModal() {
  const preferencesCloseBtn = document.getElementById('preferences-close');

  if (preferencesCloseBtn) {
    preferencesCloseBtn.addEventListener('click', () => {
      hidePreferencesModal();
    });
  }
}

/**
 * Show preferences modal
 */
function showPreferencesModal() {
  const modal = document.getElementById('preferences-modal');
  modal.classList.remove('hidden');
  loadTheme();
}

/**
 * Hide preferences modal
 */
function hidePreferencesModal() {
  const modal = document.getElementById('preferences-modal');
  modal.classList.add('hidden');
}