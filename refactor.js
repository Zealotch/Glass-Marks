const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'js');
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir);
}

const stateJs = `
export const state = {
    bookmarks: [],
    categoryOrder: [],
    customShortcuts: {
        search: { key: '/', altKey: false, ctrlKey: false, shiftKey: false, display: '/' },
        add: { key: 'n', altKey: true, ctrlKey: false, shiftKey: false, display: 'Alt+N' }
    },
    uniqueCategories: [],
    editingId: null,
    currentTab: null,
    currentTheme: 'cyan'
};

const defaultBookmarks = [
    { id: 1, name: 'Phind', url: 'https://phind.com', category: 'AI Tools', categoryDesc: 'Thinking machines' },
    { id: 2, name: 'Lovable', url: 'https://lovable.dev', category: 'AI Tools', categoryDesc: 'Thinking machines' },
    { id: 3, name: 'ChatGPT', url: 'https://chatgpt.com', category: 'AI Tools', categoryDesc: 'Thinking machines' },
    { id: 4, name: 'Claude', url: 'https://claude.ai', category: 'AI Tools', categoryDesc: 'Thinking machines' },
    { id: 5, name: 'Perplexity', url: 'https://perplexity.ai', category: 'AI Tools', categoryDesc: 'Thinking machines' },
    { id: 6, name: 'Hugging Face', url: 'https://huggingface.co', category: 'AI Tools', categoryDesc: 'Thinking machines' },
    { id: 7, name: 'CodeWars', url: 'https://codewars.com', category: 'Coding', categoryDesc: 'Build & practice' },
    { id: 8, name: 'GitHub', url: 'https://github.com', category: 'Coding', categoryDesc: 'Build & practice' }
];

export function saveData() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set({ 'glass_marks_data': state.bookmarks });
    } else {
        localStorage.setItem('glass_marks_data', JSON.stringify(state.bookmarks));
    }
}

export function saveCategoryOrder() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set({ 'glass_marks_category_order': state.categoryOrder });
    } else {
        localStorage.setItem('glass_marks_category_order', JSON.stringify(state.categoryOrder));
    }
}

export function deleteBookmark(id) {
    state.bookmarks = state.bookmarks.filter(b => b.id !== id);
    saveData();
}

export function initData(callback) {
    const savedShortcuts = localStorage.getItem('glass_marks_shortcuts');
    if (savedShortcuts) {
        state.customShortcuts = JSON.parse(savedShortcuts);
    }
    
    state.currentTheme = localStorage.getItem('glass_marks_theme') || 'cyan';

    if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.get(['glass_marks_data', 'glass_marks_category_order'], (result) => {
            if (result.glass_marks_data && result.glass_marks_data.length > 0) {
                state.bookmarks = result.glass_marks_data;
            } else {
                const localBookmarks = localStorage.getItem('glass_marks_data');
                if (localBookmarks) {
                    state.bookmarks = JSON.parse(localBookmarks);
                    saveData();
                } else {
                    state.bookmarks = defaultBookmarks;
                    saveData();
                }
            }
            
            if (result.glass_marks_category_order) {
                state.categoryOrder = result.glass_marks_category_order;
            } else {
                const localOrder = localStorage.getItem('glass_marks_category_order');
                if (localOrder) {
                    state.categoryOrder = JSON.parse(localOrder);
                    saveCategoryOrder();
                }
            }
            callback();
        });
    } else {
        const localBookmarks = localStorage.getItem('glass_marks_data');
        state.bookmarks = localBookmarks ? JSON.parse(localBookmarks) : defaultBookmarks;
        
        const localOrder = localStorage.getItem('glass_marks_category_order');
        state.categoryOrder = localOrder ? JSON.parse(localOrder) : [];
        callback();
    }
}

export function initTab(callback) {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs && tabs[0] && tabs[0].url && !tabs[0].url.startsWith('chrome://')) {
                state.currentTab = tabs[0];
            }
            callback();
        });
    } else {
        callback();
    }
}
`;

