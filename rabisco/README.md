# Risca e Salva ✏️🐝

Jogo casual no estilo "desenhe para salvar" (como nos anúncios), com física de verdade. Feito com [Matter.js](https://brm.io/matter-js/) + canvas 2D + [Capacitor](https://capacitorjs.com) e monetizado com **Google AdMob**.

O **Bolota** está em perigo. Desenhe **um único traço** com o dedo: ao soltar, o traço vira um objeto físico (cai, apoia, bloqueia) e precisa proteger o Bolota por **6 segundos** (8 no chefão). Perigos: enxame de abelhas que persegue o Bolota, chuva de pedras, canhões que miram nele, espinhos e quedas. A tinta é limitada: menos tinta, mais estrelas.

## Conteúdo

- **20 fases** feitas à mão (`src/levels.js`) e, depois delas, **fases infinitas geradas** que só aparecem se a dica comprovadamente salvar o Bolota.
- **Dica** (25 moedas ou anúncio): mostra o traço certo em laranja.
- **Roupinhas** do Bolota compradas com moedas (laço, boné, fone, coroa, óculos).

## Robô de testes das fases

```bash
npm run test:levels     # desenha a dica em cada fase e simula a física várias vezes
```
Cada fase precisa: vencer com a dica em quase todas as tentativas **e** perder sem traço nenhum (senão é fácil demais). Rode sempre que mexer em fases ou na física.

## Monetização

| Formato | Onde |
|---|---|
| **Banner** | Menu, roupinhas, vitória e derrota (nunca enquanto joga) |
| **Intersticial** | A cada 3 fases jogadas (vitória ou derrota), no máximo 1 a cada 90 s |
| **Recompensado** | Dobrar moedas, ver a dica sem moedas e pular fase |

## Rodar e publicar

```bash
cd rabisco
npm install
npm run dev            # http://localhost:5173
npm run android:sync   # build + copia para o projeto Android
```

O GitHub gera a cada push o APK de teste (`risca-e-salva-debug-apk`, aba Actions → *Android build (Risca e Salva)*) e, com os secrets `RABISCO_KEYSTORE_*`, o `.aab` assinado para a Play Store. O passo a passo da Play Store é o mesmo do Monta Tudo: veja [`../montatudo/README.md`](../montatudo/README.md). Aqui o pacote é `com.lucaspx.riscaesalva`.

## Estrutura

```
src/
  game.js      física da fase: traço desenhado, Bolota, abelhas, pedras, canhões, vitória/derrota
  levels.js    as 20 fases e o gerador de fases infinitas
  render.js    desenho em canvas (cenário, Bolota e expressões, abelhas, roupinhas)
  main.js      telas, toque, dica, moedas, anúncios
  audio.js     sons sintetizados (risco da caneta, zumbido, batidas)
tools/         robô de testes das fases
android/       projeto Android (Capacitor)
```
