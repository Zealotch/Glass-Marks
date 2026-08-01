
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
