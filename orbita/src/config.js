// Configurações gerais do jogo e dos anúncios.
// Tela em pé: largura fixa e altura que acompanha o formato do aparelho
// (iPhone com notch é mais alto que um iPhone SE), para não sobrar tarja preta.
export const GAME_WIDTH = 540;
export const GAME_HEIGHT = Math.round(
  Math.min(1200, Math.max(900, (GAME_WIDTH * window.innerHeight) / Math.max(1, window.innerWidth))),
);
// Margem do topo para o HUD não ficar embaixo do notch / Dynamic Island.
export const SAFE_TOP = 90;

// IDs do AdMob. Os valores abaixo são os IDs de TESTE oficiais do Google.
// Antes de publicar: crie os apps (iOS e Android) em https://admob.google.com, troque pelos
// seus IDs reais e mude `useTestAds` para false. Nunca clique nos seus próprios anúncios reais.
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
  // Mostra um intersticial a cada N fins de partida (sem contar quando o jogador viu um recompensado).
  interstitialEveryNGameOvers: 3,
  // Intervalo mínimo entre intersticiais.
  interstitialMinIntervalMs: 90_000,
};
