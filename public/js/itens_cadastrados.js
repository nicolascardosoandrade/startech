document.addEventListener('DOMContentLoaded', function() {
  const listaItens = document.getElementById('lista-itens');
  const feedbackDiv = document.getElementById('feedback');
  const authButton = document.getElementById('auth-button');

  // Função para mostrar feedback
  function showFeedback(message, isError = true) {
    feedbackDiv.textContent = message;
    feedbackDiv.className = `feedback ${isError ? '' : 'success'}`;
    setTimeout(() => {
      feedbackDiv.textContent = '';
      feedbackDiv.className = 'feedback';
    }, 5000);
  }

  // Função para verificar e atualizar o estado de autenticação
  function verificarAutenticacao() {
    return fetch('/api/check-auth', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Erro ao verificar autenticação.');
        }
        return response.json();
      })
      .then(data => {
        if (!data.success) {
          showFeedback('Acesso negado. Faça login como usuário master.');
          window.location.href = 'login.html';
          return false;
        }
        // Atualiza o botão de autenticação
        if (data.user.is_master) {
          authButton.innerHTML = '<a href="#" id="logout-button">Sair</a>';
          document.getElementById('logout-button').addEventListener('click', function(e) {
            e.preventDefault();
            logout();
          });
        }
        return true;
      })
      .catch(error => {
        showFeedback('Erro ao verificar acesso. Tente novamente.');
        console.error('Erro ao verificar master:', error);
        window.location.href = 'login.html';
        return false;
      });
  }

  // Função para realizar logout
  function logout() {
    if (confirm('Tem certeza que deseja sair?')) {
      fetch('/api/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
        .then(response => {
          if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
          }
          return response.json();
        })
        .then(data => {
          showFeedback(data.message, !data.success);
          if (data.success) {
            window.location.href = 'index.html'; // Redireciona para index.html após logout
          }
        })
        .catch(error => {
          showFeedback('Erro ao fazer logout.');
          console.error('Erro ao logout:', error);
        });
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
      button.addEventListener('click', function() {
        const itemId = this.getAttribute('data-id');
        showFeedback(`Removendo item ID ${itemId}...`, false);
        fetch(`/api/remover-item/${itemId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
        })
          .then(response => {
            if (!response.ok) {
              throw new Error(`Erro HTTP: ${response.status}`);
            }
            return response.json();
          })
          .then(data => {
            showFeedback(data.message, !data.success);
            if (data.success) {
              carregarTodosItens(); // Recarregar a lista após remoção
            }
          })
          .catch(error => {
            showFeedback('Erro ao remover item.');
            console.error('Erro ao remover:', error);
          });
      });
    });
  }

  // Função para carregar todos os itens
  function carregarTodosItens() {
    fetch('/api/itens-encontrados')
      .then(response => {
        if (!response.ok) {
          throw new Error(`Erro HTTP: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        exibirItens(data);
      })
      .catch(error => {
        showFeedback('Erro ao carregar itens. Verifique a conexão com o servidor.');
        console.error('Erro ao buscar itens:', error);
      });
  }

  // Inicialização
  verificarAutenticacao().then(isMaster => {
    if (isMaster) {
      carregarTodosItens();
    }
  });
});