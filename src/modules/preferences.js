import { Theme, DEFAULT_THEME_LIST, loadDefaultTheme } from '../lib/theme.js';

let theme = null;
let currentTheme = null;
let customThemes = {};
let editingTheme = null;
let defaultThemesCache = {};

/**
 * Initialize preferences and theme management
 */
export function initPreferences() {
  theme = new Theme();
  theme.install(document.body);
  theme.start();
  
  loadTheme();
  initPreferencesModal();
  initDragAndDrop();
  
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
    const savedTheme = await window.electronAPI.getTheme();
    
    if (savedTheme && savedTheme.svg) {
      theme.load(savedTheme.svg);
      currentTheme = savedTheme;
    } else {
      // Load default Dark theme
      const darkSvg = await loadDefaultTheme('dark');
      if (darkSvg) {
        theme.load(darkSvg);
        currentTheme = { name: 'dark', svg: darkSvg, isDefault: true };
        defaultThemesCache['dark'] = darkSvg;
      }
    }
    
    // Load custom themes
    const saved = await window.electronAPI.getCustomThemes();
    if (saved) {
      customThemes = saved;
    }
  } catch (error) {
    console.error('Failed to load theme:', error);
    const darkSvg = await loadDefaultTheme('dark');
    if (darkSvg) {
      theme.load(darkSvg);
      currentTheme = { name: 'dark', svg: darkSvg, isDefault: true };
      defaultThemesCache['dark'] = darkSvg;
    }
  }
}

/**
 * Initialize preferences modal
 */
function initPreferencesModal() {
  const preferencesCloseBtn = document.getElementById('preferences-close');
  const themeSelect = document.getElementById('theme-select');
  const createThemeBtn = document.getElementById('create-theme-btn');
  const exportThemeBtn = document.getElementById('export-theme-btn');
  const deleteThemeBtn = document.getElementById('delete-theme-btn');

  if (preferencesCloseBtn) {
    preferencesCloseBtn.addEventListener('click', () => {
      hidePreferencesModal();
    });
  }

  if (themeSelect) {
    themeSelect.addEventListener('change', (e) => {
      const themeName = e.target.value;
      loadThemeByName(themeName);
    });
  }

  if (createThemeBtn) {
    createThemeBtn.addEventListener('click', () => {
      createNewTheme();
    });
  }

  if (exportThemeBtn) {
    exportThemeBtn.addEventListener('click', () => {
      exportCurrentTheme();
    });
  }

  if (deleteThemeBtn) {
    deleteThemeBtn.addEventListener('click', () => {
      deleteCurrentTheme();
    });
  }

  // Color picker handlers
  setupColorPickers();
}

/**
 * Setup color pickers for theme editing
 */
function setupColorPickers() {
  const colorElements = [
    'background', 'f_high', 'f_med', 'f_low', 'f_inv',
    'b_high', 'b_med', 'b_low', 'b_inv'
  ];

  colorElements.forEach(id => {
    const element = document.getElementById(`color-${id}`);
    const input = document.getElementById(`input-${id}`);
    
    if (element && input) {
      element.addEventListener('click', () => {
        if (currentTheme && currentTheme.isDefault) {
          // Editing default theme creates a new theme
          createThemeFromDefault();
        }
        input.click();
      });

      input.addEventListener('input', (e) => {
        if (!editingTheme) return;
        
        const color = e.target.value;
        editingTheme[id] = color;
        element.style.backgroundColor = color;
        
        // Apply theme in real-time
        theme.active = editingTheme;
        theme.apply();
      });
    }
  });
}

/**
 * Load theme by name
 */
async function loadThemeByName(themeName) {
  let themeData;
  
  // Check if it's a default theme
  const isDefaultTheme = DEFAULT_THEME_LIST.find(t => t.name === themeName);
  
  if (isDefaultTheme) {
    // Load from cache or fetch
    let svg = defaultThemesCache[themeName];
    if (!svg) {
      svg = await loadDefaultTheme(themeName);
      if (svg) {
        defaultThemesCache[themeName] = svg;
      }
    }
    
    if (svg) {
      themeData = {
        name: themeName,
        svg: svg,
        isDefault: true
      };
    } else {
      console.error(`Failed to load default theme: ${themeName}`);
      return;
    }
  } else if (customThemes[themeName]) {
    themeData = customThemes[themeName];
  } else {
    return;
  }

  theme.load(themeData.svg);
  currentTheme = themeData;
  editingTheme = { ...theme.active };
  
  await window.electronAPI.setTheme(themeData);
  updateThemePreview();
  updateThemeControls();
}

