// Camada de anúncios: usa AdMob no Android e um simulador no navegador,
// para que o jogo inteiro possa ser testado com `npm run dev`.
import { Capacitor } from '@capacitor/core';
import {
  AdMob,
  AdmobConsentStatus,
  BannerAdPosition,
  BannerAdSize,
  InterstitialAdPluginEvents,
  RewardAdPluginEvents,
} from '@capacitor-community/admob';
import { ADS } from './config.js';
import { setAdPlaying } from './audio.js';

const native = Capacitor.isNativePlatform();
const ids = ADS.android;

let ready = false;
let bannerShown = false;
let interstitialLoaded = false;
let rewardedLoaded = false;
let lastInterstitialAt = 0;
let gameOversSinceInterstitial = 0;

export const Ads = {
  async init() {
    if (!native) {
      ready = true;
      return;
    }
    try {
      await AdMob.initialize({ initializeForTesting: ADS.useTestAds });
      // Consentimento (GDPR/LGPD) via UMP do Google: obrigatório para anúncios personalizados na Europa.
      const consent = await AdMob.requestConsentInfo();
      if (consent.isConsentFormAvailable && consent.status === AdmobConsentStatus.REQUIRED) {
        await AdMob.showConsentForm();
      }
      AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => preloadInterstitial());
      AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad, () => (interstitialLoaded = false));
      AdMob.addListener(RewardAdPluginEvents.FailedToLoad, () => (rewardedLoaded = false));
      ready = true;
      preloadInterstitial();
      preloadRewarded();
    } catch (e) {
      console.warn('AdMob indisponível', e);
    }
  },

  async showBanner() {
    if (!ready || bannerShown) return;
    bannerShown = true;
    if (!native) return;
    try {
      await AdMob.showBanner({
        adId: ids.banner,
        adSize: BannerAdSize.ADAPTIVE_BANNER,
        position: BannerAdPosition.BOTTOM_CENTER,
        margin: 0,
        isTesting: ADS.useTestAds,
      });
    } catch (e) {
      bannerShown = false;
      console.warn('banner', e);
    }
  },

  async hideBanner() {
    if (!bannerShown) return;
    bannerShown = false;
    if (!native) return;
    try {
      await AdMob.removeBanner();
    } catch (e) {
      console.warn('banner', e);
    }
  },

  /** Chamado em todo fim de partida; decide sozinho se é hora de um intersticial. */
  async maybeShowInterstitial() {
    gameOversSinceInterstitial += 1;
    const now = Date.now();
    if (gameOversSinceInterstitial < ADS.interstitialEveryNGameOvers) return;
    if (now - lastInterstitialAt < ADS.interstitialMinIntervalMs) return;
    gameOversSinceInterstitial = 0;
    lastInterstitialAt = now;
    if (!native) return withAdAudio(() => simulate('Intersticial', 1500));
    if (!interstitialLoaded) return preloadInterstitial();
    interstitialLoaded = false;
    await withAdAudio(
      () =>
        new Promise((resolve) => {
          const handles = [];
          const done = () => {
            handles.forEach((h) => h.then((x) => x.remove()));
            resolve();
          };
          handles.push(AdMob.addListener(InterstitialAdPluginEvents.Dismissed, done));
          handles.push(AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, done));
          AdMob.showInterstitial().catch(done);
        }),
    );
  },

  /** Jogador viu um anúncio recompensado: adia o próximo intersticial. */
  noteRewardedWatched() {
    gameOversSinceInterstitial = 0;
    lastInterstitialAt = Date.now();
  },

  /** Mostra um anúncio recompensado. Resolve `true` se o jogador ganhou a recompensa. */
  async showRewarded() {
    if (!native) {
      await withAdAudio(() => simulate('Recompensado', 2500));
      this.noteRewardedWatched();
      return true;
    }
    if (!rewardedLoaded) {
      await preloadRewarded();
      if (!rewardedLoaded) return false;
    }
    rewardedLoaded = false;
    const earned = await withAdAudio(() => new Promise((resolve) => {
      let got = false;
      const handles = [];
      const done = (v) => {
        handles.forEach((h) => h.then((x) => x.remove()));
        resolve(v);
      };
      handles.push(AdMob.addListener(RewardAdPluginEvents.Rewarded, () => (got = true)));
      handles.push(AdMob.addListener(RewardAdPluginEvents.Dismissed, () => done(got)));
      handles.push(AdMob.addListener(RewardAdPluginEvents.FailedToShow, () => done(false)));
      AdMob.showRewardVideoAd().catch(() => done(false));
    }));
    preloadRewarded();
    if (earned) this.noteRewardedWatched();
    return earned;
  },

  isRewardedAvailable: () => !native || rewardedLoaded,
};

async function withAdAudio(fn) {
  setAdPlaying(true);
  try {
    // Garantia: se o SDK nunca avisar que o anúncio fechou, o jogo não fica travado.
    const timeout = new Promise((r) => setTimeout(() => r(false), 120_000));
    return await Promise.race([fn(), timeout]);
  } finally {
    setAdPlaying(false);
  }
}

async function preloadInterstitial() {
  if (!native || interstitialLoaded) return;
  try {
    await AdMob.prepareInterstitial({ adId: ids.interstitial, isTesting: ADS.useTestAds });
    interstitialLoaded = true;
  } catch (e) {
    interstitialLoaded = false;
  }
}

async function preloadRewarded() {
  if (!native || rewardedLoaded) return;
  try {
    await AdMob.prepareRewardVideoAd({ adId: ids.rewarded, isTesting: ADS.useTestAds });
    rewardedLoaded = true;
  } catch (e) {
    rewardedLoaded = false;
  }
}

function simulate(kind, ms) {
  const el = document.getElementById('ad-sim');
  const txt = document.getElementById('ad-sim-text');
  if (!el) return Promise.resolve();
  txt.textContent = `${kind} — no celular aparece um anúncio real do AdMob`;
  el.style.display = 'flex';
  return new Promise((r) =>
    setTimeout(() => {
      el.style.display = 'none';
      r();
    }, ms),
  );
}
