// Vibração curta nos toques: no Android usa o motor háptico nativo, no navegador o navigator.vibrate.
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Save } from './storage.js';

const native = Capacitor.isNativePlatform();

function impact(style, ms) {
  if (Save.get('vibrationOff')) return;
  if (native) Haptics.impact({ style }).catch(() => {});
  else navigator.vibrate?.(ms);
}

export const Haptic = {
  light: () => impact(ImpactStyle.Light, 8),
  medium: () => impact(ImpactStyle.Medium, 18),
  heavy: () => impact(ImpactStyle.Heavy, 35),
};
