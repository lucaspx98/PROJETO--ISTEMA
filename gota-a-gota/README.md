# Gota a Gota 💧

Quebra-cabeça **relaxante e satisfatório** para Android, com uma mecânica própria: **desembaçar um vidro com o dedo**
para guiar gotas coloridas até os potes, misturando as cores pelo caminho.
Feito com [Phaser 3](https://phaser.io) + [Capacitor](https://capacitorjs.com) e monetizado com **Google AdMob**
(mesma base do Corre Corre, na raiz do repositório).

## Modo principal: Chuva sem fim (arcade)

Partida rápida e sem pausa, feita para dar vontade de jogar "só mais uma":

- Gotas novas aparecem o tempo todo e a névoa volta rápido: cada gota pede uma passada de dedo.
- Gota esquecida escorrega sozinha pela névoa; 3 gotas perdidas (fora do pote ou na cor errada) = fim.
- Os potes trocam de pedido assim que enchem, e muitas vezes pedem a cor de uma gota que já está no vidro.
- **Combo**: potes seguidos em até 5 s somam combo e multiplicador (até x8), com a nota musical subindo a cada acerto.
- **FEBRE** a cada 10 de combo: 8 s com dedo mais largo, qualquer gota vale em qualquer pote e pontos em dobro.
- **Gotas douradas** (+5 moedas), barra de nível sempre enchendo, vida extra a cada 3 níveis e 4º pote no nível 5.
- "NOVO RECORDE!" com confete no meio da partida, e no fim "faltaram só X pontos" quando passa perto.
- Ao perder: **Continuar (+3 vidas)** com anúncio recompensado, uma vez por partida.

O modo **Fases** (abaixo) continua no menu como quebra-cabeça mais calmo.

## Como joga (fases)

- O vidro da janela está embaçado e as gotas estão grudadas nele.
- Passe o dedo no vidro: a névoa sai e as gotas **escorrem só pelo vidro limpo**, descendo pelo caminho que você desenhou.
- Duas gotas que se encostam **se juntam e misturam a cor como tinta**: vermelho + amarelo = laranja, amarelo + azul = verde,
  vermelho + azul = roxo, as três = marrom. As bolinhas dentro de cada pote mostram a receita.
- Encha cada pote com a cor certa. Gota que cai fora, ou no pote errado, se perde.
- A partir do nível 4 **a névoa volta aos poucos**, e prateleiras de madeira bloqueiam o caminho.

## O que deixa ele "satisfatório"

- Desembaçar com o dedo: chiado de pano no vidro (com rangido quando o dedo vai rápido) e vibração leve.
- Gotas esticam quando escorrem, deixam um rastro limpo e fazem "bloop" ao se juntar.
- O pote enche com a cor misturada; ao completar, brilho e sininhos.
- Fim de nível: o vidro inteiro desembaça de uma vez, revelando a paisagem, com confete.
- Chuva fininha e trilha ambiente generativa de fundo.
- 4 vistas da janela na loja: Cidade, Pôr do sol, Floresta e Aurora.
- O menu também é um vidro embaçado: dá para brincar de desembaçar.

## Níveis

Gerados por código e **infinitos**, com dificuldade crescente (mais potes, misturas, prateleiras e névoa mais rápida).
O mesmo nível é sempre igual. `npm test` testa a física (névoa, escorrer, juntar, potes, prateleiras, continuar) e põe
um "robô" para jogar os 120 primeiros níveis.

## Monetização

| Formato | Onde |
|---|---|
| **Banner** | Rodapé de todas as telas (o jogo deixa essa faixa livre) |
| **Intersticial** | Ao avançar ou recomeçar após perder, a partir do nível 4, a cada 3 níveis e no máximo 1 a cada 90 s |
| **Recompensado** | Arcade: "Continuar (+3 vidas)". Fases: "Continuar" (devolve as gotas perdidas), "Parar névoa", "Dobrar moedas". Loja: "+50 moedas" |

Tudo configurável em `src/config.js`.

## Rodar no navegador

```bash
cd gota-a-gota
npm install
npm run dev        # abre em http://localhost:5173
```

No navegador os anúncios são simulados.

## Gerar o app Android

```bash
npm run android:sync   # build + copia para o projeto Android
npm run android:open   # abre no Android Studio
```

Cada push no GitHub gera o APK de teste (aba **Actions** → *Gota a Gota - Android build* → artefato `gota-a-gota-debug-apk`).

## Publicar

Siga o passo a passo do README da raiz (Corre Corre), com estas diferenças:

- ID do pacote: `com.lucaspx.gotaagota` (troque agora se quiser; depois de publicado não muda).
- Crie um **app novo no AdMob** com seus 3 blocos e troque os IDs em `src/config.js` e em `android/app/src/main/AndroidManifest.xml`.
- Use uma **chave de assinatura própria**. Para o GitHub gerar o `.aab`, os secrets são
  `GG_ANDROID_KEYSTORE_BASE64`, `GG_ANDROID_KEYSTORE_PASSWORD`, `GG_ANDROID_KEY_ALIAS` e `GG_ANDROID_KEY_PASSWORD`.
- Política de privacidade: use o modelo `docs/privacidade.html` trocando o nome do app.
- Ícone e splash ainda são os padrão do Capacitor: gere os seus com `npx @capacitor/assets generate`.

## Estrutura

```
src/
  sim.js           física: névoa, gotas, potes e gerador de níveis (sem Phaser, testável com Node)
  colors.js        mistura de cores tipo tinta (RYB)
  glass.js         desenha o vidro, a névoa e as gotas
  views.js         vistas da janela (loja)
  textures.js      gráficos desenhados por código
  audio.js         efeitos sonoros sintetizados (inclui o som de desembaçar)
  music.js         chuva + trilha ambiente generativa
  haptics.js       vibração
  ads.js           AdMob (Android) + simulador (navegador)
  storage.js       progresso salvo no aparelho
  jars.js          parapeito e potes
  scenes/          Menu, Arcade (Chuva sem fim), Game (fases), Shop
scripts/test-sim.js   testes da física e dos níveis
android/          projeto Android nativo (Capacitor)
```
