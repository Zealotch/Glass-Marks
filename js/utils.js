
export function getFavicon(url) {
    try {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
            const faviconUrl = new URL(chrome.runtime.getURL("/_favicon/"));
            faviconUrl.searchParams.set("pageUrl", url);
            faviconUrl.searchParams.set("size", "64");
            return faviconUrl.toString();
        }
        const domain = new URL(url).hostname;
        return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
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
