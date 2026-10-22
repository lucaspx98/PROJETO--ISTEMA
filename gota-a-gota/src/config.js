// Configurações gerais do jogo e dos anúncios.
export const GAME_WIDTH = 540;
export const GAME_HEIGHT = 960;
// Faixa inferior livre para o banner do AdMob não cobrir o jogo.
export const BANNER_SPACE = 100;

// Raio do "dedo" que desembaça o vidro, em pixels do jogo.
export const WIPE_RADIUS = 22;

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
  // Mostra um intersticial a cada N níveis terminados (sem contar quando o jogador viu um recompensado).
  interstitialEveryNGameOvers: 3,
  // Intervalo mínimo entre intersticiais (política de boa experiência do Google).
  interstitialMinIntervalMs: 90_000,
  // Nenhum intersticial nos primeiros níveis, para o jogador pegar gosto primeiro.
  interstitialFromLevel: 4,
};
