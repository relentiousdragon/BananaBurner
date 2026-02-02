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
      toggleOverrideSRC: document.getElementById('toggleOverrideSRC'),
      forceInject: document.getElementById('forceInject'),
      forceUpdate: document.getElementById('forceUpdate'),
      version: document.getElementById('version'),
      scriptVersion: document.getElementById('scriptVersion'),
      lastUpdated: document.getElementById('lastUpdated'),
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
      this.elements.scriptVersion.textContent = response.version;
      this.elements.version.textContent = response.version;
      this.elements.lastUpdated.textContent = response.lastUpdated;

      this.elements.container.classList.add('no-transition');
      this.updateButtonVisibility(response.overrideSRC);
      this.updateToggleVisibility(response.enabled);

      if (response.extensionUpdate) {
        this.elements.newVersion.textContent = response.extensionUpdate;
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

    this.elements.forceInject.addEventListener('click', () => {
      this.forceInject();
    });

    this.elements.forceUpdate.addEventListener('click', () => {
      this.forceUpdate();
    });

    this.elements.updateBanner.addEventListener('click', () => {
      window.open('https://github.com/relentiousdragon/BananaBurner', '_blank');
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
      if (!enabled) {
        await this.setOverrideSRC(false);
      }
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
      this.updateButtonVisibility(enabled);
    } catch (error) {
      this.showMessage('Failed to update OverrideSRC', 'error');
      this.elements.toggleOverrideSRC.checked = !enabled;
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

  updateButtonVisibility(overrideSRC) {
    if (overrideSRC) {
      this.elements.forceInject.classList.add('btn-hidden');
    } else {
      this.elements.forceInject.classList.remove('btn-hidden');
    }
  }

  updateToggleVisibility(extensionEnabled) {
    if (extensionEnabled) {
      this.elements.rowOverrideSRC.style.display = 'flex';
      this.checkCurrentTab();
    } else {
      this.elements.rowOverrideSRC.style.display = 'none';
      this.elements.forceInject.disabled = true;
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
