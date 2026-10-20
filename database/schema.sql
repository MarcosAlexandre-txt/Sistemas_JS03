CREATE DATABASE IF NOT EXISTS db_vendas
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE db_vendas;

CREATE TABLE IF NOT EXISTS regioes (
  id_regiao INT AUTO_INCREMENT PRIMARY KEY,
  nome_regiao VARCHAR(50) NOT NULL UNIQUE,
  percentual_bonus DECIMAL(5,2) NOT NULL DEFAULT 0,
  CHECK (percentual_bonus >= 0)
);

CREATE TABLE IF NOT EXISTS vendedores (
  id_vendedor INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  meta_mensal DECIMAL(12,2) NOT NULL,
  percentual_base DECIMAL(5,2) NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  CHECK (meta_mensal >= 0),
  CHECK (percentual_base >= 0)
);

CREATE TABLE IF NOT EXISTS vendas (
  id_venda INT AUTO_INCREMENT PRIMARY KEY,
  codigo_venda VARCHAR(50) NOT NULL UNIQUE,
  id_vendedor INT NOT NULL,
  id_regiao INT NOT NULL,
  data_venda DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  valor_venda DECIMAL(12,2) NOT NULL,
  tipo_cliente ENUM('PF', 'PJ') NOT NULL,
  valor_comissao DECIMAL(12,2) NOT NULL,
  CONSTRAINT fk_vendas_vendedor FOREIGN KEY (id_vendedor)
    REFERENCES vendedores(id_vendedor) ON DELETE RESTRICT,
  CONSTRAINT fk_vendas_regiao FOREIGN KEY (id_regiao)
    REFERENCES regioes(id_regiao) ON DELETE RESTRICT,
  CHECK (valor_venda > 0),
  CHECK (valor_comissao >= 0),
  INDEX ix_vendas_data (data_venda),
  INDEX ix_vendas_vendedor_data (id_vendedor, data_venda),
  INDEX ix_vendas_regiao_data (id_regiao, data_venda)
);

INSERT INTO regioes (nome_regiao, percentual_bonus) VALUES
  ('Norte', 1.00), ('Nordeste', 1.00), ('Sudeste', 0.00), ('Sul', 0.50)
ON DUPLICATE KEY UPDATE percentual_bonus = VALUES(percentual_bonus);
