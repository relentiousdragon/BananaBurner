class ContentScript {
  constructor() {
    this.scriptInjected = false;
    this.cloudflareChecked = false;
    this.init();
  }

  async init() {
    const response = await this.sendMessage({action: 'getStatus'});
    if (!response.enabled) return;

    console.log('Banana Burner: Starting injection process...');

    this.waitForCloudflareToClear().then(() => {
      this.injectScript();
    });

    this.setupMutationObserver();
  }

  setupMutationObserver() {
    const observer = new MutationObserver((mutations) => {
      if (!this.cloudflareChecked) {
        this.checkCloudflare();
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  async checkCloudflare() {
    const selectors = [
      '#cf-content',
      '.cf-browser-verification',
      '#challenge-form',
      '.cf-im-under-attack',
      '#cf-challenge-running',
      'iframe[src*="challenges.cloudflare.com"]',
      'iframe[src*="turnstile.cloudflare.com"]', 
      '.turnstile-wrapper',
      '.hcaptcha-box',
      '.cf-challenge',
      'form[action*="/cdn-cgi/challenge-platform"]',
      'form[action*="/cdn-cgi/challenge"]',
      'form[action*="/cdn-cgi/l/chk_jschl"]'
    ];
    const mainContent = document.querySelector('.main-content');
    if (mainContent && mainContent.offsetParent !== null) {
      const text = mainContent.textContent || '';
      if (/verify you are human|needs to review the security of your connection|cloudflare security challenge/i.test(text)) {
        return false;
      }
    }

    const iframes = Array.from(document.querySelectorAll('iframe'));
    const hasChallengeIframe = iframes.some(iframe => iframe.src && iframe.src.includes('challenges.cloudflare.com'));
    if (hasChallengeIframe) {
      return false;
    }

    this.cloudflareChecked = true;
    return true;
  }

  async waitForCloudflareToClear() {
    return new Promise((resolve) => {
      const checkInterval = setInterval(async () => {
        const isClear = await this.checkCloudflare();
        if (isClear) {
          clearInterval(checkInterval);
          console.log('Banana Burner: Cloudflare cleared, injecting...');
          resolve();
        }
      }, 1000);

      setTimeout(() => {
        clearInterval(checkInterval);
        console.log('Banana Burner: Cloudflare check timeout, injecting anyway');
        resolve();
      }, 30000);
    });
  }

  async injectScript() {
    if (this.scriptInjected) return;

    try {
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('injected.js');
      script.onload = function() {
        this.remove();
      };
      (document.head || document.documentElement).appendChild(script);
      this.scriptInjected = true;
      console.log('Banana Burner: Bananas injected successfully! 🍌');
      this.sendMessage({action: 'injectionComplete'});
    } catch (error) {
      console.error('Banana Burner: Failed to inject script:', error);
    }
  }

  sendMessage(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'forceInject') {
    console.log('Banana Burner: Force injection requested');
    const contentScript = new ContentScript();
    sendResponse({ success: true });
  }
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new ContentScript());
} else {
  new ContentScript();
}
