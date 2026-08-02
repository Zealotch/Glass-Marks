
import { state, saveData, saveCategoryOrder } from './state.js';
import { DOM } from './dom.js';
import { render } from './ui.js';
import { getFavicon } from './utils.js';

export function setupTheme() {
    function applyTheme(themeName) {
        document.body.className = '';
        if (themeName !== 'cyan') {
            document.body.classList.add(`theme-${themeName}`);
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
                const blob = new Blob([jsonStr], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const date = new Date();
                const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                const filename = `glass_marks_backup_${dateString}.json`;

                if (typeof chrome !== 'undefined' && chrome.downloads && chrome.downloads.download) {
                    chrome.downloads.download({
                        url: url,
                        filename: filename,
                        saveAs: true
                    }, (downloadId) => {
                        if (chrome.runtime.lastError) {
                            console.warn("Download API fallback:", chrome.runtime.lastError);
                            fallbackDownload(url, filename);
                        }
                    });
                } else {
                    fallbackDownload(url, filename);
                }
            } catch (err) {
                alert("Error preparing export: " + err.message);
            }
        });

        function fallbackDownload(url, filename) {
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.href = url;
            downloadAnchorNode.download = filename;
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
        
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
            if (confirm("Sinkronkan bookmark ke Bookmarks Manager Chrome (Folder 'Glass Marks')?")) {
                DOM.syncNativeBtn.innerHTML = "Syncing...";
                DOM.syncNativeBtn.disabled = true;
                
                const FOLDER_NAME = 'Glass Marks';
                
                const populateBookmarks = (folderId) => {
                    let total = state.bookmarks.length;
                    let processed = 0;
                    if (total === 0) {
                        DOM.syncNativeBtn.innerHTML = "Push to Chrome Bookmarks";
                        DOM.syncNativeBtn.disabled = false;
                        alert("Done! Tidak ada bookmark yang perlu disinkronkan.");
                        return;
                    }
                    state.bookmarks.forEach(bm => {
                        chrome.bookmarks.create({
                            parentId: folderId,
                            title: bm.name,
                            url: bm.url
                        }, () => {
                            processed++;
                            if (processed === total) {
                                setTimeout(() => { 
                                    DOM.syncNativeBtn.innerHTML = "Push to Chrome Bookmarks"; 
                                    DOM.syncNativeBtn.disabled = false; 
                                }, 1500);
                                alert("Berhasil menyinkronkan seluruh bookmark ke folder 'Glass Marks' di Chrome!");
                            }
                        });
                    });
                };

                const createFreshFolderAndSync = () => {
                    chrome.bookmarks.create({ title: FOLDER_NAME }, (newFolder) => {
                        chrome.storage.local.set({ glass_marks_native_folder_id: newFolder.id }, () => {
                            populateBookmarks(newFolder.id);
                        });
                    });
                };

                chrome.storage.local.get(['glass_marks_native_folder_id'], (res) => {
                    const savedFolderId = res.glass_marks_native_folder_id;
                    if (savedFolderId) {
                        chrome.bookmarks.get(savedFolderId, (nodes) => {
                            if (chrome.runtime.lastError || !nodes || nodes.length === 0) {
                                createFreshFolderAndSync();
                            } else {
                                chrome.bookmarks.removeTree(savedFolderId, () => {
                                    createFreshFolderAndSync();
                                });
                            }
                        });
                    } else {
                        createFreshFolderAndSync();
                    }
                });
            }
        });
    }
}