const domJs = `
export const DOM = {
    collectionsContainer: document.getElementById('collections-container'),
    searchInput: document.getElementById('search-input'),
    statsText: document.getElementById('stats-text'),
    addBtn: document.getElementById('add-btn'),
    quickAddBtn: document.getElementById('quick-add-btn'),
    modal: document.getElementById('add-modal'),
    closeBtn: document.getElementById('close-modal'),
    form: document.getElementById('add-form'),
    statsBtn: document.getElementById('stats-btn'),
    statsModal: document.getElementById('stats-modal'),
    closeStatsBtn: document.getElementById('close-stats-btn'),
    leaderboardList: document.getElementById('leaderboard-list'),
    settingsBtn: document.getElementById('settings-btn'),
    settingsModal: document.getElementById('settings-modal'),
    closeSettingsBtn: document.getElementById('close-settings'),
    exportBtn: document.getElementById('export-btn'),
    importBtnProxy: document.getElementById('import-btn-proxy'),
    importFile: document.getElementById('import-file'),
    syncNativeBtn: document.getElementById('sync-native-btn'),
    themeCircles: document.querySelectorAll('.theme-circle'),
    shortcutSearchInput: document.getElementById('shortcut-search'),
    shortcutAddInput: document.getElementById('shortcut-add'),
    categoryInput: document.getElementById('bm-category'),
    categoryDropdown: document.getElementById('category-dropdown'),
    quickNav: document.getElementById('quick-nav'),
    modalTitle: document.getElementById('modal-title')
};
`;

const utilsJs = `
export function getFavicon(url) {
    try {
        const domain = new URL(url).hostname;
        return \`https://www.google.com/s2/favicons?domain=\${domain}&sz=64\`;
    } catch (e) {
        return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23333" width="100" height="100"/><text fill="white" x="50" y="50" font-family="Arial" font-size="40" text-anchor="middle" dominant-baseline="central">?</text></svg>';
    }
}

export function groupByCategory(bmList) {
    return bmList.reduce((acc, curr) => {
        if (!acc[curr.category]) acc[curr.category] = { desc: curr.categoryDesc, items: [] };
        acc[curr.category].items.push(curr);
        return acc;
    }, {});
}
`;

const dragdropJs = `
import { state, saveData, saveCategoryOrder } from './state.js';

export function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.bookmark-card:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

export function getDragAfterCollection(container, y) {
    const draggableElements = [...container.querySelectorAll('.collection:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

export function syncOrder() {
    const newBookmarks = [];
    document.querySelectorAll('.bookmark-card').forEach(card => {
        const id = Number(card.dataset.id);
        const bm = state.bookmarks.find(b => b.id === id);
        if (bm) newBookmarks.push(bm);
    });
    if (newBookmarks.length === state.bookmarks.length) {
        state.bookmarks = newBookmarks;
        saveData();
    }
}

export function syncCategoryOrder(renderCallback) {
    const newOrder = [];
    document.querySelectorAll('.collection').forEach(col => {
        if (col.dataset.categoryName) {
            newOrder.push(col.dataset.categoryName);
        }
    });
    state.categoryOrder = newOrder;
    saveCategoryOrder();
    renderCallback();
}
`;

