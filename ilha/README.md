# Ilha Brava 🏝️⚔️

Aventura 3D de **mundo aberto pequeno** (estilo "naufragado numa ilha"), feita só com código: [Three.js](https://threejs.org) + [Vite](https://vite.dev) + [Capacitor](https://capacitorjs.com), monetizada com **Google AdMob**. Jogo na horizontal.

Você naufragou. Com a ajuda do **Capitão Bento** (casaco, barba e perna de pau), coleta madeira e pedra, constrói acampamento, enfrenta gosmas e lobos, encontra 3 relíquias, forja a lâmina de cristal, derrota o **Golem** no topo da montanha e conserta o barco para ir embora — ou continua explorando.

## Conteúdo

- Ilha de 400 × 400 m gerada por ruído (praias, campos, floresta, montanha), dia e noite (à noite aparecem mais bichos).
- **13 missões** com bússola apontando o próximo objetivo (`src/quests.js`).
- Construções: fogueira (cura), bancada (melhora a arma), cabana (dormir pula a noite), barco.
- Combate com mira automática, rolamento para desviar, inimigos que avisam o golpe (círculo vermelho), chefão Golem.
- Personagens com juntas (ombro, cotovelo, quadril, joelho), rosto, cabelo e roupas; animação de andar, atacar e rolar.
- Jogo salvo sozinho a cada 8 s.

## Robô de testes

```bash
npm run test:bot        # joga a história inteira sem tela (node tools/bot.js [semente] [minutos])
```
O robô anda pelo mapa, luta, coleta e constrói. Hoje ele **zera o jogo em ~8,5 min de jogo sem morrer**. Rode sempre que mexer em `world.js` ou `quests.js`.

## Monetização

| Formato | Onde |
|---|---|
| **Banner** | Só no menu (nunca enquanto joga) |
| **Intersticial** | A cada 3 vezes que você volta ao menu ou renasce no acampamento (no máximo 1 a cada 90 s) |
| **Recompensado** | Reviver no mesmo lugar depois de morrer |

Os IDs em `src/config.js` e no `AndroidManifest.xml` são os **de teste** do Google. Troque pelos seus antes de publicar.

## Rodar e publicar

```bash
cd ilha
npm install
npm run dev            # http://localhost:5173
npm run android:sync   # build + copia para o projeto Android
```

O GitHub gera a cada push o APK de teste (`ilha-brava-debug-apk`, aba Actions → *Android build (Ilha Brava)*) e, com os secrets `ILHA_KEYSTORE_*`, o `.aab` assinado para a Play Store. O passo a passo da Play Store é o mesmo do Monta Tudo: veja [`../montatudo/README.md`](../montatudo/README.md). Aqui o pacote é `com.lucaspx.ilhabrava`.

## Estrutura

```
src/
  world.js     simulação pura (terreno, recursos, jogador, inimigos, construções, salvar) — sem 3D
  quests.js    as missões da história
  models.js    modelos 3D feitos por código (personagens, bichos, árvores, construções)
  render.js    cena 3D, câmera em terceira pessoa, animações, partículas, minimapa
  main.js      laço do jogo, joystick/teclado, HUD, menus, anúncios
  audio.js     sons sintetizados e mar
tools/bot.js   robô que joga a história
android/       projeto Android (Capacitor, horizontal)
```
