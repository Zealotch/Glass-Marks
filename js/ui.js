
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
    DOM.statsText.innerText = `${state.bookmarks.length} bookmarks across ${totalCategories} collections`;

    if (DOM.quickNav) {
        DOM.quickNav.innerHTML = '';
        categories.forEach(cat => {
            const btn = document.createElement('button');
            btn.className = 'nav-pill';
            btn.textContent = cat;
            btn.addEventListener('click', () => {
                const target = document.getElementById('cat-' + cat.replace(/\s+/g, '-'));
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
        colDiv.id = 'cat-' + cat.replace(/\s+/g, '-');
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
        header.innerHTML = `
            <h2 class="category-title-editable" contenteditable="true">${cat}</h2>
            <span class="category-desc-editable" contenteditable="true" data-placeholder="Add description...">${descText}</span>
        `;
        
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
            
            a.innerHTML = `
                <img src="${iconUrl}" class="bookmark-icon" title="Click to upload custom icon" alt="icon">
                <div class="bookmark-info">
                    <div class="bookmark-name">${bm.name}</div>
                </div>
                <div class="action-btns">
                    <button class="icon-btn edit-btn" data-id="${bm.id}" title="Edit Bookmark">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button class="icon-btn delete-btn" data-id="${bm.id}" title="Delete Bookmark">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
            `;
            
            const imgEl = a.querySelector('.bookmark-icon');
            imgEl.addEventListener('error', function() {
                const fallbackSvg = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100' height='100' fill='%23333'/><text x='50' y='50' font-size='40' text-anchor='middle' fill='white' dy='14'>?</text></svg>`;
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
                if (confirm(`Are you sure you want to delete "${bm.name}"?`)) {
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
