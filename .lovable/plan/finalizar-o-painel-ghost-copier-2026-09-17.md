# Finalizar o painel Ghost Copier

## Objetivo
Concluir o painel com o visual neon do projeto original, corrigir falhas existentes e entregar os módulos funcionando de ponta a ponta, sem gastar créditos de IA durante a implementação e os testes comuns.

## Implementação
- Reaplicar a identidade original: logo, fundo escuro, ciano/roxo neon, tipografia, menu lateral, cabeçalho, cartões, botões, formulários e comportamento no celular.
- Corrigir login, navegação, permissões por módulo, modo “entrar como” e estados de carregamento/erro.
- Finalizar Telas Pretas: criar/editar, miniatura, ativação instantânea, atalhos, QR/link, duplicação, importação/exportação e visualizador público ao vivo.
- Finalizar Play Fake: editor e prévia fiel, clonar app real, avaliações, tradução, melhoria de textos, logo/banner, salvar/duplicar/excluir e baixar a página.
- Finalizar Assistente IA com conversa em tempo real e ações úteis para gerar página, tela e conteúdo.
- Finalizar área administrativa: números, usuários, módulos, validade, senha, duplicação, suporte e histórico.
- Implementar o botão de geração real usando o serviço já conectado, com erros claros e consumo somente quando o usuário clicar.

## Economia de créditos
- Nenhuma geração de IA será executada durante os testes visuais e funcionais.
- A geração real será validada até a requisição e seus estados sem disparos repetidos.
- Recursos determinísticos, prévias e dados locais serão testados sem IA.

## Validação
- Conferir compilação, lint e segurança do banco.
- Testar no navegador os fluxos públicos, login e módulos disponíveis.
- Conferir visual e funcionamento em celular e desktop, corrigindo sobreposições e controles quebrados.
