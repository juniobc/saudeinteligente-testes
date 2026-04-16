# Sobre o Sistema — Saúde Inteligente

> Descrição geral do sistema, público-alvo, módulos e conceitos de negócio.
> O Guardian usa este arquivo para entender **o que é** o sistema antes de interagir com ele.
> Fonte: `docs/knowledge/core/projeto-saude-inteligente.md`
> Última atualização: 2026-04-16

---

## O que é o Saúde Inteligente?

Plataforma tecnológica integrada para gestão da saúde pública, operando no modelo **SaaS (Software as a Service)** com arquitetura **Multi-tenant**. Funciona como um **Ecossistema Tecnológico Único** que centraliza, padroniza e consolida dados assistenciais, regulatórios e administrativos.

Cada prefeitura (município) tem seu próprio banco de dados (Schema). O login define o contexto do tenant.

## Público-Alvo

- Gestores municipais de saúde
- Profissionais de saúde (médicos, enfermeiros, reguladores)
- Equipes de regulação (consultas, exames, leitos SUS)
- Equipes de vigilância (epidemiológica, sanitária)
- Auditores e analistas de dados

## Estrutura Modular — Os 4 Pilares

| Pilar | Nome | Função Principal |
|-------|------|-----------------|
| 01 | **Inteligência de Dados** | Centralização e tratamento de dados com Painéis de Inteligência (BI) |
| 02 | **Central de Regulação** | Gestão de fluxos assistenciais (consultas, exames e leitos SUS) |
| 03 | **Prontuário Integrador** | Camada de integração que consolida dados de múltiplos sistemas |
| 04 | **Prontuário Assistencial** | Registro direto de atendimentos ambulatoriais e hospitalares |

## Painéis de Inteligência (Áreas de Atuação)

- **APS** — Monitoramento da Portaria 3.493/2024, Indicadores C1-C7, Vacinas e Glosas
- **Vigilância** — Epidemiológica, Sanitária e Georreferenciamento do setor regulado
- **Especializada (MAC)** — Prospecção assistencial, equipamentos de diagnóstico e teto financeiro
- **Hospitalar** — Planejamento de leitos, perfil de internações e taxas hospitalares
- **Regulação** — Controle de exames, consultas, cirurgias e internações
- **Gestão** — Auditoria de FPO, repasses do FNS e indicadores de efetividade (IEGM)

## Estrutura Técnica

### Backend (API)
- **Stack:** Python / FastAPI. Retorna JSON. Protegido por autenticação JWT.
- **Dica E2E:** Erros 500 no console do navegador indicam falha em um dos microserviços.

### Frontend (SPA)
- **Stack:** React / Vite. Componentes customizados: `CrudLayout`, `ListTable`, `FormModal`.
- **Dica E2E:** O sistema usa `react-select` com prefixo `Select2__`. Para selecionar uma opção via Playwright, interagir com o elemento que contém a classe `Select2__`.

## Hierarquia de Acesso — Login como Pivot de 4 Etapas

O fluxo de entrada **nunca é direto**. Segue obrigatoriamente:

1. **Etapa 1: Credenciais** — Usuário e Senha
2. **Etapa 2: Seleção de Município** — Contexto do Multi-tenant (pode ser auto-selecionado)
3. **Etapa 3: Agrupamento de Módulos** — Tela intermediária onde os módulos são organizados por grandes áreas. **Atenção:** Os nomes desses agrupamentos são dinâmicos e mudam conforme o município
4. **Etapa 4: Seleção de Módulo** — Dentro do agrupamento escolhido, seleciona-se o sistema final (ex: APS, OCI, Regulação)

### Identificação do Município (Tenant)
O sistema identifica a prefeitura alvo através do Header HTTP `X-Tenant-ID`, que corresponde ao Schema do banco de dados daquele município. Em ambiente de desenvolvimento, isso também pode ser resolvido automaticamente via subdomínio no Origin (ex: `municipio.localhost`).

## Glossário e Conceitos Chave

| Termo | Significado para o Teste E2E |
|-------|------------------------------|
| **Multi-tenant** | Cada prefeitura tem seu próprio banco (Schema). O login define o contexto |
| **Login como Pivot** | O fluxo: Login → Município → Agrupamento → Módulo é o portão de entrada obrigatório |
| **Glosas / Inconsistências** | Erros de dados que geram perda financeira. Validar o painel de auditoria é crítico |
| **Regulação** | Controle de exames, consultas, cirurgias e internações |
| **RNDS** | Barramento para envio de registros clínicos ao Governo Federal (HL7 FHIR) |
| **SIGTAP** | Tabela oficial do SUS. O sistema deve respeitar suas regras de procedimentos |
| **SLA de 99,0%** | O sistema deve ser rápido e estável. Lentidão > 3s deve ser reportada |

## Regras de Ouro para o Guardian

1. **Nomes Dinâmicos** — Não assumir que encontrará um botão chamado "Saúde" ou "Gestão". Mapear os cartões/botões disponíveis na tela de agrupamentos
2. **Ambiente é Local** — Os testes rodam localmente, mas a base de dados segue o `.env`
3. **Plataforma Única** — Todos os módulos devem compartilhar a mesma identidade visual
4. **Integridade do Dashboard** — Gráficos vazios ou com erro são falhas de "missão crítica"

## Fluxos Críticos Prioritários

1. **Autenticação e Navegação Hierárquica** — Login → Município → Agrupamento → Módulo
2. **Navegação entre Módulos** — Sair de um módulo, voltar ao agrupamento e entrar em outro
3. **Carga e Visualização de BI** — Garantir que os Painéis de BI carreguem informações
4. **Cadastro/Edição em Modais** — Verificar se o `FormModal` salva os dados corretamente
5. **Tratamento de Fila** — Fluxo de identificação e exclusão de inconsistências na regulação
