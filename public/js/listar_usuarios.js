document.addEventListener('DOMContentLoaded', function () {
  const allUsers = [];
  const userGreeting = document.querySelector('.user-greeting');
  const accessDenied = document.getElementById('access-denied');
  const usersContainer = document.getElementById('users-container');
  const logoutLink = document.querySelector('.logout-link');

  function showFeedback(message, isError = true) {
    const feedbackDiv = document.createElement('div');
    feedbackDiv.textContent = message;
    feedbackDiv.className = `feedback ${isError ? 'error' : 'success'}`;
    usersContainer.parentNode.insertBefore(feedbackDiv, usersContainer);
    setTimeout(() => feedbackDiv.remove(), 5000);
  }

  function verificarAutenticacao() {
    return fetch('/api/check-auth', {
      method: 'GET',
      credentials: 'include',
    })
      .then(response => {
        if (!response.ok) throw new Error('Erro na resposta do servidor');
        return response.json();
      })
      .then(data => {
        console.log('Dados da sessão às 01:42 AM -03, 03/08/2025:', data);
        if (!data.success || !data.user) {
          showFeedback('Acesso negado. Faça login como usuário master.');
          window.location.href = 'area_restrita.html';
          return false;
        }

        if (!data.user.is_master) {
          accessDenied.style.display = 'block';
          showFeedback('Acesso negado. Apenas usuários master podem acessar esta página.');
          setTimeout(() => window.location.href = 'area_restrita.html', 3000);
          return false;
        }

        // Usuário master autenticado
        document.querySelectorAll('.auth-link').forEach(link => link.style.display = 'none');
        userGreeting.style.display = 'inline';
        userGreeting.textContent = `Olá, ${data.user.nome}!`;
        logoutLink.style.display = 'inline';
        logoutLink.addEventListener('click', function(e) {
          e.preventDefault();
          logout();
        });
        usersContainer.style.display = 'block';
        loadUsers();
        return true;
      })
      .catch(error => {
        console.error('Erro ao verificar autenticação:', error);
        showFeedback('Erro ao verificar acesso. Tente novamente.');
        window.location.href = 'area_restrita.html';
        return false;
      });
  }

  function logout() {
    if (confirm('Tem certeza que deseja sair?')) {
      fetch('/api/logout', {
        method: 'POST',
        credentials: 'include',
      })
        .then(response => {
          if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
          return response.json();
        })
        .then(data => {
          showFeedback(data.message, !data.success);
          if (data.success) {
            window.location.href = 'index.html';
          }
        })
        .catch(error => {
          showFeedback('Erro ao fazer logout.');
          console.error('Erro ao logout:', error);
        });
    }
  }

  function loadUsers() {
    fetch('/api/list-users', {
      method: 'GET',
      credentials: 'include',
    })
      .then(response => {
        if (!response.ok) throw new Error('Erro na resposta do servidor');
        return response.json();
      })
      .then(data => {
        if (data.success && Array.isArray(data.users)) {
          allUsers.length = 0;
          allUsers.push(...data.users);
          renderUsers(allUsers);
        } else {
          showFeedback('Erro ao carregar lista de usuários.');
        }
      })
      .catch(error => {
        console.error('Erro ao carregar usuários:', error);
        showFeedback('Erro ao carregar lista de usuários. Tente novamente.');
      });
  }

  function renderUsers(users) {
    const tableBody = document.getElementById('users-table-body');
    tableBody.innerHTML = '';
    if (users.length === 0) {
      const row = document.createElement('tr');
      row.innerHTML = '<td colspan="6" style="text-align: center; padding: 20px;">Nenhum usuário encontrado.</td>';
      tableBody.appendChild(row);
      return;
    }
    users.forEach(user => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${user.id}</td>
        <td>${user.nome}</td>
        <td>${user.sobrenome}</td>
        <td>${user.email}</td>
        <td>${user.registro}</td>
        <td>${new Date(user.data_criacao).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
      `;
      tableBody.appendChild(row);
    });
  }

  function filterUsers() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase().trim();
    const filteredUsers = allUsers.filter(user =>
      user.nome.toLowerCase().includes(searchTerm) ||
      user.sobrenome.toLowerCase().includes(searchTerm) ||
      user.email.toLowerCase().includes(searchTerm)
    );
    renderUsers(filteredUsers);
  }

  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', debounce(filterUsers, 300));
  }

  verificarAutenticacao();
});