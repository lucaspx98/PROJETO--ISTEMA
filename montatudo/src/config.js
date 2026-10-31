// IDs do AdMob. Os valores abaixo são os IDs de TESTE oficiais do Google.
// Antes de publicar: crie o app iOS em https://admob.google.com, troque pelos seus
// IDs reais e mude `useTestAds` para false. Nunca clique nos seus próprios anúncios reais.
export const ADS = {
  useTestAds: true,
  ios: {
    banner: 'ca-app-pub-3940256099942544/2934735716',
    interstitial: 'ca-app-pub-3940256099942544/4411468910',
    rewarded: 'ca-app-pub-3940256099942544/1712485313',
  },
  android: {
    banner: 'ca-app-pub-3940256099942544/6300978111',
    interstitial: 'ca-app-pub-3940256099942544/1033173712',
    rewarded: 'ca-app-pub-3940256099942544/5224354917',
  },
  // Intersticial a cada N montagens concluídas, com intervalo mínimo entre eles.
  interstitialEveryNGameOvers: 2,
  interstitialMinIntervalMs: 90_000,
};

export const HINT_PRICE = 20;
