# Pulos do Gato — Módulo OCI

> Padrões não óbvios descobertos durante testes do módulo **Ofertas de Cuidados Integrados (OCI)**.
> Carregado pelo Guardian apenas quando a tarefa envolve o módulo OCI.
> Última atualização: 2025-07-14

---

### [2026-04-15] Nunca assumir que testes existentes estão corretos

- **Contexto**: Os testes E2E foram criados como rascunho inicial. A rota `/oci/dashboard/cad_oci` não existia mais — foi substituída por `/oci/dashboard/consulta_cadastro` acessível pelo menu "Gestão de OCIs > Consultar ou Cadastrar OCI".
- **Padrão**: Sempre perguntar ao desenvolvedor o fluxo correto antes de criar/modificar testes. Nunca confiar cegamente em rotas, seletores ou fluxos dos testes existentes.
- **Aplicação**: Toda tarefa E2E deve começar com a pergunta "qual é o fluxo correto?" ao desenvolvedor.

### [2026-04-15] Navegação por menu, não por URL direta

- **Contexto**: O `goto()` do CadOCIPage navegava direto para `/oci/dashboard/cad_oci` via URL, mas essa rota mostrava "Página em Construção". A tela correta é acessada pelo menu lateral: Gestão de OCIs > Consultar ou Cadastrar OCI.
- **Padrão**: Navegar pelo menu do sistema como um usuário faria, em vez de acessar rotas diretamente por URL. Rotas podem mudar sem aviso.
- **Aplicação**: Todos os Page Objects devem navegar via menu quando possível. Exceção: `/login` é a única rota acessível diretamente.

### [2026-04-15] Nomes de testes devem ter contexto explícito

- **Contexto**: Specs como `cancelamento.spec.js` e describes como "Cancelamento" não deixam claro que se trata de cancelamento de solicitação OCI.
- **Padrão**: Usar nomes no formato `{modulo}-{funcionalidade}.spec.js` e describes com módulo explícito (ex: "Cancelamento de Solicitação — Módulo OCI").
- **Aplicação**: Todos os specs e describes devem incluir o módulo (OCI, APS, etc.) e a funcionalidade específica para evitar ambiguidade.
