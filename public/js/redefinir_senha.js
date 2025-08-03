document.addEventListener('DOMContentLoaded', function() {
  // Verificar se os elementos existem
  const resetForm = document.getElementById('reset-form');
  const tokenInput = document.getElementById('token');
  const novaSenhaInput = document.getElementById('nova-senha');
  const confirmarSenhaInput = document.getElementById('confirmar-senha');
  const feedbackDiv = document.getElementById('feedback');
  const toggleNovaSenha = document.getElementById('toggle-nova-senha');
  const toggleConfirmarSenha = document.getElementById('toggle-confirmar-senha');

  if (!resetForm || !tokenInput || !novaSenhaInput || !confirmarSenhaInput || !feedbackDiv || !toggleNovaSenha || !toggleConfirmarSenha) {
    console.error('Erro: Um ou mais elementos HTML não foram encontrados.');
    return;
  }

  // Obter token da URL
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  if (!token) {
    showFeedback('Token inválido. Tente novamente.', true);
    return;
  }
  tokenInput.value = token;

  // Função para mostrar feedback
  function showFeedback(message, isError = true) {
    feedbackDiv.textContent = message;
    feedbackDiv.className = `feedback ${isError ? '' : 'success'}`;
    setTimeout(() => {
      if (isError) {
        feedbackDiv.textContent = '';
        feedbackDiv.className = 'feedback';
      }
    }, 5000);
  }

  // Validação de força da senha
  function isStrongPassword(password) {
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    return password.length >= 6 && hasLetter && hasNumber;
  }

  // Alternar visibilidade da senha
  toggleNovaSenha.addEventListener('click', function() {
    if (novaSenhaInput && toggleNovaSenha) {
      const isPassword = novaSenhaInput.type === 'password';
      novaSenhaInput.type = isPassword ? 'text' : 'password';
      toggleNovaSenha.textContent = isPassword ? '🙈' : '👁️';
    }
  });

  toggleConfirmarSenha.addEventListener('click', function() {
    if (confirmarSenhaInput && toggleConfirmarSenha) {
      const isPassword = confirmarSenhaInput.type === 'password';
      confirmarSenhaInput.type = isPassword ? 'text' : 'password';
      toggleConfirmarSenha.textContent = isPassword ? '🙈' : '👁️';
    }
  });

  // Validação e envio do formulário
  resetForm.addEventListener('submit', function(event) {
    event.preventDefault();
    const novaSenha = novaSenhaInput.value.trim();
    const confirmarSenha = confirmarSenhaInput.value.trim();

    if (!isStrongPassword(novaSenha)) {
      showFeedback('A senha deve ter pelo menos 6 caracteres, incluindo letras e números.', true);
      novaSenhaInput.focus();
      return;
    }

    if (novaSenha !== confirmarSenha) {
      showFeedback('As senhas não coincidem.', true);
      confirmarSenhaInput.focus();
      return;
    }

    fetch('/api/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, nova_senha: novaSenha })
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Erro na requisição: ${response.status} - ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        if (data.success) {
          showFeedback('Senha redefinida com sucesso! Redirecionando...', false);
          setTimeout(() => {
            window.location.href = '/login.html';
          }, 2000);
        } else {
          showFeedback(data.message || 'Erro ao redefinir senha.', true);
        }
      })
      .catch(error => {
        console.error('Erro no fetch:', error);
        showFeedback('Erro na conexão. Tente novamente.', true);
      });
  });
});