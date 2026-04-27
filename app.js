const M3U_URL = 'https://iptv-org.github.io/iptv/index.m3u';
const CHANNELS_PER_PAGE = 60;

let allChannels = [];
let filteredChannels = [];
let currentPage = 1;
let groups = new Set();
let activeCard = null;
let currentGroup = localStorage.getItem('iptv_current_group') || 'All';
let favorites = JSON.parse(localStorage.getItem('iptv_favorites')) || [];

// DOM Elements
const grid = document.getElementById('channels-grid');
const loader = document.getElementById('loader');
const searchInput = document.getElementById('search-input');
const voiceSearchIcon = document.getElementById('voice-search-icon');
const searchIcon = document.getElementById('search-icon');
const clearSearchIcon = document.getElementById('clear-search-icon');
const dropdownTrigger = document.getElementById('dropdown-trigger');
const dropdownSelected = document.getElementById('dropdown-selected');
const dropdownMenu = document.getElementById('dropdown-menu');
const channelCountSpan = document.getElementById('channel-count');
const paginationControls = document.getElementById('pagination-controls');
const prevBtn = document.getElementById('prev-page');
const nextBtn = document.getElementById('next-page');
const pageInfo = document.getElementById('page-info');

// Player Elements
const video = document.getElementById('video-player');
const playerOverlay = document.getElementById('player-overlay');
const currentNameEl = document.getElementById('current-channel-name');
const currentGroupEl = document.getElementById('current-channel-group');

let hls = null;

async function init() {
    try {
        const response = await fetch(M3U_URL);
        if (!response.ok) throw new Error('Failed to fetch playlist');
        
        const m3uText = await response.text();
        parseM3U(m3uText);
        
        filteredChannels = [...allChannels];
        populateGroups();
        
        // Initialize dropdown state
        if (currentGroup) {
            dropdownSelected.textContent = currentGroup === 'All' ? 'All Categories' : currentGroup;
        } else {
            currentGroup = 'All';
            dropdownSelected.textContent = 'All Categories';
        }
        
        loader.style.display = 'none';
        
        if (allChannels.length > 0) {
            applyFilters();
            setupEventListeners();
            
            // Auto-play 'Aaj Tak' using the provided custom high-quality stream URL
            const defaultChannel = {
                name: 'Aaj Tak HD',
                group: 'News',
                url: 'https://feeds.intoday.in/aajtak/api/aajtakhd/master.m3u8',
                logo: ''
            };
            playChannel(defaultChannel, null);
        } else {
            grid.innerHTML = '<p>No channels found in the playlist.</p>';
        }
    } catch (error) {
        console.error("Error loading channels:", error);
        loader.innerHTML = `<p style="color: #ef4444;">Error loading channels: ${error.message}</p>`;
    }
}

function parseM3U(data) {
    const lines = data.split('\n');
    let currentChannel = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line.startsWith('#EXTINF:')) {
            // Extract info
            currentChannel = {};
            
            // Extract logo
            const logoMatch = line.match(/tvg-logo="([^"]+)"/);
            currentChannel.logo = logoMatch ? logoMatch[1] : '';
            
            // Extract group
            const groupMatch = line.match(/group-title="([^"]+)"/);
            currentChannel.group = groupMatch ? groupMatch[1] : 'Undefined';
            
            if (currentChannel.group && currentChannel.group !== 'Undefined') {
                const individualGroups = currentChannel.group.split(';');
                individualGroups.forEach(g => {
                    const trimmedGroup = g.trim();
                    if (trimmedGroup) groups.add(trimmedGroup);
                });
            } else if (currentChannel.group === 'Undefined') {
                groups.add('Undefined');
            }
            
            // Extract name (everything after the comma)
            const commaIndex = line.lastIndexOf(',');
            currentChannel.name = commaIndex !== -1 ? line.substring(commaIndex + 1).trim() : 'Unknown Channel';
            
        } else if (line !== '' && !line.startsWith('#') && currentChannel) {
            currentChannel.url = line;
            allChannels.push(currentChannel);
            currentChannel = null; // Reset for next
        }
    }
    
    // Sort alphabetically
    groups = Array.from(groups).sort();
}

function populateGroups() {
    dropdownMenu.innerHTML = '';
    
    // Add All
    const allBtn = document.createElement('button');
    allBtn.className = `dropdown-item ${currentGroup === 'All' ? 'active' : ''}`;
    allBtn.dataset.value = 'All';
    allBtn.textContent = 'All Categories';
    dropdownMenu.appendChild(allBtn);
    
    // Add Favorites
    const favBtn = document.createElement('button');
    favBtn.className = `dropdown-item ${currentGroup === 'Favorites' ? 'active' : ''}`;
    favBtn.dataset.value = 'Favorites';
    favBtn.innerHTML = '⭐ Favorites';
    dropdownMenu.appendChild(favBtn);

    groups.forEach(group => {
        const btn = document.createElement('button');
        btn.className = `dropdown-item ${currentGroup === group ? 'active' : ''}`;
        btn.dataset.value = group;
        btn.textContent = group;
        dropdownMenu.appendChild(btn);
    });
}

