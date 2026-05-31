import { closeCheatsheet } from './cheatsheet';

function getOverlay(): HTMLElement {
  return document.getElementById('help-overlay')!;
}

function getPanel(): HTMLElement {
  return document.getElementById('help-panel')!;
}

export function openHelp(): void {
  closeCheatsheet();
  getOverlay().classList.remove('hidden');
  getPanel().classList.remove('hidden');
  getOverlay().setAttribute('aria-hidden', 'false');
}

export function closeHelp(): void {
  getOverlay().classList.add('hidden');
  getPanel().classList.add('hidden');
  getOverlay().setAttribute('aria-hidden', 'true');
}

export function bindHelpHandlers(): void {
  document.getElementById('help')?.addEventListener('click', openHelp);
  document.getElementById('help-close')?.addEventListener('click', closeHelp);
  getOverlay().addEventListener('click', (event) => {
    if (event.target === getOverlay()) closeHelp();
  });
}
