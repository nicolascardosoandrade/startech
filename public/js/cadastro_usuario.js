document.addEventListener('DOMContentLoaded', function() {
  const cadastroForm = document.getElementById('cadastro-form');
  const nomeInput = document.getElementById('nome');
  const sobrenomeInput = document.getElementById('sobrenome');
  const emailInput = document.getElementById('email');
  const registroInput = document.getElementById('registro');
  const senhaInput = document.getElementById('senha');
  const confirmarSenhaInput = document.getElementById('confirmar-senha');
  const termosInput = document.getElementById('termos');
  const feedbackDiv = document.getElementById('feedback');
  const toggleSenha = document.getElementById('toggle-senha');
  const toggleConfirmarSenha = document.getElementById('toggle-confirmar-senha');

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

  // Alternar visibilidade da senha
  toggleSenha.addEventListener('click', function() {
    const type = senhaInput.type === 'password' ? 'text' : 'password';
    senhaInput.type = type;
    this.textContent = type === 'password' ? '👁️' : '🙈';
  });

  toggleConfirmarSenha.addEventListener('click', function() {
    const type = confirmarSenhaInput.type === 'password' ? 'text' : 'password';
    confirmarSenhaInput.type = type;
    this.textContent = type === 'password' ? '👁️' : '🙈';
  });

  // Validação do formulário
  cadastroForm.addEventListener('submit', function(event) {
    event.preventDefault();
    const nome = nomeInput.value.trim();
    const sobrenome = sobrenomeInput.value.trim();
    const email = emailInput.value.trim();
    const registro = registroInput.value.trim();
    const senha = senhaInput.value.trim();
    const confirmarSenha = confirmarSenhaInput.value.trim();
    const termos = termosInput.checked ? 'on' : undefined;

    // Validações
    if (!nome || nome.length < 2) {
      showFeedback('O nome deve ter pelo menos 2 caracteres.');
      nomeInput.focus();
      return;
    }

    if (!sobrenome || sobrenome.length < 2) {
      showFeedback('O sobrenome deve ter pelo menos 2 caracteres.');
      sobrenomeInput.focus();
      return;
    }

    if (!email || !/^[a-zA-Z0-9._%+-]+@senaimgaluno\.com\.br$/.test(email)) {
      showFeedback('Digite um e-mail válido com domínio @senaimgaluno.com.br.');
      emailInput.focus();
      return;
    }

    if (!registro || !/^\d{6,10}$/.test(registro)) {
      showFeedback('O registro acadêmico deve ter entre 6 e 10 dígitos.');
      registroInput.focus();
      return;
    }

    if (!senha || senha.length < 6) {
      showFeedback('A senha deve ter pelo menos 6 caracteres.');
      senhaInput.focus();
      return;
    }

    if (senha !== confirmarSenha) {
      showFeedback('As senhas não coincidem.');
      confirmarSenhaInput.focus();
      return;
    }

    if (!termos) {
      showFeedback('Você deve aceitar os Termos de Uso e a Política de Privacidade.');
      termosInput.focus();
      return;
    }

    // Envio para a API
    showFeedback('Cadastrando usuário...', false);
    fetch('/api/registrar-usuario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, sobrenome, email, registro, senha, confirmar_senha: confirmarSenha, termos })
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Erro no cadastro: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        showFeedback(data.message, !data.success);
        if (data.success) {
          setTimeout(() => {
            window.location.href = 'login.html';
          }, 2000);
        }
      })
      .catch(error => {
        console.error('Erro no cadastro:', error);
        showFeedback('Erro ao conectar com o servidor. Tente novamente.');
      });
  });

  // Acessibilidade: Foco no campo de nome ao carregar
  nomeInput.focus();

  // Suporte a navegação por teclado
  cadastroForm.addEventListener('keydown', function(event) {
    if (event.key === 'Enter' && !cadastroForm.contains(document.activeElement)) {
      nomeInput.focus();
    }
  });
});