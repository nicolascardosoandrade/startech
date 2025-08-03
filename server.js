const express = require('express');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const path = require('path');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const multer = require('multer');
const session = require('express-session');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use((req, res, next) => {
  console.log(`Requisição para: ${req.url} às ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`);
  next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Configuração de sessões
app.use(session({
  secret: process.env.SESSION_SECRET || 'sua-chave-secreta-super-segura',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production', maxAge: 24 * 60 * 60 * 1000 } // 24 horas
}));

// Configuração do Multer para upload de arquivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/');
  },
  filename: function (req, file, cb) {
    const nomeItem = req.body.nome_item ? req.body.nome_item.replace(/[^a-zA-Z0-9]/g, '_') : 'item';
    const timestamp = Date.now();
    const extension = path.extname(file.originalname);
    cb(null, `${nomeItem}_${timestamp}${extension}`);
  }
});
const upload = multer({ storage: storage });

// Configuração do banco de dados
const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: 'achados_perdidos'
});

// Verificação inicial de conexão com o banco
db.getConnection()
  .then(connection => {
    console.log('Conexão com o banco de dados estabelecida com sucesso!');
    connection.release();
  })
  .catch(err => {
    console.error('Erro ao conectar ao banco de dados:', err);
  });

// Configuração de e-mail
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Rota padrão
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Rota para redirecionar o link de redefinição
app.get('/reset-password', (req, res) => {
  const token = req.query.token;
  if (!token) {
    return res.status(400).send('Token inválido.');
  }
  res.sendFile(path.join(__dirname, 'public', 'redefinir_senha.html'));
});

// Rota para verificar se o usuário está autenticado
app.get('/api/check-auth', (req, res) => {
  if (req.session.user) {
    res.status(200).json({ success: true, user: req.session.user });
  } else {
    res.status(401).json({ success: false, message: 'Não autenticado.' });
  }
});

// Rota para verificar se o usuário é master
app.get('/api/check-master', (req, res) => {
  if (req.session.user && req.session.user.is_master) {
    res.status(200).json({ success: true, user: req.session.user });
  } else {
    res.status(401).json({ success: false, message: 'Acesso restrito a usuários master.' });
  }
});

// Nova rota para verificar master via e-mail (usada em itens_cadastrados.js)
app.post('/api/verificar-master', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: 'E-mail é obrigatório.' });
  }

  try {
    const [users] = await db.query('SELECT * FROM usuarios_master WHERE email = ?', [email]);
    if (users.length > 0) {
      res.status(200).json({ success: true, isMaster: true });
    } else {
      res.status(401).json({ success: false, message: 'Acesso negado. Usuário não é master.' });
    }
  } catch (error) {
    console.error(`Erro ao verificar master em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}:`, error);
    res.status(500).json({ success: false, message: 'Erro ao verificar acesso.' });
  }
});

// Rota para listar todos os usuários
app.get('/api/list-users', async (req, res) => {
  const user = req.session.user;

  if (!user || !user.is_master) {
    console.log(`[${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}] Acesso negado à rota /api/list-users. Usuário: ${user ? user.registro : 'Não autenticado'}, is_master: ${user ? user.is_master : 'N/A'}`);
    return res.status(401).json({ success: false, message: 'Acesso restrito a usuários master.' });
  }

  try {
    console.log(`[${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}] Buscando todos os usuários da tabela usuarios...`);
    const [users] = await db.query('SELECT id, nome, sobrenome, email, registro, data_criacao FROM usuarios');
    console.log(`[${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}] Usuários encontrados: ${users.length}`);
    res.status(200).json({ success: true, users });
  } catch (error) {
    console.error(`[${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}] Erro ao buscar usuários:`, error);
    res.status(500).json({ success: false, message: 'Erro ao buscar usuários. Tente novamente.' });
  }
});

