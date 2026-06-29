class PopupManager {
  constructor() {
    this.elements = {};
    this.currentTab = null;
    this.init();
  }
  //
  async init() {
    this.cacheElements();
    this.loadStatus();
    this.setupEventListeners();
    await this.checkCurrentTab();
  }

  cacheElements() {
    this.elements = {
      toggleEnabled: document.getElementById('toggleEnabled'),
      toggleOverrideSRC: document.getElementById('toggleOverrideSRC'),

      version: document.getElementById('version'),
      extVersion: document.getElementById('ext-version'),
      message: document.getElementById('message'),
      siteIndicator: document.getElementById('siteIndicator'),
      siteStatus: document.getElementById('siteStatus'),
      rowOverrideSRC: document.getElementById('rowOverrideSRC'),
      updateBanner: document.getElementById('updateBanner'),
      newVersion: document.getElementById('newVersion'),
      container: document.querySelector('.container')
    };
  }

  async loadStatus() {
    try {
      const response = await this.sendMessage({ action: 'getStatus' });

      this.elements.toggleEnabled.checked = response.enabled;
      this.elements.toggleOverrideSRC.checked = response.overrideSRC;
      this.elements.extVersion.textContent = response.version;
      this.elements.version.textContent = response.version;

      this.elements.container.classList.add('no-transition');

      this.updateToggleVisibility(response.enabled);

      if (response.extensionUpdate) {
        if (response.extensionUpdate) {
          this.elements.newVersion.textContent = 'v' + response.extensionUpdate;
        }
        this.elements.updateBanner.style.display = 'flex';
      } else {
        this.elements.updateBanner.style.display = 'none';
      }

      setTimeout(() => {
        this.elements.container.classList.remove('no-transition');
      }, 50);

    } catch (error) {
      this.showMessage('Failed to load status', 'error');
    }
  }

  setupEventListeners() {
    this.elements.toggleEnabled.addEventListener('change', (e) => {
      this.setEnabled(e.target.checked);
    });

    this.elements.toggleOverrideSRC.addEventListener('change', (e) => {
      this.setOverrideSRC(e.target.checked);
    });



    this.elements.updateBanner.addEventListener('click', () => {
      window.open('https://github.com/relentiousdragon/BananaBurner', '_blank');
    });
  }

  async checkCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      this.currentTab = tab;

      if (tab.url && tab.url.includes('legacy.bot-hosting.net/panel')) {
        this.elements.siteIndicator.className = 'site-indicator on-site';
        this.elements.siteStatus.textContent = 'On Bot-Hosting panel';
      } else {
        this.elements.siteIndicator.className = 'site-indicator off-site';
        this.elements.siteStatus.textContent = 'Not on Legacy Bot-Hosting panel';
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
      this.updateToggleVisibility(enabled);
    } catch (error) {
      this.showMessage('Failed to update status', 'error');
      this.elements.toggleEnabled.checked = !enabled;
    }
  }

  async setOverrideSRC(enabled) {
    try {
      await this.sendMessage({
        action: 'setOverrideSRC',
        enabled
      });

      this.showMessage(
        `OverrideSRC ${enabled ? 'enabled' : 'disabled'}`,
        'success'
      );
    } catch (error) {
      this.showMessage('Failed to update OverrideSRC', 'error');
      this.elements.toggleOverrideSRC.checked = !enabled;
    }
  }



  updateToggleVisibility(extensionEnabled) {
    if (extensionEnabled) {
      this.elements.rowOverrideSRC.style.display = 'flex';
      this.checkCurrentTab();
    } else {
      this.elements.rowOverrideSRC.style.display = 'none';
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
//
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});
///////////////////
