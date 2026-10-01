# Banco Convex do Converge

## Preparar o deployment

1. Instale Node.js LTS. Na raiz do projeto, execute `npm init -y` e `npm install convex`.
2. Execute `npx convex dev` e entre na sua conta Convex para criar ou vincular o deployment. O CLI gera `convex/_generated` e publica schema e funções.
3. O arquivo local `convex/profiles.local.json` contém os perfis iniciais e é ignorado pelo Git. Confira os e-mails e áreas antes de executar o seed.
4. Execute no PowerShell: `npx convex run seed:seedInitialData (Get-Content .\convex\profiles.local.json -Raw)`.
5. Configure um provedor de autenticação que forneça e-mail verificado. `getMyAccessProfile` recusa contas sem perfil ativo e e-mail verificado.

O seed cria a organização Converge e as sete áreas; depois cria ou atualiza os perfis informados. É idempotente, exige exatamente um `admin` inicial e aceita somente e-mails institucionais `@hc.fm.usp.br`. O perfil admin tem acesso a todas as áreas; usuários comuns ficam limitados à sua área e aos cards compartilhados.

`access.ts` contém verificações de acesso por organização, área, card compartilhado e perfil administrativo. As funções de consulta e alteração de cards devem chamar essas verificações antes de acessar os dados.

## Estado da interface

`index.html` e `script.js` ainda usam `localStorage`; não chamam o Convex nem oferecem login. Portanto, schema, seed e verificações de perfil estão preparados, mas o app só compartilhará dados e aplicará essas permissões após a integração do frontend com autenticação e funções Convex.

`convex/profiles.local.json`, `.env.local` e a planilha de teste estão excluídos do Git para não publicar dados privados ou de teste.
