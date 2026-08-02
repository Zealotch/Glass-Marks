
import { state, saveData, saveCategoryOrder, saveTheme, saveShortcuts } from './state.js';
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
            applyTheme(selectedTheme);
            saveTheme(selectedTheme);
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
            saveShortcuts(state.customShortcuts);
            inputEl.blur();
        });
    }

    setupShortcutRecorder(DOM.shortcutSearchInput, 'search');
    setupShortcutRecorder(DOM.shortcutAddInput, 'add');
}

export function setupSettings() {
    let availableSnapshots = [];

    function refreshSnapshotUI() {
        if (!DOM.snapshotSection || !DOM.snapshotSelect) return;
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.get(['glass_marks_snapshots'], (res) => {
                availableSnapshots = res.glass_marks_snapshots || [];
                if (availableSnapshots.length > 0) {
                    DOM.snapshotSection.style.display = 'block';
                    DOM.snapshotSelect.innerHTML = availableSnapshots.map((s, idx) => 
                        `<option value="${idx}">Auto-Backup: ${s.date} (${s.count} items)</option>`
                    ).join('');
                } else {
                    DOM.snapshotSection.style.display = 'none';
                }
            });
        }
    }

    if (DOM.settingsBtn) {
        DOM.settingsBtn.addEventListener('click', () => {
            refreshSnapshotUI();
            DOM.settingsModal.classList.remove('hidden');
        });
        DOM.closeSettingsBtn.addEventListener('click', () => {
            DOM.settingsModal.classList.add('hidden');
        });
        DOM.settingsModal.addEventListener('click', (e) => {
            if (e.target === DOM.settingsModal) DOM.settingsModal.classList.add('hidden');
        });

        if (DOM.restoreSnapshotBtn) {
            DOM.restoreSnapshotBtn.addEventListener('click', () => {
                const selectedIdx = parseInt(DOM.snapshotSelect.value, 10);
                const snapshot = availableSnapshots[selectedIdx];
                if (!snapshot) return;

                if (confirm(`Restore auto-backup from ${snapshot.date} (${snapshot.count} bookmarks)? Current data will be replaced.`)) {
                    state.bookmarks = snapshot.bookmarks;
                    state.categoryOrder = snapshot.categoryOrder || [];
                    saveData();
                    saveCategoryOrder();
                    render(DOM.searchInput.value);
                    alert("Auto-backup restored successfully! 🎉");
                    DOM.settingsModal.classList.add('hidden');
                }
            });
        }
        
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
        
        function validateImportedBookmarks(rawList) {
            if (!Array.isArray(rawList)) return null;
            const valid = [];
            for (const item of rawList) {
                if (item && typeof item === 'object' && typeof item.url === 'string' && item.url.trim().length > 0) {
                    valid.push({
                        id: typeof item.id === 'number' ? item.id : Date.now() + Math.floor(Math.random() * 100000),
                        name: typeof item.name === 'string' && item.name.trim() ? item.name.trim() : 'Untitled',
                        url: item.url.trim(),
                        category: typeof item.category === 'string' && item.category.trim() ? item.category.trim() : 'Uncategorized',
                        categoryDesc: typeof item.categoryDesc === 'string' ? item.categoryDesc : '',
                        customIcon: typeof item.customIcon === 'string' ? item.customIcon : null,
                        clicks: typeof item.clicks === 'number' ? item.clicks : 0
                    });
                }
            }
            return valid.length > 0 ? valid : null;
        }

        DOM.importFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const importedData = JSON.parse(event.target.result);
                    let importedBookmarks = null;
                    let importedCategoryOrder = [];

                    if (Array.isArray(importedData)) {
                        importedBookmarks = validateImportedBookmarks(importedData);
                    } else if (importedData && typeof importedData === 'object') {
                        if (importedData.bookmarks) {
                            importedBookmarks = validateImportedBookmarks(importedData.bookmarks);
                        }
                        if (Array.isArray(importedData.categoryOrder)) {
                            importedCategoryOrder = importedData.categoryOrder.filter(c => typeof c === 'string');
                        }
                    }
                    
                    if (!importedBookmarks) {
                        throw new Error("No valid bookmarks found in file.");
                    }

                    state.bookmarks = importedBookmarks;
                    state.categoryOrder = importedCategoryOrder;
                    
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

    if (DOM.importNativeBtn) {
        DOM.importNativeBtn.addEventListener('click', () => {
            if (typeof chrome === 'undefined' || !chrome.bookmarks) {
                alert("Fitur ini hanya bekerja jika Anda menginstallnya sebagai ekstensi Chrome.");
                return;
            }

            function extractBookmarks(nodes, currentFolder = "Chrome Bookmarks") {
                let results = [];
                for (const node of nodes) {
                    if (node.url) {
                        if (node.url.startsWith('http://') || node.url.startsWith('https://')) {
                            results.push({
                                id: Date.now() + Math.floor(Math.random() * 10000000),
                                name: node.title || 'Untitled',
                                url: node.url,
                                category: currentFolder,
                                categoryDesc: 'Imported from Chrome',
                                clicks: 0
                            });
                        }
                    }
                    if (node.children && node.children.length > 0) {
                        let folderName = node.title;
                        if (!folderName || folderName === "Bookmarks bar" || folderName === "Bookmarks" || folderName === "Other bookmarks" || folderName === "Mobile bookmarks") {
                            folderName = currentFolder;
                        }
                        results = results.concat(extractBookmarks(node.children, folderName));
                    }
                }
                return results;
            }

            chrome.bookmarks.getTree((tree) => {
                if (chrome.runtime.lastError || !tree) {
                    alert("Gagal membaca bookmark dari Chrome.");
                    return;
                }

                const imported = extractBookmarks(tree);
                if (imported.length === 0) {
                    alert("Tidak ada bookmark web (http/https) yang ditemukan di Chrome Anda.");
                    return;
                }

                const existingUrls = new Set(state.bookmarks.map(b => b.url.toLowerCase().trim().replace(/\/+$/, "")));
                const newItems = [];

                for (const item of imported) {
                    const cleanUrl = item.url.toLowerCase().trim().replace(/\/+$/, "");
                    if (!existingUrls.has(cleanUrl)) {
                        existingUrls.add(cleanUrl);
                        newItems.push(item);
                    }
                }

                if (newItems.length === 0) {
                    alert("Semua bookmark Chrome Anda sudah ada di Glass Marks (tidak ada bookmark baru).");
                    return;
                }

                if (confirm(`Ditemukan ${newItems.length} bookmark dari Chrome. Impor ke Glass Marks sekarang?`)) {
                    state.bookmarks = [...state.bookmarks, ...newItems];

                    newItems.forEach(item => {
                        if (!state.categoryOrder.includes(item.category)) {
                            state.categoryOrder.push(item.category);
                        }
                    });

                    saveData();
                    saveCategoryOrder();
                    render(DOM.searchInput.value);
                    alert(`Berhasil mengimpor ${newItems.length} bookmark dari Chrome! 🎉`);
                    DOM.settingsModal.classList.add('hidden');
                }
            });
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
                        DOM.syncNativeBtn.innerHTML = "Push to Chrome";
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
                                    DOM.syncNativeBtn.innerHTML = "Push to Chrome"; 
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