function renderPage() {
    grid.innerHTML = '';
    
    const totalPages = Math.ceil(filteredChannels.length / CHANNELS_PER_PAGE);
    
    // Safety check
    if (currentPage > totalPages) currentPage = totalPages || 1;
    
    const startIdx = (currentPage - 1) * CHANNELS_PER_PAGE;
    const endIdx = Math.min(startIdx + CHANNELS_PER_PAGE, filteredChannels.length);
    
    const channelsToRender = filteredChannels.slice(startIdx, endIdx);
    
    const fragment = document.createDocumentFragment();
    
    channelsToRender.forEach(channel => {
        const card = document.createElement('div');
        card.className = 'channel-card';
        
        // Handle broken logos by falling back to text
        const logoHtml = channel.logo 
            ? `<img src="${channel.logo}" class="channel-logo" alt="${channel.name}" onerror="this.onerror=null; this.outerHTML='<div class=\\'channel-logo fallback\\'><i class=\\'ph ph-television\\'></i></div>'">`
            : `<div class="channel-logo fallback"><i class="ph ph-television"></i></div>`;
            
        card.innerHTML = `
            ${logoHtml}
            <button class="fav-btn ${favorites.includes(channel.url) ? 'active' : ''}" data-url="${channel.url}">
                <i class="ph-fill ph-star"></i>
            </button>
            <div class="channel-info">
                <div class="channel-name" title="${channel.name}">${channel.name}</div>
                <div class="channel-group">${channel.group ? channel.group.split(';').join(', ') : 'Undefined'}</div>
            </div>
        `;
        
        card.addEventListener('click', () => {
            playChannel(channel, card);
        });
        
        const favBtn = card.querySelector('.fav-btn');
        favBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const url = channel.url;
            if (favorites.includes(url)) {
                favorites = favorites.filter(f => f !== url);
                favBtn.classList.remove('active');
            } else {
                favorites.push(url);
                favBtn.classList.add('active');
            }
            localStorage.setItem('iptv_favorites', JSON.stringify(favorites));
            
            if (currentGroup === 'Favorites') {
                applyFilters();
            }
        });
        
        fragment.appendChild(card);
    });
    
    grid.appendChild(fragment);
    
    // Update UI stats
    channelCountSpan.textContent = filteredChannels.length;
    
    // Pagination UI
    if (totalPages > 1) {
        paginationControls.style.display = 'flex';
        pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage === totalPages;
    } else {
        paginationControls.style.display = 'none';
    }
}

function playChannel(channel, cardElement) {
    // Update UI
    if (activeCard) {
        activeCard.classList.remove('active');
    }
    
    if (cardElement) {
        cardElement.classList.add('active');
        activeCard = cardElement;
    } else {
        activeCard = null;
    }
    
    currentNameEl.textContent = channel.name;
    currentGroupEl.textContent = channel.group ? channel.group.split(';').join(', ') : 'Undefined';
    playerOverlay.style.opacity = '0';
    
    const videoSrc = channel.url;
    
    if (Hls.isSupported()) {
        if (hls) {
            hls.destroy();
        }
        hls = new Hls({
            // Increase robustness for potentially unstable IPTV streams
            maxLoadingDelay: 4,
            minAutoBitrate: 0,
        });
        hls.loadSource(videoSrc);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, function() {
            video.volume = 1.0;
            video.muted = false;
            const playPromise = video.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.log("Autoplay prevented by browser. User must click to play.");
                    playerOverlay.style.opacity = '1';
                    playerOverlay.style.pointerEvents = 'auto';
                    playerOverlay.innerHTML = '<div style="cursor: pointer; display: flex; flex-direction: column; align-items: center;"><i class="ph ph-play-circle" style="font-size: 4rem; color: var(--primary); transition: transform 0.2s;"></i><p style="margin-top: 1rem; font-weight: 500;">Click anywhere to start video</p></div>';
                    
                    playerOverlay.onclick = () => {
                        video.play();
                        playerOverlay.style.opacity = '0';
                        playerOverlay.style.pointerEvents = 'none';
                    };
                });
            }
        });
        
        hls.on(Hls.Events.ERROR, function (event, data) {
            if (data.fatal) {
                switch (data.type) {
                    case Hls.ErrorTypes.NETWORK_ERROR:
                        console.log("fatal network error encountered, try to recover");
                        hls.startLoad();
                        break;
                    case Hls.ErrorTypes.MEDIA_ERROR:
                        console.log("fatal media error encountered, try to recover");
                        hls.recoverMediaError();
                        break;
                    default:
                        // cannot recover
                        hls.destroy();
                        playerOverlay.style.opacity = '1';
                        playerOverlay.innerHTML = '<i class="ph ph-warning-circle" style="color: #ef4444;"></i><p>Stream unavailable or blocked by CORS.</p>';
                        break;
                }
            }
        });
    }
    // Safari supports HLS natively
    else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = videoSrc;
        video.addEventListener('loadedmetadata', function() {
            video.volume = 1.0;
            video.muted = false;
            const playPromise = video.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.log("Autoplay prevented by browser. User must click to play.");
                    playerOverlay.style.opacity = '1';
                    playerOverlay.style.pointerEvents = 'auto';
                    playerOverlay.innerHTML = '<div style="cursor: pointer; display: flex; flex-direction: column; align-items: center;"><i class="ph ph-play-circle" style="font-size: 4rem; color: var(--primary); transition: transform 0.2s;"></i><p style="margin-top: 1rem; font-weight: 500;">Click anywhere to start video</p></div>';
                    
                    playerOverlay.onclick = () => {
                        video.play();
                        playerOverlay.style.opacity = '0';
                        playerOverlay.style.pointerEvents = 'none';
                    };
                });
            }
        });
    }
}