// Rota para registrar usuário
app.post('/api/registrar-usuario', async (req, res) => {
  const { nome, sobrenome, email, registro, senha, confirmar_senha, termos } = req.body;

  if (!nome || !sobrenome || !email || !registro || !senha || !confirmar_senha || typeof termos === 'undefined') {
    return res.status(400).json({ success: false, message: 'Todos os campos são obrigatórios.' });
  }
  if (nome.length < 2) {
    return res.status(400).json({ success: false, message: 'O nome deve ter pelo menos 2 caracteres.' });
  }
  if (sobrenome.length < 2) {
    return res.status(400).json({ success: false, message: 'O sobrenome deve ter pelo menos 2 caracteres.' });
  }
  if (!/^[a-zA-Z0-9._%+-]+@senaimgaluno\.com\.br$/.test(email)) {
    return res.status(400).json({ success: false, message: 'E-mail institucional inválido. Use o domínio @senaimgaluno.com.br.' });
  }
  if (!/^\d{6,10}$/.test(registro)) {
    return res.status(400).json({ success: false, message: 'O registro acadêmico deve ter entre 6 e 10 dígitos.' });
  }
  if (senha !== confirmar_senha) {
    return res.status(400).json({ success: false, message: 'As senhas não coincidem.' });
  }
  if (senha.length < 6) {
    return res.status(400).json({ success: false, message: 'A senha deve ter pelo menos 6 caracteres.' });
  }
  if (!termos) {
    return res.status(400).json({ success: false, message: 'Você deve aceitar os Termos de Uso e a Política de Privacidade.' });
  }

  try {
    const [existingUsers] = await db.query('SELECT * FROM usuarios WHERE registro = ? OR email = ?', [registro, email]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ success: false, message: 'Registro ou e-mail já cadastrado.' });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(senha, saltRounds);

    await db.query(
      'INSERT INTO usuarios (nome, sobrenome, email, registro, senha, termos_aceitos, is_master) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [nome, sobrenome, email, registro, hashedPassword, true, false]
    );

    res.status(201).json({ success: true, message: 'Usuário cadastrado com sucesso!' });
  } catch (error) {
    console.error(`Erro ao cadastrar usuário em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}:`, error);
    res.status(500).json({ success: false, message: 'Erro ao processar o cadastro. Tente novamente.' });
  }
});

// Rota para registrar usuário master
app.post('/api/registrar-master', async (req, res) => {
  const { nome, sobrenome, email, registro, senha, confirmar_senha } = req.body;

  if (!nome || !sobrenome || !email || !registro || !senha || !confirmar_senha) {
    return res.status(400).json({ success: false, message: 'Todos os campos são obrigatórios.' });
  }
  if (nome.length < 2) {
    return res.status(400).json({ success: false, message: 'O nome deve ter pelo menos 2 caracteres.' });
  }
  if (sobrenome.length < 2) {
    return res.status(400).json({ success: false, message: 'O sobrenome deve ter pelo menos 2 caracteres.' });
  }
  if (!/^[a-zA-Z0-9._%+-]+@senaimgaluno\.com\.br$/.test(email)) {
    return res.status(400).json({ success: false, message: 'E-mail institucional inválido. Use o domínio @senaimgaluno.com.br.' });
  }
  if (!/^\d{6,10}$/.test(registro)) {
    return res.status(400).json({ success: false, message: 'O registro acadêmico deve ter entre 6 e 10 dígitos.' });
  }
  if (senha !== confirmar_senha) {
    return res.status(400).json({ success: false, message: 'As senhas não coincidem.' });
  }
  if (senha.length < 6) {
    return res.status(400).json({ success: false, message: 'A senha deve ter pelo menos 6 caracteres.' });
  }

  try {
    const [existingUsers] = await db.query('SELECT * FROM usuarios_master WHERE registro = ? OR email = ?', [registro, email]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ success: false, message: 'Registro ou e-mail já cadastrado.' });
    }

    const [existingRegularUsers] = await db.query('SELECT * FROM usuarios WHERE registro = ? OR email = ?', [registro, email]);
    if (existingRegularUsers.length > 0) {
      return res.status(400).json({ success: false, message: 'Registro ou e-mail já cadastrado em outra tabela.' });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(senha, saltRounds);

    await db.query(
      'INSERT INTO usuarios_master (nome, sobrenome, email, registro, senha, ativo) VALUES (?, ?, ?, ?, ?, ?)',
      [nome, sobrenome, email, registro, hashedPassword, true]
    );

    res.status(201).json({ success: true, message: 'Usuário master cadastrado com sucesso!' });
  } catch (error) {
    console.error(`Erro ao cadastrar usuário master em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}:`, error);
    res.status(500).json({ success: false, message: 'Erro ao processar o cadastro. Tente novamente.' });
  }
});

