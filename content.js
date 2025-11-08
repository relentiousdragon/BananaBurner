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
        console.log('Banana Burner: Found Cloudflare element:', selector);
        return true; 
      }
    }

    const iframes = document.querySelectorAll('iframe');
    for (const iframe of iframes) {
      const src = iframe.src || '';
      if (cloudflareIframeUrls.some(url => src.includes(url))) {
        console.log('Banana Burner: Found Cloudflare iframe:', src);
        return true; 
      }
    }

    const forms = document.querySelectorAll('form');
    for (const form of forms) {
      const action = form.getAttribute('action') || '';
      if (cloudflareIframeUrls.some(url => action.includes(url))) {
        console.log('Banana Burner: Found Cloudflare form:', action);
        return true; 
      }
    }

    const pageText = document.body.innerText || document.documentElement.innerText || '';
    for (const pattern of cloudflareTextPatterns) {
      if (pattern.test(pageText)) {
        console.log('Banana Burner: Found Cloudflare text:', pattern);
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
      console.log('Banana Burner: Found Cloudflare challenge indicator');
      return true; 
    }

    this.cloudflareChecked = true;
    return false; 
  }

  async waitForCloudflareToClear() {
    return new Promise((resolve) => {
      const checkInterval = setInterval(async () => {
        const hasCloudflare = await this.checkCloudflare();
        if (!hasCloudflare) {
          clearInterval(checkInterval);
          console.log('Banana Burner: Cloudflare cleared, injecting...');
          resolve();
        } else {
          console.log('Banana Burner: Still waiting for Cloudflare to clear...');
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
