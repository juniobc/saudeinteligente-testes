// Dados de teste para a suíte E2E — Guardian
// Fixtures compartilhadas entre todos os specs
// Adicione novos exports conforme novos módulos forem testados

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

/** Rotas base do sistema utilizadas nos testes. */
export const routes = {
  login: '/login',
  menuSistemas: '/sistemas',
};
