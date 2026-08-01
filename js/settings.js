
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
                
                navigator.clipboard.writeText(jsonStr).then(() => {
                    alert("BERHASIL! ✅\n\nKarena sistem unduhan Chrome memblokir file, seluruh data Bookmark Anda telah otomatis di-COPY (Salin) ke Clipboard Anda.\n\nLANGKAH SELANJUTNYA:\n1. Buka aplikasi Notepad di komputer Anda.\n2. Tekan Ctrl + V (Paste).\n3. Simpan file tersebut (Save As) dengan nama 'backup.json'.\n\nData Anda dijamin aman sekarang!");
                }).catch(err => {
                    console.error("Clipboard fail", err);
                });
                
                const blob = new Blob([jsonStr], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const downloadAnchorNode = document.createElement('a');
                downloadAnchorNode.href = url;
                const date = new Date();
                const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                downloadAnchorNode.download = `glass_marks_backup_${dateString}.json`;
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
