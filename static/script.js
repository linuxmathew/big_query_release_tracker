// Global Application State
let rawNotesData = [];
let processedNotes = [];
let currentFilter = 'all';
let searchQuery = '';

// DOM Elements
const updatesFeed = document.getElementById('updates-feed');
const refreshBtn = document.getElementById('refresh-btn');
const refreshIcon = refreshBtn.querySelector('.spinner-icon');
const refreshText = refreshBtn.querySelector('.refresh-text');
const lastUpdatedTime = document.getElementById('last-updated-time');
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search');
const totalStatsSpan = document.getElementById('stats-total');
const filterBtns = document.querySelectorAll('.filter-btn');

// Modal Elements
const composerModal = document.getElementById('composer-modal');
const tweetTextarea = document.getElementById('tweet-textarea');
const tweetPreviewText = document.getElementById('tweet-preview-text');
const charCounter = document.getElementById('char-counter');
const progressCircle = document.getElementById('progress-circle');
const closeModalBtn = document.getElementById('close-modal');
const copyBtn = document.getElementById('btn-copy');
const tweetBtn = document.getElementById('btn-tweet');
const tweetBtnText = document.getElementById('tweet-btn-text');

// Live Preview User Cards
const previewDisplayName = document.getElementById('preview-display-name');
const previewHandle = document.getElementById('preview-handle');
const previewBadge = document.getElementById('preview-badge');

// Toast Notification
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toast-message');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    fetchNotes();
    setupEventListeners();
    setupCircularProgress();
});