// Rota para login com logs de depuração
app.post('/api/login', async (req, res) => {
  const { registro, senha } = req.body;
  console.log(`[${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}] Tentativa de login - Registro: ${registro}, Senha: [HIDDEN]`);

  if (!registro || !/^\d{6,10}$/.test(registro)) {
    console.log('Validação falhou: Registro inválido');
    return res.status(400).json({ success: false, message: 'Registro acadêmico inválido (6 a 10 dígitos).' });
  }
  if (!senha || senha.length < 6) {
    console.log('Validação falhou: Senha inválida');
    return res.status(400).json({ success: false, message: 'A senha deve ter pelo menos 6 caracteres.' });
  }

  try {
    console.log(`Consultando usuarios_master para registro ${registro}...`);
    let [masterUsers] = await db.query('SELECT * FROM usuarios_master WHERE registro = ? AND ativo = TRUE', [registro]);
    let user = masterUsers[0];
    let isMaster = true;

    console.log(`Resultado da consulta a usuarios_master: ${masterUsers.length} registros encontrados`);

    if (!user) {
      console.log(`Registro ${registro} não encontrado em usuarios_master, consultando usuarios...`);
      [masterUsers] = await db.query('SELECT * FROM usuarios WHERE registro = ?', [registro]);
      user = masterUsers[0];
      isMaster = false;
      console.log(`Resultado da consulta a usuarios: ${masterUsers.length} registros encontrados`);
    }

    if (!user) {
      console.log(`Registro ${registro} não encontrado no banco de dados`);
      return res.status(404).json({ success: false, message: 'Registro não encontrado.' });
    }

    console.log(`Usuário encontrado: ${JSON.stringify(user)}`);
    const match = await bcrypt.compare(senha, user.senha);
    console.log(`Comparação de senha para registro ${registro}: ${match}`);

    if (!match) {
      return res.status(401).json({ success: false, message: 'Senha incorreta.' });
    }

    req.session.user = {
      id: user.id,
      registro: user.registro,
      nome: user.nome,
      email: user.email,
      is_master: isMaster
    };

    console.log(`Login bem-sucedido para registro ${registro} (Master: ${isMaster}) em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`);
    res.status(200).json({ success: true, message: 'Login bem-sucedido! Redirecionando...', redirect: isMaster ? '/area_restrita.html' : '/index.html' });
  } catch (error) {
    console.error(`Erro ao autenticar em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}:`, error);
    res.status(500).json({ success: false, message: 'Erro ao autenticar. Tente novamente.' });
  }
});

// Rota para logout
app.post('/api/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error(`Erro ao fazer logout em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}:`, err);
      return res.status(500).json({ success: false, message: 'Erro ao fazer logout.' });
    }
    res.status(200).json({ success: true, message: 'Logout realizado com sucesso!' });
  });
});

// Rota para registro de item perdido
app.post('/api/registrar-perdido', (req, res) => {
  const { nome_item, descricao, local, data, cor, marca, caracteristica_unica } = req.body;
  if (!nome_item || !descricao || !local || !data) {
    return res.status(400).json({ success: false, message: 'Todos os campos obrigatórios devem ser preenchidos.' });
  }
  console.log(`Item perdido registrado em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}:`, { nome_item, descricao, local, data, cor, marca, caracteristica_unica });
  res.status(200).json({ success: true, message: 'Item perdido registrado com sucesso!' });
});

