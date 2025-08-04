-- Criar o banco de dados com codificação UTF-8 para suportar caracteres especiais
CREATE DATABASE IF NOT EXISTS achados_perdidos
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Selecionar o banco de dados
USE achados_perdidos;

-- Criar a tabela de usuários
CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  sobrenome VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  registro VARCHAR(10) NOT NULL UNIQUE,
  senha VARCHAR(255) NOT NULL,
  termos_aceitos BOOLEAN NOT NULL DEFAULT FALSE,
  data_criacao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_master BOOLEAN DEFAULT FALSE,
  INDEX idx_registro (registro),
  INDEX idx_email (email)
) ENGINE=InnoDB;

-- Criar a tabela de redefinições de senha
CREATE TABLE IF NOT EXISTS password_resets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(40) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Criar a tabela para itens encontrados
CREATE TABLE IF NOT EXISTS itens_encontrados (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome_item VARCHAR(100) NOT NULL,
  descricao TEXT NOT NULL,
  categoria ENUM('roupas', 'eletronicos', 'documentos', 'outros') NOT NULL,
  local_encontrado ENUM('biblioteca', 'sala', 'refeitorio', 'outros') NOT NULL,
  data_encontrada DATE NOT NULL,
  foto_path VARCHAR(255) DEFAULT NULL,
  data_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
  status ENUM('pendente', 'reclamado') DEFAULT 'pendente',
  status_reivindicacao ENUM('pendente', 'aprovado', 'rejeitado', 'nao_reivindicado') DEFAULT 'nao_reivindicado',
  usuario_reivindicado_id INT DEFAULT NULL,
  data_devolvida DATE DEFAULT NULL,
  reivindicado_por VARCHAR(255) DEFAULT NULL,
  FOREIGN KEY (usuario_reivindicado_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  INDEX idx_local_data (local_encontrado, data_encontrada),
  INDEX idx_status (status),
  INDEX idx_status_reivindicacao (status_reivindicacao)
) ENGINE=InnoDB;

-- Criar a tabela de reivindicações
CREATE TABLE IF NOT EXISTS reivindicacoes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  item_id INT NOT NULL,
  user_id INT NOT NULL,
  descricao_reivindicacao TEXT,
  data_reivindicacao DATETIME DEFAULT CURRENT_TIMESTAMP,
  status ENUM('pendente', 'aprovado', 'rejeitado') DEFAULT 'pendente',
  FOREIGN KEY (item_id) REFERENCES itens_encontrados(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  INDEX idx_item_user (item_id, user_id),
  INDEX idx_status (status)
) ENGINE=InnoDB;

-- Criar a tabela de usuários master
CREATE TABLE IF NOT EXISTS usuarios_master (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  sobrenome VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  registro VARCHAR(10) NOT NULL UNIQUE,
  senha VARCHAR(255) NOT NULL,
  data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
  ativo BOOLEAN DEFAULT TRUE,
  INDEX idx_registro (registro),
  INDEX idx_email (email)
) ENGINE=InnoDB;