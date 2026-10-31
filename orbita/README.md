# Órbita 🪐

Jogo de **um toque** para iPhone, feito com [Phaser 3](https://phaser.io) + [Capacitor](https://capacitorjs.com) e monetizado com **Google AdMob**.

Seu cometa gira em volta de um planeta. **Toque** para soltá-lo pela tangente. Se ele passar pela órbita (o círculo tracejado) do próximo planeta, é capturado e você ganha 1 ponto. Se errar, se perde no espaço.

- **Cristais** no caminho servem para comprar cometas novos na loja.
- **Combo "RÁPIDO"**: soltar menos de 1 s depois de ser capturado, várias vezes seguidas, dá cristais extras.
- A partir do planeta 6 aparecem **luas** que batem em você. A partir do 12, **planetas que se mexem**. Os planetas ficam menores e mais distantes conforme o jogo avança.
- **Presente diário** de cristais, para o jogador voltar todo dia.

## Monetização

| Formato | Onde | Por quê |
|---|---|---|
| **Banner** | Menu, loja e fim de jogo (nunca durante a partida) | Receita contínua sem atrapalhar |
| **Intersticial** | Ao sair do fim de jogo, a cada 3 partidas e no máximo 1 a cada 90 s | Pausa natural |
| **Recompensado** | "Continuar" após morrer, "Dobrar cristais" e "+40 cristais grátis" na loja | É o que mais paga, e o jogador escolhe ver |

Tudo é configurado em `src/config.js`. No iPhone, o jogo mostra o aviso de rastreamento da Apple (ATT) antes de carregar os anúncios. Isso é obrigatório para usar o IDFA.

## Rodar no navegador

```bash
cd orbita
npm install
npm run dev        # abre em http://localhost:5173 (use o modo celular do navegador)
```

No navegador os anúncios são **simulados**.

## Gerar o app de iPhone

O iOS só compila num **Mac com Xcode** ou pelo **GitHub Actions** (máquina macOS na nuvem, ver abaixo).

```bash
npm run ios:sync   # build do jogo + copia para o projeto iOS
npm run ios:open   # abre no Xcode → escolha seu iPhone → ▶
```

Cada push no GitHub já compila o app para o simulador (aba **Actions** → *iOS build (Órbita)*), para conferir que nada quebrou.

## Passo a passo para publicar na App Store

1. **Apple Developer Program**: https://developer.apple.com/programs (US$ 99/ano). Pode ser pessoa física.
2. **AdMob**: em https://admob.google.com, crie o app **iOS** e 3 blocos de anúncio: *Banner*, *Intersticial* e *Premiado*.
3. **Troque os IDs de teste pelos seus:**
   - `src/config.js` → `ADS.ios.banner / interstitial / rewarded` e `useTestAds: false`
   - `ios/App/App/Info.plist` → `GADApplicationIdentifier` (o ID do app, com `~`)
   - Confira a lista `SKAdNetworkItems` no `Info.plist` com a lista atual do Google: https://developers.google.com/admob/ios/privacy/strategies
   > ⚠️ Nunca clique nos seus próprios anúncios reais, porque o AdMob bane a conta. Para testar no seu iPhone, mantenha `useTestAds: true`.
4. **ID do pacote:** `com.lucaspx.orbita` (em `capacitor.config.json` e no Xcode). Se quiser trocar, troque agora, porque depois de publicado não muda mais.
5. **App Store Connect** (https://appstoreconnect.apple.com) → *Apps* → **+** → novo app com esse ID de pacote.
6. **Política de privacidade** (obrigatória): preencha `docs/privacidade.html` (nome, e-mail, data) e publique, por exemplo no GitHub Pages. Coloque o link no App Store Connect.
7. **Privacidade do app** (no App Store Connect): declare *Identificadores → ID do dispositivo* (publicidade de terceiros, usado para rastreamento), *Dados de uso → Interação com o produto / Publicidade* e *Diagnóstico*. São os dados que o SDK do AdMob coleta.
8. **app-ads.txt**: o AdMob mostra uma linha para colocar em `seusite.com/app-ads.txt`. Informe esse site como "URL de marketing" ou "site do desenvolvedor".
9. **Classificação etária**: responda o questionário (sem violência real, sem conteúdo adulto). Não marque o app como "para crianças", porque apps infantis têm regras bem mais rígidas para anúncios.
10. **Capturas de tela**: no mínimo as do iPhone 6,9" (1320×2868 ou 1290×2796). Tire no simulador ou num iPhone grande. Ícone e tela de abertura já estão prontos (`resources/`).
11. **Enviar o build**: no Xcode, *Product → Archive → Distribute App → App Store Connect*, ou pelo GitHub Actions (abaixo). Depois teste pelo **TestFlight**, escolha o build na página da versão e clique em *Enviar para revisão*.
12. A cada atualização, aumente a versão (*MARKETING_VERSION*) e o build (*CURRENT_PROJECT_VERSION*). Pelo GitHub o build é aumentado sozinho.

### Build automático para o TestFlight (sem Mac)

Cadastre em *Settings → Secrets and variables → Actions* do repositório:

| Secret | Onde conseguir |
|---|---|
| `APPLE_TEAM_ID` | developer.apple.com → *Membership* → Team ID |
| `ASC_KEY_ID`, `ASC_ISSUER_ID` | App Store Connect → *Usuários e Acesso* → *Integrações* → *Chaves da API* (crie uma chave com acesso **Admin**) |
| `ASC_KEY_P8_BASE64` | O arquivo `.p8` baixado nessa chave, convertido: `base64 -i AuthKey_XXXX.p8` |

Com isso, cada push gera o build assinado e envia direto para o TestFlight.

## Estrutura

```
src/
  config.js         tamanho da tela, IDs e frequência dos anúncios
  ads.js            AdMob (iOS) + aviso de rastreamento + simulador (navegador)
  storage.js        recorde, cristais, cometas e presente diário (salvos no aparelho)
  skins.js          cometas da loja
  textures.js       todos os gráficos, desenhados por código
  audio.js          efeitos sonoros sintetizados
  music.js          trilha original sintetizada
  ui.js             botões, textos e céu com parallax
  scenes/           Menu, Game, GameOver, Shop
ios/                projeto Xcode gerado pelo Capacitor
resources/          ícone 1024×1024 e tela de abertura
docs/privacidade.html  modelo de política de privacidade
```

## Próximas ideias para aumentar a receita

- Compra "Remover anúncios" (In-App Purchase, ~R$ 9,90), que costuma render bem em jogos casuais no iPhone.
- Ranking no **Game Center** (retenção e competição entre amigos).
- Versão Android (`npx cap add android`): o código do jogo já serve, só falta configurar o AdMob Android.
