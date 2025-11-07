class PopupManager {
  constructor() {
    this.elements = {};
    this.currentTab = null;
    this.init();
  }

  async init() {
    this.cacheElements();
    this.loadStatus();
    this.setupEventListeners();
    await this.checkCurrentTab();
  }

  cacheElements() {
    this.elements = {
      toggleEnabled: document.getElementById('toggleEnabled'),
      forceInject: document.getElementById('forceInject'),
      forceUpdate: document.getElementById('forceUpdate'),
      version: document.getElementById('version'),
      scriptVersion: document.getElementById('scriptVersion'),
      lastUpdated: document.getElementById('lastUpdated'),
      message: document.getElementById('message'),
      siteIndicator: document.getElementById('siteIndicator'),
      siteStatus: document.getElementById('siteStatus')
    };
  }

  async loadStatus() {
    try {
      const response = await this.sendMessage({ action: 'getStatus' });
      
      this.elements.toggleEnabled.checked = response.enabled;
      this.elements.scriptVersion.textContent = response.version;
      this.elements.version.textContent = response.version;
      this.elements.lastUpdated.textContent = response.lastUpdated;
      
    } catch (error) {
      this.showMessage('Failed to load status', 'error');
    }
  }

  setupEventListeners() {
    this.elements.toggleEnabled.addEventListener('change', (e) => {
      this.setEnabled(e.target.checked);
    });

    this.elements.forceInject.addEventListener('click', () => {
      this.forceInject();
    });

    this.elements.forceUpdate.addEventListener('click', () => {
      this.forceUpdate();
    });
  }

  async checkCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      this.currentTab = tab;
      
      if (tab.url && tab.url.includes('bot-hosting.net/panel')) {
        this.elements.siteIndicator.className = 'site-indicator on-site';
        this.elements.siteStatus.textContent = 'On Bot-Hosting panel';
        this.elements.forceInject.disabled = false;
      } else {
        this.elements.siteIndicator.className = 'site-indicator off-site';
        this.elements.siteStatus.textContent = 'Not on Bot-Hosting panel';
        this.elements.forceInject.disabled = true;
      }
    } catch (error) {
      console.error('Failed to check current tab:', error);
    }
  }

  async setEnabled(enabled) {
    try {
      await this.sendMessage({ 
        action: 'setEnabled', 
        enabled 
      });
      
      this.showMessage(
        `Extension ${enabled ? 'enabled' : 'disabled'}`,
        'success'
      );
    } catch (error) {
      this.showMessage('Failed to update status', 'error');
      this.elements.toggleEnabled.checked = !enabled;
    }
  }

  async forceInject() {
    if (!this.currentTab) return;

    try {
      this.elements.forceInject.disabled = true;
      this.elements.forceInject.classList.add('loading');

      await chrome.tabs.reload(this.currentTab.id);
      
      this.showMessage('Page reloaded for bananajection', 'success');
      
    } catch (error) {
      this.showMessage('Failed to force bananajection', 'error');
    } finally {
      setTimeout(() => {
        this.elements.forceInject.disabled = false;
        this.elements.forceInject.classList.remove('loading');
      }, 2000);
    }
  }

  async forceUpdate() {
    try {
      this.elements.forceUpdate.disabled = true;
      this.elements.forceUpdate.classList.add('loading');

      const response = await this.sendMessage({ 
        action: 'forceUpdate' 
      });

      if (response.success) {
        await this.loadStatus();
        this.showMessage('Script updated successfully!', 'success');
      } else {
        this.showMessage('Failed to update: ' + response.error, 'error');
      }
      
    } catch (error) {
      this.showMessage('Failed to update script', 'error');
    } finally {
      this.elements.forceUpdate.disabled = false;
      this.elements.forceUpdate.classList.remove('loading');
    }
  }

  showMessage(text, type = 'success') {
    const message = this.elements.message;
    message.textContent = text;
    message.className = `message message-${type}`;
    message.style.display = 'block';

    setTimeout(() => {
      message.style.display = 'none';
    }, 3000);
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

document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});