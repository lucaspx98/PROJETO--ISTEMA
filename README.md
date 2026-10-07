# Corre Corre 🏃‍♂️

Jogo **runner infinito** para Android, feito com [Phaser 3](https://phaser.io) + [Capacitor](https://capacitorjs.com) e monetizado com **Google AdMob**.

Toque para pular, toque de novo no ar para o pulo duplo, solte cedo para um pulo baixo. Desvie de espinhos e serras, pouse nos blocos, junte moedas e compre novos personagens na loja.

## Monetização (onde os anúncios aparecem)

| Formato | Onde | Por quê |
|---|---|---|
| **Banner** | Menu, loja e tela de fim de jogo (nunca durante a partida) | Receita contínua sem atrapalhar o jogo |
| **Intersticial** | Ao sair da tela de fim de jogo, a cada 3 partidas e no máximo 1 a cada 90 s | Pausa natural; frequência dentro das regras do Google |
| **Recompensado** | "Continuar" após morrer, "Dobrar moedas" e "+50 moedas grátis" na loja | O que mais paga (eCPM alto) e o jogador escolhe ver |

Tudo é configurado em `src/config.js`. Jogar um recompensado adia o próximo intersticial.

## Rodar no navegador

```bash
npm install
npm run dev        # abre em http://localhost:5173
```

No navegador os anúncios são **simulados** (uma tela "ANÚNCIO (simulado)"), então dá para testar o fluxo inteiro.

## Gerar o app Android

Requisitos: Node 22+, Java 21 e Android Studio (ou só o Android SDK).

```bash
npm run android:sync   # build do jogo + copia para o projeto Android
npm run android:open   # abre no Android Studio para rodar no celular
```

Ou pela linha de comando: `cd android && ./gradlew assembleDebug` → `android/app/build/outputs/apk/debug/app-debug.apk`.

Cada push no GitHub também gera o APK de teste automaticamente (aba **Actions** → *Android build* → artefato `corre-corre-debug-apk`).

## Passo a passo para publicar na Play Store

1. **Conta de desenvolvedor Google Play** — https://play.google.com/console (taxa única de US$ 25).
2. **Conta AdMob** — https://admob.google.com. Crie o app (Android) e 3 blocos de anúncio: *Banner*, *Intersticial* e *Premiado*.
3. **Troque os IDs de teste pelos seus:**
   - `src/config.js` → `ADS.android.banner / interstitial / rewarded` e `useTestAds: false`
   - `android/app/src/main/AndroidManifest.xml` → `com.google.android.gms.ads.APPLICATION_ID` (o ID do app, com `~`)
   > ⚠️ Nunca clique nos seus próprios anúncios reais — o AdMob bane a conta. Para testar no seu celular, mantenha `useTestAds: true`.
4. **ID do pacote:** `com.lucaspx.correcorre` (em `capacitor.config.json` e `android/app/build.gradle`). Troque agora se quiser — depois de publicado não muda mais.
5. **Chave de assinatura** (guarde em lugar seguro, com backup!):
   ```bash
   keytool -genkeypair -v -keystore correcorre.jks -alias correcorre -keyalg RSA -keysize 2048 -validity 10000
   ```
   Crie `android/keystore.properties` (já está no `.gitignore`):
   ```properties
   storeFile=/caminho/para/correcorre.jks
   storePassword=SUA_SENHA
   keyAlias=correcorre
   keyPassword=SUA_SENHA
   ```
   Ou, para o GitHub gerar o `.aab`, cadastre os secrets `ANDROID_KEYSTORE_BASE64` (`base64 -w0 correcorre.jks`), `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` e `ANDROID_KEY_PASSWORD`.
6. **Gerar o pacote:** `npm run android:sync && cd android && ./gradlew bundleRelease` → `android/app/build/outputs/bundle/release/app-release.aab`.
7. **Política de privacidade** (obrigatória com anúncios): preencha `docs/privacidade.html` e publique (ex.: GitHub Pages em *Settings → Pages → branch main, pasta /docs*). Coloque o link na Play Console.
8. **app-ads.txt:** o AdMob mostra uma linha para colocar em `seusite.com/app-ads.txt`; informe esse site como "site do desenvolvedor" na Play Store.
9. **Na Play Console:** crie o app, marque "Contém anúncios", preencha classificação de conteúdo, público-alvo (13+ evita as regras de apps infantis), segurança de dados (declare o ID de publicidade coletado pelo AdMob), envie ícone 512×512, imagem de destaque 1024×500 e pelo menos 2 capturas de tela.
10. **Teste fechado:** contas novas precisam de um teste fechado com **12 testadores por 14 dias** antes de liberar a produção.
11. A cada atualização, aumente `versionCode` em `android/app/build.gradle`.

## Estrutura

```
src/
  config.js         tamanho da tela, IDs e frequência dos anúncios
  ads.js            AdMob (Android) + simulador (navegador)
  storage.js        recorde, moedas e personagens salvos no aparelho
  skins.js          personagens da loja
  textures.js       todos os gráficos, desenhados por código
  audio.js          efeitos sonoros sintetizados
  ui.js             botões, textos e fundo com parallax
  scenes/           Menu, Game, GameOver, Shop
android/            projeto Android nativo gerado pelo Capacitor
docs/privacidade.html  modelo de política de privacidade
```

## Próximas ideias para aumentar a receita

- Ícone e splash screen próprios (`npx @capacitor/assets generate`).
- Missões diárias e recompensa diária por anúncio (mais recompensados por usuário).
- Ranking online (Google Play Games) para aumentar retenção.
- Compra "Remover anúncios" (Google Play Billing).
