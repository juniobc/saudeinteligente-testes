# Sobre o Módulo — OCI (Oferta de Cuidados Integrados)

> Descrição do módulo, objetivo, telas principais e conceitos de negócio.
> O Guardian usa este arquivo para entender **o que é** o módulo antes de explorar ou testar.
> Última atualização: 2026-04-16

---

## O que é o módulo OCI?

O módulo **OCI (Oferta de Cuidados Integrados)** é o orquestrador do fluxo assistencial que conecta a Atenção Primária à Atenção Especializada. Diferente de um sistema de agendamento comum, a OCI gerencia o **Ciclo Completo de Cuidado** do paciente, garantindo que ele percorra todo o caminho diagnóstico e terapêutico dentro de uma **Linha de Cuidado** específica.

## Telas Principais

| Tela | Rota (se conhecida) | Descrição |
|------|---------------------|-----------|
| Painel de Inteligência | `/oci/dashboard` | Dashboard com indicadores e gráficos de solicitações por especialidade |
| Consulta/Cadastro OCI | `/oci/dashboard/consulta_cadastro` | Listagem, filtros e criação de solicitações OCI |
| Configuração de OCIs | `/oci/dashboard/config_oci` | Configuração de linhas de cuidado, procedimentos e modos de progressão |
| Consulta/Cadastro de Agendas | `/oci/dashboard/consulta_cadastro_agenda` | Gestão de agendas das unidades executantes |
| Regulação | `/oci/dashboard/med_autorizador` | Autorização de solicitações pelo médico regulador |
| Lista de Espera | `/oci/dashboard/lista_espera` | Agendamento da lista de espera |
| Confirmação de Atendimento | `/oci/dashboard/confirm_comparecimento` | Confirmação de comparecimento via chave de verificação |

## Conceitos de Negócio

### O Ciclo de Vida da OCI (As 3 Etapas)

Um processo de OCI é estruturado em três fases fundamentais:

1. **1ª ETAPA: Consulta Inicial Especializada** — O primeiro contato do paciente vindo da APS com o médico especialista.
2. **2ª ETAPA: Exames de Apoio Diagnóstico** — Conjunto de exames solicitados pelo especialista para fundamentar o diagnóstico.
3. **3ª ETAPA: Consulta de Retorno Especializada** — Retorno ao especialista para fechamento do caso ou início do tratamento.

### Modos de Progressão

O comportamento do agendamento entre as etapas depende de como a Linha de Cuidado foi configurada:

- **Modo Integrado (1)**: Permite o agendamento das 3 etapas de uma só vez.
- **Modo Sequencial (2)**: Cada etapa só é liberada para agendamento após a confirmação de comparecimento da etapa anterior. É o único modo que permite a **Regulação Manual** (`st_exige_regulacao`).
- **Modo Faseado (3)**: Permite agendar as etapas 1 e 2 juntas, mas bloqueia a etapa 3 até que todos os exames obrigatórios da etapa 2 sejam concluídos.

### Glossário Técnico

| Termo | Significado |
|---|---|
| **nr_protocolo** | Identificador único que amarra todas as etapas de uma mesma OCI |
| **id_progressao** | Define o comportamento do fluxo: Integrado(1), Sequencial(2) ou Faseado(3) |
| **st_fila** | Status do paciente na fila de espera (Aguardando, Agendado, Compareceu, etc.) |
| **st_exige_regulacao** | Se verdadeiro, exige autorização de um médico regulador para agendar |
| **X-Tenant-ID** | Header obrigatório que identifica o município (Schema do banco) |

## Regras de Negócio Importantes

### Procedimentos Obrigatórios vs. Opcionais
- **Obrigatórios**: Devem ter o comparecimento confirmado para que o sistema libere o agendamento da 3ª Etapa (Retorno).
- **Opcionais**: Não travam a progressão do fluxo.

### Gestão de Cotas e Reserva Técnica
- As vagas são distribuídas por **Cotas** para as unidades solicitantes (CNES).
- A **Reserva Técnica** (Percentual ou Absoluto) garante vagas protegidas para a Central de Regulação, invisíveis para o agendamento rotineiro.

### Segurança e Reversão
- **Chave de Verificação (Senha)**: Todo agendamento gera uma senha única que deve ser informada no momento do atendimento.
- **Janela de Reversão de 24 Horas**: O sistema permite desfazer marcações de "Não Compareceu" apenas dentro de 24 horas.

## Perfis de Usuário

- **Unidade Solicitante (UBS/APS)**: Responsável por identificar a necessidade e iniciar o protocolo de OCI. Cadastrada em `oci_unidade_solicitante` (35 unidades em Luziânia). Somente unidades nesta tabela podem criar solicitações.
- **Unidade Executante (Especialidades)**: Onde o serviço é prestado e onde se confirma o comparecimento via chave de verificação. Cadastrada em `oci_unidade_executante` (72 unidades em Luziânia). Somente unidades nesta tabela podem executar procedimentos.
- **Regulação**: Gestor que configura as linhas, define as cotas e autoriza solicitações (quando exigido).
- Uma unidade pode ter ambos os papéis (solicitante + executante) simultaneamente.

## Fluxos Principais (resumo)

1. **Criar Solicitação OCI**: Escolher especialidade → Preencher formulário (paciente, linha de cuidado, CID, justificativa) → Salvar
2. **Cancelar Solicitação**: Selecionar na tabela → Preencher justificativa → Confirmar
3. **Agendar Etapas**: Depende do modo de progressão (Integrado, Sequencial ou Faseado)
4. **Confirmar Comparecimento**: Informar chave de verificação → Sistema registra presença
5. **Regulação**: Médico regulador autoriza ou rejeita solicitações pendentes

## Fluxos Críticos para Teste E2E

1. **Progressão Bloqueada**: Validar se o Modo Sequencial impede o agendamento do Retorno sem a Consulta confirmada.
2. **Consumo de Cota**: Verificar se o sistema bloqueia o agendamento quando o saldo de cotas da unidade chega a zero.
3. **Validação de Chave**: Testar se o comparecimento só é gravado com a `chave_verif` correta.
4. **Configuração de Linha**: Validar se, ao mudar para o Modo Integrado, o sistema desativa automaticamente a exigência de regulação manual.

## Observações

- A rota antiga `/oci/dashboard/cad_oci` não existe mais — foi substituída por `/oci/dashboard/consulta_cadastro`
- A navegação para a tela de Consulta/Cadastro OCI é feita pelo menu lateral: Gestão de OCIs > Consultar ou Cadastrar OCI
- As especialidades disponíveis no sistema de teste: Atenção em Oncologia, Cardiologia, Ortopedia, Oftalmologia, Otorrinolaringologia, Saúde da Mulher
