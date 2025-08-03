document.addEventListener('DOMContentLoaded', function() {
  const buscaForm = document.getElementById('busca-form');
  const listaResultados = document.getElementById('lista-resultados');
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
      credentials: 'include', // Para enviar cookies/sessão
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

  // Função para formatar a categoria
  function formatarCategoria(categoria) {
    const categorias = {
      'todas': 'Todas',
      'roupas': 'Roupas',
      'eletronicos': 'Eletrônicos',
      'documentos': 'Documentos',
      'outros': 'Outros'
    };
    return categorias[categoria] || categoria;
  }

  // Função para formatar o local
  function formatarLocal(local) {
    const locais = {
      'biblioteca': 'Biblioteca',
      'sala': 'Sala de Aula',
      'refeitorio': 'Refeitório',
      'outros': 'Outros'
    };
    return locais[local] || local;
  }

  // Função para buscar e exibir itens
  async function carregarItens(termo = '', categoria = '', local = '', data = '') {
    try {
      showFeedback('Carregando itens...', false);
      const queryParams = new URLSearchParams();
      if (termo) queryParams.append('termo', termo);
      if (categoria) queryParams.append('categoria', categoria);
      if (local) queryParams.append('local', local);
      if (data) queryParams.append('data', data);

      const response = await fetch(`/api/buscar?${queryParams.toString()}`);
      if (!response.ok) {
        throw new Error('Erro na resposta do servidor');
      }
      const itens = await response.json();

      listaResultados.innerHTML = '';
      if (itens.length === 0) {
        listaResultados.innerHTML = '<p>Nenhum item encontrado.</p>';
        showFeedback('Nenhum item corresponde aos filtros selecionados.', false);
        return;
      }

      itens.forEach(item => {
        const itemCard = document.createElement('div');
        itemCard.className = 'resultado-item';
        itemCard.innerHTML = `
          <div class="item-container">
            ${item.foto_path ? `<img src="${item.foto_path}" alt="${item.nome_item}" class="item-foto">` : ''}
            <div class="item-detalhes">
              <p><strong>Item:</strong> ${item.nome_item}</p>
              <p><strong>Descrição:</strong> ${item.descricao}</p>
              <p><strong>Categoria:</strong> ${formatarCategoria(item.categoria)}</p>
              <p><strong>Local:</strong> ${formatarLocal(item.local_encontrado)}</p>
              <p><strong>Data:</strong> ${new Date(item.data_encontrada).toLocaleDateString('pt-BR')}</p>
              <button class="btn-reivindicar" data-id="${item.id}">Reivindicar Item</button>
            </div>
          </div>
        `;
        listaResultados.appendChild(itemCard);
      });

      // Adicionar eventos aos botões de reivindicação
      document.querySelectorAll('.btn-reivindicar').forEach(button => {
        button.addEventListener('click', async () => {
          const itemId = button.getAttribute('data-id');
          const descricao = prompt('Por favor, forneça uma descrição para justificar sua reivindicação:');
          if (descricao === null) return; // Usuário cancelou

          try {
            const authResponse = await fetch('/api/check-auth');
            const authData = await authResponse.json();
            if (!authData.success) {
              showFeedback('Você precisa estar logado para reivindicar um item.', true);
              setTimeout(() => {
                window.location.href = 'login.html';
              }, 500);
              return;
            }

            const response = await fetch(`/api/reivindicar/${itemId}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ descricao_reivindicacao: descricao })
            });
            const result = await response.json();
            if (result.success) {
              showFeedback('Item reivindicado com sucesso! Aguarde aprovação.', false);
              button.disabled = true;
              button.textContent = 'Reivindicação Pendente';
              carregarItens(termo, categoria, local, data); // Recarregar a lista
            } else {
              showFeedback(result.message || 'Erro ao reivindicar item.', true);
            }
          } catch (error) {
            console.error('Erro ao reivindicar item:', error);
            showFeedback('Erro ao reivindicar item. Tente novamente.', true);
          }
        });
      });

      showFeedback('Itens carregados com sucesso!', false);
    } catch (error) {
      console.error('Erro ao carregar itens:', error);
      showFeedback('Erro ao carregar itens. Tente novamente.', true);
    }
  }

  // Evento de submissão do formulário de busca
  buscaForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const termo = document.getElementById('termo').value.trim();
    const categoria = document.getElementById('categoria').value;
    const local = document.getElementById('local').value;
    const data = document.getElementById('data').value;

    await carregarItens(termo, categoria, local, data);
  });

  // Inicialização: Verificar autenticação e carregar itens apenas se autenticado
  verificarAutenticacao().then(isAuthenticated => {
    if (isAuthenticated) {
      carregarItens(); // Carregar itens apenas se o usuário estiver autenticado
    }
    // Se não autenticado, o redirecionamento já foi tratado na função verificarAutenticacao
  });
});