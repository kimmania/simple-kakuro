import { closeCheatsheet } from './cheatsheet';

let lastTrigger: HTMLElement | null = null;

function getOverlay(): HTMLElement {
  return document.getElementById('help-overlay')!;
}

function getPanel(): HTMLElement {
  return document.getElementById('help-panel')!;
}

export function openHelp(): void {
  closeCheatsheet();
  lastTrigger = document.activeElement as HTMLElement | null;
  getOverlay().classList.remove('hidden');
  getPanel().classList.remove('hidden');
  getOverlay().setAttribute('aria-hidden', 'false');
  document.getElementById('help-close')?.focus();
}

export function closeHelp(): void {
  if (getPanel().classList.contains('hidden')) return;
  getOverlay().classList.add('hidden');
  getPanel().classList.add('hidden');
  getOverlay().setAttribute('aria-hidden', 'true');
  lastTrigger?.focus();
  lastTrigger = null;
}

export function bindHelpHandlers(): void {
  document.getElementById('help')?.addEventListener('click', openHelp);
  document.getElementById('help-close')?.addEventListener('click', closeHelp);
  getOverlay().addEventListener('click', (event) => {
    if (event.target === getOverlay()) closeHelp();
  });
}
