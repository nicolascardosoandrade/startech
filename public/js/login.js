document.addEventListener('DOMContentLoaded', function() {
  const loginForm = document.getElementById('login-form');
  const registroInput = document.getElementById('registro');
  const senhaInput = document.getElementById('senha');
  const feedbackDiv = document.getElementById('feedback');
  const togglePassword = document.getElementById('toggle-password');

  // Função para mostrar feedback
  function showFeedback(message, isError = true) {
    feedbackDiv.textContent = message;
    feedbackDiv.className = `feedback ${isError ? '' : 'success'}`;
    setTimeout(() => {
      feedbackDiv.textContent = '';
      feedbackDiv.className = 'feedback';
    }, 5000);
  }

  // Alternar visibilidade da senha
  togglePassword.addEventListener('click', function() {
    const type = senhaInput.type === 'password' ? 'text' : 'password';
    senhaInput.type = type;
    this.textContent = type === 'password' ? '👁️' : '🙈';
  });

  // Validação e envio do formulário
  loginForm.addEventListener('submit', function(event) {
    event.preventDefault();
    const registro = registroInput.value.trim();
    const senha = senhaInput.value.trim();

    if (!registro || !/^\d{6,10}$/.test(registro)) {
      showFeedback('Por favor, digite um registro acadêmico válido (6 a 10 dígitos).');
      registroInput.focus();
      return;
    }

    if (!senha || senha.length < 6) {
      showFeedback('A senha deve ter pelo menos 6 caracteres.');
      senhaInput.focus();
      return;
    }

    showFeedback('Autenticando...', false);
    fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registro, senha })
    })
      .then(response => {
        if (!response.ok) {
          return response.json().then(data => {
            throw new Error(data.message || `Erro na autenticação: ${response.status}`);
          });
        }
        return response.json();
      })
      .then(data => {
        showFeedback(data.message, !data.success);
        if (data.success && data.redirect) {
          setTimeout(() => {
            registroInput.value = '';
            senhaInput.value = '';
            window.location.href = data.redirect;
          }, 2000);
        }
      })
      .catch(error => {
        console.error('Erro na autenticação:', error);
        showFeedback(error.message || 'Erro ao autenticar. Tente novamente.');
      });
  });

  // Acessibilidade: Foco no campo de registro ao carregar
  registroInput.focus();

  // Suporte a navegação por teclado
  loginForm.addEventListener('keydown', function(event) {
    if (event.key === 'Enter' && !loginForm.contains(document.activeElement)) {
      registroInput.focus();
    }
  });
});