function applyFilters() {
    const searchTerm = searchInput.value.toLowerCase();
    
    filteredChannels = allChannels.filter(channel => {
        const matchesSearch = channel.name.toLowerCase().includes(searchTerm);
        let matchesGroup = false;
        
        if (currentGroup === 'All') {
            matchesGroup = true;
        } else if (currentGroup === 'Favorites') {
            matchesGroup = favorites.includes(channel.url);
        } else {
            const channelGroups = channel.group ? channel.group.split(';').map(g => g.trim()) : [];
            matchesGroup = channelGroups.includes(currentGroup);
        }
        
        return matchesSearch && matchesGroup;
    });
    
    currentPage = 1;
    renderPage();
}

function updateSearchUI() {
    const hasText = searchInput.value.length > 0;
    const isRecording = voiceSearchIcon && voiceSearchIcon.classList.contains('recording');

    if (isRecording) {
        if (voiceSearchIcon) voiceSearchIcon.style.display = 'block';
        if (searchIcon) searchIcon.style.display = 'none';
        if (clearSearchIcon) clearSearchIcon.style.display = 'none';
    } else if (hasText) {
        if (voiceSearchIcon) voiceSearchIcon.style.display = 'none';
        if (searchIcon) searchIcon.style.display = 'none';
        if (clearSearchIcon) clearSearchIcon.style.display = 'block';
    } else {
        if (voiceSearchIcon) voiceSearchIcon.style.display = 'block';
        if (searchIcon) searchIcon.style.display = 'block';
        if (clearSearchIcon) clearSearchIcon.style.display = 'none';
    }
}

function setupEventListeners() {
    searchInput.addEventListener('input', () => {
        updateSearchUI();
        // Debounce search slightly for performance
        clearTimeout(window.searchTimeout);
        window.searchTimeout = setTimeout(applyFilters, 300);
    });

    if (clearSearchIcon) {
        clearSearchIcon.addEventListener('click', () => {
            searchInput.value = '';
            updateSearchUI();
            applyFilters();
            searchInput.focus();
        });
    }
    
    // Voice Search setup
    if (voiceSearchIcon) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            
            voiceSearchIcon.addEventListener('click', () => {
                if (voiceSearchIcon.classList.contains('recording')) {
                    recognition.stop();
                    return;
                }
                
                try {
                    recognition.start();
                    voiceSearchIcon.classList.add('recording');
                    searchInput.placeholder = "Listening...";
                    updateSearchUI();
                } catch (e) {
                    console.error("Speech recognition error:", e);
                }
            });
            
            recognition.addEventListener('result', (e) => {
                const transcript = e.results[0][0].transcript;
                // Clean up punctuation sometimes added by speech engines
                searchInput.value = transcript.replace(/[.,!?]$/, '');
                updateSearchUI();
                applyFilters();
            });
            
            recognition.addEventListener('end', () => {
                voiceSearchIcon.classList.remove('recording');
                searchInput.placeholder = "Search channels...";
                updateSearchUI();
            });
            
            recognition.addEventListener('error', (e) => {
                console.error('Speech recognition error:', e.error);
                voiceSearchIcon.classList.remove('recording');
                searchInput.placeholder = "Search channels...";
                updateSearchUI();
            });
        } else {
            // Hide icon if browser doesn't support Web Speech API
            voiceSearchIcon.style.display = 'none';
        }
    }
    
    dropdownTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownMenu.classList.toggle('show');
    });

    document.addEventListener('click', () => {
        dropdownMenu.classList.remove('show');
    });

    dropdownMenu.addEventListener('click', (e) => {
        const item = e.target.closest('.dropdown-item');
        if (!item) return;

        dropdownMenu.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');

        currentGroup = item.dataset.value;
        dropdownSelected.textContent = item.textContent === '⭐ Favorites' ? 'Favorites' : item.textContent;
        dropdownMenu.classList.remove('show');
        
        localStorage.setItem('iptv_current_group', currentGroup);
        applyFilters();
    });
    
    prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderPage();
            grid.scrollTop = 0;
        }
    });
    
    nextBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(filteredChannels.length / CHANNELS_PER_PAGE);
        if (currentPage < totalPages) {
            currentPage++;
            renderPage();
            grid.scrollTop = 0;
        }
    });
}

// Start the app
document.addEventListener('DOMContentLoaded', init);
