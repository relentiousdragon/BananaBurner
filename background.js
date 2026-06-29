const UPDATE_ALARM_NAME = 'scriptUpdateCheck';
const activeWebSockets = new Map();
const notificationTabMap = new Map();
const NOTIFICATION_TTL = 10 * 60 * 1000;
//
class ScriptManager {
    constructor() {
        this.initialize();
    }

    async initialize() {
        await this.migrateStorage();
        await this.checkScriptUpdate();
        await this.setupHeaderRules();
        await this.setupOverrideRules();
        await this.setupAlarm();
    }

    async setupAlarm() {
        try {
            await chrome.alarms.create(UPDATE_ALARM_NAME, {
                periodInMinutes: 60
            });
            console.log('[BananaBurner] Update alarm scheduled.');
        } catch (e) {
            console.error('[BananaBurner] Failed to create alarm:', e);
        }
    }



    async setupOverrideRules() {
        const enabled = await this.isEnabled();
        const override = await this.isOverrideSRCEnabled();
        const showAds = await this.getFromStorage('showAds', true) !== false;
        const joinSupportServer = await this.getFromStorage('joinSupportServer', false) !== false;

        if (enabled && override) {
            const noDiscordServerJoin = !joinSupportServer ? {
                id: 20,
                priority: 10,
                action: {
                    type: 'redirect',
                    redirect: { url: 'https://discord.com/oauth2/authorize?client_id=884382422530158623&redirect_uri=https%3A%2F%2Flegacy.bot-hosting.net%2Fpanel%2F&response_type=code&scope=identify+email' }
                },
                condition: {
                    requestDomains: ["legacy.bot-hosting.net"],
                    excludedRequestDomains: [
                        "bot-hosting.net",
                    ],
                    urlFilter: "/login/discord",
                    resourceTypes: ["main_frame"]
                }
            } : null;

            const rule = {
                id: 3,
                priority: 3,
                action: {
                    type: 'redirect',
                    redirect: { extensionPath: '/injected.js' }
                },
                condition: {
                    urlFilter: 'legacy.bot-hosting.net/panel/assets/index*.js',
                    excludedRequestDomains: ['bot-hosting.net'],
                    resourceTypes: ['script']
                }
            };

            const blockingRules = [
                !showAds ? {
                    id: 10,
                    priority: 1,
                    action: { type: 'block' },
                    condition: { urlFilter: '*nitropay.com*', resourceTypes: ['script', 'sub_frame'],  initiatorDomains: [
      "legacy.bot-hosting.net"
    ] }
                } : null,
                {
                    id: 13,
                    priority: 1,
                    action: { type: 'block' },
                    condition: { urlFilter: '*sweetalert*', resourceTypes: ['script', 'stylesheet'], initiatorDomains: [
      "legacy.bot-hosting.net"
    ] }
                },
                {
                    id: 14,
                    priority: 1,
                    action: { type: 'block' },
                    condition: { urlFilter: '*simplemde*', resourceTypes: ['script', 'stylesheet'], initiatorDomains: [
      "legacy.bot-hosting.net"
    ] }
                },
                {
                    id: 15,
                    priority: 1,
                    action: { type: 'block' },
                    condition: { urlFilter: '*bttn.css*', resourceTypes: ['stylesheet'], initiatorDomains: [
      "legacy.bot-hosting.net"
    ] },
                }
            ].filter(Boolean);

            try {
                await chrome.declarativeNetRequest.updateDynamicRules({
                    removeRuleIds: [3, 5, 10, 11, 12, 13, 14, 15, 20],
                    addRules: [rule, noDiscordServerJoin, ...blockingRules].filter(Boolean)
                });
                console.log('[BananaBurner] Override redirection (JS) and blocking rules applied.');
            } catch (error) {
                console.error('[BananaBurner] Failed to apply override/blocking rules:', error);
            }
        } else {
            try {
                await chrome.declarativeNetRequest.updateDynamicRules({
                    removeRuleIds: [3, 5, 10, 11, 12, 13, 14, 15, 20]
                });
                console.log('[BananaBurner] Override redirection and blocking rules removed.');
            } catch (error) {
                console.error('[BananaBurner] Failed to remove override rules:', error);
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
                    urlFilter: '*legacy.bot-hosting.net*',
                    resourceTypes: ['xmlhttprequest', 'websocket'],
                    initiatorDomains: ['legacy.bot-hosting.net'],
                    excludedInitiatorDomains: ['control.bot-hosting.net', 'bot-hosting.net'],
                    excludedRequestDomains: ['bot-hosting.net']
                }
            },
            {
                id: 17,
                priority: 1,
                action: {
                    type: 'modifyHeaders',
                    requestHeaders: [
                        { header: 'Origin', operation: 'set', value: 'https://control.bot-hosting.net' },
                        { header: 'Referer', operation: 'set', value: 'https://control.bot-hosting.net/' }
                    ]
                },
                condition: {
                    urlFilter: '*bot-hosting.cloud*',
                    resourceTypes: ['xmlhttprequest', 'websocket'],
                    initiatorDomains: ['legacy.bot-hosting.net'],
                    excludedInitiatorDomains: ['control.bot-hosting.net', 'bot-hosting.net']
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
                    resourceTypes: ['xmlhttprequest'],
                    initiatorDomains: ['legacy.bot-hosting.net'],
                    excludedInitiatorDomains: ['control.bot-hosting.net', 'bot-hosting.net']
                }
            },
            {
                id: 6,
                priority: 6,
                action: {
                    type: 'modifyHeaders',
                    responseHeaders: [
                        { header: 'Access-Control-Allow-Origin', operation: 'set', value: 'https://legacy.bot-hosting.net' },
                        { header: 'Access-Control-Allow-Methods', operation: 'set', value: 'GET, POST, PUT, DELETE, OPTIONS' },
                        { header: 'Access-Control-Allow-Headers', operation: 'set', value: '*' },
                        { header: 'Access-Control-Allow-Credentials', operation: 'set', value: 'true' }
                    ]
                },
                condition: {
                    urlFilter: '*bot-hosting.net*',
                    resourceTypes: ['xmlhttprequest'],
                    initiatorDomains: ['legacy.bot-hosting.net'],
                    excludedInitiatorDomains: ['control.bot-hosting.net', 'bot-hosting.net'],
                    excludedRequestDomains: ['bot-hosting.net']
                }
            },
            {
                id: 18,
                priority: 6,
                action: {
                    type: 'modifyHeaders',
                    responseHeaders: [
                        { header: 'Access-Control-Allow-Origin', operation: 'set', value: 'https://legacy.bot-hosting.net' },
                        { header: 'Access-Control-Allow-Methods', operation: 'set', value: 'GET, POST, PUT, DELETE, OPTIONS' },
                        { header: 'Access-Control-Allow-Headers', operation: 'set', value: '*' },
                        { header: 'Access-Control-Allow-Credentials', operation: 'set', value: 'true' }
                    ]
                },
                condition: {
                    urlFilter: '*bot-hosting.cloud*',
                    resourceTypes: ['xmlhttprequest'],
                    initiatorDomains: ['legacy.bot-hosting.net'],
                    excludedInitiatorDomains: ['control.bot-hosting.net', 'bot-hosting.net']
                }
            }
        ];