/**
 * Create new theme
 */
function createNewTheme() {
  const themeName = prompt('Enter theme name:');
  if (!themeName || themeName.trim() === '') return;
  
  const name = themeName.trim();
  
  // Check if name conflicts with default themes
  const isDefaultName = DEFAULT_THEME_LIST.find(t => t.name === name);
  if (isDefaultName) {
    alert('Cannot use default theme name');
    return;
  }

  // Start with current theme or default
  const baseTheme = editingTheme || theme.active || {
    background: '#000000',
    f_high: '#ffffff',
    f_med: '#999999',
    f_low: '#444444',
    f_inv: '#000000',
    b_high: '#ffffff',
    b_med: '#999999',
    b_low: '#444444',
    b_inv: '#000000'
  };

  editingTheme = { ...baseTheme };
  
  const themeObj = {
    name: name,
    svg: generateThemeSVG(editingTheme),
    isDefault: false
  };

  customThemes[name] = themeObj;
  currentTheme = themeObj;
  
  saveCustomThemes();
  populateThemeSelect();
  updateThemePreview();
  updateThemeControls();
  
  document.getElementById('theme-select').value = name;
}

/**
 * Create theme from default (when editing default)
 */
function createThemeFromDefault() {
  const baseName = currentTheme.name;
  let newName = `${baseName} (Custom)`;
  let counter = 1;
  
  while (customThemes[newName]) {
    newName = `${baseName} (Custom ${counter})`;
    counter++;
  }

  editingTheme = { ...theme.active };
  
  const themeObj = {
    name: newName,
    svg: generateThemeSVG(editingTheme),
    isDefault: false
  };

  customThemes[newName] = themeObj;
  currentTheme = themeObj;
  
  saveCustomThemes();
  populateThemeSelect();
  updateThemePreview();
  updateThemeControls();
  
  document.getElementById('theme-select').value = newName;
  
  alert(`Created custom theme "${newName}" from ${baseName}`);
}

/**
 * Export current theme
 */
async function exportCurrentTheme() {
  if (!currentTheme) return;
  
  try {
    const svg = currentTheme.svg || generateThemeSVG(theme.active);
    const filename = `${currentTheme.name.toLowerCase().replace(/\s+/g, '-')}.svg`;
    
    await window.electronAPI.exportTheme(filename, svg);
    alert(`Theme exported to Downloads/Resonance/${filename}`);
  } catch (error) {
    console.error('Failed to export theme:', error);
    alert('Failed to export theme');
  }
}

/**
 * Delete current theme
 */
async function deleteCurrentTheme() {
  if (!currentTheme || currentTheme.isDefault) {
    alert('Cannot delete default themes');
    return;
  }

  const confirmed = confirm(`Delete theme "${currentTheme.name}"?`);
  if (!confirmed) return;

  delete customThemes[currentTheme.name];
  await saveCustomThemes();
  
  // Load default Dark theme
  await loadThemeByName('dark');
  populateThemeSelect();
}

/**
 * Generate SVG from theme object
 */
function generateThemeSVG(themeObj) {
  return `<svg width="96px" height="64px" xmlns="http://www.w3.org/2000/svg" baseProfile="full" version="1.1">
  <rect width='96' height='64' id='background' fill='${themeObj.background}'></rect>
  <circle cx='24' cy='24' r='8' id='f_high' fill='${themeObj.f_high}'></circle>
  <circle cx='40' cy='24' r='8' id='f_med' fill='${themeObj.f_med}'></circle>
  <circle cx='56' cy='24' r='8' id='f_low' fill='${themeObj.f_low}'></circle>
  <circle cx='72' cy='24' r='8' id='f_inv' fill='${themeObj.f_inv}'></circle>
  <circle cx='24' cy='40' r='8' id='b_high' fill='${themeObj.b_high}'></circle>
  <circle cx='40' cy='40' r='8' id='b_med' fill='${themeObj.b_med}'></circle>
  <circle cx='56' cy='40' r='8' id='b_low' fill='${themeObj.b_low}'></circle>
  <circle cx='72' cy='40' r='8' id='b_inv' fill='${themeObj.b_inv}'></circle>
</svg>`;
}

/**
 * Update theme preview display
 */
