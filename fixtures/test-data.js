// Dados de teste para a suíte E2E do módulo OCI
// Saúde Inteligente — Fixtures compartilhadas entre todos os specs

/**
 * Credenciais de autenticação para testes.
 * Usa getters para ler process.env no momento do acesso (após dotenv carregar).
 */
export const credentials = {
  get valid() {
    return {
      username: process.env.E2E_USERNAME || 'usuario_teste',
      password: process.env.E2E_PASSWORD || 'senha_teste',
    };
  },
  invalid: {
    username: 'usuario_inexistente',
    password: 'senha_errada',
  },
};

/**
 * Dados de um paciente novo para cadastro durante o fluxo OCI.
 * CPF e CEP são valores válidos para evitar erros de validação.
 */
export const pacienteNovo = {
  nome: 'PACIENTE TESTE E2E',
  dataNascimento: '01/01/1990',
  sexo: 'Masculino',
  cpf: '529.982.247-25',       // CPF válido para teste
  nomeMae: 'MAE TESTE E2E',
  cep: '68900-073',            // CEP válido de Macapá/AP
};

/**
 * Dados para criação de uma nova solicitação OCI.
 * linhaCuidado e cid são preenchidos dinamicamente durante o teste.
 */
export const solicitacaoOCI = {
  especialidade: 'Cardiologia',
  linhaCuidado: null,          // Preenchido dinamicamente conforme especialidade
  cid: null,                   // Preenchido dinamicamente conforme linha de cuidado
  prioridade: 'B',             // Prioridade SWALIS
  justificativa: 'Justificativa de teste E2E - solicitação automática',
};

/** Dados para cancelamento de solicitação OCI. */
export const cancelamento = {
  justificativa: 'Cancelamento de teste E2E - motivo automático',
};

/** Rotas principais do sistema utilizadas nos testes. */
export const routes = {
  login: '/login',
  menuSistemas: '/sistemas',
  cadOCI: '/oci/dashboard/cad_oci',
  cadPaciente: '/oci/dashboard/cad_paciente',
};