// Rota para registro de item encontrado
app.post('/api/registrar-encontrado', upload.single('foto'), async (req, res) => {
  const { nome_item, descricao, local, data, categoria } = req.body;
  const fotoPath = req.file ? `/uploads/${req.file.filename}` : null;
  const validCategories = ['todas', 'roupas', 'eletronicos', 'documentos', 'outros'];

  if (!nome_item || !descricao || !local || !data || !categoria) {
    return res.status(400).json({ success: false, message: 'Todos os campos obrigatórios devem be preenchidos.' });
  }
  if (!validCategories.includes(categoria)) {
    return res.status(400).json({ success: false, message: 'Categoria inválida. Escolha entre: ' + validCategories.join(', ') + '.' });
  }

  try {
    const [result] = await db.query(
      'INSERT INTO itens_encontrados (nome_item, descricao, local_encontrado, data_encontrada, foto_path, categoria, status_reivindicacao) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [nome_item, descricao, local, data, fotoPath, categoria, 'nao_reivindicado']
    );

    console.log(`Item encontrado registrado com ID ${result.insertId} em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}:`, { nome_item, descricao, local, data, fotoPath, categoria });
    res.status(200).json({ success: true, message: 'Item encontrado registrado com sucesso!' });
  } catch (error) {
    console.error(`Erro ao registrar item encontrado em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}:`, error);
    res.status(500).json({ success: false, message: 'Erro ao registrar item. Tente novamente.' });
  }
});

// Rota para buscar todos os itens encontrados
app.get('/api/itens-encontrados', async (req, res) => {
  try {
    console.log('Tentando buscar todos os itens da tabela itens_encontrados...');
    const [rows] = await db.query('SELECT * FROM itens_encontrados');
    console.log('Itens encontrados:', rows);
    res.status(200).json(rows);
  } catch (error) {
    console.error(`Erro ao buscar itens em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}:`, error);
    res.status(500).json({ success: false, message: 'Erro ao buscar itens.' });
  }
});

// Rota para buscar itens com filtros
app.get('/api/buscar', async (req, res) => {
  const { termo, categoria, local, data } = req.query;
  const validCategories = ['todas', 'roupas', 'eletronicos', 'documentos', 'outros'];

  try {
    let query = 'SELECT * FROM itens_encontrados WHERE status = "pendente"';
    const params = [];

    if (termo) {
      query += ' AND (nome_item LIKE ? OR descricao LIKE ?)';
      params.push(`%${termo}%`, `%${termo}%`);
    }
    if (categoria && validCategories.includes(categoria)) {
      query += ' AND categoria = ?';
      params.push(categoria);
    } else if (categoria) {
      return res.status(400).json({ success: false, message: 'Categoria inválida. Escolha entre: ' + validCategories.join(', ') + '.' });
    }
    if (local) {
      query += ' AND local_encontrado = ?';
      params.push(local);
    }
    if (data) {
      query += ' AND data_encontrada = ?';
      params.push(data);
    }

    const [rows] = await db.query(query, params);
    console.log(`Busca realizada em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}:`, { termo, categoria, local, data, resultados: rows.length });
    res.status(200).json(rows);
  } catch (error) {
    console.error(`Erro ao buscar itens em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}:`, error);
    res.status(500).json({ success: false, message: 'Erro ao buscar itens.' });
  }
});