const uiJs = `
import { state, saveData, saveCategoryOrder, deleteBookmark } from './state.js';
import { getFavicon, groupByCategory } from './utils.js';
import { getDragAfterElement, syncOrder, syncCategoryOrder, getDragAfterCollection } from './dragdrop.js';
import { DOM } from './dom.js';

export function openEditModal(bm) {
    state.editingId = bm.id;
    if (DOM.modalTitle) DOM.modalTitle.textContent = "Edit Bookmark";
    document.getElementById('bm-name').value = bm.name;
    document.getElementById('bm-url').value = bm.url;
    document.getElementById('bm-category').value = bm.category;
    document.getElementById('bm-desc').value = bm.categoryDesc || '';
    DOM.modal.classList.remove('hidden');
}

export function render(searchTerm = '') {
    DOM.collectionsContainer.innerHTML = '';
    
    const filtered = state.bookmarks.filter(b => 
        b.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        b.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    const grouped = groupByCategory(filtered);
    let categories = Object.keys(grouped);
    
    categories.sort((a, b) => {
        let indexA = state.categoryOrder.indexOf(a);
        let indexB = state.categoryOrder.indexOf(b);
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return -1;
        if (indexB === -1) return 1;
        return indexA - indexB;
    });
    
    state.categoryOrder = categories;
    saveCategoryOrder();
    state.uniqueCategories = categories;
    
    const totalCategories = Object.keys(groupByCategory(state.bookmarks)).length;
    DOM.statsText.innerText = \`\${state.bookmarks.length} bookmarks across \${totalCategories} collections\`;

    if (DOM.quickNav) {
        DOM.quickNav.innerHTML = '';
        categories.forEach(cat => {
            const btn = document.createElement('button');
            btn.className = 'nav-pill';
            btn.textContent = cat;
            btn.addEventListener('click', () => {
                const target = document.getElementById('cat-' + cat.replace(/\\s+/g, '-'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
            DOM.quickNav.appendChild(btn);
        });
    }

    if (categories.length === 0) {
        DOM.collectionsContainer.innerHTML = '<p style="text-align:center; color:var(--text-muted); margin-top:50px;">No bookmarks found.</p>';
        return;
    }

    categories.forEach(cat => {
        const data = grouped[cat];
        
        const colDiv = document.createElement('div');
        colDiv.className = 'collection';
        colDiv.id = 'cat-' + cat.replace(/\\s+/g, '-');
        colDiv.dataset.categoryName = cat;
        
        if (searchTerm === '') {
            colDiv.draggable = true;
            colDiv.addEventListener('dragstart', (e) => {
                if (e.target === colDiv) {
                    setTimeout(() => colDiv.classList.add('dragging'), 0);
                }
            });
            colDiv.addEventListener('dragend', () => {
                colDiv.classList.remove('dragging');
                syncCategoryOrder(() => render(DOM.searchInput.value));
            });
        }
        
        const header = document.createElement('div');
        header.className = 'collection-header';
        
        const descText = data.desc || '';
        header.innerHTML = \`
            <h2 class="category-title-editable" contenteditable="true">\${cat}</h2>
            <span class="category-desc-editable" contenteditable="true" data-placeholder="Add description...">\${descText}</span>
        \`;
        
        const titleH2 = header.querySelector('.category-title-editable');
        titleH2.addEventListener('blur', (e) => {
            const newCat = e.target.textContent.trim();
            if (newCat && newCat !== cat) {
                state.bookmarks.forEach(b => {
                    if (b.category === cat) {
                        b.category = newCat;
                    }
                });
                const index = state.categoryOrder.indexOf(cat);
                if (index !== -1) {
                    state.categoryOrder[index] = newCat;
                }
                saveCategoryOrder();
                saveData();
                render(DOM.searchInput.value);
            } else {
                e.target.textContent = cat; 
            }
        });
        
        titleH2.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                titleH2.blur();
            }
        });
        
        const descSpan = header.querySelector('.category-desc-editable');
        descSpan.addEventListener('blur', (e) => {
            const newDesc = e.target.textContent.trim();
            state.bookmarks.forEach(b => {
                if (b.category === cat) {
                    b.categoryDesc = newDesc;
                }
            });
            saveData();
        });
        
        descSpan.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                descSpan.blur();
            }
        });
        
        const grid = document.createElement('div');
        grid.className = 'bookmarks-grid';
        
        data.items.forEach(bm => {
            const a = document.createElement('a');
            a.className = 'bookmark-card';
            a.href = bm.url;
            a.target = '_blank';
            a.dataset.id = bm.id;
            
            if (searchTerm === '') {
                a.draggable = true;
                a.addEventListener('dragstart', (e) => {
                    e.stopPropagation();
                    setTimeout(() => a.classList.add('dragging'), 0);
                });
                a.addEventListener('dragend', () => {
                    a.classList.remove('dragging');
                    syncOrder();
                });
            }
            
            const iconUrl = bm.customIcon ? bm.customIcon : getFavicon(bm.url);
            
            a.innerHTML = \`
                <img src="\${iconUrl}" class="bookmark-icon" title="Click to upload custom icon" alt="icon">
                <div class="bookmark-info">
                    <div class="bookmark-name">\${bm.name}</div>
                </div>
                <div class="action-btns">
                    <button class="icon-btn edit-btn" data-id="\${bm.id}" title="Edit Bookmark">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button class="icon-btn delete-btn" data-id="\${bm.id}" title="Delete Bookmark">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
            \`;
            
            const imgEl = a.querySelector('.bookmark-icon');
            imgEl.addEventListener('error', function() {
                const fallbackSvg = \`data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100' height='100' fill='%23333'/><text x='50' y='50' font-size='40' text-anchor='middle' fill='white' dy='14'>?</text></svg>\`;
                this.src = fallbackSvg;
            }, { once: true });
            
            imgEl.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const fileInput = document.createElement('input');
                fileInput.type = 'file';
                fileInput.accept = 'image/*';
                fileInput.onchange = (event) => {
                    const file = event.target.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            const img = new Image();
                            img.onload = () => {
                                const canvas = document.createElement('canvas');
                                const MAX_SIZE = 128;
                                let width = img.width;
                                let height = img.height;
                                
                                if (width > height && width > MAX_SIZE) {
                                    height *= MAX_SIZE / width;
                                    width = MAX_SIZE;
                                } else if (height > MAX_SIZE) {
                                    width *= MAX_SIZE / height;
                                    height = MAX_SIZE;
                                }
                                
                                canvas.width = width;
                                canvas.height = height;
                                const ctx = canvas.getContext('2d');
                                ctx.drawImage(img, 0, 0, width, height);
                                
                                const dataUrl = canvas.toDataURL('image/png');
                                
                                const targetBm = state.bookmarks.find(b => b.id === bm.id);
                                if (targetBm) {
                                    targetBm.customIcon = dataUrl;
                                    saveData();
                                    render(DOM.searchInput.value);
                                }
                            };
                            img.src = e.target.result;
                        };
                        reader.readAsDataURL(file);
                    }
                };
                fileInput.click();
            });
            
            a.addEventListener('click', (e) => {
                if (e.target.closest('.action-btns') || e.target.classList.contains('bookmark-icon')) {
                    return;
                }
                bm.clicks = (bm.clicks || 0) + 1;
                saveData();
            });

            const delBtn = a.querySelector('.delete-btn');
            delBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (confirm(\`Are you sure you want to delete "\${bm.name}"?\`)) {
                    deleteBookmark(bm.id);
                    render(DOM.searchInput.value);
                }
            });

            const editBtn = a.querySelector('.edit-btn');
            editBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                openEditModal(bm);
            });
            
            grid.appendChild(a);
        });
        
        if (searchTerm === '') {
            grid.addEventListener('dragover', (e) => {
                const draggable = document.querySelector('.bookmark-card.dragging');
                if (!draggable) return; 
                
                e.preventDefault(); 
                const afterElement = getDragAfterElement(grid, e.clientY);
                if (afterElement == null) {
                    grid.appendChild(draggable);
                } else {
                    grid.insertBefore(draggable, afterElement);
                }
            });
        }
        
        colDiv.appendChild(header);
        colDiv.appendChild(grid);
        DOM.collectionsContainer.appendChild(colDiv);
    });
}

// Category Dropdown
export function setupCategoryDropdown() {
    DOM.categoryInput.addEventListener('focus', showDropdown);
    DOM.categoryInput.addEventListener('input', showDropdown);

    function showDropdown() {
        const val = DOM.categoryInput.value.toLowerCase();
        const filtered = state.uniqueCategories.filter(c => c.toLowerCase().includes(val));
        
        if (filtered.length === 0) {
            DOM.categoryDropdown.classList.add('hidden');
            return;
        }
        
        DOM.categoryDropdown.innerHTML = '';
        filtered.forEach(cat => {
            const div = document.createElement('div');
            div.className = 'custom-dropdown-item';
            div.textContent = cat;
            div.addEventListener('click', () => {
                DOM.categoryInput.value = cat;
                DOM.categoryDropdown.classList.add('hidden');
            });
            DOM.categoryDropdown.appendChild(div);
        });
        
        DOM.categoryDropdown.classList.remove('hidden');
    }

    document.addEventListener('click', (e) => {
        if (e.target !== DOM.categoryInput && !DOM.categoryDropdown.contains(e.target)) {
            DOM.categoryDropdown.classList.add('hidden');
        }
    });
}
`;