// Event Listeners Setup
function setupEventListeners() {
    // Refresh button
    refreshBtn.addEventListener('click', fetchNotes);
    
    // Search input
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase();
        clearSearchBtn.style.display = searchQuery ? 'block' : 'none';
        renderFeed();
    });
    
    // Clear search
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        renderFeed();
    });
    
    // Filter buttons
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.getAttribute('data-type');
            renderFeed();
        });
    });

    // Close Modal
    closeModalBtn.addEventListener('click', hideModal);
    composerModal.addEventListener('click', (e) => {
        if (e.target === composerModal) hideModal();
    });

    // Copy Content
    copyBtn.addEventListener('click', () => {
        const text = tweetTextarea.value;
        navigator.clipboard.writeText(text).then(() => {
            showToast('Copied draft to clipboard!', 'fa-check-circle', '#50fa7b');
        }).catch(err => {
            showToast('Failed to copy to clipboard', 'fa-exclamation-circle', '#ff5555');
        });
    });

    // Send Post (Web Intent Fallback)
    tweetBtn.addEventListener('click', () => {
        const text = tweetTextarea.value;
        const encodedText = encodeURIComponent(text);
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedText}`;
        window.open(twitterUrl, '_blank', 'width=550,height=420');
        showToast('Opening Web Intent...', 'fa-brands fa-x-twitter', '#1d9bf0');
        hideModal();
    });

    // Textarea input sync for character count & live preview
    tweetTextarea.addEventListener('input', (e) => {
        updateTweetCounter(e.target.value);
    });
}

// Fetch Notes from Flask API
async function fetchNotes() {
    setLoadingState(true);
    try {
        const response = await fetch('/api/notes');
        const result = await response.json();
        
        if (result.status === 'success') {
            rawNotesData = result.data;
            processNotesData();
            renderFeed();
            updateLastUpdatedTime();
        } else {
            console.error('Error details:', result.message);
            showToast('Failed to load release notes', 'fa-circle-xmark', '#ff5555');
        }
    } catch (err) {
        console.error('Fetch error:', err);
        showToast('Network error while loading feed', 'fa-triangle-exclamation', '#ffb86c');
    } finally {
        setLoadingState(false);
    }
}

// Parse Raw HTML Content into classified updates
function processNotesData() {
    processedNotes = [];
    
    rawNotesData.forEach(entry => {
        const parsedItems = parseRawContent(entry.raw_content);
        
        parsedItems.forEach(item => {
            processedNotes.push({
                date: entry.date,
                link: entry.link,
                type: item.type,
                content: item.content
            });
        });
    });
}

// Deep XML Parsing helper using DOMParser in Client
function parseRawContent(rawHtml) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(rawHtml, 'text/html');
    const items = [];
    
    let currentType = 'feature'; // Default fallback
    let currentParagraphs = [];
    
    Array.from(doc.body.children).forEach(child => {
        if (child.tagName === 'H3') {
            if (currentParagraphs.length > 0) {
                items.push({
                    type: sanitizeType(currentType),
                    content: currentParagraphs.join('')
                });
                currentParagraphs = [];
            }
            currentType = child.textContent.trim();
        } else {
            currentParagraphs.push(child.outerHTML);
        }
    });
    
    if (currentParagraphs.length > 0) {
        items.push({
            type: sanitizeType(currentType),
            content: currentParagraphs.join('')
        });
    }
    
    return items;
}

function sanitizeType(type) {
    const t = type.toLowerCase();
    if (t.includes('feature')) return 'feature';
    if (t.includes('change')) return 'change';
    if (t.includes('deprecation')) return 'deprecation';
    if (t.includes('fix')) return 'fix';
    return 'change'; // default
}

// Render feed list of updates grouped by date
function renderFeed() {
    updatesFeed.innerHTML = '';
    
    // Filter and search
    let filtered = processedNotes.filter(note => {
        const matchesFilter = (currentFilter === 'all' || note.type === currentFilter);
        
        // Plain text content extraction for search matching
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = note.content;
        const textContent = tempDiv.textContent || tempDiv.innerText || "";
        const matchesSearch = !searchQuery || 
                              note.date.toLowerCase().includes(searchQuery) ||
                              note.type.toLowerCase().includes(searchQuery) ||
                              textContent.toLowerCase().includes(searchQuery);
                              
        return matchesFilter && matchesSearch;
    });

    // Update statistics
    totalStatsSpan.textContent = filtered.length;
    
    if (filtered.length === 0) {
        updatesFeed.innerHTML = `
            <div class="no-results">
                <i class="fa-regular fa-folder-open"></i>
                <p>No release notes found matching your criteria.</p>
            </div>
        `;
        return;
    }

    // Grouping by Date
    const grouped = {};
    filtered.forEach(note => {
        if (!grouped[note.date]) {
            grouped[note.date] = [];
        }
        grouped[note.date].push(note);
    });

    // Creating DOM elements
    for (const [date, notes] of Object.entries(grouped)) {
        const dayGroup = document.createElement('div');
        dayGroup.className = 'day-group';
        
        const dayHeader = document.createElement('div');
        dayHeader.className = 'day-header';
        dayHeader.textContent = date;
        dayGroup.appendChild(dayHeader);
        
        notes.forEach(note => {
            const card = document.createElement('div');
            card.className = `note-card ${note.type}`;
            
            // Format Content
            card.innerHTML = `
                <div class="note-header">
                    <span class="note-badge ${note.type}">
                        <span class="dot ${note.type}"></span>
                        ${note.type}
                    </span>
                    <span class="note-date">
                        <i class="fa-regular fa-calendar"></i> ${note.date}
                    </span>
                </div>
                <div class="note-body">
                    ${note.content}
                </div>
                <div class="note-footer">
                    <span class="tweet-prompt">
                        <i class="fa-brands fa-x-twitter"></i> Draft Tweet
                    </span>
                    <a href="${note.link}" target="_blank" class="original-link" onclick="event.stopPropagation()">
                        Original release notes <i class="fa-solid fa-arrow-up-right-from-square"></i>
                    </a>
                </div>
            `;
            
            // Event listener to open modal
            card.addEventListener('click', () => openComposer(note));
            dayGroup.appendChild(card);
        });
        
        updatesFeed.appendChild(dayGroup);
    }
}

// Loading Spinner controls
function setLoadingState(isLoading) {
    if (isLoading) {
        refreshIcon.classList.add('spinning');
        refreshBtn.disabled = true;
        refreshText.textContent = 'Fetching...';
        updatesFeed.innerHTML = `
            <div class="skeleton-card"></div>
            <div class="skeleton-card"></div>
            <div class="skeleton-card"></div>
        `;
    } else {
        refreshIcon.classList.remove('spinning');
        refreshBtn.disabled = false;
        refreshText.textContent = 'Refresh Feed';
    }
}

// Update Last Updated Timestamp
function updateLastUpdatedTime() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    lastUpdatedTime.textContent = `Last updated: Today at ${timeStr}`;
}

// Open Tweet Composer
function openComposer(note) {
    // Strip HTML Tags to make text
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = note.content;
    let plainText = tempDiv.textContent || tempDiv.innerText || "";
    
    // Normalize spaces and truncate if too long
    plainText = plainText.replace(/\s+/g, ' ').trim();
    if (plainText.length > 180) {
        plainText = plainText.substring(0, 175) + '...';
    }
    
    // Compose premium template
    const emojiMap = {
        'feature': '🚀 Feature',
        'change': '⚙️ Change',
        'deprecation': '⚠️ Deprecation',
        'fix': '🔧 Fix'
    };
    
    const emoji = emojiMap[note.type] || '📢';
    const linkSuffix = note.link ? `\n\nRead more: ${note.link}` : '';
    const draftText = `${emoji} BigQuery Update (${note.date}):\n\n"${plainText}"${linkSuffix}\n\n#BigQuery #GoogleCloud`;
    
    tweetTextarea.value = draftText;
    updateTweetCounter(draftText);
    
    // Set Tweet button label
    tweetBtnText.textContent = 'Post to X';
    
    composerModal.classList.add('active');
}

