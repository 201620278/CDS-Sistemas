const express = require('express');
const router = express.Router();
const db = require('../database');
const moment = require('moment');

console.log('ROTA FINANCEIRO CARREGADA:', __filename);

router.get('/teste-rota-financeiro', (req, res) => {
  res.json({
    ok: true,
    arquivo: __filename,
    mensagem: 'rota financeiro ativa'
  });
});

function parseNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function dbGetAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function dbAllAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function formatoStatus(tipo, status) {
  if (status) return status;
  return tipo === 'receita' ? 'recebido' : 'pago';
}

function inserirMovimentacao(data) {
  return new Promise((resolve, reject) => {
    const {
      tipo,
      descricao,
      valor,
      data_movimento,
      categoria,
      forma_pagamento,
      referencia_id,
      referencia_tipo,
      status,
      origem,
      documento,
      vencimento,
      numero_parcela,
      total_parcelas,
      compra_id,
      venda_id,
      pessoa_nome,
      observacao
    } = data;

    db.run(`
      INSERT INTO financeiro (
        tipo, descricao, valor, data_movimento, categoria, forma_pagamento,
        referencia_id, referencia_tipo, status, origem, documento, vencimento,
        numero_parcela, total_parcelas, compra_id, venda_id, pessoa_nome, observacao,
        baixado_em
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      tipo,
      descricao,
      valor,
      data_movimento,
      categoria || null,
      forma_pagamento || null,
      referencia_id || null,
      referencia_tipo || null,
      formatoStatus(tipo, status),
      origem || 'manual',
      documento || null,
      vencimento || data_movimento,
      numero_parcela || null,
      total_parcelas || null,
      compra_id || null,
      venda_id || null,
      pessoa_nome || null,
      observacao || null,
      ['pago', 'recebido'].includes(formatoStatus(tipo, status)) ? (data.baixado_em || data_movimento) : null
    ], function(err) {
      if (err) reject(err);
      else resolve(this.lastID);
    });
  });
}

router.get('/', (req, res) => {
  const { dataInicio, dataFim, tipo, status, busca } = req.query;

  let sql = `SELECT * FROM financeiro WHERE 1=1`;
  const params = [];

  if (dataInicio && dataFim) {
    sql += ` AND date(data_movimento) BETWEEN ? AND ?`;
    params.push(dataInicio, dataFim);
  }

  if (tipo) {
    sql += ` AND tipo = ?`;
    params.push(tipo);
  }

  if (status) {
    sql += ` AND status = ?`;
    params.push(status);
  }

  if (busca) {
    sql += ` AND (descricao LIKE ? OR documento LIKE ?)`;
    params.push(`%${busca}%`, `%${busca}%`);
  }

  sql += ` ORDER BY date(data_movimento) DESC, id DESC`;

  db.all(sql, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.json(rows);
  });
});

router.get('/resumo', (req, res) => {
  const { data_inicio, data_fim, tipo, categoria, forma_pagamento, status, origem } = req.query;

  let sql = `
    SELECT 
      SUM(CASE WHEN tipo = 'receita' THEN valor ELSE 0 END) AS total_receitas,
      SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END) AS total_despesas,
      SUM(CASE WHEN tipo = 'receita' AND status IN ('recebido','pago') THEN valor ELSE 0 END) AS total_recebido,
      SUM(CASE WHEN tipo = 'despesa' AND status IN ('pago','recebido') THEN valor ELSE 0 END) AS total_pago,
      SUM(CASE WHEN tipo = 'receita' AND status = 'pendente' THEN valor ELSE 0 END) AS total_a_receber,
      SUM(CASE WHEN tipo = 'despesa' AND status = 'pendente' THEN valor ELSE 0 END) AS total_a_pagar
    FROM financeiro
    WHERE 1=1
  `;
  const params = [];

  if (data_inicio && data_fim) {
    sql += ' AND COALESCE(vencimento, data_movimento) BETWEEN ? AND ?';
    params.push(data_inicio, data_fim);
  }
  if (tipo) {
    sql += ' AND tipo = ?';
    params.push(tipo);
  }
  if (categoria) {
    sql += ' AND categoria = ?';
    params.push(categoria);
  }
  if (forma_pagamento) {
    sql += ' AND forma_pagamento = ?';
    params.push(forma_pagamento);
  }
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  if (origem) {
    sql += ' AND origem = ?';
    params.push(origem);
  }

  db.get(sql, params, (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    const resumo = row || {};
    resumo.total_receitas = parseNumber(resumo.total_receitas);
    resumo.total_despesas = parseNumber(resumo.total_despesas);
    resumo.total_recebido = parseNumber(resumo.total_recebido);
    resumo.total_pago = parseNumber(resumo.total_pago);
    resumo.total_a_receber = parseNumber(resumo.total_a_receber);
    resumo.total_a_pagar = parseNumber(resumo.total_a_pagar);
    resumo.saldo = resumo.total_recebido - resumo.total_pago;
    res.json(resumo);
  });
});

router.post('/', (req, res) => {
  const {
    tipo,
    descricao,
    valor,
    data_movimento,
    categoria,
    forma_pagamento,
    documento,
    vencimento,
    observacao,
    compra_id,
    pessoa_nome,
    status
  } = req.body;

  if (!tipo || !descricao || !valor || !data_movimento) {
    res.status(400).json({ error: 'Tipo, descrição, valor e data são obrigatórios.' });
    return;
  }

  if (!['receita', 'despesa'].includes(tipo)) {
    res.status(400).json({ error: 'Tipo de movimentação inválido.' });
    return;
  }

  inserirMovimentacao({
    tipo,
    descricao,
    valor,
    data_movimento,
    categoria,
    forma_pagamento,
    documento,
    vencimento,
    observacao,
    compra_id,
    pessoa_nome,
    origem: 'manual',
    referencia_tipo: 'manual',
    status: status || (tipo === 'despesa' ? 'pendente' : 'recebido')
  }).then((id) => {
    res.json({ id, message: 'Movimentação registrada com sucesso' });
  }).catch((err) => {
    res.status(500).json({ error: err.message });
  });
});

router.put('/:id', (req, res) => {
  const { id } = req.params;
  const {
    descricao,
    valor,
    data_movimento,
    categoria,
    forma_pagamento,
    documento,
    vencimento,
    observacao,
    pessoa_nome,
    status
  } = req.body;

  db.run(`
    UPDATE financeiro
    SET descricao = ?, valor = ?, data_movimento = ?, categoria = ?, forma_pagamento = ?,
        documento = ?, vencimento = ?, observacao = ?, pessoa_nome = ?, status = ?,
        baixado_em = CASE WHEN ? IN ('pago','recebido') THEN COALESCE(baixado_em, DATE('now')) ELSE NULL END
    WHERE id = ?
  `, [
    descricao,
    valor,
    data_movimento,
    categoria || null,
    forma_pagamento || null,
    documento || null,
    vencimento || data_movimento,
    observacao || null,
    pessoa_nome || null,
    status || null,
    status || null,
    id
  ], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'Movimentação atualizada com sucesso' });
  });
});

router.post('/receber/:id/baixar', (req, res) => {
  const { id } = req.params;
  db.get('SELECT id, tipo, status FROM financeiro WHERE id = ?', [id], (err, row) => {
    if (err) {
      res.status(500).json({ success: false, error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ success: false, error: 'Movimentação não encontrada.' });
      return;
    }
    if (['recebido', 'pago'].includes(row.status)) {
      res.status(400).json({ success: false, error: 'Esta movimentação já foi baixada.' });
      return;
    }
    const novoStatus = row.tipo === 'receita' ? 'recebido' : 'pago';
    db.run(`UPDATE financeiro SET status = ?, baixado_em = DATE('now') WHERE id = ?`, [novoStatus, id], (upErr) => {
      if (upErr) {
        res.status(500).json({ success: false, error: upErr.message });
        return;
      }
      res.json({ success: true, message: 'Recebimento baixado com sucesso.', status: novoStatus });
    });
  });
});

router.post('/pagar/:id/baixar', (req, res) => {
  const { id } = req.params;
  db.get('SELECT id, tipo, status FROM financeiro WHERE id = ?', [id], (err, row) => {
    if (err) {
      res.status(500).json({ success: false, error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ success: false, error: 'Movimentação não encontrada.' });
      return;
    }
    if (['recebido', 'pago'].includes(row.status)) {
      res.status(400).json({ success: false, error: 'Esta movimentação já foi baixada.' });
      return;
    }
    const novoStatus = row.tipo === 'receita' ? 'recebido' : 'pago';
    db.run(`UPDATE financeiro SET status = ?, baixado_em = DATE('now') WHERE id = ?`, [novoStatus, id], (upErr) => {
      if (upErr) {
        res.status(500).json({ success: false, error: upErr.message });
        return;
      }
      res.json({ success: true, message: 'Pagamento baixado com sucesso.', status: novoStatus });
    });
  });
});

router.get('/dashboard', async (req, res) => {
  const { dataInicio, dataFim } = req.query;
  const params = [];
  let periodoFiltro = '';

  if (dataInicio && dataFim) {
    periodoFiltro = ' AND COALESCE(vencimento, data_movimento) BETWEEN ? AND ?';
    params.push(dataInicio, dataFim);
  }

  const hoje = moment().format('YYYY-MM-DD');
  const daqui30 = moment().add(30, 'days').format('YYYY-MM-DD');

  const resumoSql = `
    SELECT
      COALESCE(SUM(CASE WHEN tipo = 'receita' AND status IN ('recebido','pago') THEN valor END), 0) AS totalRecebido,
      COALESCE(SUM(CASE WHEN tipo = 'despesa' AND status IN ('pago','recebido') THEN valor END), 0) AS totalPago,
      COALESCE(SUM(CASE WHEN tipo = 'receita' AND status NOT IN ('recebido','pago') THEN valor END), 0) AS totalReceber,
      COALESCE(SUM(CASE WHEN tipo = 'despesa' AND status NOT IN ('pago','recebido') THEN valor END), 0) AS totalPagar
    FROM financeiro
    WHERE 1 = 1
    ${periodoFiltro}
  `;

  const proximosRecebimentosSql = `
    SELECT
      id,
      descricao,
      valor,
      vencimento,
      pessoa_nome AS cliente,
      tipo,
      status
    FROM financeiro
    WHERE tipo = 'receita'
      AND status NOT IN ('recebido','pago')
      AND vencimento IS NOT NULL
      AND vencimento BETWEEN date('now') AND date('now', '+30 days')
    ORDER BY vencimento ASC
    LIMIT 10
  `;

  const proximosPagamentosSql = `
    SELECT
      id,
      descricao,
      valor,
      vencimento,
      pessoa_nome AS fornecedor,
      tipo,
      status
    FROM financeiro
    WHERE tipo = 'despesa'
      AND status NOT IN ('recebido','pago')
      AND vencimento IS NOT NULL
      AND vencimento BETWEEN date('now') AND date('now', '+30 days')
    ORDER BY vencimento ASC
    LIMIT 10
  `;

  const alertasSql = `
    SELECT
      id,
      descricao,
      valor,
      vencimento,
      pessoa_nome AS pessoa,
      tipo,
      status,
      CASE WHEN status NOT IN ('recebido','pago') AND vencimento < date('now') THEN 'vencido' ELSE status END AS status_exibicao
    FROM financeiro
    WHERE status NOT IN ('recebido','pago')
      AND vencimento IS NOT NULL
      AND vencimento < date('now')
    ORDER BY vencimento ASC
    LIMIT 10
  `;

  const graficoSql = `
    SELECT
      COALESCE(SUM(CASE WHEN tipo = 'receita' AND status IN ('recebido','pago') THEN valor END), 0) AS recebido,
      COALESCE(SUM(CASE WHEN tipo = 'despesa' AND status IN ('pago','recebido') THEN valor END), 0) AS pago,
      COALESCE(SUM(CASE WHEN tipo = 'receita' AND status NOT IN ('recebido','pago') THEN valor END), 0) AS receber,
      COALESCE(SUM(CASE WHEN tipo = 'despesa' AND status NOT IN ('pago','recebido') THEN valor END), 0) AS pagar
    FROM financeiro
    WHERE 1 = 1
    ${periodoFiltro}
  `;

  try {
    const resumo = await dbGetAsync(resumoSql, params);
    const proximosRecebimentos = await dbAllAsync(proximosRecebimentosSql, []);
    const proximosPagamentos = await dbAllAsync(proximosPagamentosSql, []);
    const alertas = await dbAllAsync(alertasSql, []);
    const grafico = await dbGetAsync(graficoSql, params);

    res.json({
      success: true,
      resumo: {
        totalRecebido: parseNumber(resumo.totalRecebido),
        totalPago: parseNumber(resumo.totalPago),
        totalReceber: parseNumber(resumo.totalReceber),
        totalPagar: parseNumber(resumo.totalPagar)
      },
      proximos_recebimentos: proximosRecebimentos.map(row => ({
        id: row.id,
        descricao: row.descricao,
        valor: parseNumber(row.valor),
        dataVencimento: row.vencimento,
        cliente: row.cliente,
        status: row.status
      })),
      proximos_pagamentos: proximosPagamentos.map(row => ({
        id: row.id,
        descricao: row.descricao,
        valor: parseNumber(row.valor),
        dataVencimento: row.vencimento,
        fornecedor: row.fornecedor,
        status: row.status
      })),
      alertas: alertas.map(row => ({
        id: row.id,
        descricao: row.descricao,
        valor: parseNumber(row.valor),
        dataVencimento: row.vencimento,
        pessoa: row.pessoa,
        tipo: row.tipo,
        status: row.status_exibicao
      })),
      grafico: {
        recebido: parseNumber(grafico.recebido),
        pago: parseNumber(grafico.pago),
        receber: parseNumber(grafico.receber),
        pagar: parseNumber(grafico.pagar)
      }
    });
  } catch (err) {
    console.error('Erro no endpoint dashboard:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/proximos-vencimentos', (req, res) => {
  const hoje = new Date();
  const daqui7dias = new Date(hoje.getTime() + (7 * 24 * 60 * 60 * 1000));

  db.all(`
    SELECT
      id,
      descricao,
      valor,
      vencimento,
      pessoa_nome as cliente,
      tipo,
      JULIANDAY(vencimento) - JULIANDAY('now') as diasRestantes
    FROM financeiro
    WHERE vencimento IS NOT NULL
      AND status NOT IN ('recebido', 'pago')
      AND vencimento >= date('now')
      AND vencimento <= date('now', '+30 days')
    ORDER BY vencimento ASC
    LIMIT 10
  `, [], (err, rows) => {
    if (err) {
      console.error('Erro na query próximos vencimentos:', err);
      res.status(500).json({ error: err.message });
      return;
    }

    const vencimentos = rows.map(row => ({
      id: row.id,
      descricao: row.descricao,
      valor: parseNumber(row.valor),
      dataVencimento: row.vencimento,
      cliente: row.cliente,
      diasRestantes: Math.ceil(parseNumber(row.diasRestantes))
    }));

    res.json({
      success: true,
      vencimentos: vencimentos
    });
  });
});

router.get('/ultimas-movimentacoes', (req, res) => {
  db.all(`
    SELECT
      id,
      descricao,
      valor,
      data_movimento,
      pessoa_nome as cliente,
      tipo,
      status
    FROM financeiro
    ORDER BY data_movimento DESC
    LIMIT 10
  `, [], (err, rows) => {
    if (err) {
      console.error('Erro na query últimas movimentações:', err);
      res.status(500).json({ error: err.message });
      return;
    }

    const movimentacoes = rows.map(row => ({
      id: row.id,
      descricao: row.descricao,
      valor: parseNumber(row.valor),
      dataMovimento: row.data_movimento,
      cliente: row.cliente,
      tipo: row.tipo,
      status: row.status
    }));

    res.json({
      success: true,
      movimentacoes: movimentacoes
    });
  });
});

function buildReceberQueryFilters(query) {
  const { dataInicio, dataFim, status, cliente, documento } = query;
  let sql = `
    SELECT
      id,
      descricao,
      valor,
      data_movimento as dataEmissao,
      vencimento as dataVencimento,
      pessoa_nome as cliente,
      status,
      observacao,
      documento,
      numero_parcela,
      total_parcelas,
      origem
    FROM financeiro
    WHERE tipo = 'receita'
  `;
  const params = [];

  if (dataInicio && dataFim) {
    sql += ' AND COALESCE(vencimento, data_movimento) BETWEEN ? AND ?';
    params.push(dataInicio, dataFim);
  }

  if (status && status !== 'todas') {
    if (status === 'vencidas') {
      sql += " AND status NOT IN ('recebido','pago') AND COALESCE(vencimento, data_movimento) < date('now')";
    } else if (status === 'a_vencer') {
      sql += " AND status NOT IN ('recebido','pago') AND COALESCE(vencimento, data_movimento) >= date('now')";
    } else if (status === 'recebidas') {
      sql += " AND status IN ('recebido','pago')";
    } else {
      sql += ' AND status = ?';
      params.push(status);
    }
  }

  if (cliente) {
    sql += ' AND pessoa_nome = ?';
    params.push(cliente);
  }

  if (documento) {
    sql += ' AND documento LIKE ?';
    params.push(`%${documento}%`);
  }

  sql += ' ORDER BY COALESCE(vencimento, data_movimento) DESC';

  return { sql, params };
}

router.get('/receber', (req, res) => {
  const { sql, params } = buildReceberQueryFilters(req.query);

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error('Erro na query receber:', err);
      res.status(500).json({ error: err.message });
      return;
    }

    const hoje = moment().format('YYYY-MM-DD');
    const contas = rows.map(row => {
      let status = row.status;
      if (!['recebido', 'pago'].includes(status) && row.vencimento && row.vencimento < hoje) {
        status = 'vencido';
      }
      return {
        id: row.id,
        descricao: row.descricao,
        valor: parseNumber(row.valor),
        dataEmissao: row.dataEmissao,
        dataVencimento: row.dataVencimento,
        cliente: row.cliente,
        status: status,
        observacao: row.observacao,
        documento: row.documento,
        numero_parcela: row.numero_parcela,
        total_parcelas: row.total_parcelas,
        origem: row.origem
      };
    });

    res.json({
      success: true,
      contas: contas
    });
  });
});

router.get('/contas-receber', (req, res) => {
  const { sql, params } = buildReceberQueryFilters(req.query);

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error('Erro na query contas receber:', err);
      res.status(500).json({ error: err.message });
      return;
    }

    const hoje = moment().format('YYYY-MM-DD');
    const contas = rows.map(row => {
      let status = row.status;
      if (!['recebido', 'pago'].includes(status) && row.vencimento && row.vencimento < hoje) {
        status = 'vencido';
      }
      return {
        id: row.id,
        descricao: row.descricao,
        valor: parseNumber(row.valor),
        dataEmissao: row.dataEmissao,
        dataVencimento: row.dataVencimento,
        cliente: row.cliente,
        status: status,
        observacao: row.observacao
      };
    });

    res.json({
      success: true,
      contas: contas
    });
  });
});

function buildReceberQueryFilters(query) {
  const { dataInicio, dataFim, status, cliente, documento } = query;
  let sql = `
    SELECT
      id,
      descricao,
      valor,
      data_movimento as dataEmissao,
      vencimento as dataVencimento,
      pessoa_nome as cliente,
      status,
      observacao
    FROM financeiro
    WHERE tipo = 'receita'
  `;
  const params = [];

  if (dataInicio && dataFim) {
    sql += ' AND COALESCE(vencimento, data_movimento) BETWEEN ? AND ?';
    params.push(dataInicio, dataFim);
  }

  if (status && status !== 'todas') {
    if (status === 'vencidas') {
      sql += " AND status NOT IN ('recebido','pago') AND COALESCE(vencimento, data_movimento) < date('now')";
    } else if (status === 'a_vencer') {
      sql += " AND status NOT IN ('recebido','pago') AND COALESCE(vencimento, data_movimento) >= date('now')";
    } else {
      sql += ' AND status = ?';
      params.push(status);
    }
  }

  if (cliente) {
    sql += ' AND pessoa_nome = ?';
    params.push(cliente);
  }

  if (documento) {
    sql += ' AND documento LIKE ?';
    params.push(`%${documento}%`);
  }

  sql += ' ORDER BY COALESCE(vencimento, data_movimento) DESC';
  return { sql, params };
}

function buildPagarQueryFilters(query) {
  const { dataInicio, dataFim, status, fornecedor, documento, categoria } = query;
  let sql = `
    SELECT
      id,
      descricao,
      valor,
      data_movimento as dataEmissao,
      vencimento as dataVencimento,
      pessoa_nome as fornecedor,
      categoria,
      status,
      observacao,
      documento,
      numero_parcela,
      total_parcelas,
      origem
    FROM financeiro
    WHERE tipo = 'despesa'
  `;
  const params = [];

  if (dataInicio && dataFim) {
    sql += ' AND COALESCE(vencimento, data_movimento) BETWEEN ? AND ?';
    params.push(dataInicio, dataFim);
  }

  if (status && status !== 'todos') {
    if (status === 'vencido') {
      sql += " AND status NOT IN ('recebido','pago') AND COALESCE(vencimento, data_movimento) < date('now')";
    } else if (status === 'a_vencer') {
      sql += " AND status NOT IN ('recebido','pago') AND COALESCE(vencimento, data_movimento) >= date('now')";
    } else {
      sql += ' AND status = ?';
      params.push(status);
    }
  }

  if (fornecedor) {
    sql += ' AND pessoa_nome = ?';
    params.push(fornecedor);
  }

  if (categoria) {
    sql += ' AND categoria = ?';
    params.push(categoria);
  }

  if (documento) {
    sql += ' AND documento LIKE ?';
    params.push(`%${documento}%`);
  }

  sql += ' ORDER BY COALESCE(vencimento, data_movimento) DESC';
  return { sql, params };
}

router.get('/pagar', (req, res) => {
  const { sql, params } = buildPagarQueryFilters(req.query);

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error('Erro na query pagar:', err);
      res.status(500).json({ error: err.message });
      return;
    }

    const hoje = moment().format('YYYY-MM-DD');
    const contas = rows.map(row => {
      let status = row.status;
      if (!['recebido', 'pago'].includes(status) && row.vencimento && row.vencimento < hoje) {
        status = 'vencido';
      }
      return {
        id: row.id,
        descricao: row.descricao,
        valor: parseNumber(row.valor),
        dataEmissao: row.dataEmissao,
        dataVencimento: row.dataVencimento,
        fornecedor: row.fornecedor,
        categoria: row.categoria,
        status: status,
        observacao: row.observacao,
        documento: row.documento,
        numero_parcela: row.numero_parcela,
        total_parcelas: row.total_parcelas,
        origem: row.origem
      };
    });

    res.json({
      success: true,
      contas: contas
    });
  });
});

router.get('/contas-pagar', (req, res) => {
  const { sql, params } = buildPagarQueryFilters(req.query);

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error('Erro na query contas pagar:', err);
      res.status(500).json({ error: err.message });
      return;
    }

    const hoje = moment().format('YYYY-MM-DD');
    const contas = rows.map(row => {
      let status = row.status;
      if (!['recebido', 'pago'].includes(status) && row.vencimento && row.vencimento < hoje) {
        status = 'vencido';
      }
      return {
        id: row.id,
        descricao: row.descricao,
        valor: parseNumber(row.valor),
        dataEmissao: row.dataEmissao,
        dataVencimento: row.dataVencimento,
        fornecedor: row.fornecedor,
        categoria: row.categoria,
        status: status,
        observacao: row.observacao
      };
    });

    res.json({
      success: true,
      contas: contas
    });
  });
});

// ========== RELATÓRIOS ==========

// Relatório de Resumo Financeiro
router.get('/relatorios/resumo', (req, res) => {
  const { dataInicio, dataFim } = req.query;

  let sql = `
    SELECT
      tipo,
      status,
      SUM(valor) as total,
      COUNT(*) as quantidade
    FROM financeiro
    WHERE 1=1
  `;

  const params = [];

  if (dataInicio && dataFim) {
    sql += ' AND data_movimento BETWEEN ? AND ?';
    params.push(dataInicio, dataFim);
  }

  sql += ' GROUP BY tipo, status ORDER BY tipo, status';

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error('Erro no relatório resumo:', err);
      res.status(500).json({ error: err.message });
      return;
    }

    const resumo = {
      receitas: {
        total: 0,
        recebidas: 0,
        pendentes: 0,
        quantidade: 0
      },
      despesas: {
        total: 0,
        pagas: 0,
        pendentes: 0,
        quantidade: 0
      }
    };

    rows.forEach(row => {
      const valor = parseNumber(row.total);
      if (row.tipo === 'receita') {
        resumo.receitas.total += valor;
        resumo.receitas.quantidade += row.quantidade;
        if (row.status === 'recebido') {
          resumo.receitas.recebidas += valor;
        } else {
          resumo.receitas.pendentes += valor;
        }
      } else if (row.tipo === 'despesa') {
        resumo.despesas.total += valor;
        resumo.despesas.quantidade += row.quantidade;
        if (row.status === 'pago') {
          resumo.despesas.pagas += valor;
        } else {
          resumo.despesas.pendentes += valor;
        }
      }
    });

    res.json({
      success: true,
      resumo: resumo,
      periodo: { dataInicio, dataFim }
    });
  });
});

// Relatório de Contas a Receber
router.get('/relatorios/receber', (req, res) => {
  const { dataInicio, dataFim, status, cliente } = req.query;

  let sql = `
    SELECT
      id,
      descricao,
      documento,
      valor,
      data_movimento,
      vencimento,
      status,
      origem,
      pessoa_nome
    FROM financeiro
    WHERE tipo = 'receita'
  `;

  const params = [];

  if (dataInicio && dataFim) {
    sql += ' AND date(COALESCE(vencimento, data_movimento)) BETWEEN date(?) AND date(?)';
    params.push(dataInicio, dataFim);
  }

  if (status && status !== 'todas') {
    if (status === 'vencido') {
      sql += " AND status NOT IN ('recebido','pago') AND date(COALESCE(vencimento, data_movimento)) < date('now')";
    } else {
      sql += ' AND status = ?';
      params.push(status);
    }
  }

  if (cliente && cliente.trim() !== '') {
    sql += ' AND COALESCE(pessoa_nome, "") LIKE ?';
    params.push(`%${cliente.trim()}%`);
  }

  sql += ' ORDER BY date(COALESCE(vencimento, data_movimento)) DESC, id DESC';

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error('Erro no relatório receber:', err);
      return res.status(500).json({ success: false, error: err.message });
    }

    const hoje = moment().format('YYYY-MM-DD');

    const contas = (rows || []).map(row => {
      let statusFinal = row.status || 'pendente';

      if (
        !['recebido', 'pago'].includes(statusFinal) &&
        row.vencimento &&
        row.vencimento < hoje
      ) {
        statusFinal = 'vencido';
      }

      return {
        id: row.id,
        cliente: row.pessoa_nome || '',
        descricao: row.descricao || '',
        documento: row.documento || '',
        valor: parseNumber(row.valor),
        dataEmissao: row.data_movimento || null,
        dataVencimento: row.vencimento || null,
        status: statusFinal,
        origem: row.origem || ''
      };
    });

    return res.json({
      success: true,
      contas,
      periodo: { dataInicio, dataFim }
    });
  });
});

// Relatório de Contas a Pagar
router.get('/relatorios/pagar', (req, res) => {
  const { sql, params } = buildPagarQueryFilters(req.query);

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error('Erro no relatório pagar:', err);
      return res.status(500).json({ success: false, error: err.message });
    }

    const hoje = moment().format('YYYY-MM-DD');

    const contas = (rows || []).map(row => {
      let statusFinal = row.status || 'pendente';

      if (
        !['recebido', 'pago'].includes(statusFinal) &&
        row.dataVencimento &&
        row.dataVencimento < hoje
      ) {
        statusFinal = 'vencido';
      }

      return {
        id: row.id,
        fornecedor: row.fornecedor || row.pessoa_nome || '',
        descricao: row.descricao || '',
        documento: row.documento || '',
        valor: parseNumber(row.valor),
        dataEmissao: row.dataEmissao || null,
        dataVencimento: row.dataVencimento || null,
        status: statusFinal,
        categoria: row.categoria || '',
        observacao: row.observacao || '',
        origem: row.origem || ''
      };
    });

    return res.json({
      success: true,
      contas,
      periodo: {
        dataInicio: req.query.dataInicio,
        dataFim: req.query.dataFim
      }
    });
  });
});

// Relatório de Inadimplência
router.get('/relatorios/inadimplencia', (req, res) => {
  const { dataInicio, dataFim } = req.query;

  let sql = `
    SELECT
      id,
      descricao,
      valor,
      vencimento,
      data_movimento,
      status,
      pessoa_nome
    FROM financeiro
    WHERE tipo = 'receita'
      AND status NOT IN ('recebido', 'pago')
      AND vencimento IS NOT NULL
  `;

  const params = [];

  if (dataInicio && dataFim) {
    sql += ' AND date(vencimento) BETWEEN date(?) AND date(?)';
    params.push(dataInicio, dataFim);
  }

  sql += ' ORDER BY date(vencimento) ASC';

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error('Erro no relatório inadimplência:', err);
      return res.status(500).json({ success: false, error: err.message });
    }

    const hoje = moment().startOf('day');

    const contasAtraso = [];
    let vencidas = 0;
    let vencer7dias = 0;
    let valorAtraso = 0;

    for (const row of rows || []) {
      const venc = moment(row.vencimento, 'YYYY-MM-DD');
      const diff = hoje.diff(venc, 'days');

      if (diff > 0) {
        vencidas += 1;
        valorAtraso += parseNumber(row.valor);

        contasAtraso.push({
          id: row.id,
          cliente: row.pessoa_nome || '',
          valor: parseNumber(row.valor),
          diasAtraso: diff,
          dataVencimento: row.vencimento
        });
      } else if (diff >= -7 && diff <= 0) {
        vencer7dias += 1;
      }
    }

    return res.json({
      success: true,
      vencidas,
      vencer7dias,
      valorAtraso,
      contasAtraso,
      periodo: { dataInicio, dataFim }
    });
  });
});

// Relatório de Fluxo Financeiro
router.get('/relatorios/fluxo', (req, res) => {
  const { dataInicio, dataFim } = req.query;

  let sql = `
    SELECT
      DATE(data_movimento) as data,
      tipo,
      SUM(valor) as valor
    FROM financeiro
    WHERE 1=1
  `;

  const params = [];

  if (dataInicio && dataFim) {
    sql += ' AND data_movimento BETWEEN ? AND ?';
    params.push(dataInicio, dataFim);
  }

  sql += ' GROUP BY DATE(data_movimento), tipo ORDER BY data';

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error('Erro no relatório fluxo:', err);
      res.status(500).json({ error: err.message });
      return;
    }

    const fluxo = {};
    rows.forEach(row => {
      if (!fluxo[row.data]) {
        fluxo[row.data] = { data: row.data, receitas: 0, despesas: 0, saldo: 0 };
      }
      if (row.tipo === 'receita') {
        fluxo[row.data].receitas = parseNumber(row.valor);
      } else if (row.tipo === 'despesa') {
        fluxo[row.data].despesas = parseNumber(row.valor);
      }
      fluxo[row.data].saldo = fluxo[row.data].receitas - fluxo[row.data].despesas;
    });

    const fluxoArray = Object.values(fluxo);

    res.json({
      success: true,
      entradas: fluxoArray.reduce((sum, item) => sum + item.receitas, 0),
      saidas: fluxoArray.reduce((sum, item) => sum + item.despesas, 0),
      periodo: { dataInicio, dataFim }
    });
  });
});

// Relatório de Inadimplência
router.get('/relatorios/inadimplencia', (req, res) => {
  const { dataInicio, dataFim } = req.query;

  let sql = `
    SELECT
      f.*,
      CASE
        WHEN f.tipo = 'receita' THEN c.nome
        WHEN f.tipo = 'despesa' THEN fo.nome
        ELSE f.pessoa_nome
      END as pessoa_nome,
      CASE
        WHEN f.tipo = 'receita' THEN 'cliente'
        WHEN f.tipo = 'despesa' THEN 'fornecedor'
        ELSE 'outros'
      END as tipo_pessoa,
      julianday('now') - julianday(f.vencimento) as dias_atraso
    FROM financeiro f
    LEFT JOIN clientes c ON f.pessoa_id = c.id AND f.tipo = 'receita'
    LEFT JOIN fornecedores fo ON f.pessoa_id = fo.id AND f.tipo = 'despesa'
    WHERE (f.status != 'recebido' AND f.status != 'pago') AND f.vencimento < date('now')
  `;

  const params = [];

  if (dataInicio && dataFim) {
    sql += ' AND f.data_movimento BETWEEN ? AND ?';
    params.push(dataInicio, dataFim);
  }

  sql += ' ORDER BY f.vencimento ASC';

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error('Erro no relatório inadimplência:', err);
      res.status(500).json({ error: err.message });
      return;
    }

    const inadimplentes = rows.map(row => ({
      id: row.id,
      pessoa: row.pessoa_nome,
      tipo_pessoa: row.tipo_pessoa,
      descricao: row.descricao,
      documento: row.documento,
      valor: parseNumber(row.valor),
      dataEmissao: row.data_movimento,
      dataVencimento: row.vencimento,
      status: row.status,
      dias_atraso: Math.floor(row.dias_atraso),
      tipo: row.tipo
    }));

    const vencidas = inadimplentes.filter(item => item.dias_atraso > 0).length;
    const vencer7dias = inadimplentes.filter(item => item.dias_atraso <= 7 && item.dias_atraso > 0).length;
    const valorAtraso = inadimplentes.reduce((sum, item) => sum + item.valor, 0);

    res.json({
      success: true,
      vencidas: vencidas,
      vencer7dias: vencer7dias,
      valorAtraso: valorAtraso,
      contasAtraso: inadimplentes,
      periodo: { dataInicio, dataFim }
    });
  });
});

router.get('/:id(\\d+)', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM financeiro WHERE id = ?', [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Movimentação não encontrada' });
      return;
    }
    res.json(row);
  });
});

router.delete('/:id(\\d+)', (req, res) => {
  const { id } = req.params;
  db.get('SELECT origem FROM financeiro WHERE id = ?', [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Movimentação não encontrada.' });
      return;
    }
    if (row.origem && row.origem !== 'manual') {
      res.status(400).json({ error: 'Movimentações automáticas devem ser removidas na origem (compra/venda).' });
      return;
    }
    db.run('DELETE FROM financeiro WHERE id = ?', [id], function(deleteErr) {
      if (deleteErr) {
        res.status(500).json({ error: deleteErr.message });
        return;
      }
      res.json({ message: 'Movimentação deletada com sucesso' });
    });
  });
});

module.exports = router;


