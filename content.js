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
    const cloudflareIndicators = [
      document.querySelector('#cf-content'),
      document.querySelector('.cf-browser-verification'),
      document.querySelector('#challenge-form'),
      document.querySelector('.cf-im-under-attack'),
      document.querySelector('#cf-challenge-running')
    ];

    const hasCloudflare = cloudflareIndicators.some(indicator => 
      indicator && indicator.offsetParent !== null
    );

    if (!hasCloudflare) {
      this.cloudflareChecked = true;
      return true;
    }
    return false;
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