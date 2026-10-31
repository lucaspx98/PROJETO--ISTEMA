# Monta Tudo 3D 🔧

Jogo 3D de **montagem realista** para iPhone, feito com [Three.js](https://threejs.org) + [Capacitor](https://capacitorjs.com) e monetizado com **Google AdMob**.

Arraste as peças da bandeja até o contorno no lugar certo, na ordem de uma montagem de verdade (não dá para pôr o cooler antes do processador!), e toque nos parafusos para apertar. Gire a câmera com um dedo e dê zoom com dois.

## Fases

| # | Fase | Peças |
|---|---|---|
| 1 | Mesa de escritório | 4 pernas, travessa, tampo, gaveta + 4 parafusos |
| 2 | Cadeira de escritório | rodinhas, base estrela, pistão, mecanismo, assento, encosto, braços + 4 parafusos |
| 3 | Estante de livros | laterais, base, topo, fundo, prateleiras, livros + 4 parafusos |
| 4 | PC gamer | gabinete, fonte, placa-mãe, processador, cooler, 2 memórias, SSD M.2, placa de vídeo, ventoinhas RGB, tampa de vidro + 8 parafusos |
| 5 | Setup gamer completo | mousepad, suporte, monitor, teclado, mouse, caixas de som, computador, luminária |

Cada fase dá de 1 a 3 estrelas (conforme os erros de ordem) e moedas. As moedas compram **dicas**. Para criar uma fase nova, copie um arquivo de `src/levels/` e registre em `src/levels/index.js`. Cada peça é só uma função que monta formas 3D nas medidas reais (metros).

## Monetização

| Formato | Onde | Por quê |
|---|---|---|
| **Banner** | Menu, lista de fases e tela de vitória (nunca durante a montagem) | Receita contínua sem atrapalhar |
| **Intersticial** | Ao sair da tela de vitória, a cada 2 fases e no máximo 1 a cada 90 s | Pausa natural |
| **Recompensado** | "Dobrar moedas" na vitória e "Dica" quando faltam moedas | É o que mais paga, e o jogador escolhe ver |

Tudo é configurado em `src/config.js`. No iPhone, o jogo mostra o aviso de rastreamento da Apple (ATT) antes dos anúncios.

## Rodar no navegador

```bash
cd montatudo
npm install
npm run dev        # abre em http://localhost:5173 (use o modo celular do navegador)
```

No navegador os anúncios são **simulados**. Com `?foto` no endereço, aparece só a cena 3D, sem botões (bom para ícone e imagens da loja).

## Gerar o app de iPhone

O iOS só compila num **Mac com Xcode** ou pelo **GitHub Actions** (máquina macOS na nuvem, ver abaixo).

```bash
npm run ios:sync   # build do jogo + copia para o projeto iOS
npm run ios:open   # abre no Xcode → escolha seu iPhone → ▶
```

Cada push no GitHub já compila o app para o simulador (aba **Actions** → *iOS build (Monta Tudo 3D)*), para conferir que nada quebrou.

## Passo a passo para publicar na App Store

1. **Apple Developer Program**: https://developer.apple.com/programs (US$ 99/ano). Pode ser pessoa física.
2. **AdMob**: em https://admob.google.com, crie o app **iOS** e 3 blocos de anúncio: *Banner*, *Intersticial* e *Premiado*.
3. **Troque os IDs de teste pelos seus:**
   - `src/config.js` → `ADS.ios.banner / interstitial / rewarded` e `useTestAds: false`
   - `ios/App/App/Info.plist` → `GADApplicationIdentifier` (o ID do app, com `~`)
   - Confira a lista `SKAdNetworkItems` do `Info.plist` com a lista atual do Google: https://developers.google.com/admob/ios/privacy/strategies
   > ⚠️ Nunca clique nos seus próprios anúncios reais, porque o AdMob bane a conta. Para testar no seu iPhone, mantenha `useTestAds: true`.
4. **ID do pacote:** `com.lucaspx.montatudo` (em `capacitor.config.json` e no Xcode). Se quiser trocar, troque agora, porque depois de publicado não muda mais.
5. **App Store Connect** (https://appstoreconnect.apple.com) → *Apps* → **+** → novo app com esse ID de pacote.
6. **Política de privacidade** (obrigatória): preencha `docs/privacidade.html` (nome, e-mail, data) e publique, por exemplo no GitHub Pages. Coloque o link no App Store Connect.
7. **Privacidade do app** (no App Store Connect): declare *Identificadores → ID do dispositivo* (publicidade de terceiros, usado para rastreamento), *Dados de uso → Interação com o produto / Publicidade* e *Diagnóstico*. São os dados que o SDK do AdMob coleta.
8. **app-ads.txt**: o AdMob mostra uma linha para colocar em `seusite.com/app-ads.txt`. Informe esse site como "URL de marketing".
9. **Classificação etária**: responda o questionário (sem violência, sem conteúdo adulto). Não marque o app como "para crianças", porque apps infantis têm regras bem mais rígidas para anúncios.
10. **Capturas de tela**: no mínimo as do iPhone 6,9" (1320×2868 ou 1290×2796). Tire no simulador ou num iPhone grande. Ícone e tela de abertura já estão prontos (`resources/`).
11. **Enviar o build**: no Xcode, *Product → Archive → Distribute App → App Store Connect*, ou pelo GitHub Actions (abaixo). Depois teste pelo **TestFlight**, escolha o build na página da versão e clique em *Enviar para revisão*.
12. A cada atualização, aumente a versão (*MARKETING_VERSION*). Pelo GitHub, o número do build aumenta sozinho.

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
  levels/           as fases: cada peça com forma, medidas e o que precisa vir antes
  game.js           arrastar, encaixar, ordem de montagem, parafusos, estrelas
  engine.js         cena 3D: luz, sombras, sala, câmera orbital
  materials.js      madeira, metal, placa de circuito, vidro, tecido, RGB (texturas geradas por código)
  geo.js            formas básicas e ventoinha
  thumbs.js         miniaturas das peças da bandeja
  main.js           telas, bandeja, dicas, moedas e anúncios
  ads.js            AdMob (iOS) + aviso de rastreamento + simulador (navegador)
  storage.js        moedas e estrelas (salvos no aparelho)
  audio.js, music.js  sons e trilha sintetizados
ios/                projeto Xcode gerado pelo Capacitor
resources/          ícone 1024×1024 e tela de abertura
docs/privacidade.html  modelo de política de privacidade
```

## Próximas ideias para aumentar a receita

- Mais fases: guarda-roupa, cama, cozinha, bicicleta, carro, drone. Cada fase nova é só um arquivo.
- Compra "Remover anúncios" (In-App Purchase, ~R$ 9,90).
- Pintar/personalizar o objeto montado com moedas (cores de madeira, RGB), para dar mais uso às moedas.
