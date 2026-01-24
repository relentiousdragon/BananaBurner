const SCRIPT_URL = 'https://raw.githubusercontent.com/relentiousdragon/BananaBurner/main/injected.js';
const CACHE_KEY = 'bananaburner_script_cache';
const CACHE_TIMESTAMP_KEY = 'bananaburner_script_timestamp';
const CACHE_DURATION = 60 * 60 * 1000;

const activeWebSockets = new Map();

class ScriptManager {
    constructor() {
        this.initialize();
    }

    async initialize() {
        await this.migrateStorage();
        await this.checkForUpdates();
        await this.setupHeaderRules();
    }

    async setupHeaderRules() {
        const rules = [
            {
                id: 1,
                priority: 1,
                action: {
                    type: 'modifyHeaders',
                    requestHeaders: [
                        { header: 'Origin', operation: 'set', value: 'https://control.bot-hosting.net' },
                        { header: 'Referer', operation: 'set', value: 'https://control.bot-hosting.net/' }
                    ]
                },
                condition: {
                    urlFilter: '*bot-hosting.net*',
                    resourceTypes: ['xmlhttprequest', 'websocket']
                }
            },
            {
                id: 2,
                priority: 2,
                action: {
                    type: 'modifyHeaders',
                    requestHeaders: [
                        { header: 'Host', operation: 'set', value: 'control.bot-hosting.net' }
                    ]
                },
                condition: {
                    urlFilter: 'control.bot-hosting.net/api/*',
                    resourceTypes: ['xmlhttprequest']
                }
            }
        ];

        try {
            await chrome.declarativeNetRequest.updateDynamicRules({
                removeRuleIds: rules.map(r => r.id),
                addRules: rules
            });
            console.log('Banana Burner: Header modification rules applied.');
        } catch (error) {
            console.error('Banana Burner: Failed to apply header rules:', error);
        }
    }

    async migrateStorage() {
        try {
            const syncData = await chrome.storage.sync.get([
                'extensionEnabled',
                CACHE_KEY,
                CACHE_TIMESTAMP_KEY,
                'scriptVersion'
            ]);

            if (syncData[CACHE_KEY]) {
                await chrome.storage.local.set({
                    [CACHE_KEY]: syncData[CACHE_KEY],
                    [CACHE_TIMESTAMP_KEY]: syncData[CACHE_TIMESTAMP_KEY],
                    scriptVersion: syncData.scriptVersion
                });

                await chrome.storage.sync.remove([CACHE_KEY, CACHE_TIMESTAMP_KEY, 'scriptVersion']);
            }

            if (syncData.extensionEnabled === undefined) {
                await chrome.storage.sync.set({ extensionEnabled: true });
            }
        } catch (error) {
            console.log('Banana Burner: Migration completed or not needed');
        }
    }

    async getFromStorage(key, useLocal = false) {
        const storage = useLocal ? chrome.storage.local : chrome.storage.sync;
        const result = await storage.get(key);
        return result[key];
    }

    async setInStorage(key, value, useLocal = false) {
        const storage = useLocal ? chrome.storage.local : chrome.storage.sync;
        await storage.set({ [key]: value });
    }

    async checkForUpdates() {
        try {
            const cachedTimestamp = await this.getFromStorage(CACHE_TIMESTAMP_KEY, true);
            const now = Date.now();

            if (!cachedTimestamp || (now - cachedTimestamp) > CACHE_DURATION) {
                await this.updateScript();
            }
        } catch (error) {
            console.error('Banana Burner: Update check failed:', error);
        }
    }

    async updateScript(force = false) {
        try {
            console.log('Banana Burner: Updating script from GitHub...');
            const response = await fetch(SCRIPT_URL + (force ? `?t=${Date.now()}` : ''));
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

            const script = await response.text();

            if (!script || script.length === 0) {
                throw new Error('Empty script received');
            }

            console.log(`Banana Burner: Script fetched successfully (${script.length} bytes)`);

            await this.setInStorage(CACHE_KEY, script, true);
            await this.setInStorage(CACHE_TIMESTAMP_KEY, Date.now(), true);
            await this.setInStorage('scriptVersion', this.extractVersion(script), true);

            return { success: true, script };
        } catch (error) {
            console.error('Banana Burner: Failed to update script:', error);
            return { success: false, error: error.message };
        }
    }

    extractVersion(script) {
        const versionMatch = script.match(/BananaBurner\s+(\d+)/);
        return versionMatch ? versionMatch[1] : '2979.0.3';
    }

    async getScript() {
        try {
            await this.checkForUpdates();
            const cachedScript = await this.getFromStorage(CACHE_KEY, true);

            if (!cachedScript) {
                const result = await this.updateScript();
                return result.script || '';
            }

            return cachedScript;
        } catch (error) {
            console.error('Banana Burner: Failed to get script:', error);
            return '';
        }
    }

    async isEnabled() {
        const enabled = await this.getFromStorage('extensionEnabled', false);
        return enabled !== false;
    }

    async setEnabled(enabled) {
        await this.setInStorage('extensionEnabled', enabled, false);
    }

