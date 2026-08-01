import { registerSW } from 'virtual:pwa-register';
import { bootstrap } from './app';

const toast = document.getElementById('update-toast');

const updateSW = registerSW({
  onNeedRefresh() {
    toast?.classList.remove('hidden');
  },
});

document.getElementById('update-reload')?.addEventListener('click', () => {
  void updateSW(true);
});

document.getElementById('update-dismiss')?.addEventListener('click', () => {
  toast?.classList.add('hidden');
});

bootstrap().catch((error) => {
  console.error('Failed to start app:', error);
});
