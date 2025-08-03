document.addEventListener('DOMContentLoaded', function() {
  // Verificar se os elementos existem
  const resetForm = document.getElementById('reset-form');
  const tokenInput = document.getElementById('token');
  const novaSenhaInput = document.getElementById('nova-senha');
  const confirmarSenhaInput = document.getElementById('confirmar-senha');
  const feedbackDiv = document.getElementById('feedback');

  if (!resetForm || !tokenInput || !novaSenhaInput || !confirmarSenhaInput || !feedbackDiv) {
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

  // Lógica para alternar visibilidade da senha
  document.querySelectorAll('.toggle-password').forEach(button => {
    button.addEventListener('click', function() {
      const targetId = this.getAttribute('data-target');
      const input = document.getElementById(targetId);
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      this.classList.toggle('visible');
    });
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