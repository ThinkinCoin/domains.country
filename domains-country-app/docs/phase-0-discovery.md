# Fase 0 — Descoberta e validação

## Objetivo

Confirmar que o MVP pode operar com os contratos existentes, Harmony mainnet, delegação real de DNS e PowerDNS sem custódia de chaves ou segredos do usuário.

## Evidências obrigatórias

- Rede e contratos: confirmar bytecode, ABI, permissões e titulares administrativos para `RegistrarController`, `DC`, `EWS`, `BaseRegistrar`, `TLDNameWrapper` e `PublicResolver`.
- Fluxo de registro: confirmar `commit`, período mínimo, expiração do compromisso, `register`, preço por duração e `renew` direto no `RegistrarController`.
- Propriedade: confirmar como obter owner efetivo quando o `BaseRegistrar` aponta para o wrapper, quais fuses bloqueiam transferência ou DNS, e qual chamada executa transferência.
- DNS on-chain: confirmar suporte real a A, CNAME, NS, TXT, SOA, SRV e DNAME, formato de serialização esperado e comportamento de TTL.
- Delegação DNS: confirmar quem controla a zona/registro pai `.country` e o mecanismo autorizado para criar ou atualizar a delegação do domínio para `ns1.domains.country.` e `ns2.domains.country.` ou nomes equivalentes aprovados.
- Segurança do diário local: verificar CSP restritiva, ausência de scripts externos/analytics e ausência do segredo em requisições, logs, URLs, telemetry ou armazenamento externo.
- Operação PowerDNS: testar publicação transacional, falha simulada e reversão para a última zona válida.

## Critérios de saída

- `NEXT_PUBLIC_CONTRACT_WRITES_ENABLED` só pode ser `true` após evidência aprovada de ABI, permissões, rede e allowlist.
- DNS público só pode ser marcado ativo após delegação comprovada no pai `.country`, publicação PowerDNS verificada e resolução por resolvedores públicos.
- Se qualquer contrato não suportar um recurso planejado, o recurso fica bloqueado no app e documentado para iniciativa posterior; não implantar resolver ou contrato novo neste MVP.
- Após transferência, o indexador deve invalidar permissões antigas e reconsultar owner, wrapper, fuses, resolver e TTL antes de aceitar ou publicar DNS.

## Status que o painel deve diferenciar

- `confirmado na Harmony`: evento/estado on-chain reconsultado após profundidade mínima de confirmações.
- `publicado no DNS`: zona efetivamente aceita/verificada pelo PowerDNS.
- `não delegado`: domínio sem delegação válida no pai `.country`.
- `falha de publicação`: estado on-chain mais novo existe, mas a última zona válida continua servida.