const settingsJs = `
import { state, saveData, saveCategoryOrder } from './state.js';
import { DOM, render } from './ui.js';
import { getFavicon } from './utils.js';

export function setupTheme() {
    function applyTheme(themeName) {
        document.body.className = '';
        if (themeName !== 'cyan') {
            document.body.classList.add(\`theme-\${themeName}\`);
        }
        
        DOM.themeCircles.forEach(circle => {
            if (circle.dataset.theme === themeName) {
                circle.classList.add('active');
            } else {
                circle.classList.remove('active');
            }
        });
    }

    applyTheme(state.currentTheme);

    DOM.themeCircles.forEach(circle => {
        circle.addEventListener('click', () => {
            const selectedTheme = circle.dataset.theme;
            state.currentTheme = selectedTheme;
            applyTheme(selectedTheme);
            localStorage.setItem('glass_marks_theme', selectedTheme);
        });
    });
}

export function setupShortcuts() {
    function formatShortcut(e) {
        let keys = [];
        if (e.ctrlKey) keys.push('Ctrl');
        if (e.altKey) keys.push('Alt');
        if (e.shiftKey) keys.push('Shift');
        if (e.key !== 'Control' && e.key !== 'Alt' && e.key !== 'Shift' && e.key !== 'Meta') {
            let keyName = e.key.toUpperCase();
            if (e.code === 'Space') keyName = 'Space';
            keys.push(keyName);
        }
        return keys.join('+');
    }

    function setupShortcutRecorder(inputEl, shortcutKey) {
        if (!inputEl) return;
        inputEl.value = state.customShortcuts[shortcutKey].display;
        
        inputEl.addEventListener('focus', () => {
            inputEl.classList.add('recording');
            inputEl.value = "Press keys...";
        });
        
        inputEl.addEventListener('blur', () => {
            inputEl.classList.remove('recording');
            inputEl.value = state.customShortcuts[shortcutKey].display;
        });
        
        inputEl.addEventListener('keydown', (e) => {
            e.preventDefault();
            e.stopPropagation(); 
            
            if (e.key === 'Escape') {
                inputEl.blur();
                return;
            }
            
            if (e.key === 'Control' || e.key === 'Alt' || e.key === 'Shift' || e.key === 'Meta') return;
            
            const displayStr = formatShortcut(e);
            state.customShortcuts[shortcutKey] = {
                key: e.key,
                altKey: e.altKey,
                ctrlKey: e.ctrlKey,
                shiftKey: e.shiftKey,
                display: displayStr
            };
            
            inputEl.value = displayStr;
            localStorage.setItem('glass_marks_shortcuts', JSON.stringify(state.customShortcuts));
            inputEl.blur();
        });
    }

    setupShortcutRecorder(DOM.shortcutSearchInput, 'search');
    setupShortcutRecorder(DOM.shortcutAddInput, 'add');
}

export function setupSettings() {
    if (DOM.settingsBtn) {
        DOM.settingsBtn.addEventListener('click', () => {
            DOM.settingsModal.classList.remove('hidden');
        });
        DOM.closeSettingsBtn.addEventListener('click', () => {
            DOM.settingsModal.classList.add('hidden');
        });
        DOM.settingsModal.addEventListener('click', (e) => {
            if (e.target === DOM.settingsModal) DOM.settingsModal.classList.add('hidden');
        });
        
        DOM.exportBtn.addEventListener('click', () => {
            try {
                const dataToExport = {
                    bookmarks: state.bookmarks,
                    categoryOrder: state.categoryOrder
                };
                const jsonStr = JSON.stringify(dataToExport, null, 2);
                
                navigator.clipboard.writeText(jsonStr).then(() => {
                    alert("BERHASIL! ✅\\n\\nKarena sistem unduhan Chrome memblokir file, seluruh data Bookmark Anda telah otomatis di-COPY (Salin) ke Clipboard Anda.\\n\\nLANGKAH SELANJUTNYA:\\n1. Buka aplikasi Notepad di komputer Anda.\\n2. Tekan Ctrl + V (Paste).\\n3. Simpan file tersebut (Save As) dengan nama 'backup.json'.\\n\\nData Anda dijamin aman sekarang!");
                }).catch(err => {
                    console.error("Clipboard fail", err);
                });
                
                const blob = new Blob([jsonStr], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const downloadAnchorNode = document.createElement('a');
                downloadAnchorNode.href = url;
                const date = new Date();
                const dateString = \`\${date.getFullYear()}-\${String(date.getMonth() + 1).padStart(2, '0')}-\${String(date.getDate()).padStart(2, '0')}\`;
                downloadAnchorNode.download = \`glass_marks_backup_\${dateString}.json\`;
                document.body.appendChild(downloadAnchorNode);
                downloadAnchorNode.click();
                downloadAnchorNode.remove();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
                
            } catch (err) {
                alert("Error preparing export: " + err.message);
            }
        });
        
        DOM.importBtnProxy.addEventListener('click', () => {
            DOM.importFile.click();
        });
        
        DOM.importFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const importedData = JSON.parse(event.target.result);
                    if (Array.isArray(importedData)) {
                        state.bookmarks = importedData;
                        state.categoryOrder = [];
                    } else if (importedData.bookmarks) {
                        state.bookmarks = importedData.bookmarks;
                        if (importedData.categoryOrder) {
                            state.categoryOrder = importedData.categoryOrder;
                        }
                    } else {
                        throw new Error("Invalid data format");
                    }
                    
                    saveData();
                    saveCategoryOrder();
                    render(DOM.searchInput.value);
                    
                    alert('Data imported successfully!');
                    DOM.settingsModal.classList.add('hidden');
                    DOM.importFile.value = ""; 
                    
                } catch (error) {
                    alert('Failed to parse the backup file. Please ensure it is a valid Glass Marks JSON backup.');
                    DOM.importFile.value = "";
                }
            };
            reader.readAsText(file);
        });
    }

    if (DOM.syncNativeBtn) {
        DOM.syncNativeBtn.addEventListener('click', () => {
            if (typeof chrome === 'undefined' || !chrome.bookmarks) {
                alert("Fitur ini hanya bekerja jika Anda menginstallnya sebagai ekstensi Chrome.");
                return;
            }
            if (confirm("Langkah ini akan menimpa/menghapus folder 'Glass Marks' lama di Bookmarks Manager Chrome Anda dan menggantinya dengan versi terbaru ini. Lanjutkan?")) {
                DOM.syncNativeBtn.innerHTML = "Syncing...";
                DOM.syncNativeBtn.disabled = true;
                
                const FOLDER_NAME = 'Glass Marks';
                
                chrome.bookmarks.search({ title: FOLDER_NAME }, (results) => {
                    const existingFolders = results.filter(r => !r.url);
                    
                    const startSync = (parentId) => {
                        let total = state.bookmarks.length;
                        let processed = 0;
                        if (total === 0) {
                            DOM.syncNativeBtn.innerHTML = "Push to Chrome Bookmarks";
                            DOM.syncNativeBtn.disabled = false;
                            alert("Done!");
                            return;
                        }
                        state.bookmarks.forEach(bm => {
                            chrome.bookmarks.create({
                                parentId: parentId,
                                title: bm.name,
                                url: bm.url
                            }, () => {
                                processed++;
                                if (processed === total) {
                                    setTimeout(() => { DOM.syncNativeBtn.innerHTML = "Push to Chrome Bookmarks"; DOM.syncNativeBtn.disabled = false; }, 2000);
                                    alert("Successfully pushed all bookmarks to Chrome's native Bookmarks Manager under the 'Glass Marks' folder!");
                                }
                            });
                        });
                    };
                    
                    if (existingFolders.length > 0) {
                        let removedCount = 0;
                        existingFolders.forEach(folder => {
                            chrome.bookmarks.removeTree(folder.id, () => {
                                removedCount++;
                                if (removedCount === existingFolders.length) {
                                    chrome.bookmarks.create({ title: FOLDER_NAME }, (newRoot) => {
                                        startSync(newRoot.id);
                                    });
                                }
                            });
                        });
                    } else {
                        chrome.bookmarks.create({ title: FOLDER_NAME }, (newRoot) => {
                            startSync(newRoot.id);
                        });
                    }
                });
            }
        });
    }
}
`;

