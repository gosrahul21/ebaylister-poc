import { ExtensionAction, ExtensionResponse } from '../../types';

export interface SettingsModalUI {
  openSettingsBtn: HTMLButtonElement;
  settingsModal: HTMLDivElement;
  closeSettingsModalBtn: HTMLButtonElement;
  settingMarkupPct: HTMLInputElement;
  settingFormat: HTMLSelectElement;
  settingBidPct: HTMLInputElement;
  settingDuration: HTMLSelectElement;
  settingImmediatePay: HTMLInputElement;
  settingAllowOffers: HTMLInputElement;
  saveSettingsBtn: HTMLButtonElement;
  auctionSettingsGroup: HTMLDivElement;
}

export function initSettingsModal(ui: SettingsModalUI): void {
  function loadGlobalSettings(): void {
    chrome.runtime.sendMessage({ action: ExtensionAction.GET_GLOBAL_SETTINGS }, (res: ExtensionResponse) => {
      if (res && res.success && res.settings) {
        ui.settingMarkupPct.value = String(res.settings.markupPercentage ?? 15);
        ui.settingFormat.value = res.settings.format || 'Buy It Now';
        ui.settingBidPct.value = String(res.settings.auctionBidPercentage ?? 70);
        ui.settingDuration.value = res.settings.auctionDuration || '7 days';
        ui.settingImmediatePay.checked = res.settings.immediatePay !== false;
        ui.settingAllowOffers.checked = res.settings.allowOffers === true;
        toggleAuctionGroup(ui.settingFormat.value);
      }
    });
  }

  function toggleAuctionGroup(format: string): void {
    if (ui.auctionSettingsGroup) {
      ui.auctionSettingsGroup.style.display = format === 'Auction' ? 'flex' : 'none';
    }
  }

  ui.settingFormat.addEventListener('change', () => {
    toggleAuctionGroup(ui.settingFormat.value);
  });

  ui.openSettingsBtn.addEventListener('click', () => {
    loadGlobalSettings();
    ui.settingsModal.classList.add('active');
  });

  ui.closeSettingsModalBtn.addEventListener('click', () => {
    ui.settingsModal.classList.remove('active');
  });

  ui.settingsModal.addEventListener('click', e => {
    if (e.target === ui.settingsModal) {
      ui.settingsModal.classList.remove('active');
    }
  });

  ui.saveSettingsBtn.addEventListener('click', () => {
    const markupPercentage = parseFloat(ui.settingMarkupPct.value) || 0;
    const format = (ui.settingFormat.value === 'Auction' ? 'Auction' : 'Buy It Now') as 'Buy It Now' | 'Auction';
    const auctionBidPercentage = parseFloat(ui.settingBidPct.value) || 70;
    const auctionDuration = ui.settingDuration.value || '7 days';
    const immediatePay = ui.settingImmediatePay.checked;
    const allowOffers = ui.settingAllowOffers.checked;

    ui.saveSettingsBtn.disabled = true;
    ui.saveSettingsBtn.textContent = 'Saving...';

    chrome.runtime.sendMessage(
      {
        action: ExtensionAction.SAVE_GLOBAL_SETTINGS,
        settings: {
          markupPercentage,
          format,
          auctionBidPercentage,
          auctionDuration,
          immediatePay,
          allowOffers
        }
      },
      (res: ExtensionResponse) => {
        ui.saveSettingsBtn.disabled = false;
        ui.saveSettingsBtn.textContent = '💾 Save Global Settings';
        if (res && res.success) {
          ui.settingsModal.classList.remove('active');
        } else {
          alert('Failed to save global settings');
        }
      }
    );
  });

  // Initial load of global settings
  loadGlobalSettings();
}
