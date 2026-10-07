// Configurações gerais do jogo e dos anúncios.
export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;
export const GROUND_Y = 450;

// IDs do AdMob. Os valores abaixo são os IDs de TESTE oficiais do Google.
// Antes de publicar: crie o app em https://admob.google.com, troque pelos seus
// IDs reais e mude `useTestAds` para false. Nunca clique nos seus próprios anúncios reais.
export const ADS = {
  useTestAds: true,
  android: {
    banner: 'ca-app-pub-3940256099942544/6300978111',
    interstitial: 'ca-app-pub-3940256099942544/1033173712',
    rewarded: 'ca-app-pub-3940256099942544/5224354917',
  },
  // Mostra um intersticial a cada N fins de partida (sem contar quando o jogador viu um recompensado).
  interstitialEveryNGameOvers: 3,
  // Intervalo mínimo entre intersticiais (política de boa experiência do Google).
  interstitialMinIntervalMs: 90_000,
};
