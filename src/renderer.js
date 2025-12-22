import './index.css';

// Tab switching functionality
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabButtons.forEach(button => {
  button.addEventListener('click', () => {
    const tabName = button.getAttribute('data-tab');
    
    // Remove active class from all buttons and hide all content
    tabButtons.forEach(btn => btn.classList.remove('active', 'border-b-2', 'border-blue-500'));
    tabContents.forEach(content => content.classList.add('hidden'));
    
    // Add active class to clicked button and show corresponding content
    button.classList.add('active', 'border-b-2', 'border-blue-500');
    document.getElementById(`${tabName}-tab`).classList.remove('hidden');
  });
});

// Set initial active state
document.querySelector('.tab-btn.active').classList.add('border-b-2', 'border-blue-500');

// Music player controls
const playPauseBtn = document.getElementById('play-pause-btn');
const playIcon = document.getElementById('play-icon');
const pauseIcon = document.getElementById('pause-icon');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const volumeSlider = document.getElementById('volume-slider');
const volumeBtn = document.getElementById('volume-btn');
const volumeContainer = document.querySelector('.volume-container');
const progressBar = document.getElementById('progress-bar');
const progress = document.getElementById('progress');

let isPlaying = false;

playPauseBtn.addEventListener('click', () => {
  isPlaying = !isPlaying;
  
  if (isPlaying) {
    playIcon.classList.add('hidden');
    pauseIcon.classList.remove('hidden');
  } else {
    playIcon.classList.remove('hidden');
    pauseIcon.classList.add('hidden');
  }
});

prevBtn.addEventListener('click', () => {
  console.log('Previous track');
});

nextBtn.addEventListener('click', () => {
  console.log('Next track');
});

volumeSlider.addEventListener('input', (e) => {
  console.log('Volume:', e.target.value);
});

progressBar.addEventListener('click', (e) => {
  const rect = progressBar.getBoundingClientRect();
  const percent = (e.clientX - rect.left) / rect.width * 100;
  progress.style.width = `${percent}%`;
});

// Search functionality
const searchInput = document.getElementById('search-input');
searchInput.addEventListener('input', (e) => {
  console.log('Search:', e.target.value);
});

console.log('🎵 Resonance Music Player loaded');