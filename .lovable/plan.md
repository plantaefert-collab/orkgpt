Contexto: o usuário pediu para adicionar agent integrations (MCP) ao app. Já foram iniciados os passos iniciais: instalação do pacote `@lovable.dev/mcp-js`, ativação do OAuth server no Supabase e criação dos arquivos base do MCP (`src/lib/mcp/index.ts` e três tools). Ainda restam etapas críticas para o fluxo OAuth e a integração funcionar.

Objetivo: completar a implementação de um MCP server protegido por OAuth no app TanStack Start, expondo ferramentas seguras que leem/alteram os dados do usuário autenticado.

Plano técnico:

1. Criar a rota de consentimento OAuth
   - Arquivo: `src/routes/[.]lovable.oauth.consent.tsx`
   - Lê `authorization_id` da query string.
   - Verifica sessão do app; se não houver, redireciona para `/auth` preservando o consent URL em `next`.
   - Chama `supabase.auth.oauth.getAuthorizationDetails(authorization_id)`.
   - Renderiza tela com nome do cliente, escopos e botões Aprovar/Negar.
   - Ao aprovar/negar, chama `approveAuthorization`/`denyAuthorization` e redireciona para o `redirect_url` retornado.

2. Ajustar a rota `/auth` para preservar `next`
   - `src/routes/auth.tsx` deve ler `next` dos search params.
   - Passar `next` para `AuthScreen` e, após login/cadastro bem-sucedido, redirecionar para `next` quando presente (mesmo que seja rota de consent).
   - Ajustar `handleGoogleAuth` em `AuthScreen` para usar `redirect_uri` com `next` preservado.
   - Ajustar `emailRedirectTo` do signup/resend para incluir `next`.

3. Garantir que `AuthScreen` aceite e use o `next` preservado
   - Adicionar prop opcional `next?: string`.
   - Usar `resolvePostAuthDestination` como fallback quando `next` ausente.

4. Validar build/typecheck
   - Rodar `bun run typecheck` (ou equivalente disponível no `package.json`).
   - Corrigir erros de TypeScript, imports ou rotas.

5. Extrair o manifesto MCP
   - Rodar `lovable-mcp-extract-manifest` após salvar os arquivos.
   - Verificar se `.lovable/mcp/manifest.json` foi gerado sem erros.

6. Verificar ponta a ponta (pós-build)
   - Confirmar que `/.well-known/oauth-protected-resource` responde.
   - Confirmar que `/.lovable/oauth/consent` existe e preserva `authorization_id` após login.
   - Confirmar que `/mcp` responde (em dev, sem auth, pode ser 401; isso é esperado).

Fora de escopo deste plano:
- Não adicionar novas tools além das três já criadas (ler planta, ler progresso, definir dia).
- Não publicar o app em produção.
- Não alterar o design das páginas existentes além do necessário para o fluxo OAuth.

Entregável esperado: MCP server funcional, protegido por OAuth, com rota de consentimento integrada ao login/cadastro existente, pronto para ser conectado a clientes como ChatGPT/Claude.