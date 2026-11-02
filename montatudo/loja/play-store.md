# Monta Tudo 3D — ficha da Play Store

Tudo pronto para copiar e colar no Google Play Console. Imagens nesta pasta:
`icone-512.png`, `destaque-1024x500.png` e `captura-*.png` (1080×1920).

## Detalhes do app

**Nome do app** (até 30 caracteres)
```
Monta Tudo 3D
```

**Descrição curta** (até 80 caracteres)
```
Monte PC gamer, móveis e setup peça por peça, com ferramentas de verdade!
```

**Descrição completa**
```
Você gosta de montar coisas? Em Monta Tudo 3D você monta de verdade, peça por peça, em um cenário 3D realista!

🖥️ MONTE UM PC GAMER COMPLETO
Gabinete, fonte, placa-mãe, processador, cooler, memória RAM, SSD, placa de vídeo, ventoinhas RGB e tampa de vidro. Cada peça tem seu lugar e a ordem é a de uma montagem real: nada de colocar o cooler antes do processador!

🔧 USE AS FERRAMENTAS CERTAS
• Chave de fenda: arraste o parafuso até o furo e gire o dedo para apertar
• Martelo: pregue pregos e encaixe peças nas cavilhas
• Mão: encaixe a memória e a placa de vídeo até ouvir o clique
• Parafusadeira: segure e ela aperta sozinha
Cuidado: martelar o computador não é uma boa ideia 😅

🪑 MÓVEIS E SETUP
Mesa de escritório, cadeira giratória, estante de livros e um setup gamer completo, com monitor, teclado, mouse, caixas de som e luminária.

⭐ GANHE ESTRELAS E MELHORE SUA OFICINA
Monte sem errar para ganhar 3 estrelas e moedas. Na Oficina, melhore suas ferramentas: chave que aperta mais rápido, martelo mais forte e uma parafusadeira elétrica!

✨ RELAXANTE E SATISFATÓRIO
Gire a câmera em volta do objeto, ouça cada parafuso apertando e veja seu PC ligar com as luzes RGB girando.

Monte tudo. Monte do seu jeito. Baixe grátis!
```

## Categoria e contato

- **Tipo:** Jogo
- **Categoria:** Simulação
- **Tags sugeridas:** Simulação, Casual, Quebra-cabeça
- **E-mail de contato:** (o e-mail de vocês)
- **Política de privacidade:** link da `docs/privacidade.html` publicada (veja o README)

## Formulários do Play Console (respostas)

**Anúncios:** Sim, o app contém anúncios.

**Acesso ao app:** Todas as funcionalidades estão disponíveis sem restrições (não tem login).

**Classificação do conteúdo (IARC):** Categoria "Jogo". Responda **Não** para violência, sexo, linguagem imprópria, drogas, apostas e interação entre usuários. Resultado esperado: **Livre**.

**Público-alvo:** **13 anos ou mais** (13–15, 16–17 e 18+). Não marque menores de 13: apps para crianças entram nas regras do programa "Famílias", bem mais rígidas para anúncios.

**Segurança dos dados** (é o que o SDK do AdMob coleta):
| Pergunta | Resposta |
|---|---|
| O app coleta ou compartilha dados? | Sim |
| Os dados são criptografados em trânsito? | Sim |
| Os usuários podem pedir para excluir os dados? | Não (o app não tem conta; o progresso fica só no aparelho) |
| **Identificadores do dispositivo** (ID de publicidade) | Coletado e compartilhado · Publicidade ou marketing, Análise |
| **Informações e desempenho do app** (registros de falhas, diagnóstico) | Coletado · Análise |
| **Atividade no app** (interações) | Coletado · Publicidade ou marketing, Análise |

**ID de publicidade** (Conteúdo do app → ID de publicidade): **Sim**, o app usa o ID de publicidade (para anúncios).

**App de notícias / saúde / governo / financeiro:** Não.

## Antes de enviar

1. Trocar os IDs de teste do AdMob pelos reais (`src/config.js` → `ADS.android` e `android/app/src/main/AndroidManifest.xml` → `APPLICATION_ID`).
2. Contas pessoais novas no Play Console precisam fazer um **teste fechado com pelo menos 12 testadores por 14 dias seguidos** antes de liberar a produção.
3. A cada nova versão enviada, o número da versão sobe sozinho no GitHub (`VERSION_CODE` = número da execução).
