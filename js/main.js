
import { state, initData, initTab, saveData } from './state.js';
import { DOM } from './dom.js';
import { render, setupCategoryDropdown } from './ui.js';
import { setupSettings, setupTheme, setupShortcuts } from './settings.js';
import { getFavicon, escapeHTML } from './utils.js';
import { getDragAfterCollection } from './dragdrop.js';

// Search
DOM.searchInput.addEventListener('input', (e) => {
    render(e.target.value);
});

DOM.searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const firstCard = DOM.collectionsContainer.querySelector('.bookmark-card');
        if (firstCard) {
            const id = Number(firstCard.dataset.id);
            const bm = state.bookmarks.find(b => b.id === id);
            if (bm) {
                bm.clicks = (bm.clicks || 0) + 1;
                saveData();
            }
            const url = firstCard.getAttribute('href');
            if (url && url !== '#') {
                if (typeof chrome !== 'undefined' && chrome.tabs) {
                    chrome.tabs.create({ url: url });
                } else {
                    window.open(url, '_blank');
                }
            }
        }
    }
});

// Quick Add
if (DOM.quickAddBtn) {
    DOM.quickAddBtn.addEventListener('click', () => {
        if (state.currentTab) {
            const exists = state.bookmarks.find(b => b.url === state.currentTab.url);
            if (exists) {
                alert('This page is already bookmarked!');
                return;
            }
            
            const newBm = {
                id: Date.now(),
                name: state.currentTab.title || 'Unknown Page',
                url: state.currentTab.url,
                category: 'Uncategorized',
                categoryDesc: '',
                clicks: 0
            };
            state.bookmarks.push(newBm);
            saveData();
            render(DOM.searchInput.value);
            
            DOM.quickAddBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
            setTimeout(() => {
                DOM.quickAddBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;
            }, 1500);
        }
    });
}