        try {
            await chrome.declarativeNetRequest.updateDynamicRules({
                removeRuleIds: [1, 2, 6, 17, 18],
                addRules: rules
            });
            console.log('[BananaBurner] Header modification rules applied.');
        } catch (error) {
            console.error('[BananaBurner] Failed to apply header rules:', error);
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
            console.log('[BananaBurner] Migration completed or not needed');
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
            console.log('[BananaBurner] Checking for script updates (sv.dat)...');

            const response = await fetch('https://raw.githubusercontent.com/relentiousdragon/BananaBurner/main/sv.dat?t=' + Date.now());
            if (!response.ok) throw new Error(`sv.dat fetch failed: HTTP ${response.status}`);

            const remoteScriptVersion = (await response.text()).trim();
            if (!remoteScriptVersion) throw new Error('Empty sv.dat received');

            const currentScriptVersion = await this.getFromStorage('scriptVersion', true);

            await this.setInStorage('latestScriptVersion', remoteScriptVersion, true);
            await this.setInStorage('lastScriptCheck', Date.now(), true);

            const updateAvailable = this.isVersionNewer(currentScriptVersion, remoteScriptVersion);
            await this.setInStorage('scriptUpdateAvailable', updateAvailable, true);

            console.log(`[BananaBurner] Script check: current v${currentScriptVersion}, remote v${remoteScriptVersion}, update? ${updateAvailable}`);

            this.checkExtensionUpdate();

            return {
                scriptUpdateAvailable: updateAvailable,
                currentVersion: currentScriptVersion,
                latestVersion: remoteScriptVersion
            };

        } catch (error) {
            console.error('[BananaBurner] Failed to check script update:', error);
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
                console.log(`[BananaBurner] New extension version available: ${remoteVersion}`);
            } else {
                await this.setInStorage('extensionUpdateAvailable', false, true);
            }
        } catch (e) {
            console.error('[BananaBurner] Extension update check failed:', e);
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
        console.log('[BananaBurner] Alarm fired, checking for script updates...');
        await scriptManager.checkScriptUpdate();
    }
});

