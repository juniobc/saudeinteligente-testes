# Erros Conhecidos — Módulo OCI

> Erros encontrados durante testes do módulo **Ofertas de Cuidados Integrados (OCI)** e suas resoluções.
> Carregado pelo Guardian apenas quando a tarefa envolve o módulo OCI.
> Última atualização: 2025-07-14

---

### [2026-04-15] Rota /oci/dashboard/cad_oci não existe mais

- **Descrição**: A rota `/oci/dashboard/cad_oci` usada no `CadOCIPage.goto()` exibia "Página em Construção". A tela de cadastro/consulta de OCI foi movida para `/oci/dashboard/consulta_cadastro`.
- **Seletor que falhou**: `page.goto('/oci/dashboard/cad_oci')`
- **Abordagem alternativa**: Navegar pelo menu lateral: Gestão de OCIs > Consultar ou Cadastrar OCI. Rota real: `/oci/dashboard/consulta_cadastro`.
- **Resultado**: resolvido — `CadOCIPage.goto()` atualizado para navegar via menu.
- **Screenshot**: N/A