    async getVersion() {
        const version = await this.getFromStorage('scriptVersion', true);
        return version || '2979.?.?';
    }

    async getLastUpdated() {
        const timestamp = await this.getFromStorage(CACHE_TIMESTAMP_KEY, true);
        return timestamp ? new Date(timestamp).toLocaleDateString() : 'Never';
    }
}

const scriptManager = new ScriptManager();

chrome.webNavigation.onCompleted.addListener(async (details) => {
    if (details.url.includes('/panel/')) {
        const enabled = await scriptManager.isEnabled();
        if (enabled) {
            console.log('Banana Burner: Page loaded, bananajection ready 🍌');
        }
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case 'getScript':
            scriptManager.getScript().then(script => sendResponse({ script }));
            return true;

        case 'getStatus':
            Promise.all([
                scriptManager.isEnabled(),
                scriptManager.getVersion(),
                scriptManager.getLastUpdated()
            ]).then(([enabled, version, lastUpdated]) => {
                sendResponse({ enabled, version, lastUpdated });
            });
            return true;

        case 'setEnabled':
            scriptManager.setEnabled(request.enabled).then(() => {
                sendResponse({ success: true });
            });
            return true;

        case 'forceUpdate':
            scriptManager.updateScript(true).then(result => {
                sendResponse(result);
            });
            return true;

        case 'injectionComplete':
            console.log('Banana Burner: Script injected successfully!');
            sendResponse({ success: true });
            return true;

        case 'sendNotification': {
            console.log('Banana Burner: Received notification request:', request);

            const notificationOptions = {
                type: 'basic',
                iconUrl: chrome.runtime.getURL('icons/icon128.png'),
                title: request.title || 'Banana Burner',
                message: request.message || '',
                priority: 2
            };

            chrome.notifications.create(notificationOptions, (notificationId) => {
                if (chrome.runtime.lastError) {
                    const error = chrome.runtime.lastError.message;
                    console.error('Banana Burner: Primary notification failed:', error);

                    console.log('Banana Burner: Attempting fallback without icon...');
                    chrome.notifications.create({
                        type: 'basic',
                        iconUrl: '',
                        title: (request.title || 'Banana Burner') + ' (Fallback)',
                        message: request.message || ''
                    }, (fallbackId) => {
                        if (chrome.runtime.lastError) {
                            console.error('Banana Burner: Fallback notification also failed:', chrome.runtime.lastError.message);
                        } else {
                            console.log('Banana Burner: Fallback notification created:', fallbackId);
                        }
                    });
                } else {
                    console.log('Banana Burner: Notification created successfully:', notificationId);
                }
            });
            sendResponse({ success: true, logged: true });
            return true;
        }

        case 'proxyFetch': {
            const { url, options } = request;
            console.log('Banana Burner: Proxying fetch to:', url);

            fetch(url, options)
                .then(async response => {
                    const status = response.status;
                    const ok = response.ok;
                    const statusText = response.statusText;
                    let data;
                    const contentType = response.headers.get('content-type');

                    if (contentType && contentType.includes('application/json')) {
                        data = await response.json();
                    } else {
                        data = await response.text();
                    }

                    sendResponse({ success: true, status, ok, statusText, data });
                })
                .catch(error => {
                    console.error('Banana Burner: Proxy fetch error:', error);
                    sendResponse({ success: false, error: error.message });
                });
            return true;
        }

        case 'wsAction': {
            const { subAction, url, identifier, payload } = request;
            const socketKey = `${sender.tab.id}-${identifier}`;

            if (subAction === 'connect') {
                try {
                    if (activeWebSockets.has(socketKey)) {
                        try { activeWebSockets.get(socketKey).close(); } catch (e) { }
                    }
                    const ws = new WebSocket(url);
                    activeWebSockets.set(socketKey, ws);
                    ws.onopen = () => chrome.tabs.sendMessage(sender.tab.id, { source: 'banana-burner-ws', identifier, event: 'open' }).catch(() => { });
                    ws.onmessage = (e) => chrome.tabs.sendMessage(sender.tab.id, { source: 'banana-burner-ws', identifier, event: 'message', data: e.data }).catch(() => { });
                    ws.onerror = () => chrome.tabs.sendMessage(sender.tab.id, { source: 'banana-burner-ws', identifier, event: 'error' }).catch(() => { });
                    ws.onclose = () => {
                        chrome.tabs.sendMessage(sender.tab.id, { source: 'banana-burner-ws', identifier, event: 'close' }).catch(() => { });
                        activeWebSockets.delete(socketKey);
                    };
                    sendResponse({ success: true });
                } catch (e) {
                    sendResponse({ success: false, error: e.message });
                }
            } else if (subAction === 'send') {
                const ws = activeWebSockets.get(socketKey);
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(typeof payload === 'string' ? payload : JSON.stringify(payload));
                    sendResponse({ success: true });
                } else sendResponse({ success: false, error: 'Not connected' });
            } else if (subAction === 'close') {
                const ws = activeWebSockets.get(socketKey);
                if (ws) { ws.close(); activeWebSockets.delete(socketKey); }
                sendResponse({ success: true });
            }
            return true;
        }
    }
});
