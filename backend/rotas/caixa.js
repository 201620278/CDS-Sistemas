const express = require('express');
const router = express.Router();
const db = require('../database');

function hojeBR() {
    const agora = new Date();

    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    const dia = String(agora.getDate()).padStart(2, '0');

    return `${ano}-${mes}-${dia}`;
}

// ABRIR CAIXA
router.post('/abrir', (req, res) => {
    const data = hojeBR();
    const valorInicial = Number(req.body.valor_inicial || 0);

    if (valorInicial < 0) {
        return res.status(400).json({ error: 'Valor inicial inválido.' });
    }

    db.get(`SELECT * FROM caixa WHERE data = ? AND status = 'aberto'`, [data], (err, caixa) => {
        if (err) return res.status(500).json({ error: err.message });

        if (caixa) {
            return res.status(400).json({ error: 'Já existe um caixa aberto hoje.' });
        }

        db.run(`
            INSERT INTO caixa (data, valor_inicial, total_sangrias, status, aberto_em)
            VALUES (?, ?, 0, 'aberto', CURRENT_TIMESTAMP)
        `, [data, valorInicial], function(err) {
            if (err) return res.status(500).json({ error: err.message });

            res.json({
                success: true,
                id: this.lastID,
                message: 'Caixa aberto com sucesso.'
            });
        });
    });
});

// SANGRIA
router.post('/sangria', (req, res) => {
    const data = hojeBR();
    const valor = Number(req.body.valor || 0);
    const motivo = req.body.motivo || 'Sangria de caixa';

    if (valor <= 0) {
        return res.status(400).json({ error: 'Informe um valor válido para sangria.' });
    }

    db.get(`SELECT * FROM caixa WHERE data = ? AND status = 'aberto'`, [data], (err, caixa) => {
        if (err) return res.status(500).json({ error: err.message });

        if (!caixa) {
            return res.status(400).json({ error: 'Nenhum caixa aberto hoje.' });
        }

        db.run(`
            INSERT INTO caixa_movimentacoes (caixa_id, tipo, valor, motivo)
            VALUES (?, 'sangria', ?, ?)
        `, [caixa.id, valor, motivo], function(err) {
            if (err) return res.status(500).json({ error: err.message });

            db.run(`
                UPDATE caixa 
                SET total_sangrias = total_sangrias + ?
                WHERE id = ?
            `, [valor, caixa.id], function(err) {
                if (err) return res.status(500).json({ error: err.message });

                res.json({ success: true, message: 'Sangria registrada.' });
            });
        });
    });
});

// RESUMO / FECHAMENTO
router.get('/fechamento', (req, res) => {
    const data = req.query.data || hojeBR();

    db.get(`SELECT * FROM caixa WHERE data = ? ORDER BY id DESC LIMIT 1`, [data], (err, caixa) => {
        if (err) return res.status(500).json({ error: err.message });

        if (!caixa) {
            return res.json({
                caixa_aberto: false,
                valor_inicial: 0,
                total_vendas: 0,
                total_sangrias: 0,
                saldo_esperado: 0,
                formas_pagamento: [],
                produtos_mais_vendidos: []
            });
        }

        db.get(`
            SELECT 
                COUNT(*) AS quantidade_vendas,
                COALESCE(SUM(total), 0) AS total_vendas
            FROM vendas
            WHERE DATE(data_venda) = DATE(?)
        `, [data], (err, vendas) => {
            if (err) return res.status(500).json({ error: err.message });

            db.all(`
                SELECT 
                    forma_pagamento,
                    COUNT(*) AS quantidade,
                    COALESCE(SUM(total), 0) AS total
                FROM vendas
                WHERE DATE(data_venda) = DATE(?)
                GROUP BY forma_pagamento
                ORDER BY total DESC
            `, [data], (err, formas) => {
                if (err) return res.status(500).json({ error: err.message });

                db.all(`
                    SELECT 
                        p.codigo,
                        p.nome,
                        p.unidade,
                        COALESCE(SUM(vi.quantidade), 0) AS quantidade,
                        COALESCE(SUM(vi.subtotal), 0) AS total
                    FROM vendas_itens vi
                    INNER JOIN vendas v ON v.id = vi.venda_id
                    INNER JOIN produtos p ON p.id = vi.produto_id
                    WHERE DATE(v.data_venda) = DATE(?)
                    GROUP BY p.id
                    ORDER BY quantidade DESC
                    LIMIT 20
                `, [data], (err, produtos) => {
                    if (err) return res.status(500).json({ error: err.message });

                    const totalVendas = Number(vendas.total_vendas || 0);
                    const valorInicial = Number(caixa.valor_inicial || 0);
                    const sangrias = Number(caixa.total_sangrias || 0);

                    const vendasDinheiro = (formas || [])
                        .filter(f => f.forma_pagamento === 'dinheiro')
                        .reduce((total, f) => total + Number(f.total || 0), 0);

                    const recebidoDigital = (formas || [])
                        .filter(f => f.forma_pagamento !== 'dinheiro')
                        .reduce((total, f) => total + Number(f.total || 0), 0);

                    const dinheiroEmCaixa = valorInicial + vendasDinheiro - sangrias;

                    const saldoGeral = valorInicial + totalVendas - sangrias;

                    res.json({
                        caixa_aberto: caixa.status === 'aberto',
                        status: caixa.status,
                        valor_inicial: valorInicial,
                        quantidade_vendas: vendas.quantidade_vendas || 0,
                        total_vendas: totalVendas,
                        total_sangrias: sangrias,
                        vendas_dinheiro: vendasDinheiro,
                        recebido_digital: recebidoDigital,
                        dinheiro_em_caixa: dinheiroEmCaixa,
                        saldo_geral: saldoGeral,
                        saldo_esperado: saldoGeral,
                        formas_pagamento: formas || [],
                        produtos_mais_vendidos: produtos || []
                    });
                });
            });
        });
    });
});

// FECHAR CAIXA
router.post('/fechar', (req, res) => {
    const data = hojeBR();
    const valorInformado = Number(req.body.valor_informado || 0);
    const observacao = req.body.observacao || '';

    db.get(`SELECT * FROM caixa WHERE data = ? AND status = 'aberto'`, [data], (err, caixa) => {
        if (err) return res.status(500).json({ error: err.message });

        if (!caixa) {
            return res.status(400).json({ error: 'Nenhum caixa aberto para fechar.' });
        }

        db.get(`
            SELECT COALESCE(SUM(total), 0) AS total_vendas
            FROM vendas
            WHERE DATE(data_venda) = DATE(?)
        `, [data], (err, vendas) => {
            if (err) return res.status(500).json({ error: err.message });

            const saldoEsperado =
                Number(caixa.valor_inicial || 0) +
                Number(vendas.total_vendas || 0) -
                Number(caixa.total_sangrias || 0);

            const diferenca = valorInformado - saldoEsperado;

            db.run(`
                UPDATE caixa
                SET status = 'fechado',
                    valor_fechamento = ?,
                    saldo_esperado = ?,
                    diferenca = ?,
                    observacao = ?,
                    fechado_em = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [valorInformado, saldoEsperado, diferenca, observacao, caixa.id], function(err) {
                if (err) return res.status(500).json({ error: err.message });

                res.json({
                    success: true,
                    saldo_esperado: saldoEsperado,
                    valor_informado: valorInformado,
                    diferenca
                });
            });
        });
    });
});

module.exports = router;