# domains.country app

Novo aplicativo oficial para registro e administração de domínios `.country` na Harmony.

## Estado atual

Esta pasta contém a fundação do MVP: app Next.js, contratos de API, diário local do segredo `commit → register`, schema PostgreSQL, painel administrativo por carteira e camada PowerDNS com rollback. Escritas em contrato ficam desligadas por padrão por `NEXT_PUBLIC_CONTRACT_WRITES_ENABLED=false` até a aprovação da Fase 0.

## Comandos

- `npm install` instala dependências do novo app.
- `npm run dev` inicia o app localmente.
- `npm run build` valida o build Next.js.
- `npm run test` executa testes unitários.
- `npm run db:generate` gera o client Prisma.
- `npm run db:migrate` cria a migração local do PostgreSQL.

`npm audit` pode reportar vulnerabilidades transitivas no conjunto atual. Não use `npm audit fix --force` sem revisar quebras de Next/Prisma/ESLint.

## Segurança do compromisso

O segredo do compromisso é gerado no navegador por `crypto.getRandomValues` e guardado somente em `localStorage`. Ele não é enviado ao backend. Se o usuário limpar o navegador, trocar de dispositivo ou perder o segredo, aquele compromisso não poderá ser concluído no `register`.

O app aplica CSP restritiva em `src/middleware.ts`; não adicione analytics, tags remotas ou scripts de terceiros sem revisar esse requisito.

## DNS público

PowerDNS só torna uma zona resolvível se o domínio estiver delegado no pai `.country` para os nameservers do projeto. Um registro `NS` dentro da zona filha não cria essa delegação. A publicação DNS guarda separadamente o estado on-chain confirmado e a zona efetivamente servida.

Consulte `docs/phase-0-discovery.md` antes de habilitar escrita, allowlist operacional ou publicação DNS.
