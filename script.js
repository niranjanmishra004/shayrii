// ==========================================
// DASTAAN — SHAYARI PORTAL LOGIC & STORAGE
// ==========================================

// --- 1. IndexedDB Helper for Storing Audio Recitations ---
const AudioDB = {
    dbName: 'DastaanAudioDB',
    version: 1,
    storeName: 'audio_recitations',

    open() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName);
                }
            };
        });
    },

    async save(id, audioBlob) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(this.storeName, 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.put(audioBlob, id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    async get(id) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(this.storeName, 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async delete(id) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(this.storeName, 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    async clearAll() {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(this.storeName, 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
};

// --- 2. Initial Seed Data (Poetry Masterpieces) ---
const seedShayaris = [
    {
        id: "seed-1",
        title: "Koshish",
        content: "Hazaron khwaishein aisi ki har khwaish pe dam nikle,\nBohat niklay mere arman, lekin phir bhi kam nikle.",
        category: "Life",
        tags: ["ghalib", "khwaish", "zindagi"],
        style: "gold",
        date: "2026-05-28",
        isFavorite: true
    },
    {
        id: "seed-2",
        title: "Gham-e-Dil",
        content: "दिल से तेरी निगाह जिगर तक उतर गई,\nदोनों को एक अदा में रज़ामंद कर गई।",
        category: "Love",
        tags: ["dil", "mohabbat", "nazar"],
        style: "sunset",
        date: "2026-05-27",
        isFavorite: false
    },
    {
        id: "seed-3",
        title: "Umeed",
        content: "Chalte chalte thak ke jis mod pe baith jaate hain,\nWahin se naye safar ki shuruaat ho jaati hai.",
        category: "Life",
        tags: ["safar", "zindagi", "umeed"],
        style: "forest",
        date: "2026-05-26",
        isFavorite: false
    }
];

const poetrySparks = [
    { quote: "The pen is the tongue of the soul; as the thoughts of the soul are, so will the words of the pen be.", author: "Miguel de Cervantes" },
    { quote: "Dono jahan teri mohabbat mein haar ke, woh ja raha hai koi shab-e-gham guzar ke.", author: "Faiz Ahmad Faiz" },
    { quote: "Dil napaak to dil ki baatein napaak, Rooh napaak to rooh ki baatein napaak.", author: "Bulleh Shah" },
    { quote: "Poetry is the spontaneous overflow of powerful feelings: it takes its origin from emotion recollected in tranquility.", author: "William Wordsworth" },
    { quote: "Kuch to tanhai ka ehsaas tha pehle se humein, Kuch teri yaad ne deewana bana rakha hai.", author: "Gulzar" },
    { quote: "Bada mushkil hai khud ko har pal zinda rakhna, Har saans mein thoda gham-e-dil piyo to sahi.", author: "Aseem" }
];

// --- 3. App State & LocalStorage Keys ---
let shayaris = [];
let currentTab = 'feed';
let activeCategoryFilter = 'all';
let currentTheme = 'dark';
let profile = {
    name: 'Niranjan',
    title: 'Poet & Storyteller'
};

// Audio Recorder State variables
let mediaRecorder = null;
let audioChunks = [];
let audioBlob = null;
let recordingTimer = null;
let recordingSeconds = 0;
let isRecording = false;
let currentPlayingAudio = null;
let currentPlayingBtn = null;

// --- 4. Selectors ---
const DOM = {
    navItems: document.querySelectorAll('.nav-item'),
    tabContents: document.querySelectorAll('.tab-content'),
    shayariGrid: document.getElementById('shayariGrid'),
    noDataPlaceholder: document.getElementById('noDataPlaceholder'),
    searchInput: document.getElementById('searchInput'),
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    quickWriteBtn: document.getElementById('quickWriteBtn'),
    placeholderWriteBtn: document.getElementById('placeholderWriteBtn'),
    categoriesFilterContainer: document.getElementById('categoriesFilterContainer'),
    featuredContainer: document.getElementById('featuredContainer'),
    featuredCard: document.getElementById('featuredCard'),
    
    // Form & Composer
    shayariForm: document.getElementById('shayariForm'),
    editShayariId: document.getElementById('editShayariId'),
    shayariTitle: document.getElementById('shayariTitle'),
    shayariContent: document.getElementById('shayariContent'),
    shayariCategory: document.getElementById('shayariCategory'),
    shayariTags: document.getElementById('shayariTags'),
    visualOptions: document.querySelectorAll('.visual-option'),
    charCount: document.getElementById('charCount'),
    lineCount: document.getElementById('lineCount'),
    cancelComposeBtn: document.getElementById('cancelComposeBtn'),
    saveShayariBtn: document.getElementById('saveShayariBtn'),
    submitBtnText: document.getElementById('submitBtnText'),
    
    // Live Preview
    livePreviewCard: document.getElementById('livePreviewCard'),
    previewTitle: document.getElementById('previewTitle'),
    previewContent: document.getElementById('previewContent'),
    previewDate: document.getElementById('previewDate'),
    previewAuthor: document.getElementById('previewAuthor'),
    
    // Audio Recorder
    recordBtn: document.getElementById('recordBtn'),
    recordText: document.getElementById('recordText'),
    recordingStatus: document.getElementById('recordingStatus'),
    recordTimer: document.getElementById('recordTimer'),
    audioPlaybackContainer: document.getElementById('audioPlaybackContainer'),
    audioPlayback: document.getElementById('audioPlayback'),
    deleteAudioBtn: document.getElementById('deleteAudioBtn'),
    
    // Profile Elements
    profileName: document.getElementById('profileName'),
    profileTitle: document.getElementById('profileTitle'),
    openProfileModal: document.getElementById('openProfileModal'),
    profileModal: document.getElementById('profileModal'),
    closeProfileModal: document.getElementById('closeProfileModal'),
    cancelProfileModal: document.getElementById('cancelProfileModal'),
    modalSettingsName: document.getElementById('modalSettingsName'),
    modalSettingsTitle: document.getElementById('modalSettingsTitle'),
    saveProfileModalBtn: document.getElementById('saveProfileModalBtn'),
    
    // Insights
    statTotalCount: document.getElementById('statTotalCount'),
    statRecordedCount: document.getElementById('statRecordedCount'),
    statFavoriteCount: document.getElementById('statFavoriteCount'),
    categoryBreakdownList: document.getElementById('categoryBreakdownList'),
    inspirationQuote: document.getElementById('inspirationQuote'),
    inspirationAuthor: document.querySelector('.inspiration-author'),
    newQuoteBtn: document.getElementById('newQuoteBtn'),
    
    // Settings
    settingsName: document.getElementById('settingsName'),
    settingsTitle: document.getElementById('settingsTitle'),
    saveProfileBtn: document.getElementById('saveProfileBtn'),
    exportDataBtn: document.getElementById('exportDataBtn'),
    importDataFile: document.getElementById('importDataFile'),
    resetDataBtn: document.getElementById('resetDataBtn'),
    
    toastContainer: document.getElementById('toastContainer')
};

// --- 5. Application Init & Core Events ---
document.addEventListener('DOMContentLoaded', async () => {
    loadSettings();
    await loadShayaris();
    initTheme();
    setupNavigation();
    setupFormListeners();
    setupAudioRecording();
    setupModalListeners();
    setupSettingsTab();
    setupSparks();
    
    // Initialize premium sanctuary greeting message
    updateSanctuaryGreeting();
    
    // Load initial counts
    updateInsights();
});

// --- 6. Toast Notification Manager ---
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconClass = 'fa-circle-check';
    if (type === 'danger') iconClass = 'fa-circle-exclamation';
    if (type === 'info') iconClass = 'fa-circle-info';
    
    toast.innerHTML = `
        <i class="fa-solid ${iconClass}"></i>
        <span>${message}</span>
    `;
    
    DOM.toastContainer.appendChild(toast);
    
    // Auto remove
    setTimeout(() => {
        toast.classList.add('hide');
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }, 3500);
}

// --- 7. Theme Management ---
function initTheme() {
    const storedTheme = localStorage.getItem('dastaan_theme') || 'dark';
    setTheme(storedTheme);

    DOM.themeToggleBtn.addEventListener('click', () => {
        const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(nextTheme);
        showToast(`Switched to ${nextTheme === 'dark' ? 'Dark' : 'Light'} Mode`, 'info');
    });
}

function setTheme(theme) {
    currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('dastaan_theme', theme);
    
    const icon = DOM.themeToggleBtn.querySelector('i');
    if (theme === 'dark') {
        icon.className = 'fa-solid fa-moon';
    } else {
        icon.className = 'fa-solid fa-sun';
    }
}

// --- 8. Profile Setup & Management ---
function loadSettings() {
    const storedProfile = localStorage.getItem('dastaan_profile');
    if (storedProfile) {
        profile = JSON.parse(storedProfile);
    }
    
    // Lock default author signature to Niranjan
    profile.name = 'Niranjan';
    profile.title = 'Poet & Storyteller';
    
    updateProfileUI();
}

// Generate premium time-based greetings dynamically for Niranjan's sanctuary hero
function updateSanctuaryGreeting() {
    const greetingEl = document.getElementById('sanctuaryGreeting');
    if (!greetingEl) return;
    
    const hour = new Date().getHours();
    let message = "";
    if (hour < 5) {
        message = "Writing under the quiet stars... The night is deep, and so are the ash'aar. Welcome, Niranjan.";
    } else if (hour < 12) {
        message = "A new dawn bringing fresh light for beautiful couplets. Good morning, Niranjan.";
    } else if (hour < 17) {
        message = "Let the afternoon light flow through your verses. Welcome to your sanctuary, Niranjan.";
    } else if (hour < 21) {
        message = "The gentle twilight hours speak in poetry. Good evening, Niranjan.";
    } else {
        message = "The silence of the night holds a thousand secret verses. Good night, Niranjan.";
    }
    
    greetingEl.textContent = message;
}

function updateProfileUI() {
    DOM.profileName.textContent = profile.name;
    DOM.profileTitle.textContent = profile.title;
    
    // Set placeholder author signature on Preview and Settings inputs safely
    DOM.previewAuthor.textContent = `— ${profile.name}`;
    if (DOM.settingsName) DOM.settingsName.value = profile.name;
    if (DOM.settingsTitle) DOM.settingsTitle.value = profile.title;
    if (DOM.modalSettingsName) DOM.modalSettingsName.value = profile.name;
    if (DOM.modalSettingsTitle) DOM.modalSettingsTitle.value = profile.title;
}

function saveProfile(name, title) {
    if (!name.trim()) return;
    profile.name = name.trim();
    profile.title = title.trim() || 'Poet & Storyteller';
    
    localStorage.setItem('dastaan_profile', JSON.stringify(profile));
    updateProfileUI();
    
    // Update live preview author
    DOM.previewAuthor.textContent = `— ${profile.name}`;
    
    // Refresh library grid to show updated signature
    renderShayariGrid();
    showToast('Writer profile updated successfully!');
}

function setupModalListeners() {
    if (DOM.openProfileModal) {
        DOM.openProfileModal.addEventListener('click', () => {
            if (DOM.modalSettingsName) DOM.modalSettingsName.value = profile.name;
            if (DOM.modalSettingsTitle) DOM.modalSettingsTitle.value = profile.title;
            if (DOM.profileModal) DOM.profileModal.classList.add('active');
        });
    }

    const closeModal = () => {
        if (DOM.profileModal) DOM.profileModal.classList.remove('active');
    };

    if (DOM.closeProfileModal) DOM.closeProfileModal.addEventListener('click', closeModal);
    if (DOM.cancelProfileModal) DOM.cancelProfileModal.addEventListener('click', closeModal);
    if (DOM.profileModal) {
        DOM.profileModal.addEventListener('click', (e) => {
            if (e.target === DOM.profileModal) closeModal();
        });
    }

    if (DOM.saveProfileModalBtn) {
        DOM.saveProfileModalBtn.addEventListener('click', () => {
            if (DOM.modalSettingsName && DOM.modalSettingsTitle) {
                saveProfile(DOM.modalSettingsName.value, DOM.modalSettingsTitle.value);
            }
            closeModal();
        });
    }
}

// --- 9. Navigation / Tab Management ---
function setupNavigation() {
    DOM.navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = item.getAttribute('data-tab');
            switchTab(tabId);
        });
    });

    DOM.quickWriteBtn.addEventListener('click', () => {
        resetComposerForm();
        switchTab('create');
    });

    DOM.placeholderWriteBtn.addEventListener('click', () => {
        resetComposerForm();
        switchTab('create');
    });
}