function updateThemePreview() {
  if (!editingTheme) editingTheme = { ...theme.active };

  const colorElements = [
    'background', 'f_high', 'f_med', 'f_low', 'f_inv',
    'b_high', 'b_med', 'b_low', 'b_inv'
  ];

  colorElements.forEach(id => {
    const element = document.getElementById(`color-${id}`);
    const input = document.getElementById(`input-${id}`);
    
    if (element && input && editingTheme[id]) {
      element.style.backgroundColor = editingTheme[id];
      input.value = editingTheme[id];
    }
  });
}

/**
 * Update theme controls (enable/disable based on theme type)
 */
function updateThemeControls() {
  const deleteBtn = document.getElementById('delete-theme-btn');
  const themeNameDisplay = document.getElementById('current-theme-name');
  
  if (deleteBtn) {
    deleteBtn.disabled = !currentTheme || currentTheme.isDefault;
  }
  
  if (themeNameDisplay) {
    themeNameDisplay.textContent = currentTheme ? currentTheme.name : 'Unknown';
  }
}

/**
 * Populate theme select dropdown
 */
function populateThemeSelect() {
  const select = document.getElementById('theme-select');
  if (!select) return;

  let html = '';
  
  // Group themes by category
  const categories = {};
  DEFAULT_THEME_LIST.forEach(themeInfo => {
    if (!categories[themeInfo.category]) {
      categories[themeInfo.category] = [];
    }
    categories[themeInfo.category].push(themeInfo);
  });
  
  // Add default themes grouped by category
  Object.keys(categories).forEach(category => {
    html += `<optgroup label="${category}">`;
    categories[category].forEach(themeInfo => {
      html += `<option value="${themeInfo.name}">${themeInfo.displayName}</option>`;
    });
    html += '</optgroup>';
  });

  // Add custom themes
  if (Object.keys(customThemes).length > 0) {
    html += '<optgroup label="Custom Themes">';
    Object.keys(customThemes).forEach(name => {
      html += `<option value="${name}">${name}</option>`;
    });
    html += '</optgroup>';
  }

  select.innerHTML = html;
  
  if (currentTheme) {
    select.value = currentTheme.name;
  }
}

/**
 * Save custom themes
 */
async function saveCustomThemes() {
  try {
    await window.electronAPI.setCustomThemes(customThemes);
  } catch (error) {
    console.error('Failed to save custom themes:', error);
  }
}

/**
 * Initialize drag and drop for theme loading
 */
function initDragAndDrop() {
  const dropZone = document.body;

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  });

  dropZone.addEventListener('drop', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    const file = files[0];
    if (!file.name.endsWith('.svg')) {
      alert('Please drop an SVG theme file');
      return;
    }

    try {
      const text = await file.text();
      const loaded = theme.load(text);
      
      if (loaded) {
        // Create custom theme from dropped file
        const baseName = file.name.replace('.svg', '');
        let themeName = baseName;
        let counter = 1;
        
        while (customThemes[themeName]) {
          themeName = `${baseName} ${counter}`;
          counter++;
        }

        const themeObj = {
          name: themeName,
          svg: text,
          isDefault: false
        };

        customThemes[themeName] = themeObj;
        currentTheme = themeObj;
        editingTheme = { ...theme.active };

        await saveCustomThemes();
        await window.electronAPI.setTheme(themeObj);
        
        populateThemeSelect();
        updateThemePreview();
        updateThemeControls();
        
        document.getElementById('theme-select').value = themeName;
        
        alert(`Theme "${themeName}" loaded successfully!`);
      } else {
        alert('Invalid theme file');
      }
    } catch (error) {
      console.error('Failed to load theme:', error);
      alert('Failed to load theme file');
    }
  });
}

/**
 * Show preferences modal
 */
function showPreferencesModal() {
  const modal = document.getElementById('preferences-modal');
  modal.classList.remove('hidden');
  populateThemeSelect();
  updateThemePreview();
  updateThemeControls();
}

/**
 * Hide preferences modal
 */
function hidePreferencesModal() {
  const modal = document.getElementById('preferences-modal');
  modal.classList.add('hidden');
  
  // Save current theme if editing
  if (editingTheme && currentTheme && !currentTheme.isDefault) {
    currentTheme.svg = generateThemeSVG(editingTheme);
    customThemes[currentTheme.name] = currentTheme;
    saveCustomThemes();
  }
}