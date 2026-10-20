const express = require("express");
const pool = require("./db");
const { BONUS_CLIENTE, calcularComissao } = require("./comissao");

const app = express();
app.use(express.json());
const asyncRoute = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);
const idValido = (id) => Number.isInteger(Number(id)) && Number(id) > 0;

app.get("/", (req, res) =>
  res.json({
    mensagem: "API de vendas e comissões",
    endpoints: [
      "/vendedores",
      "/vendas",
      "/relatorios/performance?inicio=AAAA-MM-DD&fim=AAAA-MM-DD",
    ],
  }),
);

app.post(
  "/vendedores",
  asyncRoute(async (req, res) => {
    const { nome, meta_mensal, percentual_base } = req.body;
    if (
      !nome?.trim() ||
      !Number.isFinite(Number(meta_mensal)) ||
      Number(meta_mensal) < 0 ||
      !Number.isFinite(Number(percentual_base)) ||
      Number(percentual_base) < 0
    ) {
      return res
        .status(400)
        .json({ erro: "Informe nome, meta_mensal e percentual_base válidos." });
    }
    const [result] = await pool.execute(
      "INSERT INTO vendedores (nome, meta_mensal, percentual_base) VALUES (?, ?, ?)",
      [nome.trim(), meta_mensal, percentual_base],
    );
    const [rows] = await pool.execute(
      "SELECT * FROM vendedores WHERE id_vendedor = ?",
      [result.insertId],
    );
    res.status(201).json(rows[0]);
  }),
);

app.get(
  "/vendedores",
  asyncRoute(async (req, res) => {
    const [rows] = await pool.execute(
      "SELECT * FROM vendedores ORDER BY id_vendedor",
    );
    res.json(rows);
  }),
);

app.get(
  "/vendedores/:id",
  asyncRoute(async (req, res) => {
    if (!idValido(req.params.id))
      return res.status(400).json({ erro: "ID inválido." });
    const [rows] = await pool.execute(
      "SELECT * FROM vendedores WHERE id_vendedor = ?",
      [req.params.id],
    );
    if (!rows.length)
      return res.status(404).json({ erro: "Vendedor não encontrado." });
    res.json(rows[0]);
  }),
);

app.put(
  "/vendedores/:id",
  asyncRoute(async (req, res) => {
    const { meta_mensal, percentual_base } = req.body;
    if (
      !idValido(req.params.id) ||
      !Number.isFinite(Number(meta_mensal)) ||
      Number(meta_mensal) < 0 ||
      !Number.isFinite(Number(percentual_base)) ||
      Number(percentual_base) < 0
    )
      return res
        .status(400)
        .json({ erro: "ID, meta_mensal ou percentual_base inválido." });
    const [result] = await pool.execute(
      "UPDATE vendedores SET meta_mensal = ?, percentual_base = ? WHERE id_vendedor = ?",
      [meta_mensal, percentual_base, req.params.id],
    );
    if (!result.affectedRows)
      return res.status(404).json({ erro: "Vendedor não encontrado." });
    const [rows] = await pool.execute(
      "SELECT * FROM vendedores WHERE id_vendedor = ?",
      [req.params.id],
    );
    res.json(rows[0]);
  }),
);

app.patch(
  "/vendedores/:id/desativar",
  asyncRoute(async (req, res) => {
    if (!idValido(req.params.id))
      return res.status(400).json({ erro: "ID inválido." });
    const [result] = await pool.execute(
      "UPDATE vendedores SET ativo = FALSE WHERE id_vendedor = ?",
      [req.params.id],
    );
    if (!result.affectedRows)
      return res.status(404).json({ erro: "Vendedor não encontrado." });
    res.json({ mensagem: "Vendedor desativado." });
  }),
);

app.patch(
  "/vendedores/:id/ativar",
  asyncRoute(async (req, res) => {
    if (!idValido(req.params.id)) {
      return res.status(400).json({ erro: "ID inválido." });
    }
    const [result] = await pool.execute(
      "UPDATE vendedores SET ativo = TRUE WHERE id_vendedor = ?",
      [req.params.id],
    );
    if (!result.affectedRows) {
      return res.status(404).json({ erro: "Vendedor não encontrado." });
    }
    res.json({ mensagem: "Vendedor reativado." });
  }),
);

