# Arquitetura

Jogo runner infinito em **Phaser 3**, empacotado para Android com **Capacitor** e monetizado com **AdMob**. Voltar para [[Início]].

## Arquivos principais (`src/`)

| Arquivo | Função |
|---|---|
| `main.js` | Cria o jogo Phaser e registra as cenas |
| `config.js` | Tamanho da tela, IDs e frequência dos anúncios |
| `ads.js` | AdMob no Android + simulador no navegador |
| `storage.js` | Recorde, moedas e personagens salvos (localStorage) |
| `skins.js` | Personagens da loja |
| `textures.js` | Todos os gráficos, desenhados por código |
| `audio.js` | Efeitos sonoros sintetizados (WebAudio) |
| `music.js` | Trilha de fundo original (sequenciador WebAudio) |
| `ui.js` | Botões, textos e fundo com parallax |

## Cenas (`src/scenes/`)

`BootScene` → `MenuScene` → `GameScene` → `GameOverScene`, com `ShopScene` acessível pelo menu.

## Outros

- `android/` — projeto Android nativo gerado pelo Capacitor
- `docs/privacidade.html` — política de privacidade
- `.github/workflows/android.yml` — gera o APK a cada push