function switchTab(tabId) {
    currentTab = tabId;
    
    // Sync navigation highlight
    DOM.navItems.forEach(item => {
        if (item.getAttribute('data-tab') === tabId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // Toggle content visibility
    DOM.tabContents.forEach(content => {
        if (content.id === `tab-${tabId}`) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });

    // Run actions associated with tabs
    if (tabId === 'feed') {
        renderShayariGrid();
    } else if (tabId === 'analytics') {
        updateInsights();
    } else if (tabId === 'create') {
        updateLivePreview();
    }
}

// --- 10. Shayari Storage & Loading ---
async function loadShayaris() {
    const stored = localStorage.getItem('dastaan_shayaris');
    if (stored) {
        shayaris = JSON.parse(stored);
    } else {
        // First run: Use seeds!
        shayaris = [...seedShayaris];
        saveShayarisToStorage();
    }
    
    renderShayariGrid();
}

function saveShayarisToStorage() {
    localStorage.setItem('dastaan_shayaris', JSON.stringify(shayaris));
}

// --- 11. Shayari Grid Rendering & Interaction ---
function renderShayariGrid() {
    // 1. Clear grid except for the empty state placeholder
    const cards = DOM.shayariGrid.querySelectorAll('.shayari-card');
    cards.forEach(c => c.remove());

    // 2. Filter & Search
    let filtered = [...shayaris];
    
    // Sort chronologically (newest first)
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Category filter
    if (activeCategoryFilter !== 'all') {
        filtered = filtered.filter(s => s.category === activeCategoryFilter);
    }

    // Search query matching
    const query = DOM.searchInput.value.toLowerCase().trim();
    if (query) {
        filtered = filtered.filter(s => 
            s.content.toLowerCase().includes(query) || 
            (s.title && s.title.toLowerCase().includes(query)) ||
            s.category.toLowerCase().includes(query) ||
            s.tags.some(t => t.toLowerCase().includes(query))
        );
    }

    // Toggle Empty state placeholder
    if (filtered.length === 0) {
        DOM.noDataPlaceholder.style.display = 'flex';
    } else {
        DOM.noDataPlaceholder.style.display = 'none';
        
        // Show featured card on feed page if appropriate
        setupFeaturedCard(filtered);

        // Render card nodes
        filtered.forEach(s => {
            const card = createShayariCardElement(s);
            DOM.shayariGrid.appendChild(card);
        });
    }
}

// Helper to render visual card background gradients
function getStyleClass(styleName) {
    const maps = {
        'deep-space': 'visuals-deep-space',
        'sunset': 'visuals-sunset',
        'forest': 'visuals-forest',
        'ocean': 'visuals-ocean',
        'gold': 'visuals-gold',
        'crimson': 'visuals-crimson'
    };
    return maps[styleName] || 'visuals-deep-space';
}

function createShayariCardElement(s) {
    const cardDiv = document.createElement('div');
    cardDiv.className = `shayari-card visuals-${s.style || 'deep-space'}`;
    cardDiv.setAttribute('data-id', s.id);

    // Tags strings
    const tagsHTML = s.tags.length > 0 
        ? `<div class="card-tags">${s.tags.map(t => `<span class="card-tag">#${t}</span>`).join('')}</div>`
        : '';

    // Audio narration play button if recitation is available
    // (We will asynchronously check if an audio narration exists in IndexedDB)
    const audioBtnId = `audio-btn-${s.id}`;
    
    // Construct HTML template
    cardDiv.innerHTML = `
        <div class="card-header">
            <span class="card-category">${s.category}</span>
            <div class="card-actions-top">
                <button class="card-action-btn fav-btn ${s.isFavorite ? 'active' : ''}" title="Bookmark Verse">
                    <i class="fa-solid fa-heart"></i>
                </button>
                <button class="card-action-btn edit-btn" title="Edit Entry">
                    <i class="fa-solid fa-edit"></i>
                </button>
                <button class="card-action-btn delete-btn" title="Delete Entry">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
        </div>

        <div class="card-content-body">
            <div class="card-ornament">❦</div>
            ${s.title ? `<h4 class="card-title">${s.title}</h4>` : ''}
            <div class="card-verses">${s.content}</div>
            <div class="card-ornament">❦</div>
            ${tagsHTML}
        </div>

        <div class="card-footer">
            <div class="card-meta-left">
                <span class="card-author">— ${profile.name}</span>
                <span class="card-date">${formatDate(s.date)}</span>
            </div>
            <div class="card-actions-bottom">
                <button class="action-btn-pill audio-play-btn" id="${audioBtnId}" style="display: none;" title="Play narration">
                    <i class="fa-solid fa-play"></i>
                    <span>Listen</span>
                </button>
                <button class="action-btn-pill copy-btn" title="Copy Text">
                    <i class="fa-solid fa-copy"></i>
                    <span>Copy</span>
                </button>
                <button class="action-btn-pill download-btn" title="Download Card Image">
                    <i class="fa-solid fa-download"></i>
                    <span>Save Image</span>
                </button>
            </div>
        </div>
    `;

    // Asynchronously verify if recitation exists
    AudioDB.get(s.id).then(audioBlob => {
        if (audioBlob) {
            const playBtn = cardDiv.querySelector(`#${audioBtnId}`);
            if (playBtn) playBtn.style.display = 'inline-flex';
        }
    }).catch(err => console.warn('Could not read recitation status: ', err));

    // Attach interaction handlers
    attachCardListeners(cardDiv, s);

    return cardDiv;
}

// Format Dates: e.g., "May 28, 2026"
function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

function attachCardListeners(cardElement, s) {
    // Favorite Button
    const favBtn = cardElement.querySelector('.fav-btn');
    favBtn.addEventListener('click', () => {
        s.isFavorite = !s.isFavorite;
        favBtn.classList.toggle('active', s.isFavorite);
        saveShayarisToStorage();
        updateInsights();
        showToast(s.isFavorite ? 'Verse added to Favorites!' : 'Verse removed from Favorites', 'info');
    });

    // Delete Button
    const deleteBtn = cardElement.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', async () => {
        if (confirm('Are you sure you want to delete this beautiful verse? This cannot be undone.')) {
            // Remove from state array
            shayaris = shayaris.filter(item => item.id !== s.id);
            saveShayarisToStorage();

            // Clear audio recording from IndexedDB
            await AudioDB.delete(s.id);

            // Re-render
            renderShayariGrid();
            updateInsights();
            showToast('Shayari deleted.', 'danger');
        }
    });

    // Edit Button
    const editBtn = cardElement.querySelector('.edit-btn');
    editBtn.addEventListener('click', async () => {
        // Populates compose fields
        DOM.editShayariId.value = s.id;
        DOM.shayariTitle.value = s.title || '';
        DOM.shayariContent.value = s.content;
        DOM.shayariCategory.value = s.category;
        DOM.shayariTags.value = s.tags.join(', ');
        
        // Setup style picker
        DOM.visualOptions.forEach(opt => {
            if (opt.getAttribute('data-style') === s.style) {
                opt.classList.add('active');
            } else {
                opt.classList.remove('active');
            }
        });

        // Set action button text
        DOM.submitBtnText.textContent = 'Save Changes';

        // Load Audio narration from DB if it exists
        try {
            audioBlob = await AudioDB.get(s.id);
            if (audioBlob) {
                const url = URL.createObjectURL(audioBlob);
                DOM.audioPlayback.src = url;
                DOM.audioPlaybackContainer.style.display = 'flex';
                DOM.recordText.textContent = 'Re-record Recitation';
            } else {
                clearAudioPlayback();
            }
        } catch(e) {
            clearAudioPlayback();
        }

        // Switch to Write page
        switchTab('create');
        updateLivePreview();
        showToast('Editing verse...', 'info');
    });

    // Copy to clipboard
    const copyBtn = cardElement.querySelector('.copy-btn');
    copyBtn.addEventListener('click', () => {
        const titleStr = s.title ? `${s.title}\n\n` : '';
        const signature = `\n\n— Written by ${profile.name}`;
        const fullContent = titleStr + s.content + signature;
        
        navigator.clipboard.writeText(fullContent)
            .then(() => showToast('Couplets copied to clipboard!'))
            .catch(() => showToast('Copy failed. Please try manually.', 'danger'));
    });

    // Download Card as PNG Image
    const downloadBtn = cardElement.querySelector('.download-btn');
    downloadBtn.addEventListener('click', () => {
        downloadShayariAsCardImage(s);
    });

    // Play Recitation Button
    const playBtn = cardElement.querySelector('.audio-play-btn');
    if (playBtn) {
        playBtn.addEventListener('click', async () => {
            // If already playing this, pause it
            if (currentPlayingAudio && currentPlayingBtn === playBtn) {
                stopPlayingCurrentAudio();
                return;
            }

            // Stop other playing audio
            stopPlayingCurrentAudio();

            try {
                const blob = await AudioDB.get(s.id);
                if (blob) {
                    const audioUrl = URL.createObjectURL(blob);
                    currentPlayingAudio = new Audio(audioUrl);
                    currentPlayingBtn = playBtn;

                    currentPlayingAudio.play();
                    playBtn.classList.add('playing');
                    playBtn.querySelector('i').className = 'fa-solid fa-pause';
                    playBtn.querySelector('span').textContent = 'Pause';

                    currentPlayingAudio.onended = () => {
                        stopPlayingCurrentAudio();
                    };
                }
            } catch (err) {
                console.error(err);
                showToast('Unable to play narration.', 'danger');
            }
        });
    }
}

function stopPlayingCurrentAudio() {
    if (currentPlayingAudio) {
        currentPlayingAudio.pause();
        currentPlayingAudio = null;
    }
    if (currentPlayingBtn) {
        currentPlayingBtn.classList.remove('playing');
        currentPlayingBtn.querySelector('i').className = 'fa-solid fa-play';
        currentPlayingBtn.querySelector('span').textContent = 'Listen';
        currentPlayingBtn = null;
    }
}

// Setup Highlighting / Featured Card of the Day
function setupFeaturedCard(filtered) {
    if (filtered.length === 0) {
        DOM.featuredContainer.style.display = 'none';
        return;
    }

    // Try to find a favorite card to showcase, otherwise get the latest card
    let featured = filtered.find(s => s.isFavorite);
    if (!featured) {
        featured = filtered[0];
    }

    DOM.featuredContainer.style.display = 'block';
    
    const tagsHTML = featured.tags.length > 0 
        ? `<div class="card-tags" style="justify-content: flex-start; margin-top: 15px;">${featured.tags.map(t => `<span class="card-tag">#${t}</span>`).join('')}</div>`
        : '';

    DOM.featuredCard.innerHTML = `
        <div class="card-header" style="margin-bottom: 15px;">
            <span class="card-category" style="background: rgba(var(--accent-rgb), 0.15); color: var(--accent); border: 1px solid rgba(var(--accent-rgb), 0.3);">${featured.category}</span>
            <span class="card-date" style="opacity: 0.6; font-size: 12px;"><i class="fa-solid fa-feather-pointed"></i> Writer's Selection</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px;">
            ${featured.title ? `<h3 style="font-family: 'Cinzel', serif; font-size: 22px; color: var(--accent);">${featured.title}</h3>` : ''}
            <div style="font-family: var(--card-font); font-size: 20px; line-height: 1.8; font-weight: 500; font-style: italic; white-space: pre-line;">${featured.content}</div>
            ${tagsHTML}
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed rgba(255,255,255,0.08); padding-top: 15px;">
            <div>
                <span style="font-size: 14px; font-weight: 600;">— Written by ${profile.name}</span>
            </div>
            <button class="btn btn-primary btn-sm" onclick="switchTab('create'); document.getElementById('shayariContent').value = \`${featured.content.replace(/\n/g, '\\n')}\`; updateLivePreview();" style="border-radius: 8px;">
                <i class="fa-solid fa-feather"></i> Pen another
            </button>
        </div>
    `;
}

// Categories filters chip clicks
DOM.categoriesFilterContainer.addEventListener('click', (e) => {
    const chip = e.target.closest('.filter-chip');
    if (!chip) return;

    // Toggle active category classes
    const chips = DOM.categoriesFilterContainer.querySelectorAll('.filter-chip');
    chips.forEach(c => c.classList.remove('active'));
    chip.classList.add('active');

    activeCategoryFilter = chip.getAttribute('data-category');
    renderShayariGrid();
});

// Real-time live search listener
DOM.searchInput.addEventListener('input', () => {
    renderShayariGrid();
});

// --- 12. Shayari Form / Creator / Live Preview ---
function setupFormListeners() {
    DOM.shayariContent.addEventListener('input', () => {
        updateLivePreview();
        calculateCounts();
    });

    DOM.shayariTitle.addEventListener('input', updateLivePreview);

    // Card visual color choices
    DOM.visualOptions.forEach(opt => {
        opt.addEventListener('click', () => {
            DOM.visualOptions.forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            updateLivePreview();
        });
    });

    // Cancel Compose button
    DOM.cancelComposeBtn.addEventListener('click', () => {
        if (confirm('Discard changes and return to library?')) {
            resetComposerForm();
            switchTab('feed');
        }
    });

    // Form submission
    DOM.shayariForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = DOM.shayariTitle.value.trim();
        const content = DOM.shayariContent.value.trim();
        const category = DOM.shayariCategory.value;
        
        // Tags array cleanup
        const tags = DOM.shayariTags.value
            .split(',')
            .map(t => t.trim())
            .filter(t => t !== '');

        // Grab active visual style name
        const activeOpt = document.querySelector('.visual-option.active');
        const style = activeOpt ? activeOpt.getAttribute('data-style') : 'deep-space';

        // Check if editing or creating a new entry
        const editId = DOM.editShayariId.value;

        if (editId) {
            // Edit existing
            const index = shayaris.findIndex(s => s.id === editId);
            if (index !== -1) {
                shayaris[index].title = title;
                shayaris[index].content = content;
                shayaris[index].category = category;
                shayaris[index].tags = tags;
                shayaris[index].style = style;
                
                // Save audio narration in IndexedDB if it was recorded
                if (audioBlob) {
                    await AudioDB.save(editId, audioBlob);
                } else {
                    // Check if they intentionally deleted audio
                    if (DOM.audioPlaybackContainer.style.display === 'none') {
                        await AudioDB.delete(editId);
                    }
                }
                
                showToast('Verse changes updated successfully!');
            }
        } else {
            // Create brand new shayari
            const newId = 'shayari-' + Date.now();
            const newShayari = {
                id: newId,
                title: title,
                content: content,
                category: category,
                tags: tags,
                style: style,
                date: new Date().toISOString().split('T')[0],
                isFavorite: false
            };

            shayaris.push(newShayari);
            
            // Save narration audio in IndexedDB if recorded
            if (audioBlob) {
                await AudioDB.save(newId, audioBlob);
            }

            showToast('Beautiful verse added to your diary!');
        }

        saveShayarisToStorage();
        resetComposerForm();
        switchTab('feed');
    });
}

