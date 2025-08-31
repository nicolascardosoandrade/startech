document.addEventListener('DOMContentLoaded', function() {
  const registrarForm = document.getElementById('registrar-form');
  const nomeItemInput = document.getElementById('nome-item');
  const descricaoInput = document.getElementById('descricao');
  const categoriaSelect = document.getElementById('categoria'); // Novo campo
  const localSelect = document.getElementById('local');
  const dataInput = document.getElementById('data');
  const corInput = document.getElementById('cor');
  const marcaInput = document.getElementById('marca');
  const caracteristicaUnicaInput = document.getElementById('caracteristica-unica');
  const fotoInput = document.getElementById('foto');
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
          showFeedback('Você precisa estar autenticado para registrar um item.');
          setTimeout(() => {
            window.location.href = 'login.html';
          }, 500); // Reduzido de 2000ms para 500ms
          return false;
        }
      })
      .catch(error => {
        showFeedback('Erro ao verificar autenticação. Tente novamente.');
        console.error('Erro ao verificar autenticação:', error);
        setTimeout(() => {
          window.location.href = 'login.html';
        }, 500); // Reduzido de 2000ms para 500ms
        return false;
      });
  }

  // Configurar logout com confirmação
  if (logoutLink) {
    logoutLink.addEventListener('click', (e) => {
      e.preventDefault();
      if (confirm('Tem certeza que deseja sair?')) {
        fetch('/api/logout', {
          method: 'POST',
          credentials: 'include',
        })
          .then(response => response.json())
          .then(data => {
            if (data.success) {
              showFeedback('Logout realizado com sucesso!', false);
              authLink.style.display = 'block';
              logoutLink.style.display = 'none';
              setTimeout(() => {
                window.location.href = 'index.html';
              }, 500); // Reduzido de 1000ms para 500ms
            } else {
              showFeedback('Erro ao fazer logout. Tente novamente.');
            }
          })
          .catch(error => {
            console.error('Erro ao fazer logout:', error);
            showFeedback('Erro ao fazer logout. Tente novamente.');
          });
      }
    });
  }

  // Validação e envio do formulário
  registrarForm.addEventListener('submit', function(event) {
    event.preventDefault();
    const nomeItem = nomeItemInput.value.trim();
    const descricao = descricaoInput.value.trim();
    const categoria = categoriaSelect.value; // Novo campo
    const local = localSelect.value;
    const data = dataInput.value;
    const cor = corInput.value.trim();
    const marca = marcaInput.value.trim();
    const caracteristicaUnica = caracteristicaUnicaInput.value.trim();
    const foto = fotoInput.files[0];

    if (!nomeItem || nomeItem.length < 2) {
      showFeedback('O nome do item deve ter pelo menos 2 caracteres.');
      nomeItemInput.focus();
      return;
    }

    if (!descricao || descricao.length < 10) {
      showFeedback('A descrição deve ter pelo menos 10 caracteres.');
      descricaoInput.focus();
      return;
    }

    if (!categoria) {
      showFeedback('Selecione uma categoria.');
      categoriaSelect.focus();
      return;
    }

    if (!local) {
      showFeedback('Selecione o último local visto.');
      localSelect.focus();
      return;
    }

    if (!data) {
      showFeedback('Selecione a data aproximada de perda.');
      dataInput.focus();
      return;
    }

    // Preparar's dados para envio
    const formData = new FormData();
    formData.append('nome_item', nomeItem);
    formData.append('descricao', descricao);
    formData.append('categoria', categoria); // Novo campo
    formData.append('local', local);
    formData.append('data', data);
    if (cor) formData.append('cor', cor);
    if (marca) formData.append('marca', marca);
    if (caracteristicaUnica) formData.append('caracteristica_unica', caracteristicaUnica);
    if (foto) formData.append('foto', foto);

    // Enviar dados ao servidor
    showFeedback('Registrando item perdido...', false);
    fetch('/api/registrar-perdido', {
      method: 'POST',
      body: formData
    })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          showFeedback('Item perdido registrado com sucesso!', false);
          registrarForm.reset();
          setTimeout(() => {
            window.location.href = 'index.html';
          }, 3000); // Redireciona após 3 segundos (mantido)
        } else {
          showFeedback(data.message || 'Erro ao registrar item.');
        }
      })
      .catch(error => {
        showFeedback('Erro ao conectar com o servidor.');
        console.error('Erro:', error);
      });
  });

  // Inicialização: Verificar autenticação ao carregar a página
  verificarAutenticacao().then(isAuthenticated => {
    if (isAuthenticated) {
      nomeItemInput.focus(); // Foco no campo de nome se autenticado
    }
    // Se não autenticado, o redirecionamento já foi tratado na função verificarAutenticacao
  });

  // Suporte a navegação por teclado
  registrarForm.addEventListener('keydown', function(event) {
    if (event.key === 'Enter' && !registrarForm.contains(document.activeElement)) {
      nomeItemInput.focus();
    }
  });
});