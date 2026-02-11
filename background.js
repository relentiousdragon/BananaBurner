const UPDATE_ALARM_NAME = 'scriptUpdateCheck';
const activeWebSockets = new Map();

class ScriptManager {
    constructor() {
        this.initialize();
    }

    async initialize() {
        await this.migrateStorage();
        await this.checkScriptUpdate();
        await this.setupHeaderRules();
        await this.setupOverrideRules();
        await this.setupQuicRules();
        await this.setupAlarm();
    }

    async setupAlarm() {
        try {
            await chrome.alarms.create(UPDATE_ALARM_NAME, {
                periodInMinutes: 60
            });
            console.log('Banana Burner: Update alarm scheduled (every 60 min).');
        } catch (e) {
            console.error('Banana Burner: Failed to create alarm:', e);
        }
    }

    async setupQuicRules() {
        const disabled = await this.getFromStorage('quicDisabled', false);
        if (disabled) {
            const rule = {
                id: 4,
                priority: 4,
                action: {
                    type: 'modifyHeaders',
                    responseHeaders: [{ header: 'Alt-Svc', operation: 'remove' }]
                },
                condition: {
                    urlFilter: '*bot-hosting.net*',
                    resourceTypes: ['main_frame', 'sub_frame', 'xmlhttprequest', 'script', 'stylesheet', 'image', 'websocket']
                }
            };
            try {
                await chrome.declarativeNetRequest.updateDynamicRules({
                    removeRuleIds: [4],
                    addRules: [rule]
                });
                console.log('Banana Burner: QUIC stripping rule applied.');
            } catch (e) { console.error('QUIC Error:', e); }
        } else {
            try {
                await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: [4] });
                console.log('Banana Burner: QUIC stripping rule removed.');
            } catch (e) { }
        }
    }

    async setupOverrideRules() {
        const enabled = await this.isEnabled();
        const override = await this.isOverrideSRCEnabled();

        if (enabled && override) {
            const rule = {
                id: 3,
                priority: 3,
                action: {
                    type: 'redirect',
                    redirect: { extensionPath: '/injected.js' }
                },
                condition: {
                    urlFilter: 'bot-hosting.net/panel/assets/index*.js',
                    resourceTypes: ['script']
                }
            };

            const blockingRules = [
                {
                    id: 10,
                    priority: 1,
                    action: { type: 'block' },
                    condition: { urlFilter: '*nitropay.com*', resourceTypes: ['script', 'sub_frame'] }
                },
                {
                    id: 11,
                    priority: 1,
                    action: { type: 'block' },
                    condition: { urlFilter: '*googletagmanager.com*', resourceTypes: ['script'] }
                },
                {
                    id: 12,
                    priority: 1,
                    action: { type: 'block' },
                    condition: { urlFilter: '*cloudflareinsights.com*', resourceTypes: ['script'] }
                },
                {
                    id: 13,
                    priority: 1,
                    action: { type: 'block' },
                    condition: { urlFilter: '*sweetalert*', resourceTypes: ['script', 'stylesheet'] }
                },
                {
                    id: 14,
                    priority: 1,
                    action: { type: 'block' },
                    condition: { urlFilter: '*simplemde*', resourceTypes: ['script', 'stylesheet'] }
                },
                {
                    id: 15,
                    priority: 1,
                    action: { type: 'block' },
                    condition: { urlFilter: '*bttn.css*', resourceTypes: ['stylesheet'] }
                }
            ];

            try {
                await chrome.declarativeNetRequest.updateDynamicRules({
                    removeRuleIds: [3, 5, 10, 11, 12, 13, 14, 15],
                    addRules: [rule, ...blockingRules]
                });
                console.log('Banana Burner: Override redirection (JS) and blocking rules applied.');
            } catch (error) {
                console.error('Banana Burner: Failed to apply override/blocking rules:', error);
            }
        } else {
            try {
                await chrome.declarativeNetRequest.updateDynamicRules({
                    removeRuleIds: [3, 5, 10, 11, 12, 13, 14, 15]
                });
                console.log('Banana Burner: Override redirection and blocking rules removed.');
            } catch (error) {
                console.error('Banana Burner: Failed to remove override rules:', error);
            }
        }
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
            const syncData = await chrome.storage.sync.get(['extensionEnabled']);

            const legacyKeys = ['bananaburner_script_cache', 'bananaburner_script_timestamp'];
            await chrome.storage.local.remove(legacyKeys);
            await chrome.storage.sync.remove(legacyKeys);

            const storedVersion = await this.getFromStorage('scriptVersion', true);
            if (storedVersion && storedVersion.includes('2979')) {
                await chrome.storage.local.remove('scriptVersion');
            }

            if (!storedVersion) {
                const manifestScriptVersion = chrome.runtime.getManifest().script_version;
                await this.setInStorage('scriptVersion', manifestScriptVersion, true);
            }

            if (syncData.extensionEnabled === undefined) {
                await chrome.storage.sync.set({
                    extensionEnabled: true,
                    overrideSRCEnabled: true
                });
            } else if ((await this.getFromStorage('overrideSRCEnabled', false)) === undefined) {
                await this.setOverrideSRC(true);
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

    async checkScriptUpdate() {
        try {
            console.log('Banana Burner: Checking for script updates (sv.dat)...');

            const response = await fetch('https://raw.githubusercontent.com/relentiousdragon/BananaBurner/main/sv.dat?t=' + Date.now());
            if (!response.ok) throw new Error(`sv.dat fetch failed: HTTP ${response.status}`);

            const remoteScriptVersion = (await response.text()).trim();
            if (!remoteScriptVersion) throw new Error('Empty sv.dat received');

            const currentScriptVersion = await this.getFromStorage('scriptVersion', true);

            await this.setInStorage('latestScriptVersion', remoteScriptVersion, true);
            await this.setInStorage('lastScriptCheck', Date.now(), true);

            const updateAvailable = this.isVersionNewer(currentScriptVersion, remoteScriptVersion);
            await this.setInStorage('scriptUpdateAvailable', updateAvailable, true);

            console.log(`Banana Burner: Script check: current v${currentScriptVersion}, remote v${remoteScriptVersion}, update? ${updateAvailable}`);

            this.checkExtensionUpdate();

            return {
                scriptUpdateAvailable: updateAvailable,
                currentVersion: currentScriptVersion,
                latestVersion: remoteScriptVersion
            };

        } catch (error) {
            console.error('Banana Burner: Failed to check script update:', error);
            return { error: error.message };
        }
    }

    async checkExtensionUpdate() {
        try {
            const currentVersion = chrome.runtime.getManifest().version;
            const response = await fetch('https://raw.githubusercontent.com/relentiousdragon/BananaBurner/main/manifest.json?t=' + Date.now());
            if (!response.ok) return;

            const remoteManifest = await response.json();
            const remoteVersion = remoteManifest.version;

            if (this.isVersionNewer(currentVersion, remoteVersion)) {
                await this.setInStorage('extensionUpdateAvailable', remoteVersion, true);
                console.log(`Banana Burner: New extension version available: ${remoteVersion}`);
            } else {
                await this.setInStorage('extensionUpdateAvailable', false, true);
            }
        } catch (e) {
            console.error('Banana Burner: Extension update check failed:', e);
        }
    }

    isVersionNewer(current, remote) {
        if (!current || !remote) return false;
        const c = current.split('.').map(Number);
        const r = remote.split('.').map(Number);
        for (let i = 0; i < Math.max(c.length, r.length); i++) {
            const cv = c[i] || 0;
            const rv = r[i] || 0;
            if (rv > cv) return true;
            if (cv > rv) return false;
        }
        return false;
    }

    async isEnabled() {
        const enabled = await this.getFromStorage('extensionEnabled', false);
        return enabled !== false;
    }

    async setEnabled(enabled) {
        await this.setInStorage('extensionEnabled', enabled, false);
        if (!enabled) {
            await this.setInStorage('overrideSRCEnabled', false, false);
        }
        await this.setupOverrideRules();
    }

    async isOverrideSRCEnabled() {
        const enabled = await this.getFromStorage('overrideSRCEnabled', false);
        return enabled === true;
    }

    async setOverrideSRC(enabled) {
        await this.setInStorage('overrideSRCEnabled', enabled, false);
        await this.setupOverrideRules();
    }

    async getVersion() {
        const version = await this.getFromStorage('scriptVersion', true);
        return version || chrome.runtime.getManifest().script_version || '?.?';
    }

    async getLastChecked() {
        const timestamp = await this.getFromStorage('lastScriptCheck', true);
        return timestamp ? new Date(timestamp).toLocaleDateString() : 'Never';
    }
}

const scriptManager = new ScriptManager();

chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === UPDATE_ALARM_NAME) {
        console.log('Banana Burner: Alarm fired, checking for script updates...');
        await scriptManager.checkScriptUpdate();
    }
});

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
        case 'getStatus':
            Promise.all([
                scriptManager.isEnabled(),
                scriptManager.isOverrideSRCEnabled(),
                scriptManager.getLastChecked(),
                scriptManager.getVersion(),
                scriptManager.getFromStorage('extensionUpdateAvailable', true),
                scriptManager.getFromStorage('scriptUpdateAvailable', true),
                scriptManager.getFromStorage('latestScriptVersion', true)
            ]).then(([enabled, overrideSRC, lastChecked, scriptVersion, extensionUpdate, scriptUpdateAvailable, latestScriptVersion]) => {
                const version = chrome.runtime.getManifest().version;
                sendResponse({
                    enabled,
                    overrideSRC,
                    version,
                    lastChecked,
                    scriptVersion,
                    extensionUpdate,
                    scriptUpdateAvailable,
                    latestScriptVersion
                });
            });
            return true;

        case 'setOverrideSRC':
            scriptManager.setOverrideSRC(request.enabled).then(() => {
                sendResponse({ success: true });
            });
            return true;

        case 'setEnabled':
            scriptManager.setEnabled(request.enabled).then(() => {
                sendResponse({ success: true });
            });
            return true;

        case 'checkScriptUpdate':
            scriptManager.checkScriptUpdate().then(result => {
                sendResponse(result);
            });
            return true;

        case 'checkExtensionUpdate':
            scriptManager.checkExtensionUpdate().then(() => {
                sendResponse({ success: true });
            });
            return true;

        case 'setQuicDisabled':
            scriptManager.setInStorage('quicDisabled', request.disabled, false).then(() => {
                scriptManager.setupQuicRules().then(() => {
                    sendResponse({ success: true });
                });
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

        case 'scriptUpdateDetected':
            chrome.action.setBadgeText({ text: '!' });
            chrome.action.setBadgeBackgroundColor({ color: '#FFAB00' });

            (async () => {
                await scriptManager.setInStorage('scriptUpdateAvailable', true, true);
                if (request.version) {
                    await scriptManager.setInStorage('latestScriptVersion', request.version, true);
                }
            })();

            sendResponse({ success: true });
            return true;

        case 'proxyFetch': {
            const { url, options } = request;
            console.log('Banana Burner: Proxying fetch to:', url);

            (async () => {
                try {
                    const targetUrl = new URL(url);
                    if (targetUrl.hostname.includes('bot-hosting.net')) {
                        const cookies = await chrome.cookies.getAll({ domain: targetUrl.hostname });
                        const xsrfCookie = cookies.find(c => c.name === 'XSRF-TOKEN');
                        if (xsrfCookie) {
                            options.headers = options.headers || {};
                            options.headers['X-XSRF-TOKEN'] = decodeURIComponent(xsrfCookie.value);
                        }
                    }

                    const response = await fetch(url, { ...options, credentials: 'include' });
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
                } catch (error) {
                    console.error('Banana Burner: Proxy fetch error:', error);
                    sendResponse({ success: false, error: error.message });
                }
            })();
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
