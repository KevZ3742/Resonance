/**
 * Initialize previous/next buttons
 */
export function initNavigationButtons() {
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');

  prevBtn.addEventListener('click', async () => {
    if (!window.queueManager || window.queueManager.getQueue().length === 0) {
      return;
    }
    
    if (window.queueManager) {
      await window.queueManager.playPrevious();
    }
  });

  nextBtn.addEventListener('click', async () => {
    if (!window.queueManager || window.queueManager.getQueue().length === 0) {
      return;
    }
    
    if (window.queueManager) {
      await window.queueManager.playNext();
    }
  });
}