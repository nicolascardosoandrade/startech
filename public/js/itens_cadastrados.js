document.addEventListener('DOMContentLoaded', function() {
  const listaItens = document.getElementById('lista-itens');
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
        // Exibir saudação com o nome do usuário
        userGreeting.textContent = `Olá, ${data.user.nome}`;
        userGreeting.style.display = 'inline';
        // Exibir o botão de logout
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
          }, 1000); // Redireciona após 1 segundo para exibir o feedback
        }
      } catch (error) {
        showFeedback('Erro ao fazer logout. Tente novamente.', true);
        console.error('Erro ao fazer logout:', error);
      }
    }
  }

  // Função para exibir itens
  function exibirItens(itens) {
    listaItens.innerHTML = '';
    if (!Array.isArray(itens) || itens.length === 0) {
      listaItens.innerHTML = '<p>Nenhum item cadastrado.</p>';
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
        </div>
        <button class="btn-remover" data-id="${item.id}">Remover</button>
      `;
      listaItens.appendChild(itemDiv);
    });

    // Adicionar evento aos botões de remover
    document.querySelectorAll('.btn-remover').forEach(button => {
      button.addEventListener('click', async function() {
        const itemId = this.getAttribute('data-id');
        showFeedback(`Removendo item ID ${itemId}...`, false);
        try {
          const response = await fetch(`/api/remover-item/${itemId}`, {
            method: 'DELETE',
            headers: { 
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'credentials': 'include'
            }
          });
          if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
          }
          const data = await response.json();
          showFeedback(data.message, !data.success);
          if (data.success) {
            carregarTodosItens();
          }
        } catch (error) {
          showFeedback('Erro ao remover item. Tente novamente.', true);
          console.error('Erro ao remover:', error);
        }
      });
    });
  }

  // Função para carregar todos os itens
  async function carregarTodosItens() {
    try {
      const response = await fetch('/api/itens-encontrados', {
        headers: { 'Accept': 'application/json' },
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }
      const data = await response.json();
      exibirItens(data);
    } catch (error) {
      showFeedback('Erro ao carregar itens. Verifique a conexão com o servidor.', true);
      console.error('Erro ao buscar itens:', error);
    }
  }

  // Adicionar evento de logout
  if (logoutLink) {
    logoutLink.addEventListener('click', logout);
  }

  // Inicialização
  verificarAutenticacao().then(isMaster => {
    if (isMaster) {
      carregarTodosItens();
    }
  });
});