// Rota para reivindicar item
app.post('/api/reivindicar/:id', async (req, res) => {
  const itemId = req.params.id;
  const user = req.session.user;
  const { descricao_reivindicacao } = req.body;

  if (!user) {
    return res.status(401).json({ success: false, message: 'Você precisa estar autenticado para reivindicar um item.' });
  }

  try {
    const [items] = await db.query('SELECT * FROM itens_encontrados WHERE id = ? AND status = "pendente"', [itemId]);
    if (items.length === 0) {
      return res.status(404).json({ success: false, message: 'Item não encontrado ou já foi reclamado.' });
    }

    await db.query(
      'INSERT INTO reivindicacoes (item_id, user_id, descricao_reivindicacao, status) VALUES (?, ?, ?, ?)',
      [itemId, user.id, descricao_reivindicacao || 'Nenhuma descrição fornecida', 'pendente']
    );

    await db.query('UPDATE itens_encontrados SET status_reivindicacao = ? WHERE id = ?', ['pendente', itemId]);

    const item = items[0];
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Confirmação de Reivindicação - Achados e Perdidos SENAI',
      text: `Você reivindicou o item "${item.nome_item}" encontrado em ${item.local_encontrado} no dia ${new Date(item.data_encontrada).toLocaleDateString('pt-BR')}. Aguarde a aprovação do administrador.`
    };
    await transporter.sendMail(mailOptions);

    console.log(`Item ID ${itemId} reivindicado por usuário ${user.registro} em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`);
    res.status(200).json({ success: true, message: 'Item reivindicado com sucesso! Aguarde aprovação.' });
  } catch (error) {
    console.error(`Erro ao reivindicar item ID ${itemId} em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}:`, error);
    res.status(500).json({ success: false, message: 'Erro ao reivindicar item. Tente novamente.' });
  }
});

// Rota para buscar reivindicações (área restrita)
app.get('/api/reivindicacoes', async (req, res) => {
  const user = req.session.user;
  if (!user || !user.is_master) {
    return res.status(401).json({ success: false, message: 'Acesso restrito a usuários master.' });
  }

  try {
    const [rows] = await db.query(`
      SELECT r.id, r.item_id, r.user_id, r.descricao_reivindicacao, r.status, r.data_reivindicacao,
             i.nome_item, i.descricao, i.local_encontrado, i.data_encontrada, i.foto_path, i.categoria,
             u.nome, u.email, u.registro
      FROM reivindicacoes r
      JOIN itens_encontrados i ON r.item_id = i.id
      JOIN usuarios u ON r.user_id = u.id
      WHERE r.status = 'pendente'
    `);
    res.status(200).json(rows);
  } catch (error) {
    console.error(`Erro ao buscar reivindicações em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}:`, error);
    res.status(500).json({ success: false, message: 'Erro ao buscar reivindicações.' });
  }
});

// Rota para aprovar ou rejeitar reivindicação
app.post('/api/admin/reivindicacao/:id', async (req, res) => {
  const reivindicacaoId = req.params.id;
  const { acao } = req.body; // 'aprovar' ou 'rejeitar'
  const user = req.session.user;

  if (!user || !user.is_master) {
    return res.status(401).json({ success: false, message: 'Acesso restrito a usuários master.' });
  }

  if (!['aprovar', 'rejeitar'].includes(acao)) {
    return res.status(400).json({ success: false, message: 'Ação inválida.' });
  }

  try {
    const [reivindicacoes] = await db.query('SELECT * FROM reivindicacoes WHERE id = ?', [reivindicacaoId]);
    if (reivindicacoes.length === 0) {
      return res.status(404).json({ success: false, message: 'Reivindicação não encontrada.' });
    }

    const reivindicacao = reivindicacoes[0];
    const newStatus = acao === 'aprovar' ? 'aprovado' : 'rejeitado';
    await db.query('UPDATE reivindicacoes SET status = ? WHERE id = ?', [newStatus, reivindicacaoId]);

    const itemStatus = acao === 'aprovar' ? 'aprovado' : 'rejeitado';
    await db.query('UPDATE itens_encontrados SET status_reivindicacao = ?, status = ? WHERE id = ?', [itemStatus, acao === 'aprovar' ? 'reclamado' : 'pendente', reivindicacao.item_id]);

    const [users] = await db.query('SELECT * FROM usuarios WHERE id = ?', [reivindicacao.user_id]);
    const [items] = await db.query('SELECT * FROM itens_encontrados WHERE id = ?', [reivindicacao.item_id]);
    const user = users[0];
    const item = items[0];

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: `Reivindicação ${acao === 'aprovar' ? 'Aprovada' : 'Rejeitada'} - Achados e Perdidos SENAI`,
      text: `Sua reivindicação para o item "${item.nome_item}" foi ${acao === 'aprovar' ? 'aprovada' : 'rejeitada'}. ${acao === 'aprovar' ? 'Entre em contato com achados.perdidos@senai.br para retirada.' : 'Motivo: Contate o administrador para mais detalhes.'}`
    };
    await transporter.sendMail(mailOptions);

    console.log(`Reivindicação ID ${reivindicacaoId} ${acao} por usuário master ${user.registro} em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`);
    res.status(200).json({ success: true, message: `Reivindicação ${acao} com sucesso!` });
  } catch (error) {
    console.error(`Erro ao processar reivindicação ID ${reivindicacaoId} em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}:`, error);
    res.status(500).json({ success: false, message: 'Erro ao processar reivindicação.' });
  }
});