app.post(
  "/vendas",
  asyncRoute(async (req, res) => {
    const {
      codigo_venda,
      id_vendedor,
      id_regiao,
      data_venda,
      valor_venda,
      tipo_cliente,
    } = req.body;
    if (
      !codigo_venda?.trim() ||
      !idValido(id_vendedor) ||
      !idValido(id_regiao) ||
      !Number.isFinite(Number(valor_venda)) ||
      Number(valor_venda) <= 0 ||
      !Object.hasOwn(BONUS_CLIENTE, tipo_cliente)
    )
      return res.status(400).json({ erro: "Dados da venda inválidos." });
    const [vendedores] = await pool.execute(
      "SELECT percentual_base FROM vendedores WHERE id_vendedor = ? AND ativo = TRUE",
      [id_vendedor],
    );
    if (!vendedores.length)
      return res.status(400).json({ erro: "Vendedor inexistente ou inativo." });
    const [regioes] = await pool.execute(
      "SELECT percentual_bonus FROM regioes WHERE id_regiao = ?",
      [id_regiao],
    );
    if (!regioes.length)
      return res.status(400).json({ erro: "Região não encontrada." });
    const comissao = calcularComissao(
      valor_venda,
      vendedores[0].percentual_base,
      BONUS_CLIENTE[tipo_cliente],
      regioes[0].percentual_bonus,
    );
    const [result] = await pool.execute(
      "INSERT INTO vendas (codigo_venda, id_vendedor, id_regiao, data_venda, valor_venda, tipo_cliente, valor_comissao) VALUES (?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP), ?, ?, ?)",
      [
        codigo_venda.trim(),
        id_vendedor,
        id_regiao,
        data_venda || null,
        valor_venda,
        tipo_cliente,
        comissao,
      ],
    );
    const [rows] = await pool.execute(
      "SELECT * FROM vendas WHERE id_venda = ?",
      [result.insertId],
    );
    res.status(201).json(rows[0]);
  }),
);

app.get(
  "/vendas",
  asyncRoute(async (req, res) => {
    const [rows] = await pool.execute(
      "SELECT v.*, ve.nome AS vendedor, r.nome_regiao FROM vendas v JOIN vendedores ve ON ve.id_vendedor = v.id_vendedor JOIN regioes r ON r.id_regiao = v.id_regiao ORDER BY v.data_venda DESC",
    );
    res.json(rows);
  }),
);

app.get(
  "/vendas/vendedor/:id",
  asyncRoute(async (req, res) => {
    if (!idValido(req.params.id))
      return res.status(400).json({ erro: "ID inválido." });
    const [rows] = await pool.execute(
      "SELECT * FROM vendas WHERE id_vendedor = ? ORDER BY data_venda DESC",
      [req.params.id],
    );
    res.json(rows);
  }),
);

app.get(
  "/vendas/regiao/:id",
  asyncRoute(async (req, res) => {
    if (!idValido(req.params.id))
      return res.status(400).json({ erro: "ID inválido." });
    const [rows] = await pool.execute(
      "SELECT * FROM vendas WHERE id_regiao = ? ORDER BY data_venda DESC",
      [req.params.id],
    );
    res.json(rows);
  }),
);

app.delete(
  "/vendas/:id",
  asyncRoute(async (req, res) => {
    if (!idValido(req.params.id))
      return res.status(400).json({ erro: "ID inválido." });
    const [result] = await pool.execute(
      "DELETE FROM vendas WHERE id_venda = ?",
      [req.params.id],
    );
    if (!result.affectedRows)
      return res.status(404).json({ erro: "Venda não encontrada." });
    res.status(200).json({ mensagem: "Venda excluída." });
  }),
);

