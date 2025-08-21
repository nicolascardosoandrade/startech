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

  // Verificar se o usuário está autenticado para exibir link de logout
  fetch('/api/check-auth', {
    method: 'GET',
    credentials: 'include',
  })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        authLink.style.display = 'none';
        logoutLink.style.display = 'block';
      }
    })
    .catch(error => {
      console.error('Erro ao verificar autenticação:', error);
    });

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
      localStorage.setItem(`about-secao-${secaoId}`, secao.classList.contains('active'));
    }
  }

  // Tornar seções colapsáveis
  const secoes = document.querySelectorAll('.about-secao');
  if (secoes.length > 0) {
    // Garante que todas as seções iniciem colapsadas
    secoes.forEach(secao => {
      const secaoId = secao.getAttribute('data-secao');
      if (secaoId) {
        localStorage.removeItem(`about-secao-${secaoId}`); // Limpa o estado salvo
        secao.classList.remove('active'); // Remove a classe active
      }
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
    console.warn('Nenhuma seção .about-secao encontrada.');
  }

  // Adicionar funcionalidade ao botão WhatsApp
  const whatsappBtn = document.querySelector('.whatsapp-btn');
  if (whatsappBtn) {
    whatsappBtn.addEventListener('click', function() {
      const phoneNumber = '5531992651046'; // Número com código do país
      const message = encodeURIComponent('Olá, preciso de suporte com achados e perdidos!');
      const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
      window.open(whatsappUrl, '_blank');
    });
  } else {
    console.warn('Botão WhatsApp não encontrado.');
  }

  // Acessibilidade: Foco na seção principal
  document.querySelector('.hero h1').setAttribute('tabindex', '0');
  document.querySelector('.hero h1').focus();
});