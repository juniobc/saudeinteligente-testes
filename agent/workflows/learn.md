# Workflow de Aprendizado

Este workflow define os passos que o Guardian segue para registrar correções, sugerir atualizações na base de conhecimento, consolidar lições aprendidas e garantir que toda orientação do desenvolvedor seja preservada para sessões futuras.

## Quando Usar

- Quando o desenvolvedor corrigir o Guardian durante uma sessão (ex: "Não clique aí, primeiro preencha o campo Y").
- Quando o desenvolvedor responder a um Gatilho de Dúvida.
- Quando o Guardian descobrir um padrão não óbvio durante a execução (timing, ordem de preenchimento, dependência entre campos).
- Ao final de cada sessão de teste, para consolidar aprendizados.

## Regra Fundamental

> **O Guardian NUNCA modifica arquivos dentro de `knowledge/` sem aprovação explícita do desenvolvedor.**
>
> Toda atualização na base de conhecimento passa obrigatoriamente por:
> 1. Sugestão formatada pelo Guardian.
> 2. Apresentação ao desenvolvedor.
> 3. Aprovação explícita.
> 4. Somente então, persistência no arquivo correspondente.
>
> Se o desenvolvedor rejeitar a sugestão, o Guardian descarta e segue em frente.

## Passos do Workflow

### Passo 1 — Registrar Correção

Quando o desenvolvedor corrigir o Guardian ou responder a um Gatilho de Dúvida:

1. **Capturar o contexto completo:**
   - O que o Guardian estava fazendo quando foi corrigido.
   - Qual era a expectativa do Guardian (o que ele achava que deveria fazer).
   - Qual foi a correção do desenvolvedor (o que realmente deveria ser feito).
   - Qual módulo e tela estavam envolvidos.
2. **Registrar internamente** a correção para processamento nos próximos passos.
3. **Confirmar entendimento:** "Entendi: {resumo da correção}. Vou sugerir o registro na base de conhecimento."

### Passo 2 — Categorizar a Correção

Classificar a correção em uma das categorias da base de conhecimento:

| Categoria | Arquivo Destino | Quando Usar |
|-----------|----------------|-------------|
| **Regra de negócio** | `knowledge/modules/{modulo}/rules.md` | Nova regra de negócio ou correção de regra existente (ex: "CPF é obrigatório", "campo X depende de campo Y") |
| **Fluxo validado** | `knowledge/modules/{modulo}/flows.md` | Novo fluxo passo-a-passo ou correção de fluxo existente (ex: "primeiro preencher CEP, depois esperar 2s") |
| **Seletor mapeado** | `knowledge/modules/{modulo}/selectors.md` | Novo seletor descoberto ou correção de seletor existente (ex: "o botão mudou de id") |
| **Lição aprendida (Pulo do Gato)** | `knowledge/modules/{modulo}/lessons.md` | Padrão não óbvio descoberto (ex: "botão Salvar demora 2s para aparecer após preencher CEP") |
| **Erro resolvido** | `knowledge/modules/{modulo}/errors.md` | Erro encontrado e como foi resolvido (ex: "toast não aparece se modal estiver aberto") |
| **Regra global** | `knowledge/core/rules.md` | Regra que se aplica a todos os módulos (ex: "sempre aguardar toast antes de prosseguir") |
| **Fluxo global** | `knowledge/core/flows.md` | Fluxo que se aplica a todos os módulos (ex: "navegação até módulo via menu") |
| **Seletor global** | `knowledge/core/selectors.md` | Seletor de componente comum (ex: "toast de sucesso", "botão de paginação") |

### Passo 3 — Formatar Sugestão

Formatar a sugestão de atualização seguindo o modelo de dados do arquivo destino:

**Para `rules.md`:**
```markdown
### {nome-da-regra}

- **Contexto**: {onde a regra se aplica}
- **Regra**: {descrição da regra de negócio}
- **Impacto no teste**: {como a regra afeta a automação}
- **Validado em**: {data}
```

**Para `flows.md`:**
```markdown
### {nome-do-fluxo}

- **Pré-condições**: {estado necessário}
- **Rota**: {rota de navegação}
- **Passos**:
  1. {Ação} — seletor: `{seletor}`
  2. {Ação} — seletor: `{seletor}`
- **Resultado esperado**: {o que deve acontecer}
- **Page Object**: {arquivo relacionado}
- **Spec**: {arquivo de spec}
- **Status**: ✅ validado | ⚠️ parcial | ❌ desatualizado
```

**Para `selectors.md`:**
```markdown
| Tela | Campo | Tipo | Seletor Primário | Seletor Alternativo | Status |
```

**Para `lessons.md` (Pulo do Gato):**
```markdown
### [{data}] {título descritivo}

- **Contexto**: {situação em que o padrão foi descoberto}
- **Padrão**: {o que foi aprendido}
- **Aplicação**: {como usar em testes futuros}
```