// Stats / Leaderboard Modal
if (DOM.statsBtn) {
    DOM.statsBtn.addEventListener('click', () => {
        DOM.leaderboardList.innerHTML = '';
        
        const sorted = [...state.bookmarks]
            .filter(b => b.clicks && b.clicks > 0)
            .sort((a, b) => b.clicks - a.clicks);
            
        if (sorted.length === 0) {
            DOM.leaderboardList.innerHTML = '<p style="text-align:center; color:var(--text-muted); margin-top: 20px;">No statistics available yet. Click some bookmarks first!</p>';
        } else {
            sorted.forEach((bm, index) => {
                const rank = index + 1;
                let rankClass = '';
                if (rank === 1) rankClass = 'rank-1';
                else if (rank === 2) rankClass = 'rank-2';
                else if (rank === 3) rankClass = 'rank-3';
                
                const iconUrl = bm.customIcon ? bm.customIcon : getFavicon(bm.url);
                
                const item = document.createElement('a');
                item.className = 'leaderboard-item';
                item.href = bm.url;
                item.target = '_blank';
                
                const hotClass = bm.clicks >= 5 ? 'hot' : '';
                const icon = bm.clicks >= 5 ? '🔥' : '📈';
                
                item.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0;">
                        <span class="leaderboard-rank ${rankClass}">${rank === 1 ? '🏆' : rank}</span>
                        <img src="${iconUrl}" style="width: 24px; height: 24px; border-radius: 6px; object-fit: contain;">
                        <span style="color: var(--text-main); font-weight: 500; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHTML(bm.name)}</span>
                    </div>
                    <span class="clicks-badge ${hotClass}">${icon} ${bm.clicks}</span>
                `;
                
                item.addEventListener('click', () => {
                    bm.clicks = (bm.clicks || 0) + 1;
                    saveData();
                });
                
                DOM.leaderboardList.appendChild(item);
            });
        }
        
        DOM.statsModal.classList.remove('hidden');
    });
    
    DOM.closeStatsBtn.addEventListener('click', () => {
        DOM.statsModal.classList.add('hidden');
    });
    
    DOM.statsModal.addEventListener('click', (e) => {
        if (e.target === DOM.statsModal) DOM.statsModal.classList.add('hidden');
    });
}

// Add Form
DOM.addBtn.addEventListener('click', () => {
    state.editingId = null;
    if (DOM.modalTitle) DOM.modalTitle.textContent = "Add Bookmark";
    DOM.form.reset();
    
    if (state.currentTab) {
        document.getElementById('bm-url').value = state.currentTab.url;
        document.getElementById('bm-name').value = state.currentTab.title || '';
    }
    
    DOM.modal.classList.remove('hidden');
});

DOM.closeBtn.addEventListener('click', () => {
    DOM.modal.classList.add('hidden');
});

DOM.modal.addEventListener('click', (e) => {
    if (e.target === DOM.modal) DOM.modal.classList.add('hidden');
});

DOM.form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    let url = document.getElementById('bm-url').value;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }
    
    const nameVal = document.getElementById('bm-name').value;
    const catVal = document.getElementById('bm-category').value || 'Uncategorized';
    const descVal = document.getElementById('bm-desc').value || '';

    if (state.editingId) {
        const bm = state.bookmarks.find(b => b.id === state.editingId);
        if (bm) {
            bm.name = nameVal;
            bm.url = url;
            bm.category = catVal;
            bm.categoryDesc = descVal;
        }
    } else {
        const newBm = {
            id: Date.now(),
            name: nameVal,
            url: url,
            category: catVal,
            categoryDesc: descVal,
            clicks: 0
        };
        state.bookmarks.push(newBm);
    }
    
    saveData();
    render(DOM.searchInput.value);
    
    DOM.form.reset();
    DOM.modal.classList.add('hidden');
});

// Category Drag and Drop Container Logic
if (DOM.collectionsContainer) {
    DOM.collectionsContainer.addEventListener('dragover', (e) => {
        const draggable = document.querySelector('.collection.dragging');
        if (!draggable) return;
        
        e.preventDefault();
        const afterElement = getDragAfterCollection(DOM.collectionsContainer, e.clientY);
        if (afterElement == null) {
            DOM.collectionsContainer.appendChild(draggable);
        } else {
            DOM.collectionsContainer.insertBefore(draggable, afterElement);
        }
    });
}

// Global Keyboard Shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (!DOM.modal.classList.contains('hidden')) {
            DOM.closeBtn.click();
            return;
        }
        if (DOM.statsModal && !DOM.statsModal.classList.contains('hidden')) {
            DOM.closeStatsBtn.click();
            return;
        }
        if (!DOM.settingsModal.classList.contains('hidden')) {
            DOM.settingsModal.classList.add('hidden');
            return;
        }
        if (document.activeElement === DOM.searchInput) {
            DOM.searchInput.value = '';
            render();
            DOM.searchInput.blur();
            return;
        }
    }

    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        return;
    }

    const k = e.key.toLowerCase();
    const searchS = state.customShortcuts.search;
    const addS = state.customShortcuts.add;
    
    if (
        k === searchS.key.toLowerCase() &&
        e.altKey === searchS.altKey &&
        e.ctrlKey === searchS.ctrlKey &&
        e.shiftKey === searchS.shiftKey
    ) {
        e.preventDefault();
        DOM.searchInput.focus();
        return;
    }

    if (
        k === addS.key.toLowerCase() &&
        e.altKey === addS.altKey &&
        e.ctrlKey === addS.ctrlKey &&
        e.shiftKey === addS.shiftKey
    ) {
        e.preventDefault();
        DOM.addBtn.click();
        return;
    }
});

// INITIALIZE
initTab(() => {
    if (DOM.quickAddBtn && state.currentTab) {
        DOM.quickAddBtn.style.display = 'flex';
    }
});

initData(() => {
    setupTheme();
    setupShortcuts();
    setupSettings();
    setupCategoryDropdown();
    render(DOM.searchInput.value);
});