const mainJs = `
import { state, initData, initTab, saveData } from './state.js';
import { DOM, render, setupCategoryDropdown } from './ui.js';
import { setupSettings, setupTheme, setupShortcuts } from './settings.js';
import { getFavicon } from './utils.js';
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
            
            DOM.quickAddBtn.innerHTML = \`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>\`;
            setTimeout(() => {
                DOM.quickAddBtn.innerHTML = \`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>\`;
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
                
                item.innerHTML = \`
                    <div style="display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0;">
                        <span class="leaderboard-rank \${rankClass}">\${rank === 1 ? '🏆' : rank}</span>
                        <img src="\${iconUrl}" style="width: 24px; height: 24px; border-radius: 6px; object-fit: contain;">
                        <span style="color: var(--text-main); font-weight: 500; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">\${bm.name}</span>
                    </div>
                    <span class="clicks-badge \${hotClass}">\${icon} \${bm.clicks}</span>
                \`;
                
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
`;

fs.writeFileSync(path.join(dir, 'state.js'), stateJs);
fs.writeFileSync(path.join(dir, 'dom.js'), domJs);
fs.writeFileSync(path.join(dir, 'utils.js'), utilsJs);
fs.writeFileSync(path.join(dir, 'dragdrop.js'), dragdropJs);
fs.writeFileSync(path.join(dir, 'ui.js'), uiJs);
fs.writeFileSync(path.join(dir, 'settings.js'), settingsJs);
fs.writeFileSync(path.join(dir, 'main.js'), mainJs);

// Update index.html
const indexHtmlPath = path.join(__dirname, 'index.html');
let indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
indexHtml = indexHtml.replace('<script src="script.js"></script>', '<script type="module" src="js/main.js"></script>');
fs.writeFileSync(indexHtmlPath, indexHtml);

console.log("Refactoring complete.");
