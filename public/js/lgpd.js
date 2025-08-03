document.addEventListener('DOMContentLoaded', function() {
  const feedbackDiv = document.getElementById('feedback');
  const authLink = document.querySelector('.auth-link');
  const logoutLink = document.querySelector('.logout-link');

  // Função para mostrar feedback
  function showFeedback(message, isError = true) {
    feedbackDiv.textContent = message;
    feedbackDiv.className = `feedback ${isError ? '' : 'success'}`;
    setTimeout(() => {
      feedbackDiv.textContent = '';
      feedbackDiv.className = 'feedback';
    }, 5000);
  }

  // Verificar autenticação
  function verificarAutenticacao() {
    return fetch('/api/check-auth', {
      method: 'GET',
      credentials: 'include',
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Erro ao verificar autenticação.');
        }
        return response.json();
      })
      .then(data => {
        if (data.success) {
          // Usuário autenticado: ocultar Login, exibir Sair
          authLink.style.display = 'none';
          logoutLink.style.display = 'block';
          return true;
        } else {
          // Usuário não autenticado: redirecionar para login
          showFeedback('Você precisa estar logado para acessar esta página.');
          setTimeout(() => {
            window.location.href = 'login.html';
          }, 500);
          return false;
        }
      })
      .catch(error => {
        showFeedback('Erro ao verificar autenticação. Tente novamente.');
        console.error('Erro ao verificar autenticação:', error);
        setTimeout(() => {
          window.location.href = 'login.html';
        }, 500);
        return false;
      });
  }

  // Configurar logout
  if (logoutLink) {
    logoutLink.addEventListener('click', (e) => {
      e.preventDefault();
      fetch('/api/logout', {
        method: 'POST',
        credentials: 'include',
      })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            alert('Logout realizado com sucesso!');
            authLink.style.display = 'block';
            logoutLink.style.display = 'none';
            window.location.href = 'index.html';
          } else {
            showFeedback('Erro ao fazer logout. Tente novamente.');
          }
        })
        .catch(error => {
          console.error('Erro ao fazer logout:', error);
          showFeedback('Erro ao fazer logout. Tente novamente.');
        });
    });
  }

  // Atualizar data de forma dinâmica
  const dataAtualizacao = document.getElementById('data-atualizacao');
  if (dataAtualizacao) {
    const hoje = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    dataAtualizacao.textContent = hoje;
  } else {
    console.warn('Elemento #data-atualizacao não encontrado.');
  }

  // Função para alternar seções com debounce
  function toggleSection(secao) {
    let lastToggle = 0;
    const debounceDelay = 300;
    return function() {
      const now = Date.now();
      if (now - lastToggle < debounceDelay) return;
      lastToggle = now;
      secao.classList.toggle('active');
      saveState(secao);
    };
  }

  // Salvar estado no localStorage
  function saveState(secao) {
    const secaoId = secao.getAttribute('data-secao');
    if (secaoId) {
      localStorage.setItem(`lgpd-secao-${secaoId}`, secao.classList.contains('active'));
    }
  }

  // Carregar estado do localStorage
  function loadState(secoes) {
    secoes.forEach(secao => {
      const secaoId = secao.getAttribute('data-secao');
      if (secaoId) {
        const isActive = localStorage.getItem(`lgpd-secao-${secaoId}`) === 'true';
        if (isActive) secao.classList.add('active');
      }
    });
  }

  // Tornar seções colapsáveis
  const secoes = document.querySelectorAll('.lgpd-secao');
  if (secoes.length > 0) {
    loadState(secoes); // Carrega o estado ao iniciar
    secoes.forEach(secao => {
      const cabecalho = secao.querySelector('h2');
      const conteudo = secao.querySelector('.collapsible-content');
      if (cabecalho && conteudo) {
        cabecalho.setAttribute('tabindex', '0');
        cabecalho.setAttribute('role', 'button');
        cabecalho.addEventListener('click', toggleSection(secao));
        cabecalho.addEventListener('keydown', function(e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleSection(secao)();
          }
        });
        cabecalho.addEventListener('focus', function() {
          this.style.outline = '2px solid #003087';
        });
        cabecalho.addEventListener('blur', function() {
          this.style.outline = 'none';
        });
      } else {
        console.warn('Elementos h2 ou .collapsible-content ausentes na seção:', secao);
      }
    });
  } else {
    console.warn('Nenhuma seção .lgpd-secao encontrada.');
  }

  // Inicialização: Verificar autenticação ao carregar a página
  verificarAutenticacao().then(isAuthenticated => {
    if (isAuthenticated) {
      // Acessibilidade: Foco na seção principal se autenticado
      document.querySelector('.hero h1').setAttribute('tabindex', '0');
      document.querySelector('.hero h1').focus();
    }
    // Se não autenticado, o redirecionamento já foi tratado na função verificarAutenticacao
  });
});