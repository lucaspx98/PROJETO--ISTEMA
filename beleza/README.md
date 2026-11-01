# Salão Relax 💆‍♀️

Salão de beleza **ASMR em 3D** para iPhone, feito com [Three.js](https://threejs.org) + [Capacitor](https://capacitorjs.com) e monetizado com **Google AdMob**.

Cada cliente chega com um **pedido** (cor do blush, do batom, das unhas e do cabelo) e passa por três estações. Tudo é feito com o dedo direto no modelo 3D: esfregar, pintar e tocar. Os sons ASMR acompanham a velocidade do dedo.

| Estação | Etapas |
|---|---|
| 💆 Rosto | limpar a pele com algodão, tirar cravos, estourar espinhas, máscara de argila, tirar a máscara com esponja, pelinhos da sobrancelha com pinça, base, blush e batom |
| 💅 Unhas | tirar o esmalte velho, lixar as pontas, esmaltar e decorar com strass |
| 💇 Cabelo | molhar com chuveirinho, shampoo com espuma, enxaguar, secar com secador e pintar |

No fim, as estrelas dependem de **acertar as cores do pedido** (a cor pedida tem ★ na paleta) e do **capricho** (terminar cada etapa sem apertar "Pronto" cedo). A cada cliente o rosto vem com mais cravos, espinhas e pelinhos. As clientes são geradas aleatoriamente: tom de pele, cor e corte do cabelo, cor dos olhos, nome e pedido.

## Monetização

| Formato | Onde |
|---|---|
| **Banner** | Menu, loja e resultado (nunca durante o atendimento) |
| **Intersticial** | Ao sair do resultado, a cada 2 clientes e no máximo 1 a cada 90 s |
| **Recompensado** | "Dobrar moedas" no resultado e "Pular etapa" quando faltam moedas |

A **🛍️ Loja** dá motivo para juntar moedas: pincéis maiores (pinta mais rápido), lixa elétrica e secador turbo, salão decorado (mais gorjeta), cores neon e strass coloridos. Preços em `src/shop.js`; anúncios em `src/config.js`.

## Rodar no navegador

```bash
cd beleza
npm install
npm run dev        # http://localhost:5173 (use o modo celular do navegador)
```

## iPhone e App Store

```bash
npm run ios:sync   # build + copia para o projeto iOS
npm run ios:open   # abre no Xcode
```

O passo a passo de publicação (conta Apple, AdMob, privacidade, TestFlight pelo GitHub) é o mesmo do Monta Tudo 3D: veja [`../montatudo/README.md`](../montatudo/README.md). Aqui o ID do pacote é `com.lucaspx.salaorelax` e a política de privacidade é `docs/privacidade.html`.

## Estrutura

```
src/
  characters.js   cliente em 3D: cabeça, olhos, boca, cravos, espinhas, cabelo, toalha, mão e unhas
  steps.js        as 18 etapas: ferramenta, gesto, som e como medir o progresso
  paint.js        textura pintável em camadas (sujeira, máscara, base, blush, esmalte, tinta…)
  game.js         atendimento: toque, ferramenta que segue o dedo, progresso e estrelas
  tools3d.js      ferramentas 3D (algodão, pinça, pincéis, lixa, chuveirinho, secador…) e partículas
  audio.js        sons ASMR sintetizados que seguem o dedo
  shop.js         melhorias da loja
  main.js         telas, painel da etapa, paleta de cores, anúncios
  engine.js       cena do salão, luz, câmera
ios/              projeto Xcode gerado pelo Capacitor
```
