function fcMoeda(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

function fcNumero(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', {
        minimumFractionDigits: 3,
        maximumFractionDigits: 3
    });
}

function fcHoje() {
    return new Date().toISOString().split('T')[0];
}

function initFechamentoCaixa() {
    const hoje = fcHoje();

    $('#fc_data_inicio').val(hoje);
    $('#fc_data_fim').val(hoje);

    carregarFechamentoCaixa();
}

async function carregarFechamentoCaixa() {
    const dataInicio = $('#fc_data_inicio').val() || fcHoje();
    const dataFim = $('#fc_data_fim').val() || dataInicio;

    try {
        const caixa = await $.get(`${API_URL}/vendas/relatorio/fechamento-caixa`, {
            data_inicio: dataInicio,
            data_fim: dataFim
        });

        $('#fc_total_vendido').text(fcMoeda(caixa.resumo.total_vendido));
        $('#fc_quantidade_vendas').text(caixa.resumo.quantidade_vendas || 0);
        $('#fc_total_descontos').text(fcMoeda(caixa.resumo.total_descontos));
        $('#fc_ticket_medio').text(fcMoeda(caixa.resumo.ticket_medio));

        renderPagamentosFechamento(caixa.pagamentos || []);

        const produtos = await $.get(`${API_URL}/vendas/relatorio/produtos-mais-vendidos`, {
            data_inicio: dataInicio,
            data_fim: dataFim
        });

        renderProdutosMaisVendidos(produtos || []);

    } catch (error) {
        console.error(error);
        showNotification('Erro ao carregar fechamento de caixa', 'danger');
    }
}

function renderPagamentosFechamento(lista) {
    const tbody = $('#fc_tabela_pagamentos');
    tbody.empty();

    if (!lista.length) {
        tbody.html(`
            <tr>
                <td colspan="3" class="text-center text-muted">
                    Nenhuma venda encontrada no período.
                </td>
            </tr>
        `);
        return;
    }

    lista.forEach(item => {
        tbody.append(`
            <tr>
                <td>${item.forma_pagamento || '-'}</td>
                <td>${item.quantidade || 0}</td>
                <td>${fcMoeda(item.total)}</td>
            </tr>
        `);
    });
}

function renderProdutosMaisVendidos(lista) {
    const tbody = $('#fc_tabela_produtos');
    tbody.empty();

    if (!lista.length) {
        tbody.html(`
            <tr>
                <td colspan="6" class="text-center text-muted">
                    Nenhum produto vendido no período.
                </td>
            </tr>
        `);
        return;
    }

    lista.forEach(produto => {
        tbody.append(`
            <tr>
                <td>${produto.codigo || '-'}</td>
                <td>${produto.nome || '-'}</td>
                <td>${produto.unidade || '-'}</td>
                <td>${fcNumero(produto.quantidade_vendida)}</td>
                <td>${fcMoeda(produto.total_vendido)}</td>
                <td>${fcMoeda(produto.preco_medio)}</td>
            </tr>
        `);
    });
}
