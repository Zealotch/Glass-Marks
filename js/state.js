
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

export function saveTheme(theme) {
    state.currentTheme = theme;
    if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set({ 'glass_marks_theme': theme });
    }
    localStorage.setItem('glass_marks_theme', theme);
}

export function saveShortcuts(shortcuts) {
    state.customShortcuts = shortcuts;
    if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set({ 'glass_marks_shortcuts': shortcuts });
    }
    localStorage.setItem('glass_marks_shortcuts', JSON.stringify(shortcuts));
}

export function deleteBookmark(id) {
    state.bookmarks = state.bookmarks.filter(b => b.id !== id);
    saveData();
}

export function initData(callback) {
    if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.get(['glass_marks_data', 'glass_marks_category_order', 'glass_marks_theme', 'glass_marks_shortcuts'], (result) => {
            if (result.glass_marks_theme) {
                state.currentTheme = result.glass_marks_theme;
            } else {
                state.currentTheme = localStorage.getItem('glass_marks_theme') || 'cyan';
            }

            if (result.glass_marks_shortcuts) {
                state.customShortcuts = result.glass_marks_shortcuts;
            } else {
                const savedShortcuts = localStorage.getItem('glass_marks_shortcuts');
                if (savedShortcuts) {
                    try { state.customShortcuts = JSON.parse(savedShortcuts); } catch(e) {}
                }
            }

            if (result.glass_marks_data && result.glass_marks_data.length > 0) {
                state.bookmarks = result.glass_marks_data;
            } else {
                const localBookmarks = localStorage.getItem('glass_marks_data');
                if (localBookmarks) {
                    try { state.bookmarks = JSON.parse(localBookmarks); } catch(e) { state.bookmarks = defaultBookmarks; }
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
                    try { state.categoryOrder = JSON.parse(localOrder); } catch(e) { state.categoryOrder = []; }
                    saveCategoryOrder();
                }
            }
            callback();
        });
    } else {
        state.currentTheme = localStorage.getItem('glass_marks_theme') || 'cyan';
        const savedShortcuts = localStorage.getItem('glass_marks_shortcuts');
        if (savedShortcuts) {
            try { state.customShortcuts = JSON.parse(savedShortcuts); } catch(e) {}
        }
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
