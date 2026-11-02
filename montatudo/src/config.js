// IDs do AdMob. Android: IDs reais do app. iOS: ainda os IDs de TESTE oficiais do Google
// (antes de publicar lá, crie o app iOS em https://admob.google.com e troque pelos seus).
// Para testar sem gerar anúncios reais, use `useTestAds: true`. Nunca clique nos seus próprios anúncios reais.
export const ADS = {
  useTestAds: false,
  ios: {
    banner: 'ca-app-pub-3940256099942544/2934735716',
    interstitial: 'ca-app-pub-3940256099942544/4411468910',
    rewarded: 'ca-app-pub-3940256099942544/1712485313',
  },
  android: {
    banner: 'ca-app-pub-8715426486618732/1709419400',
    interstitial: 'ca-app-pub-8715426486618732/3390613843',
    rewarded: 'ca-app-pub-8715426486618732/8375347211',
  },
  // Intersticial a cada N montagens concluídas, com intervalo mínimo entre eles.
  interstitialEveryNGameOvers: 2,
  interstitialMinIntervalMs: 90_000,
};

export const HINT_PRICE = 20;
