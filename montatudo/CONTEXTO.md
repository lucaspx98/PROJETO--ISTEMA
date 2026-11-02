# Monta Tudo 3D — contexto para continuar o trabalho

Leia isto antes de mexer no jogo. Detalhes técnicos e passo a passo de publicação estão no [README](README.md).

## Onde está

- Repositório: `lucaspx98/PROJETO--ISTEMA`, branch **`claude/runner-game`**, pasta **`montatudo/`**
- Cópia congelada da versão aprovada pelo dono: branch `claude/monta-tudo-v1.0` (antes das versões Android e dos textos da loja)
- Versão jogável no navegador (artifact privado do dono): https://claude.ai/artifact/2RDAJGFHhYfr5natqMSUia

## O jogo

Jogo 3D de montagem (Three.js + Capacitor + AdMob), tela em pé. Cinco fases: mesa, cadeira, estante, PC gamer e setup. Ferramentas: mão, chave de fenda (girar o dedo em círculos), martelo e parafusadeira (comprada). A Oficina melhora as ferramentas com moedas. Ferramenta errada ou ordem errada contam como erro e tiram estrelas.

## Situação da publicação (decisão atual: **Play Store / Android**)

Feito:
- Projeto Android em `montatudo/android/` (tela em pé, ícone, splash, assinatura por `keystore.properties` ou secrets)
- Build no GitHub Actions: `.github/workflows/android-montatudo.yml` (passando). Gera o APK de teste `monta-tudo-debug-apk` e, com os secrets `MONTATUDO_KEYSTORE_*`, o AAB assinado
- Textos da ficha, respostas dos formulários, ícone 512, destaque 1024×500 e capturas: `montatudo/loja/`
- Também existe o projeto iOS e o build iOS no GitHub (passando), caso queiram a App Store depois

Falta (depende do dono):
1. Conta no Google Play Console (US$ 25)
2. App Android no AdMob com 3 blocos. Os códigos vão na nota do Obsidian `notas/AdMob - Monta Tudo.md`. Depois é preciso trocar em `src/config.js` (`ADS.android`, `useTestAds: false`) e em `android/app/src/main/AndroidManifest.xml` (`APPLICATION_ID`)
3. Nome e e-mail de contato para `docs/privacidade.html`, e publicar a política num link
4. Gerar a chave de upload (keytool) e cadastrar os 4 secrets no GitHub
5. Teste fechado com 12 testadores por 14 dias (exigência para contas pessoais novas)

## Cuidados

- O dono fala português; responda em português simples
- O teste em navegador sem GPU (Playwright + SwiftShader) é muito lento: espere as transições da câmera (`engine.tweens`) antes de tirar prints
- Não suba chaves (`*.jks`, `keystore.properties`) para o Git; já estão no `.gitignore`
