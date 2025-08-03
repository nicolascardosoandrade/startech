document.addEventListener('DOMContentLoaded', function() {
  const recoverForm = document.getElementById('recover-form');
  const recoverRegistroInput = document.getElementById('recover-registro');
  const recoverFeedbackDiv = document.getElementById('recover-feedback');

  // Função para mostrar feedback
  function showFeedback(message, isError = true) {
    recoverFeedbackDiv.textContent = message;
    recoverFeedbackDiv.className = `feedback ${isError ? '' : 'success'}`;
    setTimeout(() => {
      if (isError) {
        recoverFeedbackDiv.textContent = '';
        recoverFeedbackDiv.className = 'feedback';
      }
    }, 5000);
  }

  // Validação e envio do formulário
  recoverForm.addEventListener('submit', function(event) {
    event.preventDefault();
    const registro = recoverRegistroInput.value.trim();

    if (!registro || !/^\d{6,10}$/.test(registro)) {
      showFeedback('Por favor, digite um registro acadêmico válido (6 a 10 dígitos).', true);
      recoverRegistroInput.focus();
      return;
    }

    showFeedback('Enviando solicitação de redefinição...', false);
    fetch('/api/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registro })
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Erro na requisição: ${response.status} - ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        showFeedback(data.message, !data.success);
        if (data.success) {
          setTimeout(() => {
            window.location.href = 'login.html';
          }, 3000);
        }
      })
      .catch(error => {
        console.error('Erro na redefinição:', error);
        showFeedback('Erro ao processar solicitação. Tente novamente.', true);
      });
  });

  // Acessibilidade: Foco no campo de registro ao carregar
  recoverRegistroInput.focus();

  // Suporte a navegação por teclado
  recoverForm.addEventListener('keydown', function(event) {
    if (event.key === 'Enter' && !recoverForm.contains(document.activeElement)) {
      recoverRegistroInput.focus();
    }
  });
});