function calculateCounts() {
    const text = DOM.shayariContent.value;
    const charCount = text.length;
    const lineCount = text === "" ? 0 : text.split('\n').length;

    DOM.charCount.textContent = `${charCount} characters`;
    DOM.lineCount.textContent = `${lineCount} lines`;
}

function updateLivePreview() {
    const title = DOM.shayariTitle.value.trim() || 'Untitled';
    const content = DOM.shayariContent.value.trim() || 'Your beautiful poetry lines will appear here in real-time...';
    
    DOM.previewTitle.textContent = title;
    DOM.previewContent.textContent = content;

    // Set matching visual card gradient
    const activeOpt = document.querySelector('.visual-option.active');
    const styleName = activeOpt ? activeOpt.getAttribute('data-style') : 'deep-space';
    
    // Clear other visuals classes
    DOM.livePreviewCard.className = 'live-preview-card';
    DOM.livePreviewCard.classList.add(`visuals-${styleName}`);

    // Update Date
    const today = new Date();
    DOM.previewDate.textContent = today.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

function resetComposerForm() {
    DOM.editShayariId.value = '';
    DOM.shayariTitle.value = '';
    DOM.shayariContent.value = '';
    DOM.shayariCategory.value = 'General';
    DOM.shayariTags.value = '';
    DOM.charCount.textContent = '0 characters';
    DOM.lineCount.textContent = '0 lines';
    
    // Reset visual picker to deep-space gradient
    DOM.visualOptions.forEach(opt => {
        if (opt.getAttribute('data-style') === 'deep-space') {
            opt.classList.add('active');
        } else {
            opt.classList.remove('active');
        }
    });

    DOM.submitBtnText.textContent = 'Publish Shayari';
    
    clearAudioPlayback();
    updateLivePreview();
}

function clearAudioPlayback() {
    audioBlob = null;
    DOM.audioPlayback.src = '';
    DOM.audioPlaybackContainer.style.display = 'none';
    DOM.recordText.textContent = 'Record Recitation';
    DOM.recordingStatus.style.display = 'none';
}

// --- 13. Voice/Audio Narrations Recording Feature ---
function setupAudioRecording() {
    DOM.recordBtn.addEventListener('click', async () => {
        if (isRecording) {
            stopRecording();
        } else {
            await startRecording();
        }
    });

    DOM.deleteAudioBtn.addEventListener('click', () => {
        if (confirm('Do you want to discard this narration recording?')) {
            clearAudioPlayback();
            showToast('Narration audio removed.', 'info');
        }
    });
}

async function startRecording() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showToast('Audio recording is not supported in this browser.', 'danger');
        return;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                audioChunks.push(e.data);
            }
        };

        mediaRecorder.onstop = () => {
            audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            const audioUrl = URL.createObjectURL(audioBlob);
            
            DOM.audioPlayback.src = audioUrl;
            DOM.audioPlaybackContainer.style.display = 'flex';
            DOM.recordText.textContent = 'Record Again';
            DOM.recordingStatus.style.display = 'none';
        };

        // UI States
        mediaRecorder.start();
        isRecording = true;
        DOM.recordBtn.classList.add('btn-danger');
        DOM.recordBtn.querySelector('i').className = 'fa-solid fa-stop';
        DOM.recordText.textContent = 'Stop Recording';
        DOM.recordingStatus.style.display = 'flex';

        // Start Timer
        recordingSeconds = 0;
        DOM.recordTimer.textContent = '00:00';
        recordingTimer = setInterval(() => {
            recordingSeconds++;
            const mins = String(Math.floor(recordingSeconds / 60)).padStart(2, '0');
            const secs = String(recordingSeconds % 60).padStart(2, '0');
            DOM.recordTimer.textContent = `${mins}:${secs}`;
        }, 1000);

        showToast('Microphone active. Start reciting!', 'info');

    } catch (err) {
        console.error('Mic access error: ', err);
        showToast('Unable to access microphone. Check permissions.', 'danger');
    }
}

function stopRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        
        // Stop all track media streams to release mic
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        
        isRecording = false;
        clearInterval(recordingTimer);
        DOM.recordBtn.classList.remove('btn-danger');
        DOM.recordBtn.querySelector('i').className = 'fa-solid fa-microphone';
    }
}

// --- 14. Download Card Image Custom Canvas Drawing ---
function downloadShayariAsCardImage(s) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Make canvas crisp & print-friendly high quality
    canvas.width = 800;
    canvas.height = 800;

    // Define gradients matching the style selector
    let grad = ctx.createLinearGradient(0, 0, 800, 800);
    let textColor = '#f2edf9';
    let ornamentColor = '#e5b567';

    if (s.style === 'sunset') {
        grad.addColorStop(0, '#3a1c1c');
        grad.addColorStop(1, '#6b2d5c');
        textColor = '#ffd8ec';
    } else if (s.style === 'forest') {
        grad.addColorStop(0, '#0d1f1f');
        grad.addColorStop(1, '#153c30');
        textColor = '#e2fdf5';
    } else if (s.style === 'ocean') {
        grad.addColorStop(0, '#061e30');
        grad.addColorStop(1, '#134658');
        textColor = '#e0f2fe';
    } else if (s.style === 'gold') {
        grad.addColorStop(0, '#242011');
        grad.addColorStop(1, '#4c3f1f');
        textColor = '#fef9c3';
    } else if (s.style === 'crimson') {
        grad.addColorStop(0, '#280a14');
        grad.addColorStop(1, '#5c162e');
        textColor = '#ffe4e6';
    } else { // deep-space
        grad.addColorStop(0, '#0f0c1b');
        grad.addColorStop(1, '#201335');
        textColor = '#f2edf9';
    }

    // Fill background
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 800, 800);

    // Draw decorative border lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 2;
    ctx.strokeRect(40, 40, 720, 720);
    
    ctx.strokeStyle = ornamentColor + '40'; // semi transparent gold
    ctx.lineWidth = 1;
    ctx.strokeRect(50, 50, 700, 700);

    // Draw Corner Ornaments
    ctx.fillStyle = ornamentColor;
    ctx.font = '24px Georgia, serif';
    ctx.textAlign = 'center';
    
    // Draw top & bottom ❦ ornaments
    ctx.fillText('❦', 400, 160);
    ctx.fillText('❦', 400, 610);

    // Draw Title
    if (s.title) {
        ctx.fillStyle = ornamentColor;
        ctx.font = 'bold 30px Cinzel, Georgia, serif';
        ctx.fillText(s.title.toUpperCase(), 400, 220);
    }

    // Draw Verses content (Supports multiline, centered)
    ctx.fillStyle = textColor;
    ctx.font = '500 28px Noto Serif Devanagari, Georgia, serif';
    
    const lines = s.content.split('\n');
    const lineHeight = 50;
    
    // Calculate total height of all poetry lines to center it on y-axis
    const totalLinesHeight = lines.length * lineHeight;
    let startY = 380 - (totalLinesHeight / 2);

    lines.forEach(line => {
        ctx.fillText(line.trim(), 400, startY);
        startY += lineHeight;
    });

    // Draw Category badge (small tag top-left)
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath();
    ctx.roundRect(65, 65, 120, 32, 8);
    ctx.fill();
    
    ctx.fillStyle = textColor;
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(s.category.toUpperCase(), 125, 85);

    // Draw Date (bottom-left)
    ctx.font = '14px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.textAlign = 'left';
    ctx.fillText(formatDate(s.date), 70, 720);

    // Draw Writer Pen Name Signature (bottom-right)
    ctx.textAlign = 'right';
    ctx.font = 'italic bold 22px "Outfit", Georgia, serif';
    ctx.fillStyle = textColor;
    ctx.fillText(`— Written by ${profile.name}`, 730, 720);

    // Create anchor link and download PNG
    const link = document.createElement('a');
    link.download = `${s.title || 'Shayari'}_Dastaan.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();

    showToast('Beautiful card image saved to downloads!');
}

// --- 15. Creative Insights & Analytics Section ---
function updateInsights() {
    DOM.statTotalCount.textContent = shayaris.length;
    
    const favCount = shayaris.filter(s => s.isFavorite).length;
    DOM.statFavoriteCount.textContent = favCount;

    // Check count of recorded recitations from IndexedDB
    AudioDB.open().then(db => {
        const transaction = db.transaction('audio_recitations', 'readonly');
        const store = transaction.objectStore('audio_recitations');
        const countRequest = store.count();
        countRequest.onsuccess = () => {
            DOM.statRecordedCount.textContent = countRequest.result;
        };
    }).catch(() => {
        DOM.statRecordedCount.textContent = '0';
    });

    // Category distribution breakdown rendering
    renderCategoryBreakdown();
}

function renderCategoryBreakdown() {
    DOM.categoryBreakdownList.innerHTML = '';
    
    const categories = ['Love', 'Sad', 'Life', 'Sufi', 'Friendship', 'General'];
    const total = shayaris.length;

    categories.forEach(cat => {
        const count = shayaris.filter(s => s.category === cat).length;
        const percentage = total > 0 ? (count / total) * 100 : 0;

        const row = document.createElement('div');
        row.className = 'category-row';
        row.innerHTML = `
            <div class="category-info">
                <span class="category-name">${cat}</span>
                <span class="category-count">${count} (${Math.round(percentage)}%)</span>
            </div>
            <div class="category-bar-outer">
                <div class="category-bar-inner" style="width: 0%;"></div>
            </div>
        `;
        
        DOM.categoryBreakdownList.appendChild(row);

        // Micro animation trigger
        setTimeout(() => {
            const bar = row.querySelector('.category-bar-inner');
            if (bar) bar.style.width = `${percentage}%`;
        }, 100);
    });
}

function setupSparks() {
    DOM.newQuoteBtn.addEventListener('click', () => {
        const randomIndex = Math.floor(Math.random() * poetrySparks.length);
        const spark = poetrySparks[randomIndex];
        
        DOM.inspirationQuote.style.opacity = '0';
        DOM.inspirationAuthor.style.opacity = '0';
        
        setTimeout(() => {
            DOM.inspirationQuote.textContent = `"${spark.quote}"`;
            DOM.inspirationAuthor.textContent = `— ${spark.author}`;
            DOM.inspirationQuote.style.opacity = '1';
            DOM.inspirationAuthor.style.opacity = '1';
        }, 300);
    });
}

// --- 16. Settings Actions ---
function setupSettingsTab() {
    if (DOM.saveProfileBtn) {
        DOM.saveProfileBtn.addEventListener('click', () => {
            saveProfile(DOM.settingsName.value, DOM.settingsTitle.value);
        });
    }

    // Export Shayari to JSON
    DOM.exportDataBtn.addEventListener('click', () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(shayaris, null, 4));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href",     dataStr);
        downloadAnchor.setAttribute("download", `Dastaan_Shayari_Backup_${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        showToast('Library exported successfully!');
    });

    // Import Shayari from JSON file
    DOM.importDataFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(evt) {
            try {
                const imported = JSON.parse(evt.target.result);
                if (Array.isArray(imported)) {
                    // Simple validator
                    const validated = imported.filter(s => s && s.content);
                    if (validated.length > 0) {
                        // Merge or overwrite (merge is better, using IDs for deduplication)
                        validated.forEach(newS => {
                            // Ensure valid schema
                            if (!newS.id) newS.id = 'shayari-' + Date.now() + '-' + Math.floor(Math.random()*1000);
                            if (!newS.style) newS.style = 'deep-space';
                            if (!newS.category) newS.category = 'General';
                            if (!newS.tags) newS.tags = [];
                            if (!newS.date) newS.date = new Date().toISOString().split('T')[0];

                            const idx = shayaris.findIndex(item => item.id === newS.id);
                            if (idx !== -1) {
                                shayaris[idx] = newS; // overwrite matching id
                            } else {
                                shayaris.push(newS); // append
                            }
                        });

                        saveShayarisToStorage();
                        renderShayariGrid();
                        updateInsights();
                        showToast(`Successfully imported ${validated.length} verses!`);
                    } else {
                        showToast('Invalid JSON backup file schema.', 'danger');
                    }
                } else {
                    showToast('Invalid backup file formatting.', 'danger');
                }
            } catch (err) {
                showToast('Error reading backup file.', 'danger');
            }
        };
        reader.readAsText(file);
    });

    // Erase all data
    DOM.resetDataBtn.addEventListener('click', async () => {
        if (confirm('WARNING! This will erase all your custom written shayaris and voice recordings. Are you absolutely sure?')) {
            shayaris = [];
            saveShayarisToStorage();
            
            // Clear IndexedDB audios
            await AudioDB.clearAll();
            
            // Re-load seed data
            await loadShayaris();
            updateInsights();
            showToast('All user data has been cleared and reset.', 'danger');
        }
    });
}
