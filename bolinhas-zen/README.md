# Bolinhas Zen 🫧

Quebra-cabeça **relaxante e satisfatório** para Android: separe as bolinhas por cor até cada tubo ter uma cor só.
Feito com [Phaser 3](https://phaser.io) + [Capacitor](https://capacitorjs.com) e monetizado com **Google AdMob** (mesma base do Corre Corre, na raiz do repositório).

Toque num tubo para levantar as bolinhas de cima, toque em outro para soltar. Só pode empilhar sobre a mesma cor ou num tubo vazio.

## O que deixa ele "satisfatório"

- Bolinhas voam em arco e **quicam** ao pousar, com "achatada" no impacto.
- Cada pouso toca uma nota da **escala pentatônica** (quanto mais alto no tubo, mais aguda): qualquer sequência soa bonita.
- **Vibração** curtinha a cada pouso (motor háptico do Android), mais forte ao completar.
- Tubo completo: tampinha cai com quique, faíscas na cor do tubo e arpejo de sininhos.
- Nível vencido: onda de comemoração, confete e moedas contando.
- Trilha ambiente generativa e calma, que nunca se repete igual.
- 4 temas na loja: Clássico, Doces, Neon e Gemas.

## Níveis

Gerados por código e **infinitos**: começa com 3 cores e ganha uma a cada 2 níveis (até 11). Todo nível passa por um
solucionador antes de aparecer, então **sempre tem solução**, e o mesmo nível é sempre o mesmo tabuleiro.
`npm test` confere os 300 primeiros níveis.

## Monetização

| Formato | Onde |
|---|---|
| **Banner** | Rodapé de todas as telas (o jogo deixa essa faixa livre) |
| **Intersticial** | Ao avançar de nível, a partir do nível 4, a cada 3 níveis e no máximo 1 a cada 90 s |
| **Recompensado** | +1 tubo extra, +5 desfazer, dica (grátis até o nível 3), dobrar moedas e +50 moedas na loja |

Tudo configurável em `src/config.js`.

## Rodar no navegador

```bash
cd bolinhas-zen
npm install
npm run dev        # abre em http://localhost:5173
```

No navegador os anúncios são simulados.

## Gerar o app Android

```bash
npm run android:sync   # build + copia para o projeto Android
npm run android:open   # abre no Android Studio
```

Cada push no GitHub gera o APK de teste (aba **Actions** → *Bolinhas Zen - Android build* → artefato `bolinhas-zen-debug-apk`).

## Publicar

Siga o mesmo passo a passo do README da raiz (Corre Corre), com estas diferenças:

- ID do pacote: `com.lucaspx.bolinhaszen` (troque agora se quiser; depois de publicado não muda).
- Crie um **app novo no AdMob** com seus 3 blocos e troque os IDs em `src/config.js` e em `android/app/src/main/AndroidManifest.xml`.
- Use uma **chave de assinatura própria** para este app. Para o GitHub gerar o `.aab`, os secrets são
  `BZ_ANDROID_KEYSTORE_BASE64`, `BZ_ANDROID_KEYSTORE_PASSWORD`, `BZ_ANDROID_KEY_ALIAS` e `BZ_ANDROID_KEY_PASSWORD`.
- A política de privacidade de `docs/privacidade.html` serve para os dois jogos (troque o nome do app ao publicar).
- Ícone e splash ainda são os padrão do Capacitor: gere os seus com `npx @capacitor/assets generate`.

## Estrutura

```
src/
  config.js        tamanho da tela, regras e anúncios
  logic.js         regras, solucionador e gerador de níveis (sem Phaser, testável com Node)
  themes.js        temas da loja (paletas e estilos)
  textures.js      bolinhas e fundos desenhados por código
  audio.js         efeitos sonoros sintetizados
  music.js         trilha ambiente generativa
  haptics.js       vibração
  ads.js           AdMob (Android) + simulador (navegador)
  storage.js       progresso salvo no aparelho
  scenes/          Menu, Game, Shop
scripts/test-levels.js   testes dos níveis
android/          projeto Android nativo (Capacitor)
```