function hideModal() {
    composerModal.classList.remove('active');
}

// Circular Character Counter for Post
let ringRadius = 12;
let ringCircumference = 2 * Math.PI * ringRadius;

function setupCircularProgress() {
    progressCircle.style.strokeDasharray = `${ringCircumference} ${ringCircumference}`;
    progressCircle.style.strokeDashoffset = ringCircumference;
}

function updateTweetCounter(text) {
    const maxChars = 280;
    const count = text.length;
    const remaining = maxChars - count;
    
    charCounter.textContent = remaining;
    
    // Progress calculation
    const progress = Math.min(count / maxChars, 1);
    const offset = ringCircumference - (progress * ringCircumference);
    progressCircle.style.strokeDashoffset = offset;
    
    // Colors & Warning states
    if (remaining < 0) {
        progressCircle.style.stroke = '#ff5555';
        charCounter.className = 'char-counter danger';
        tweetBtn.disabled = true;
        tweetBtn.style.opacity = '0.5';
    } else if (remaining <= 20) {
        progressCircle.style.stroke = '#ffb86c';
        charCounter.className = 'char-counter warning';
        tweetBtn.disabled = false;
        tweetBtn.style.opacity = '1';
    } else {
        progressCircle.style.stroke = '#1d9bf0';
        charCounter.className = 'char-counter';
        tweetBtn.disabled = false;
        tweetBtn.style.opacity = '1';
    }
    
    // Format links and highlights in Preview Text
    tweetPreviewText.innerHTML = formatTweetPreview(text);
}

// format simple text preview inside Twitter preview simulator
function formatTweetPreview(text) {
    if (!text) return '<i>Draft your post to see it previewed here live!</i>';
    
    // Safely encode html characters to prevent script injection in the live preview
    let escaped = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
        
    // Highlight links
    escaped = escaped.replace(/(https?:\/\/[^\s]+)/g, '<span style="color: #1d9bf0; cursor: pointer; border-bottom: 1.5px solid transparent;" onmouseover="this.style.borderBottomColor=\'#1d9bf0\'" onmouseout="this.style.borderBottomColor=\'transparent\'">$1</span>');
    
    // Highlight tags
    escaped = escaped.replace(/(#[a-zA-Z0-9_]+)/g, '<span style="color: #1d9bf0; cursor: pointer;">$1</span>');
    
    // Replace newlines with breaks
    return escaped.replace(/\n/g, '<br>');
}

// Quick Tag Insertion inside Draft
window.insertHashtag = function(tag) {
    const text = tweetTextarea.value;
    const cursorPosition = tweetTextarea.selectionStart;
    
    const before = text.substring(0, cursorPosition);
    const after = text.substring(cursorPosition, text.length);
    
    const spaceBefore = before.endsWith(' ') || before === '' ? '' : ' ';
    const spaceAfter = after.startsWith(' ') || after === '' ? '' : ' ';
    
    const newText = before + spaceBefore + tag + spaceAfter + after;
    tweetTextarea.value = newText;
    
    const newCursorPos = cursorPosition + spaceBefore.length + tag.length;
    tweetTextarea.setSelectionRange(newCursorPos, newCursorPos + spaceAfter.length);
    tweetTextarea.focus();
    
    updateTweetCounter(newText);
};

// Elegant Micro Toast UI
function showToast(message, iconClass, color) {
    toastMessage.textContent = message;
    const icon = toast.querySelector('.toast-icon');
    icon.className = `toast-icon ${iconClass}`;
    icon.style.color = color;
    toast.style.borderLeftColor = color;
    
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}