chrome.webNavigation.onCompleted.addListener(async (details) => {
    if (details.url.includes('/panel/')) {
        const enabled = await scriptManager.isEnabled();
        if (enabled) {
            console.log('[BananaBurner] Page loaded, bananajection ready 🍌');
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
                scriptManager.getFromStorage('latestScriptVersion', true),
                scriptManager.getFromStorage('joinSupportServer', false)
            ]).then(([enabled, overrideSRC, lastChecked, scriptVersion, extensionUpdate, scriptUpdateAvailable, latestScriptVersion, joinSupportServer]) => {
                const version = chrome.runtime.getManifest().version;
                sendResponse({
                    enabled,
                    overrideSRC,
                    version,
                    lastChecked,
                    scriptVersion,
                    extensionUpdate,
                    scriptUpdateAvailable,
                    latestScriptVersion,
                    joinSupportServer: joinSupportServer !== false
                });
            });
            return true;

        case 'setOverrideSRC':
            scriptManager.setOverrideSRC(request.enabled).then(() => {
                sendResponse({ success: true });
            });
            return true;

        case 'setShowAds':
            scriptManager.setInStorage('showAds', request.enabled, false).then(() => {
                scriptManager.setupOverrideRules().then(() => {
                    sendResponse({ success: true });
                });
            });
            return true;

        case 'setJoinSupportServer':
            scriptManager.setInStorage('joinSupportServer', request.enabled, false).then(() => {
                scriptManager.setupOverrideRules().then(() => {
                    sendResponse({ success: true });
                });
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

        case 'injectionComplete':
            console.log('[BananaBurner] Script injected successfully!');
            sendResponse({ success: true });
            return true;

        case 'sendNotification': {
            console.log('[BananaBurner] Received notification request:', request);

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
                    console.error('[BananaBurner] Primary notification failed:', error);

                    console.log('[BananaBurner] Attempting fallback without icon...');
                    chrome.notifications.create({
                        type: 'basic',
                        iconUrl: '',
                        title: (request.title || 'Banana Burner') + ' (Fallback)',
                        message: request.message || ''
                    }, (fallbackId) => {
                        if (chrome.runtime.lastError) {
                            console.error('[BananaBurner] Fallback notification also failed:', chrome.runtime.lastError.message);
                        } else {
                            if (sender.tab) {
                                notificationTabMap.set(fallbackId, {
                                    tabId: sender.tab.id,
                                    windowId: sender.tab.windowId,
                                    timestamp: Date.now()
                                });
                            }
                            console.log('[BananaBurner] Fallback notification created:', fallbackId);
                        }
                    });
                } else {
                    if (sender.tab) {
                        notificationTabMap.set(notificationId, {
                            tabId: sender.tab.id,
                            windowId: sender.tab.windowId,
                            timestamp: Date.now()
                        });
                    }
                    console.log('[BananaBurner] Notification created successfully:', notificationId);
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
            //console.log('[BananaBurner] Proxying fetch to:', url);

            (async () => {
                try {
                    const targetUrl = new URL(url);
                    const hostname = targetUrl.hostname;

                    const allowedDomains = [
                        'bot-hosting.net',
                        'bot-hosting.cloud',
                        'discord.com',
                        'cdn.discordapp.com',
                        'github.com',
                        'raw.githubusercontent.com',
                        'status.bot-hosting.net',
                        'featurebase.app'
                    ];

                    const isAllowed = allowedDomains.some(domain =>
                        hostname === domain || hostname.endsWith('.' + domain)
                    );

                    if (!isAllowed) {
                        throw new Error(`SSRF Blocked: External domain '${hostname}' is not whitelisted.`);
                    }

                    const isBotHosting = hostname.endsWith('bot-hosting.net') || hostname.endsWith('bot-hosting.cloud');
                    const fetchOptions = { ...options };

                    if (isBotHosting) {
                        const cookies = await chrome.cookies.getAll({ domain: hostname });
                        const xsrfCookie = cookies.find(c => c.name === 'XSRF-TOKEN');
                        if (xsrfCookie) {
                            fetchOptions.headers = fetchOptions.headers || {};
                            fetchOptions.headers['X-XSRF-TOKEN'] = decodeURIComponent(xsrfCookie.value);
                        }
                        fetchOptions.credentials = 'include';
                    } else {
                        // EXT
                        fetchOptions.credentials = 'omit';
                        if (fetchOptions.headers) {
                            delete fetchOptions.headers['X-XSRF-TOKEN'];
                        }
                    }

                    const response = await fetch(url, fetchOptions);
                    const status = response.status;
                    const ok = response.ok;
                    const statusText = response.statusText;
                    let data;
                    const contentType = response.headers.get('content-type');

                    if (contentType && contentType.includes('application/json')) {
                        data = await response.json();
                    } else if (contentType && contentType.includes('image/')) {
                        const buffer = await response.arrayBuffer();
                        const bytes = new Uint8Array(buffer);
                        let binary = '';
                        for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
                        data = `data:${contentType};base64,${btoa(binary)}`;
                    } else {
                        data = await response.text();
                    }

                    sendResponse({ success: true, status, ok, statusText, data });
                } catch (error) {
                    console.error('[BananaBurner] Proxy fetch error:', error);
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
                    const targetUrl = new URL(url);
                    const hostname = targetUrl.hostname;
                    const allowedDomains = [
                        'bot-hosting.net',
                        'bot-hosting.cloud',
                        'discord.com',
                        'cdn.discordapp.com',
                        'github.com',
                        'raw.githubusercontent.com',
                        'status.bot-hosting.net',
                        'featurebase.app'
                    ];

                    const isAllowed = allowedDomains.some(domain =>
                        hostname === domain || hostname.endsWith('.' + domain)
                    );

                    if (!isAllowed) {
                        throw new Error(`WebSocket SSRF Blocked: External domain '${hostname}' is not whitelisted.`);
                    }

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

chrome.notifications.onClicked.addListener((notificationId) => {
    const data = notificationTabMap.get(notificationId);
    if (data) {
        chrome.tabs.update(data.tabId, { active: true }, (tab) => {
            if (chrome.runtime.lastError) {
                console.warn('[BananaBurner] cannot find tab');
            } else {
                chrome.windows.update(data.windowId, { focused: true });
            }
        });
        notificationTabMap.delete(notificationId);
    }
});

setInterval(() => {
    const now = Date.now();
    for (const [id, data] of notificationTabMap.entries()) {
        if (now - data.timestamp > NOTIFICATION_TTL) {
            notificationTabMap.delete(id);
        }
    }
}, 60000);

/////////////////////