// Rota para iniciar redefinição de senha
app.post('/api/forgot-password', async (req, res) => {
  const { registro } = req.body;

  if (!registro || !/^\d{6,10}$/.test(registro)) {
    return res.status(400).json({ success: false, message: 'Registro acadêmico inválido (6 a 10 dígitos).' });
  }

  try {
    const [users] = await db.query('SELECT * FROM usuarios WHERE registro = ?', [registro]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'Registro não encontrado.' });
    }

    const user = users[0];
    const token = crypto.randomBytes(20).toString('hex');
    const expires = new Date(Date.now() + 3600000); // 1 hora

    await db.query(
      'INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)',
      [user.id, token, expires]
    );

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Redefinição de Senha - Achados e Perdidos SENAI',
      text: `Clique no link para redefinir sua senha: ${process.env.APP_URL}/reset-password?token=${token}\nO link expira em 1 hora. Enviado em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}.`
    };

    await transporter.sendMail(mailOptions);
    console.log(`E-mail de redefinição enviado para ${user.email} em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}.`);
    res.status(200).json({ success: true, message: 'E-mail de redefinição enviado! Redirecionando em 3 segundos...' });
  } catch (error) {
    console.error(`Erro ao processar redefinição em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}:`, error);
    res.status(500).json({ success: false, message: 'Erro ao enviar e-mail. Tente novamente.' });
  }
});

// Rota para redefinir senha
app.post('/api/reset-password', async (req, res) => {
  const { token, nova_senha } = req.body;

  if (!token || !nova_senha || nova_senha.length < 6) {
    return res.status(400).json({ success: false, message: 'Token ou senha inválida.' });
  }

  try {
    const [tokens] = await db.query('SELECT * FROM password_resets WHERE token = ? AND expires_at > ?', [token, new Date()]);
    if (tokens.length === 0) {
      return res.status(400).json({ success: false, message: 'Token inválido ou expirado.' });
    }

    const tokenData = tokens[0];
    const [users] = await db.query('SELECT * FROM usuarios WHERE id = ?', [tokenData.user_id]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    }

    const user = users[0];
    const hashedPassword = await bcrypt.hash(nova_senha, 10);

    await db.query('UPDATE usuarios SET senha = ? WHERE id = ?', [hashedPassword, user.id]);
    await db.query('DELETE FROM password_resets WHERE token = ?', [token]);

    console.log(`Senha redefinida para usuário ${user.registro} em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}.`);
    res.status(200).json({ success: true, message: 'Senha redefinida com sucesso! Redirecionando...' });
  } catch (error) {
    console.error(`Erro ao redefinir senha em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}:`, error);
    res.status(500).json({ success: false, message: 'Erro ao redefinir senha. Tente novamente.' });
  }
});

// Rota para remover item (área restrita)
app.delete('/api/remover-item/:id', async (req, res) => {
  const itemId = req.params.id;
  const user = req.session.user;

  if (!user || !user.is_master) {
    return res.status(401).json({ success: false, message: 'Acesso restrito a usuários master.' });
  }

  try {
    const [result] = await db.query('DELETE FROM itens_encontrados WHERE id = ?', [itemId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Item não encontrado.' });
    }
    res.status(200).json({ success: true, message: 'Item removido com sucesso!' });
  } catch (error) {
    console.error(`Erro ao remover item ID ${itemId} em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}:`, error);
    res.status(500).json({ success: false, message: 'Erro ao remover item.' });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT} em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}.`);
});