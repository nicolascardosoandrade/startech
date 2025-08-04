document.addEventListener('DOMContentLoaded', function() {
  const listaItensDevolvidos = document.getElementById('lista-itens-devolvidos');
  const feedbackDiv = document.getElementById('feedback');
  const userGreeting = document.querySelector('.user-greeting');
  const logoutLink = document.querySelector('.logout-link');

  // Função para mostrar feedback
  function showFeedback(message, isError = true) {
    feedbackDiv.textContent = message;
    feedbackDiv.className = `feedback ${isError ? 'error' : 'success'}`;
    setTimeout(() => {
      feedbackDiv.textContent = '';
      feedbackDiv.className = 'feedback';
    }, 5000);
  }

  // Função para verificar e atualizar o estado de autenticação
  async function verificarAutenticacao() {
    try {
      const response = await fetch('/api/check-master', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });
      if (!response.ok) {
        if (response.status === 401) {
          showFeedback('Acesso negado. Faça login como usuário master.', true);
          window.location.href = 'area_restrita.html';
          return false;
        }
        throw new Error(`Erro HTTP: ${response.status}`);
      }
      const data = await response.json();
      if (data.success && data.user && data.user.is_master) {
        userGreeting.textContent = `Olá, ${data.user.nome}`;
        userGreeting.style.display = 'inline';
        if (logoutLink) {
          logoutLink.style.display = 'inline';
        }
        return true;
      } else {
        showFeedback('Acesso negado. Apenas usuários master podem acessar esta página.', true);
        window.location.href = 'area_restrita.html';
        return false;
      }
    } catch (error) {
      console.error('Erro ao verificar acesso:', error);
      showFeedback('Erro ao verificar acesso. Verifique a conexão com o servidor.', true);
      window.location.href = 'area_restrita.html';
      return false;
    }
  }

  // Função para realizar logout
  async function logout(e) {
    e.preventDefault();
    if (confirm('Tem certeza que deseja sair?')) {
      try {
        const response = await fetch('/api/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          credentials: 'include'
        });
        if (!response.ok) {
          throw new Error(`Erro HTTP: ${response.status}`);
        }
        const data = await response.json();
        showFeedback(data.message, !data.success);
        if (data.success) {
          setTimeout(() => {
            window.location.href = 'index.html';
          }, 1000);
        }
      } catch (error) {
        showFeedback('Erro ao fazer logout. Tente novamente.', true);
        console.error('Erro ao fazer logout:', error);
      }
    }
  }

  // Função para exibir itens devolvidos
  function exibirItensDevolvidos(itens) {
    listaItensDevolvidos.innerHTML = '';
    if (!Array.isArray(itens) || itens.length === 0) {
      listaItensDevolvidos.innerHTML = '<p>Nenhum item devolvido encontrado.</p>';
      return;
    }

    itens.forEach(item => {
      const itemDiv = document.createElement('div');
      itemDiv.className = 'item-card';
      itemDiv.innerHTML = `
        <img src="${item.foto_path || '/img/placeholder.png'}" alt="${item.nome_item || 'Sem nome'}" onerror="this.src='/img/placeholder.png';">
        <div class="item-info">
          <p><strong>Nome do Item:</strong> ${item.nome_item || 'Sem nome'}</p>
          <p><strong>Descrição:</strong> ${item.descricao || 'Sem descrição'}</p>
          <p><strong>Categoria:</strong> ${item.categoria || 'Desconhecida'}</p>
          <p><strong>Local Encontrado:</strong> ${item.local_encontrado || 'Desconhecido'}</p>
          <p><strong>Data Encontrada:</strong> ${item.data_encontrada ? new Date(item.data_encontrada).toLocaleDateString('pt-BR') : 'Desconhecida'}</p>
          <p><strong>Data Devolvida:</strong> ${item.data_devolvida ? new Date(item.data_devolvida).toLocaleDateString('pt-BR') : 'Desconhecida'}</p>
          <p><strong>Reivindicado por:</strong> ${item.reivindicado_por || 'Desconhecido'}</p>
        </div>
      `;
      listaItensDevolvidos.appendChild(itemDiv);
    });
  }

  // Função para carregar itens devolvidos
  async function carregarItensDevolvidos() {
    try {
      const response = await fetch('/api/itens-devolvidos', {
        headers: { 'Accept': 'application/json' },
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }
      const data = await response.json();
      exibirItensDevolvidos(data);
    } catch (error) {
      showFeedback('Erro ao carregar itens devolvidos. Verifique a conexão com o servidor.', true);
      console.error('Erro ao buscar itens devolvidos:', error);
    }
  }

  // Adicionar evento de logout
  if (logoutLink) {
    logoutLink.addEventListener('click', logout);
  }

  // Inicialização
  verificarAutenticacao().then(isMaster => {
    if (isMaster) {
      carregarItensDevolvidos();
    }
  });
});