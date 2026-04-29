class ContentScript {
  constructor() {
    const existingNonce = document.documentElement.getAttribute('data-bh-bridge-nonce');
    this.bridgeNonce = existingNonce || Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');

    if (!existingNonce) {
      document.documentElement.setAttribute('data-bh-bridge-nonce', this.bridgeNonce);
    }

    this.scriptInjected = false;
    this.cloudflareChecked = false;
    this.setupMessageBridge();

    const alreadyInjected = document.documentElement.hasAttribute('data-bh-injected');
    if (!alreadyInjected) {
      this.init();
    } else {
      console.log('[BananaBurner] Bridge re-synced.');
      this.osrcT();
    }
  }
  //
  async osrcT(response) {
    if (!response) {
      response = await this.sendMessage({ action: 'getStatus' });
    }
    if (!response || !response.enabled) {
      console.log('[BananaBurner] Extension is disabled');
      return;
    }

    if (response.overrideSRC) {
      console.log('[BananaBurner] OverrideSRC is enabled...');
      localStorage.setItem('OSRC', 'true');

      this.injectLocalStorageHook();

      document.title = 'BananaBurner 2979';

      const iconUrl = 'https://raw.githubusercontent.com/relentiousdragon/BananaBurner/refs/heads/main/icons/icon48.png';
      let link = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = iconUrl;

      this.scriptInjected = true;
      return true;
    }

    localStorage.setItem('OSRC', 'false');
    return false;
  }
  //
  async init(osrcF = false) {
    console.log('[BananaBurner] Content script initialized, checking status...');

    const path = window.location.pathname;
    if (!path.startsWith('/panel') && !path.startsWith('/login')) {
      console.log('[BananaBurner] Path not supported, skipping injection.');
      return;
    }

    const response = await this.sendMessage({ action: 'getStatus' });
    if (!response || !response.enabled) {
      console.log('[BananaBurner] Extension is disabled');
      return;
    }

    if (path.startsWith('/login')) {
      this.modifyLoginPage();
    }
    const osrcT = await this.osrcT(response);
    if (osrcT) return;

    console.log('[BananaBurner] trying to inject...');

    this.CfClear().then(() => {
      this.injectScript();
    });

    this.setupMutationObserver();
  }

  modifyLoginPage() {
    if (!document.getElementById('banana-login-styles')) {
      const style = document.createElement('style');
      style.id = 'bananaa-login-styles';
      style.textContent = `
        .login_effect { 
          background-image: linear-gradient(-60deg, rgb(255 127 39) 50%, #893a11 50%) !important; 
        }
        :root { 
          --navbar-bg-color: hsl(33.7deg 100% 26.09%) !important; 
        }
        .logindescription button { 
          background: #cc9329 !important; 
        }
        .bh-login-checkbox-container {
          margin-top: 1rem;
          display: flex;
          align-items: center;
          gap: 0.65rem;
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.9rem;
          cursor: pointer;
          user-select: none;
          justify-content: center;
          transition: opacity 0.2s;
        }
        .bh-login-checkbox-container:hover {
          opacity: 0.9;
        }
        .bh-login-checkbox-container input {
          cursor: pointer;
          accent-color: #cc9329;
          width: 17px;
          height: 17px;
          margin: 0;
          border-radius: 4px;
        }
      `;
      document.head.appendChild(style);
    }

    const iconUrl = 'https://raw.githubusercontent.com/relentiousdragon/BananaBurner/refs/heads/main/icons/icon48.png';
    const navbarLogoImg = document.querySelector('.navbar-logo img');
    if (navbarLogoImg && navbarLogoImg.src !== iconUrl) {
      navbarLogoImg.src = iconUrl;
    }

    const selector = 'section.loginimage .logindescription .logindescriptionborder p';
    const targetP = document.querySelector(selector);
    if (targetP) {
      const regex = /and\s+agree\s+that\s+you\s+will\s+be\s+auto+matically\s+added\s+to\s+Bot-Hosting's\s+official\s+Discord\s+server\.?/i;
      if (regex.test(targetP.textContent)) {
        targetP.innerHTML = targetP.innerHTML.replace(regex, '').trim();
        if (!targetP.innerHTML.endsWith('.') && targetP.innerHTML.length > 0) {
          targetP.innerHTML += '.';
        }
      }

      const checkboxId = 'bh-join-server-checkbox';
      if (!document.getElementById(checkboxId)) {
        const container = document.createElement('label');
        container.className = 'bh-login-checkbox-container';
        container.htmlFor = checkboxId;

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = checkboxId;

        this.sendMessage({ action: 'getStatus' }).then(status => {
          checkbox.checked = status.joinSupportServer !== false;
        });

        checkbox.onchange = () => {
          this.sendMessage({ action: 'setJoinSupportServer', enabled: checkbox.checked });
        };

        container.appendChild(checkbox);
        const text = document.createElement('span');
        text.textContent = 'Join Discord support server';
        container.appendChild(text);

        targetP.parentNode.insertBefore(container, targetP.nextSibling);
        targetP.parentNode.insertBefore(document.createElement('br'), container.nextSibling);
      }
    }
  }



  injectLocalStorageHook() {
    console.log('[BananaBurner] Injecting OSRC localStorage hook via external script...');
    try {
      localStorage.setItem('OSRC', 'true');

      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('osrc_hook.js');
      script.onload = function () {
        this.remove();
      };
      (document.head || document.documentElement).appendChild(script);
    } catch (error) {
      console.error('[BananaBurner] Failed to inject OSRC hook:', error);
    }
  }

  injectScript() {
    if (this.scriptInjected) return;

    try {
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('injected.js');
      script.dataset.nonce = this.bridgeNonce;
      script.onload = function () {
        // moved to injected.js
      };
      (document.head || document.documentElement).appendChild(script);
      this.scriptInjected = true;
      console.log('[BananaBurner] Bananas injected successfully! 🍌');
      this.sendMessage({ action: 'injectionComplete' });
    } catch (error) {
      console.error('[BananaBurner] Failed to inject script:', error);
    }
  }

  setupMessageBridge() {
    window.addEventListener('message', (event) => {
      if (!event.data || event.data.source !== 'banana-burner') return;
      if (event.data.nonce !== this.bridgeNonce) {
        console.warn(`[BananaBurner] Blocked message with invalid nonce (action: ${event.data.action}). Expected: ${this.bridgeNonce.substring(0, 4)}..., Got: ${String(event.data.nonce).substring(0, 4)}...`);
        return;
      }

      //console.log('[BananaBurner] Bridge caught message:', event.data.action, event.data);

      if (event.data.action === 'sendNotification') {
        this.sendMessage({
          action: 'sendNotification',
          title: event.data.title,
          message: event.data.message
        }).then(response => {
          console.log('[BananaBurner] Background notification response:', response);
        }).catch(err => {
          console.error('[BananaBurner] Bridge error forwarding notification:', err);
        });
      } else if (event.data.action === 'proxyFetch') {
        this.sendMessage({
          action: 'proxyFetch',
          url: event.data.url,
          options: event.data.options
        }).then(response => {
          window.postMessage({
            source: 'banana-burner-response',
            requestId: event.data.requestId,
            response: response
          }, '*');
        }).catch(err => {
          window.postMessage({
            source: 'banana-burner-response',
            requestId: event.data.requestId,
            response: { success: false, error: err.message }
          }, '*');
        });
      } else if (event.data.action === 'wsAction') {
        this.sendMessage({
          action: 'wsAction',
          subAction: event.data.subAction,
          url: event.data.url,
          identifier: event.data.identifier,
          payload: event.data.payload
        }).then(response => {
          if (event.data.requestId) {
            window.postMessage({ source: 'banana-burner-response', requestId: event.data.requestId, response }, '*');
          }
        });
      } else if (event.data.action === 'getStatus') {
        this.sendMessage({ action: 'getStatus' }).then(response => {
          window.postMessage({
            source: 'banana-burner-response',
            requestId: event.data.requestId,
            response: response
          }, '*');
        });
      } else if (event.data.action === 'checkExtensionUpdate') {
        this.sendMessage({ action: 'checkExtensionUpdate' }).then(response => {
          if (event.data.requestId) {
            window.postMessage({ source: 'banana-burner-response', requestId: event.data.requestId, response }, '*');
          }
        });
      } else if (event.data.action === 'scriptUpdateDetected') {
        this.sendMessage({
          action: 'scriptUpdateDetected',
          version: event.data.version
        });
      } else if (event.data.action === 'setShowAds') {
        this.sendMessage({
          action: 'setShowAds',
          enabled: event.data.enabled
        });
      }
    });

    window.bn_bridge_alive = true;
  }

  setupMutationObserver() {
    const observer = new MutationObserver((mutations) => {
      if (!this.cloudflareChecked) {
        this.checkCloudflare();
      }
      if (window.location.pathname.startsWith('/login')) {
        this.modifyLoginPage();
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }
  //
  async checkCloudflare() {
    const cloudflareSelectors = [
      '#cf-content',
      '.cf-browser-verification',
      '#challenge-form',
      '.cf-im-under-attack',
      '#cf-challenge-running',
      '.cf-challenge',
      '.turnstile-wrapper',
      '.hcaptcha-box'
    ];
    const cloudflareIframeUrls = [
      'challenges.cloudflare.com',
      'turnstile.cloudflare.com',
      '/cdn-cgi/challenge-platform',
      '/cdn-cgi/challenge',
      '/cdn-cgi/l/chk_jschl'
    ];
    const cloudflareTextPatterns = [
      /verify you are human/i,
      /complete the action below/i,
      /cloudflare security challenge/i,
      /verifying you are human/i,
      /please complete the security check/i,
      /just checking your browser/i,
      /you will be redirected/i,
      /ddos protection by cloudflare/i
    ];
    for (const selector of cloudflareSelectors) {
      if (document.querySelector(selector)) {
        console.log('[BananaBurner] Found Cloudflare element:', selector);
        return true;
      }
    }
    const iframes = document.querySelectorAll('iframe');
    for (const iframe of iframes) {
      const src = iframe.src || '';
      if (cloudflareIframeUrls.some(url => src.includes(url))) {
        console.log('[BananaBurner] Found Cloudflare iframe:', src);
        return true;
      }
    }

    const forms = document.querySelectorAll('form');
    for (const form of forms) {
      const action = form.getAttribute('action') || '';
      if (cloudflareIframeUrls.some(url => action.includes(url))) {
        console.log('[BananaBurner] Found Cloudflare form:', action);
        return true;
      }
    }


    const pageText = document.body.innerText || document.documentElement.innerText || '';
    for (const pattern of cloudflareTextPatterns) {
      if (pattern.test(pageText)) {
        console.log('[BananaBurner] Found Cloudflare text:', pattern);
        return true;
      }
    }

    const challengeIndicators = [
      document.querySelector('input[name="jschl_answer"]'),
      document.querySelector('input[name="r"]'),
      document.querySelector('[id*="cf-"]'),
      document.querySelector('[class*="cf-"]')
    ];

    if (challengeIndicators.some(indicator => indicator !== null)) {
      console.log('[BananaBurner] Found Cloudflare challenge indicator');
      return true;
    }

    this.cloudflareChecked = true;
    return false;
  }
  //
  async CfClear() {
    return new Promise((resolve) => {
      const checkInterval = setInterval(async () => {
        const hasCloudflare = await this.checkCloudflare();
        if (!hasCloudflare) {
          clearInterval(checkInterval);
          console.log('[BananaBurner] Cloudflare cleared, injecting...');
          resolve();
        } else {
          console.log('[BananaBurner] Still waiting for Cloudflare to clear...');
        }
      }, 1000);

      setTimeout(() => {
        clearInterval(checkInterval);
        console.log('[BananaBurner] Cloudflare check timeout, injecting anyway');
        resolve();
      }, 30000);
    });
  }

  sendMessage(message) {
    if (!chrome.runtime || !chrome.runtime.id) {
      console.warn('[BananaBurner] Bridge lost connection to extension. Please refresh the page.');
      return Promise.reject(new Error('Context invalidated'));
    }
    return new Promise((resolve, reject) => {
      try {
        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) {
            const err = chrome.runtime.lastError;
            if (err.message.includes('context invalidated')) {
              console.warn('[BananaBurner] Extension reloaded. Please refresh the page to restore notifications.');
            }
            reject(err);
          } else {
            resolve(response);
          }
        });
      } catch (e) {
        if (e.message.includes('context invalidated')) {
          console.warn('[BananaBurner] Bridge severed by extension reload. Please refresh the page.');
        }
        reject(e);
      }
    });
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'forceInject') {
    console.log('[BananaBurner] Force injection requested');
    const contentScript = new ContentScript();
    sendResponse({ success: true });
  } else if (request.source === 'banana-burner-ws') {
    window.postMessage(request, '*');
  }
});
//
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new ContentScript());
} else {
  new ContentScript();
}
////////////////