**Para `errors.md`:**
```markdown
### [{data}] {título do erro}

- **Descrição**: {o que aconteceu}
- **Seletor que falhou**: {seletor}
- **Abordagem alternativa**: {como foi resolvido}
- **Resultado**: resolvido | pendente | workaround
- **Screenshot**: {caminho do screenshot, se disponível}
```

### Passo 4 — Apresentar ao Desenvolvedor

1. Apresentar a sugestão formatada ao desenvolvedor:
   > "Com base na sua orientação, sugiro a seguinte atualização em `{arquivo}`:
   > {sugestão formatada}
   > Posso registrar essa atualização?"
2. Se houver múltiplas sugestões, apresentar todas de uma vez para revisão.
3. Indicar claramente qual arquivo será modificado e em qual seção.

### Passo 5 — Aguardar Aprovação

1. O desenvolvedor pode:
   - **Aprovar** — Prosseguir para persistência.
   - **Ajustar** — Modificar o texto da sugestão antes de persistir.
   - **Rejeitar** — Descartar a sugestão (o Guardian não insiste).
2. Se o desenvolvedor ajustar, aplicar as modificações e confirmar: "Atualizado conforme sua orientação."
3. Se o desenvolvedor rejeitar, confirmar: "Entendido, sugestão descartada."

### Passo 6 — Persistir

1. Somente após aprovação explícita, escrever a atualização no arquivo de knowledge correspondente.
2. Manter a formatação e estrutura existente do arquivo — nunca reorganizar ou reformatar conteúdo que já existe.
3. Adicionar a nova entrada na seção apropriada do arquivo.
4. Se for atualização de entrada existente, substituir apenas a entrada afetada.

### Passo 7 — Confirmar

1. Confirmar ao desenvolvedor que a atualização foi persistida:
   > "Registrado em `{arquivo}`. Na próxima execução, essa regra já estará disponível no contexto."
2. Se a atualização impactar testes existentes, informar:
   > "Atenção: essa mudança pode afetar os testes {lista de specs}. Deseja que eu os revise?"

## Registro de Pulo do Gato

Quando o Guardian descobrir um **padrão não óbvio** durante a execução, ele deve registrar como Pulo do Gato:

### O que é um Pulo do Gato?

Um Pulo do Gato é uma lição aprendida que não é óbvia pela documentação ou pelo código. Exemplos:
- "O botão Salvar demora 2 segundos para aparecer após o preenchimento do CEP."
- "O campo Especialidade só é habilitado depois de selecionar a Linha de Cuidado."
- "O toast de sucesso não aparece se houver um modal aberto por cima."
- "A tabela recarrega automaticamente após 5 segundos se o filtro estiver ativo."

### Quando Registrar

- Quando o Guardian descobrir um timing inesperado (elemento demora para aparecer/desaparecer).
- Quando houver dependência entre campos que não está documentada.
- Quando a ordem de preenchimento importar e não for óbvia.
- Quando um workaround for necessário para contornar comportamento do SPA.

### Como Registrar

1. Formatar como entrada de `lessons.md`:
   ```markdown
   ### [{data}] {título descritivo}

   - **Contexto**: {situação em que o padrão foi descoberto}
   - **Padrão**: {o que foi aprendido}
   - **Aplicação**: {como usar em testes futuros}
   ```
2. Apresentar ao desenvolvedor para aprovação.
3. Persistir somente após aprovação.

## Resumo de Sessão

Ao final de cada sessão de teste (quando o desenvolvedor indicar que terminou ou quando não houver mais tarefas pendentes), o Guardian deve:

1. **Compilar todas as sugestões** de atualização geradas durante a sessão (aprovadas e pendentes).
2. **Apresentar resumo consolidado** ao desenvolvedor:
   > "Resumo da sessão:
   > - **Atualizações aprovadas e persistidas:** {lista}
   > - **Sugestões pendentes (não aprovadas):** {lista}
   > - **Pulos do Gato descobertos:** {lista}
   > - **Erros encontrados:** {lista}
   > Deseja revisar alguma sugestão pendente antes de encerrar?"
3. **Aguardar decisão** do desenvolvedor sobre sugestões pendentes.
4. Se o desenvolvedor aprovar sugestões pendentes, persistir conforme Passos 6 e 7.
5. Se o desenvolvedor encerrar sem aprovar, descartar sugestões pendentes (elas podem ser re-sugeridas em sessões futuras se o mesmo padrão for encontrado).

## Notas

- O workflow de aprendizado é acionado automaticamente durante os workflows de exploração (`explore.md`) e teste (`test.md`) sempre que o desenvolvedor corrigir o Guardian ou responder a um Gatilho de Dúvida.
- A regra de nunca modificar knowledge sem aprovação é inviolável — mesmo que o Guardian tenha alta confiança na correção.
- Pulos do Gato são o tipo mais valioso de conhecimento — eles capturam padrões que nenhuma documentação formal registra.
- O resumo de sessão garante que nenhum aprendizado seja perdido ao final de uma sessão de trabalho.
- Sugestões rejeitadas não são re-apresentadas na mesma sessão, mas podem ser re-sugeridas em sessões futuras se o mesmo padrão for encontrado novamente.
