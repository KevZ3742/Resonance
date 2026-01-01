let loopMode = 'none'; // 'none', 'one', 'all'

/**
 * Update loop button display
 */
export function updateLoopButtonDisplay() {
  const loopBtn = document.getElementById('loop-btn');
  if (!loopBtn) return;
  
  const icon = loopBtn.querySelector('svg');
  
  if (loopMode === 'none') {
    // No loop - gray icon
    icon.innerHTML = '<path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>';
    loopBtn.classList.remove('text-neutral-400', 'text-blue-400');
    loopBtn.classList.add('text-neutral-400');
    loopBtn.title = 'Loop Mode: Off';
  } else if (loopMode === 'all') {
    // Loop all (infinite) - blue icon
    icon.innerHTML = '<path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>';
    loopBtn.classList.remove('text-neutral-400', 'text-blue-400');
    loopBtn.classList.add('text-blue-400');
    loopBtn.title = 'Loop Mode: Infinite (Current Song)';
  } else if (loopMode === 'one') {
    // Loop one - blue icon with "1" badge
    icon.innerHTML = '<path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/><circle cx="12" cy="12" r="4" fill="currentColor"/><text x="12" y="12" text-anchor="middle" dominant-baseline="central" fill="var(--background)" font-size="6" font-weight="bold">1</text>';
    loopBtn.classList.remove('text-neutral-400', 'text-blue-400');
    loopBtn.classList.add('text-blue-400');
    loopBtn.title = 'Loop Mode: Once (Play Twice)';
  }
}

/**
 * Initialize loop control
 */
export function initLoopControl() {
  const loopBtn = document.getElementById('loop-btn');
  if (!loopBtn) return;
  
  loopBtn.addEventListener('click', () => {
    // Cycle through modes: none -> all -> one -> none
    if (loopMode === 'none') {
      loopMode = 'all';
    } else if (loopMode === 'all') {
      loopMode = 'one';
    } else {
      loopMode = 'none';
    }
    updateLoopButtonDisplay();
  });
  
  updateLoopButtonDisplay();
}

/**
 * Get current loop mode
 */
export function getLoopMode() {
  return loopMode;
}

/**
 * Set loop mode
 */
export function setLoopMode(mode) {
  loopMode = mode;
}