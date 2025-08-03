document.addEventListener('DOMContentLoaded', function() {
  const loginPopup = document.getElementById('login-popup');
  const registerPopup = document.getElementById('register-popup');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const loginFeedback = document.getElementById('login-feedback');
  const registerFeedback = document.getElementById('register-feedback');
  const feedbackDiv = document.getElementById('feedback');
  const listaReivindicacoes = document.getElementById('lista-reivindicacoes');
  const showRegisterLink = document.getElementById('show-register');
  const showLoginLink = document.getElementById('show-login');
  const togglePasswordButtons = document.querySelectorAll('.toggle-password');
  const headerNav = document.querySelector('header nav ul');
  const loginLink = document.querySelector('header nav ul li a[href="login.html"]');

  function showFeedback(message, isError = true, target = feedbackDiv) {
    target.textContent = message;
    target.className = `feedback ${isError ? 'error' : 'success'}`;
    setTimeout(() => {
      target.textContent = '';
      target.className = 'feedback';
    }, 5000);
  }

  function formatarCategoria(categoria) {
    const categorias = { 'roupas': 'Roupas', 'eletronicos': 'Eletrônicos', 'documentos': 'Documentos', 'outros': 'Outros' };
    return categorias[categoria] || categoria;
  }

  function formatarLocal(local) {
    const locais = { 'biblioteca': 'Biblioteca', 'sala': 'Sala de Aula', 'refeitorio': 'Refeitório', 'outros': 'Outros' };
    return locais[local] || local;
  }

  // Toggle password visibility
  togglePasswordButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetId = button.getAttribute('data-target');
      const input = document.getElementById(targetId);
      const isPasswordVisible = input.type === 'text';
      input.type = isPasswordVisible ? 'password' : 'text';
      button.querySelector('.eye-icon').textContent = isPasswordVisible ? '👁️' : '👁️‍🗨️';
      button.setAttribute('aria-label', isPasswordVisible ? 'Mostrar senha' : 'Ocultar senha');
    });
  });

  // Toggle between login and register popups
  showRegisterLink.addEventListener('click', (e) => {
    e.preventDefault();
    loginPopup.style.display = 'none';
    registerPopup.style.display = 'flex';
  });

  showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    registerPopup.style.display = 'none';
    loginPopup.style.display = 'flex';
  });

  async function carregarReivindicacoes() {
    try {
      showFeedback('Carregando reivindicações...', false);
      const response = await fetch('/api/reivindicacoes', { 
        headers: { 'Accept': 'application/json' },
        credentials: 'include'
      });
      if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
      const reivindicacoes = await response.json();
      listaReivindicacoes.innerHTML = '';
      if (reivindicacoes.length === 0) {
        listaReivindicacoes.innerHTML = '<tr><td colspan="8">Nenhuma reivindicação pendente.</td></tr>';
        showFeedback('Nenhuma reivindicação pendente no momento.', false);
        return;
      }
      reivindicacoes.forEach(r => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${r.nome_item}</td>
          <td>${r.descricao}</td>
          <td>${formatarCategoria(r.categoria)}</td>
          <td>${formatarLocal(r.local_encontrado)}</td>
          <td>${new Date(r.data_encontrada).toLocaleDateString('pt-BR')}</td>
          <td>${r.nome} (${r.registro})</td>
          <td>${r.descricao_reivindicacao || 'Nenhuma descrição'}</td>
          <td>
            <button class="btn-aprovar" data-id="${r.id}">Aprovar</button>
            <button class="btn-rejeitar" data-id="${r.id}">Rejeitar</button>
          </td>
        `;
        listaReivindicacoes.appendChild(row);
      });
      document.querySelectorAll('.btn-aprovar, .btn-rejeitar').forEach(button => {
        button.addEventListener('click', async () => {
          const reivindicacaoId = button.getAttribute('data-id');
          const acao = button.classList.contains('btn-aprovar') ? 'aprovar' : 'rejeitar';
          if (!confirm(`Tem certeza que deseja ${acao} esta reivindicação?`)) return;
          try {
            const response = await fetch(`/api/admin/reivindicacao/${reivindicacaoId}`, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json', 
                'Accept': 'application/json',
                'credentials': 'include'
              },
              body: JSON.stringify({ acao })
            });
            const result = await response.json();
            if (result.success) {
              showFeedback(`Reivindicação ${acao} com sucesso!`, false);
              carregarReivindicacoes();
            } else {
              showFeedback(result.message || `Erro ao ${acao} reivindicação.`, true);
            }
          } catch (error) {
            console.error(`Erro ao ${acao} reivindicação:`, error);
            showFeedback(`Erro ao ${acao} reivindicação. Tente novamente.`, true);
          }
        });
      });
      showFeedback('Reivindicações carregadas com sucesso!', false);
    } catch (error) {
      console.error('Erro ao carregar reivindicações:', error);
      showFeedback('Erro ao carregar reivindicações. Verifique a conexão com o servidor.', true);
    }
  }

  async function verificarAcesso() {
    try {
      console.log('Verificando acesso em /api/check-master...');
      const response = await fetch('/api/check-master', { 
        headers: { 'Accept': 'application/json' },
        credentials: 'include'
      });
      console.log('Resposta de /api/check-master:', response.status, response.statusText);
      if (!response.ok) {
        if (response.status === 401) {
          loginPopup.style.display = 'flex';
          registerPopup.style.display = 'none';
          return;
        }
        throw new Error(`Erro HTTP: ${response.status}`);
      }
      const data = await response.json();
      console.log('Dados de /api/check-master:', data);
      if (data.success) {
        loginPopup.style.display = 'none';
        registerPopup.style.display = 'none';
        // Usuário master logado: remove o botão de login e adiciona o botão de sair
        if (loginLink && data.user && data.user.is_master) {
          loginLink.style.display = 'none';
          const logoutItem = document.createElement('li');
          const logoutLink = document.createElement('a');
          logoutLink.href = '#';
          logoutLink.textContent = 'Sair';
          logoutLink.className = 'logout-link';
          logoutItem.appendChild(logoutLink);
          headerNav.appendChild(logoutItem);

          logoutLink.addEventListener('click', async (e) => {
            e.preventDefault();
            if (confirm('Tem certeza que deseja sair?')) {
              try {
                const logoutResponse = await fetch('/api/logout', {
                  method: 'POST',
                  headers: { 
                    'Content-Type': 'application/json', 
                    'Accept': 'application/json',
                    'credentials': 'include'
                  }
                });
                const logoutData = await logoutResponse.json();
                if (logoutData.success) {
                  showFeedback('Logout realizado com sucesso!', false);
                  window.location.href = 'index.html';
                } else {
                  showFeedback('Erro ao fazer logout. Tente novamente.', true);
                }
              } catch (error) {
                console.error('Erro ao fazer logout:', error);
                showFeedback('Erro ao fazer logout. Tente novamente.', true);
              }
            }
          });
        }
        carregarReivindicacoes();
      } else {
        loginPopup.style.display = 'flex';
        registerPopup.style.display = 'none';
      }
    } catch (error) {
      console.error('Erro ao verificar acesso:', error);
      loginPopup.style.display = 'flex';
      registerPopup.style.display = 'none';
      showFeedback('Erro ao verificar acesso. Verifique a conexão com o servidor.', true, loginFeedback);
    }
  }

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const registro = document.getElementById('registro-login').value.trim();
    const senha = document.getElementById('senha-login').value;

    if (!registro) {
      showFeedback('O campo Registro Acadêmico é obrigatório.', true, loginFeedback);
      return;
    }
    if (!/^\d{6,10}$/.test(registro)) {
      showFeedback('O registro acadêmico deve ter entre 6 e 10 dígitos.', true, loginFeedback);
      return;
    }
    if (!senha) {
      showFeedback('O campo Senha é obrigatório.', true, loginFeedback);
      return;
    }
    if (senha.length < 6) {
      showFeedback('A senha deve ter pelo menos 6 caracteres.', true, loginFeedback);
      return;
    }

    console.log(`Tentativa de login com registro: ${registro}`);

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Accept': 'application/json',
          'credentials': 'include'
        },
        body: JSON.stringify({ registro, senha })
      });
      console.log('Resposta de /api/login:', response.status, response.statusText);
      const data = await response.json();
      console.log('Dados de /api/login:', data);
      if (data.success) {
        if (data.redirect === '/area_restrita.html') {
          loginPopup.style.display = 'none';
          showFeedback('Login bem-sucedido! Carregando reivindicações...', false, loginFeedback);
          verificarAcesso(); // Recarrega a verificação após login
        } else {
          showFeedback('Acesso negado. Apenas usuários master podem acessar esta área.', true, loginFeedback);
        }
      } else {
        showFeedback(data.message || 'Erro ao fazer login. Verifique suas credenciais.', true, loginFeedback);
      }
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      showFeedback('Erro ao fazer login. Verifique a conexão com o servidor.', true, loginFeedback);
    }
  });

  registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const nome = document.getElementById('nome').value.trim();
    const sobrenome = document.getElementById('sobrenome').value.trim();
    const email = document.getElementById('email').value.trim();
    const registro = document.getElementById('registro-register').value.trim();
    const senha = document.getElementById('senha-register').value;
    const confirmar_senha = document.getElementById('confirmar-senha').value;

    // Client-side validations
    if (!nome || nome.length < 2) {
      showFeedback('O nome deve ter pelo menos 2 caracteres.', true, registerFeedback);
      return;
    }
    if (!sobrenome || sobrenome.length < 2) {
      showFeedback('O sobrenome deve ter pelo menos 2 caracteres.', true, registerFeedback);
      return;
    }
    if (!email || !/^[a-zA-Z0-9._%+-]+@senaimgaluno\.com\.br$/.test(email)) {
      showFeedback('E-mail institucional inválido. Use o domínio @senaimgaluno.com.br.', true, registerFeedback);
      return;
    }
    if (!registro || !/^\d{6,10}$/.test(registro)) {
      showFeedback('O registro acadêmico deve ter entre 6 e 10 dígitos.', true, registerFeedback);
      return;
    }
    if (!senha || senha.length < 6) {
      showFeedback('A senha deve ter pelo menos 6 caracteres.', true, registerFeedback);
      return;
    }
    if (senha !== confirmar_senha) {
      showFeedback('As senhas não coincidem.', true, registerFeedback);
      return;
    }

    console.log(`Tentativa de cadastro com registro: ${registro}`);

    try {
      const response = await fetch('/api/registrar-master', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Accept': 'application/json',
          'credentials': 'include'
        },
        body: JSON.stringify({ nome, sobrenome, email, registro, senha, confirmar_senha })
      });
      const data = await response.json();
      if (data.success) {
        showFeedback('Usuário master cadastrado com sucesso! Faça login.', false, registerFeedback);
        registerForm.reset();
        registerPopup.style.display = 'none';
        loginPopup.style.display = 'flex';
      } else {
        showFeedback(data.message || 'Erro ao cadastrar usuário master.', true, registerFeedback);
      }
    } catch (error) {
      console.error('Erro ao cadastrar usuário master:', error);
      showFeedback('Erro ao cadastrar usuário master. Verifique a conexão com o servidor.', true, registerFeedback);
    }
  });

  verificarAcesso();
});