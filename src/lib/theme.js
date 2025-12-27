export class Theme {
  constructor() {
    this.active = null;
    this.el = null;
    this.callback = null;
  }

  install(host) {
    this.el = document.createElement('style');
    this.el.id = 'theme-style';
    host.appendChild(this.el);
  }

  start() {
    console.log('Theme system started');
  }

  load(data) {
    const theme = this.parse(data);
    if (!theme) {
      console.warn('Invalid theme data');
      return false;
    }
    
    this.active = theme;
    this.apply();
    
    if (this.callback) {
      this.callback(theme);
    }
    
    return true;
  }

  apply() {
    if (!this.active || !this.el) return;

    const css = `
      :root {
        --background: ${this.active.background};
        --f_high: ${this.active.f_high};
        --f_med: ${this.active.f_med};
        --f_low: ${this.active.f_low};
        --f_inv: ${this.active.f_inv};
        --b_high: ${this.active.b_high};
        --b_med: ${this.active.b_med};
        --b_low: ${this.active.b_low};
        --b_inv: ${this.active.b_inv};
        
        /* Map to Resonance variables */
        --bg-primary: ${this.active.background};
        --bg-secondary: ${this.active.b_low};
        --bg-tertiary: ${this.active.b_med};
        --bg-hover: ${this.active.b_high};
        --text-primary: ${this.active.f_high};
        --text-secondary: ${this.active.f_med};
        --border-color: ${this.active.b_med};
        --accent-color: ${this.active.b_inv};
        --accent-hover: ${this.active.f_inv};
        --scrollbar-track: ${this.active.b_low};
        --scrollbar-thumb: ${this.active.b_med};
        --scrollbar-thumb-hover: ${this.active.b_high};
      }
    `;

    this.el.textContent = css;
  }

  parse(svg) {
    if (!svg) return null;

    const parser = new DOMParser();
    const doc = parser.parseFromString(svg, 'image/svg+xml');
    
    if (doc.querySelector('parsererror')) {
      console.error('Failed to parse SVG');
      return null;
    }

    const theme = {
      background: this.findColor(doc, 'background') || '#000000',
      f_high: this.findColor(doc, 'f_high') || '#ffffff',
      f_med: this.findColor(doc, 'f_med') || '#999999',
      f_low: this.findColor(doc, 'f_low') || '#444444',
      f_inv: this.findColor(doc, 'f_inv') || '#000000',
      b_high: this.findColor(doc, 'b_high') || '#ffffff',
      b_med: this.findColor(doc, 'b_med') || '#999999',
      b_low: this.findColor(doc, 'b_low') || '#444444',
      b_inv: this.findColor(doc, 'b_inv') || '#000000'
    };

    return theme;
  }

  findColor(doc, id) {
    const el = doc.getElementById(id);
    if (!el) return null;
    
    return el.getAttribute('fill') || 
           el.getAttribute('stroke') || 
           el.style.fill || 
           el.style.stroke || 
           null;
  }

  toString() {
    if (!this.active) return '';
    
    return `<!-- Resonance Theme -->
<svg width="96px" height="64px" xmlns="http://www.w3.org/2000/svg" baseProfile="full" version="1.1">
  <rect width='96' height='64' id='background' fill='${this.active.background}'></rect>
  <!-- Foreground -->
  <circle cx='24' cy='24' r='8' id='f_high' fill='${this.active.f_high}'></circle>
  <circle cx='40' cy='24' r='8' id='f_med' fill='${this.active.f_med}'></circle>
  <circle cx='56' cy='24' r='8' id='f_low' fill='${this.active.f_low}'></circle>
  <circle cx='72' cy='24' r='8' id='f_inv' fill='${this.active.f_inv}'></circle>
  <!-- Background -->
  <circle cx='24' cy='40' r='8' id='b_high' fill='${this.active.b_high}'></circle>
  <circle cx='40' cy='40' r='8' id='b_med' fill='${this.active.b_med}'></circle>
  <circle cx='56' cy='40' r='8' id='b_low' fill='${this.active.b_low}'></circle>
  <circle cx='72' cy='40' r='8' id='b_inv' fill='${this.active.b_inv}'></circle>
</svg>`;
  }

  set onLoad(fn) {
    this.callback = fn;
  }
}

// Default theme names and metadata
export const DEFAULT_THEME_LIST = [
  { name: 'dark', displayName: 'Dark', category: 'Original' },
  { name: 'light', displayName: 'Light', category: 'Original' },
  { name: 'slate', displayName: 'Slate', category: 'Original' },

  { name: 'boysenberry', displayName: 'Boysenberry', category: 'Hundred Rabbits' },
  { name: 'gotham', displayName: 'Gotham', category: 'Hundred Rabbits' },
  { name: 'noir', displayName: 'Noir', category: 'Hundred Rabbits' },
  { name: 'nord', displayName: 'Nord', category: 'Hundred Rabbits' },
  { name: 'op-1', displayName: 'OP-1', category: 'Hundred Rabbits' },
  { name: 'teenage', displayName: 'Teenage', category: 'Hundred Rabbits' },
  { name: 'zenburn', displayName: 'Zenburn', category: 'Hundred Rabbits' }
];

/**
 * Load a default theme by name from the themes directory
 * @param {string} themeName - Name of the theme file (without .svg extension)
 * @returns {Promise<string|null>} - SVG content or null if failed
 */
export async function loadDefaultTheme(themeName) {
  try {
    const response = await fetch(`/src/themes/${themeName}.svg`);
    if (!response.ok) {
      throw new Error(`Theme ${themeName} not found`);
    }
    return await response.text();
  } catch (error) {
    console.error(`Failed to load theme ${themeName}:`, error);
    return null;
  }
}