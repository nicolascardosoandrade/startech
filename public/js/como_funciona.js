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

  // Adicionar interatividade aos passos (efeito de destaque ao clicar)
  const steps = document.querySelectorAll('.step');
  steps.forEach(step => {
    step.addEventListener('click', function() {
      steps.forEach(s => s.classList.remove('active'));
      this.classList.add('active');
    });
  });

  // Adicionar navegação aos links legais
  const legalLinks = document.querySelectorAll('.links-legais ul li a');
  legalLinks.forEach(link => {
    link.addEventListener('click', function(event) {
      event.preventDefault();
      const page = this.textContent.trim();
      let targetUrl;

      // Definir URLs reais para cada link
      switch(page) {
        case 'Termos de Uso':
          targetUrl = '/termos_de_uso.html';
          break;
        case 'Política de Privacidade':
          targetUrl = '/politica_de_privacidade.html';
          break;
        case 'LGPD':
          targetUrl = '/lgpd.html';
          break;
        default:
          targetUrl = this.getAttribute('href');
      }

      // Redirecionar para a página correspondente
      window.location.href = targetUrl;
    });
  });

  // Inicialização: Verificar autenticação ao carregar a página
  verificarAutenticacao().then(isAuthenticated => {
    if (isAuthenticated) {
      // Acessibilidade: Foco na seção principal se autenticado
      document.querySelector('.como-funciona h1').setAttribute('tabindex', '0');
      document.querySelector('.como-funciona h1').focus();
    }
    // Se não autenticado, o redirecionamento já foi tratado na função verificarAutenticacao
  });
});