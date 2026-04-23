# XSky Poster 🚀

Uma extensão leve e poderosa para navegadores baseados em Chromium, criada com um objetivo claro: **postar no X (Twitter) e no Bluesky sem precisar abrir as redes sociais e cair na armadilha da timeline.**

Com o XSky Poster, você foca no que importa: espalhar as suas ideias e atualizações para as duas plataformas simultaneamente, de forma rápida, invisível e sem distrações.

## ✨ Funcionalidades

- **Postagem Dupla Instantânea:** Escreva uma vez, publique nas duas redes (X e Bluesky) ao mesmo tempo.
- **Suporte a Imagens:** Adicione imagens aos seus posts via botão ou simplesmente usando `Ctrl+V` / `Cmd+V` direto na caixa de texto.
- **Automação Invisível (Headless):** Se o post for apenas texto, a extensão faz a publicação "fantasma" rodando os scripts em janelas invisíveis de background. Você nem vê acontecer e não perde o foco da sua aba atual.
- **Modo Assistido para Mídia:** Em posts com imagens (devido às proteções do React Native Web das plataformas), a extensão prepara tudo magicamente e só pede um clique seu para confirmar o upload.
- **Central de Notificações Inteligente:** O popup não serve apenas para postar! Ele tem duas abas extras dedicadas para carregar as suas Notificações e Menções recentes de cada rede. 
  - Leia quem te respondeu, seguiu ou curtiu, tudo isso com formatação nativa.
  - Respostas diretas ("replies") recebem um destaque especial em azul-esverdeado para facilitar a leitura.
  - Atualização em tempo real das notificações sem piscar a tela e mantendo seu histórico.

## 🛠️ Como Instalar (Modo Desenvolvedor)

Como esta extensão utiliza permissões avançadas de automação, ela é carregada em modo de desenvolvimento local:

1. Baixe ou clone este repositório no seu computador.
2. Abra o Chrome (ou Brave/Edge) e acesse a página de extensões: `chrome://extensions/`.
3. Ative a chave **"Modo do desenvolvedor"** no canto superior direito.
4. Clique no botão **"Carregar sem compactação"** (Load unpacked).
5. Selecione a pasta onde você salvou este repositório (`xsky`).
6. Pronto! O ícone da extensão aparecerá na sua barra do navegador (é recomendado "fixar/pinnar" o ícone para acesso rápido).

## 🔒 Segurança e Privacidade

Esta extensão **não** usa servidores externos ou pede suas senhas. Ela utiliza as sessões que já estão ativas no seu navegador.
Toda a comunicação é feita diretamente entre o seu próprio computador e as APIs internas do X e do Bluesky usando os seus próprios cookies/tokens armazenados localmente.

## 💻 Como Funciona por Baixo dos Panos

- **Manifest V3:** Construída sob as regras mais recentes de extensões do Chrome.
- **Background Service Workers:** Gerenciam a fila de janelas e mantêm tudo funcionando mesmo se você fechar o popup rápido demais.
- **Scraping Avançado (DOM Parsing):** Os robôs de notificação abrem o feed por trás dos panos, procuram as "caixas" exatas das notificações da UI React e injetam as respostas formatadas diretamente no seu popup, garantindo estabilidade contra mudanças de layout das redes.