app.get(
  "/relatorios/performance",
  asyncRoute(async (req, res) => {
    const { inicio, fim } = req.query;
    if (
      !inicio ||
      !fim ||
      Number.isNaN(Date.parse(inicio)) ||
      Number.isNaN(Date.parse(fim)) ||
      inicio > fim
    )
      return res
        .status(400)
        .json({ erro: "Informe inicio e fim válidos (AAAA-MM-DD)." });
    const params = [inicio, fim];
    const [total] = await pool.execute(
      "SELECT COUNT(*) AS total_vendas FROM vendas WHERE data_venda >= ? AND data_venda < DATE_ADD(?, INTERVAL 1 DAY)",
      params,
    );
    const [porRegiao] = await pool.execute(
      "SELECT r.nome_regiao, SUM(v.valor_venda) AS total_vendido FROM vendas v JOIN regioes r ON r.id_regiao = v.id_regiao WHERE v.data_venda >= ? AND v.data_venda < DATE_ADD(?, INTERVAL 1 DAY) GROUP BY r.id_regiao, r.nome_regiao ORDER BY total_vendido DESC",
      params,
    );
    const [porCliente] = await pool.execute(
      "SELECT tipo_cliente, SUM(valor_venda) AS total_vendido FROM vendas WHERE data_venda >= ? AND data_venda < DATE_ADD(?, INTERVAL 1 DAY) GROUP BY tipo_cliente",
      params,
    );
    const [melhor] = await pool.execute(
      "SELECT ve.id_vendedor, ve.nome, SUM(v.valor_venda) AS total_vendido FROM vendas v JOIN vendedores ve ON ve.id_vendedor = v.id_vendedor WHERE v.data_venda >= ? AND v.data_venda < DATE_ADD(?, INTERVAL 1 DAY) GROUP BY ve.id_vendedor, ve.nome ORDER BY total_vendido DESC LIMIT 1",
      params,
    );
    const [maiorComissao] = await pool.execute(
      "SELECT ve.id_vendedor, ve.nome, SUM(v.valor_comissao) AS comissao_acumulada FROM vendas v JOIN vendedores ve ON ve.id_vendedor = v.id_vendedor WHERE v.data_venda >= ? AND v.data_venda < DATE_ADD(?, INTERVAL 1 DAY) GROUP BY ve.id_vendedor, ve.nome ORDER BY comissao_acumulada DESC LIMIT 1",
      params,
    );
    const [metas] = await pool.execute(
      "SELECT COUNT(*) AS vendedores_que_atingiram_meta FROM (SELECT ve.id_vendedor FROM vendedores ve JOIN vendas v ON v.id_vendedor = ve.id_vendedor WHERE v.data_venda >= ? AND v.data_venda < DATE_ADD(?, INTERVAL 1 DAY) GROUP BY ve.id_vendedor, ve.meta_mensal HAVING SUM(v.valor_venda) >= ve.meta_mensal) resultado",
      params,
    );
    const [mediaGeral] = await pool.execute(
      "SELECT AVG(valor_comissao) AS comissao_media FROM vendas WHERE data_venda >= ? AND data_venda < DATE_ADD(?, INTERVAL 1 DAY)",
      params,
    );
    const [mediaRegiao] = await pool.execute(
      "SELECT r.nome_regiao, AVG(v.valor_comissao) AS comissao_media FROM vendas v JOIN regioes r ON r.id_regiao = v.id_regiao WHERE v.data_venda >= ? AND v.data_venda < DATE_ADD(?, INTERVAL 1 DAY) GROUP BY r.id_regiao, r.nome_regiao",
      params,
    );
    res.json({
      periodo: { inicio, fim },
      total_vendas: total[0].total_vendas,
      vendas_por_regiao: porRegiao,
      vendas_por_tipo_cliente: porCliente,
      melhor_vendedor: melhor[0] || null,
      maior_comissao: maiorComissao[0] || null,
      metas_atingidas: metas[0].vendedores_que_atingiram_meta,
      comissao_media_geral: mediaGeral[0].comissao_media || 0,
      comissao_media_por_regiao: mediaRegiao,
    });
  }),
);

app.use((err, req, res, next) => {
  console.error(err.message);
  if (err.code === "ER_DUP_ENTRY")
    return res.status(400).json({ erro: "Código de venda já cadastrado." });
  if (err.code === "ER_NO_REFERENCED_ROW_2")
    return res.status(400).json({ erro: "Vendedor ou região inválida." });
  res.status(500).json({ erro: "Erro interno ao processar a requisição." });
});

module.exports = app;
