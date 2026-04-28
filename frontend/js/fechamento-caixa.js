function getToken() {
    return localStorage.getItem('token') || sessionStorage.getItem('token') || '';
}

function moeda(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

function numero(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', {
        minimumFractionDigits: 3,
        maximumFractionDigits: 3
    });
}

function hoje() {
    return new Date().toISOString().split('T')[0];
}

async function carregarFechamentoCaixa() {
    const dataInicio = document.getElementById('data_inicio').value || hoje();
    const dataFim = document.getElementById('data_fim').value || dataInicio;

    document.getElementById('data_inicio').value = dataInicio;
    document.getElementById('data_fim').value = dataFim;

    const token = getToken();

    const resCaixa = await fetch(`/api/vendas/relatorio/fechamento-caixa?data_inicio=${dataInicio}&data_fim=${dataFim}`, {
        headers: {
            'Authorization': `Bearer ${token}` 
        }
    });

    const caixa = await resCaixa.json();

    if (!resCaixa.ok) {
        alert(caixa.error || 'Erro ao carregar fechamento de caixa');
        return;
    }

    document.getElementById('total_vendido').textContent = moeda(caixa.resumo.total_vendido);
    document.getElementById('quantidade_vendas').textContent = caixa.resumo.quantidade_vendas || 0;
    document.getElementById('total_descontos').textContent = moeda(caixa.resumo.total_descontos);
    document.getElementById('ticket_medio').textContent = moeda(caixa.resumo.ticket_medio);

    const tabelaPagamentos = document.getElementById('tabela_pagamentos');
    tabelaPagamentos.innerHTML = '';

    if (!caixa.pagamentos || caixa.pagamentos.length === 0) {
        tabelaPagamentos.innerHTML = `
            <tr>
                <td colspan="3">Nenhuma venda encontrada.</td>
            </tr>
        `;
    } else {
        caixa.pagamentos.forEach(item => {
            tabelaPagamentos.innerHTML += `
                <tr>
                    <td>${item.forma_pagamento || '-'}</td>
                    <td>${item.quantidade || 0}</td>
                    <td>${moeda(item.total)}</td>
                </tr>
            `;
        });
    }

    await carregarProdutosMaisVendidos(dataInicio, dataFim);
}

async function carregarProdutosMaisVendidos(dataInicio, dataFim) {
    const token = getToken();

    const resProdutos = await fetch(`/api/vendas/relatorio/produtos-mais-vendidos?data_inicio=${dataInicio}&data_fim=${dataFim}&limite=30`, {
        headers: {
            'Authorization': `Bearer ${token}` 
        }
    });

    const produtos = await resProdutos.json();

    if (!resProdutos.ok) {
        alert(produtos.error || 'Erro ao carregar produtos mais vendidos');
        return;
    }

    const tabelaProdutos = document.getElementById('tabela_produtos');
    tabelaProdutos.innerHTML = '';

    if (!produtos || produtos.length === 0) {
        tabelaProdutos.innerHTML = `
            <tr>
                <td colspan="6">Nenhum produto vendido no período.</td>
            </tr>
        `;
        return;
    }

    produtos.forEach(produto => {
        tabelaProdutos.innerHTML += `
            <tr>
                <td>${produto.produto_codigo || '-'}</td>
                <td>${produto.produto_nome || '-'}</td>
                <td>${produto.unidade || '-'}</td>
                <td>${numero(produto.quantidade_vendida)}</td>
                <td>${moeda(produto.total_vendido)}</td>
                <td>${moeda(produto.preco_medio)}</td>
            </tr>
        `;
    });
}

document.addEventListener('DOMContentLoaded', carregarFechamentoCaixa);
