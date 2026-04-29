function moedaCaixa(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

function hojeCaixa() {
    const agora = new Date();

    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    const dia = String(agora.getDate()).padStart(2, '0');

    return `${ano}-${mes}-${dia}`;
}

function loadCaixa() {
    const html = `
        <div class="container-fluid">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2><i class="fas fa-cash-register"></i> Fechamento de Caixa</h2>
                    <small class="text-muted">Controle simples para mercadinho</small>
                </div>
            </div>

            <div class="card mb-3">
                <div class="card-body d-flex gap-2 align-items-end">
                    <div>
                        <label>Data do caixa</label>
                        <input type="date" id="data_caixa" class="form-control">
                    </div>

                    <button class="btn btn-primary" onclick="carregarFechamentoCaixa()">
                        Buscar
                    </button>
                </div>
            </div>

            <div class="card mb-3">
                <div class="card-body">
                    <button class="btn btn-success" onclick="abrirModalAbrirCaixa()">
                        Abrir Caixa
                    </button>

                    <button class="btn btn-warning" onclick="abrirModalSangria()">
                        Sangria
                    </button>

                    <button class="btn btn-danger" onclick="abrirModalFecharCaixa()">
                        Fechar Caixa
                    </button>

                    <button class="btn btn-primary" onclick="carregarFechamentoCaixa()">
                        Atualizar
                    </button>
                </div>
            </div>

            <div class="row mb-3">
                <div class="col-md-3">
                    <div class="card text-bg-dark">
                        <div class="card-body">
                            <h6>Valor Inicial</h6>
                            <h3 id="cx_valor_inicial">R$ 0,00</h3>
                        </div>
                    </div>
                </div>

                <div class="col-md-3">
                    <div class="card text-bg-success">
                        <div class="card-body">
                            <h6>Total Vendido</h6>
                            <h3 id="cx_total_vendas">R$ 0,00</h3>
                        </div>
                    </div>
                </div>

                <div class="col-md-3">
                    <div class="card text-bg-warning">
                        <div class="card-body">
                            <h6>Sangrias</h6>
                            <h3 id="cx_sangrias">R$ 0,00</h3>
                        </div>
                    </div>
                </div>

                <div class="col-md-3">
                    <div class="card text-bg-primary">
                        <div class="card-body">
                            <h6>Saldo Esperado</h6>
                            <h3 id="cx_saldo">R$ 0,00</h3>
                        </div>
                    </div>
                </div>

                <div class="col-md-3">
                    <div class="card text-bg-info">
                        <div class="card-body">
                            <h6>Dinheiro em Caixa</h6>
                            <h3 id="cx_dinheiro_caixa">R$ 0,00</h3>
                        </div>
                    </div>
                </div>

                <div class="col-md-3">
                    <div class="card text-bg-secondary">
                        <div class="card-body">
                            <h6>Recebido Digital</h6>
                            <h3 id="cx_recebido_digital">R$ 0,00</h3>
                        </div>
                    </div>
                </div>
            </div>

            <div class="alert alert-info" id="cx_status">Carregando caixa...</div>

            <div class="card mb-3">
                <div class="card-header"><strong>Formas de Pagamento</strong></div>
                <div class="card-body table-responsive">
                    <table class="table table-striped">
                        <thead>
                            <tr>
                                <th>Forma</th>
                                <th>Qtd.</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody id="cx_formas_pagamento"></tbody>
                    </table>
                </div>
            </div>

            <div class="card">
                <div class="card-header"><strong>Produtos Mais Vendidos</strong></div>
                <div class="card-body table-responsive">
                    <table class="table table-striped">
                        <thead>
                            <tr>
                                <th>Código</th>
                                <th>Produto</th>
                                <th>Unidade</th>
                                <th>Quantidade</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody id="cx_produtos"></tbody>
                    </table>
                </div>
            </div>
        </div>

        <div id="caixa-modals"></div>
    `;

    $('#page-content').html(html);
    carregarFechamentoCaixa();
}

function carregarFechamentoCaixa() {
    let data = $('#data_caixa').val();

    if (!data) {
        data = new Date().toISOString().split('T')[0];
        $('#data_caixa').val(data);
    }

    $.get(`${API_URL}/caixa/fechamento`, {
    data: $('#data_caixa').val(),
    _: Date.now()
}, function(dados) {
        $('#cx_valor_inicial').text(moedaCaixa(dados.valor_inicial));
        $('#cx_total_vendas').text(moedaCaixa(dados.total_vendas));
        $('#cx_sangrias').text(moedaCaixa(dados.total_sangrias));
        $('#cx_dinheiro_caixa').text(moedaCaixa(dados.dinheiro_em_caixa));
        $('#cx_recebido_digital').text(moedaCaixa(dados.recebido_digital));
        $('#cx_saldo').text(moedaCaixa(dados.saldo_geral));

        $('#cx_status')
            .removeClass('alert-info alert-success alert-danger')
            .addClass(dados.caixa_aberto ? 'alert-success' : 'alert-danger')
            .text(dados.caixa_aberto ? 'Caixa aberto' : 'Caixa fechado ou não aberto');

        let formasHtml = '';

        (dados.formas_pagamento || []).forEach(item => {
            formasHtml += `
                <tr>
                    <td>${item.forma_pagamento || '-'}</td>
                    <td>${item.quantidade || 0}</td>
                    <td>${moedaCaixa(item.total)}</td>
                </tr>
            `;
        });

        $('#cx_formas_pagamento').html(
            formasHtml || '<tr><td colspan="3" class="text-center">Nenhuma venda</td></tr>'
        );

        let produtosHtml = '';

        (dados.produtos_mais_vendidos || []).forEach(item => {
            produtosHtml += `
                <tr>
                    <td>${item.codigo || '-'}</td>
                    <td>${item.nome || '-'}</td>
                    <td>${item.unidade || '-'}</td>
                    <td>${Number(item.quantidade || 0).toFixed(3)}</td>
                    <td>${moedaCaixa(item.total)}</td>
                </tr>
            `;
        });

        $('#cx_produtos').html(
            produtosHtml || '<tr><td colspan="5" class="text-center">Nenhum produto vendido</td></tr>'
        );
    });
}

function abrirModalAbrirCaixa() {
    $('#caixa-modals').html(`
        <div class="modal fade" id="modalAbrirCaixa" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header"><h5>Abrir Caixa</h5></div>
                    <div class="modal-body">
                        <label>Valor inicial</label>
                        <input type="number" id="valor_inicial_caixa" class="form-control" step="0.01" min="0" value="0">
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button class="btn btn-success" onclick="confirmarAbrirCaixa()">Abrir</button>
                    </div>
                </div>
            </div>
        </div>
    `);

    new bootstrap.Modal(document.getElementById('modalAbrirCaixa')).show();
}

function confirmarAbrirCaixa() {
    $.post(`${API_URL}/caixa/abrir`, {
        valor_inicial: Number($('#valor_inicial_caixa').val() || 0)
    })
    .done(() => {
        bootstrap.Modal.getInstance(document.getElementById('modalAbrirCaixa')).hide();
        showNotification('Caixa aberto com sucesso.', 'success');
        carregarFechamentoCaixa();
    })
    .fail(xhr => {
        showNotification(xhr.responseJSON?.error || 'Erro ao abrir caixa.', 'danger');
    });
}

function abrirModalSangria() {
    $('#caixa-modals').html(`
        <div class="modal fade" id="modalSangria" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header"><h5>Registrar Sangria</h5></div>
                    <div class="modal-body">
                        <label>Valor</label>
                        <input type="number" id="valor_sangria" class="form-control mb-2" step="0.01" min="0">

                        <label>Motivo</label>
                        <input type="text" id="motivo_sangria" class="form-control" value="Retirada de dinheiro">
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button class="btn btn-warning" onclick="confirmarSangria()">Registrar</button>
                    </div>
                </div>
            </div>
        </div>
    `);

    new bootstrap.Modal(document.getElementById('modalSangria'), {
        backdrop: 'static'
    }).show();
}

function confirmarSangria() {
    const valor = Number($('#valor_sangria').val() || 0);
    const motivo = $('#motivo_sangria').val();

    if (valor <= 0) {
        showNotification('Informe um valor válido.', 'warning');
        return;
    }

    $.post(`${API_URL}/caixa/sangria`, {
        valor,
        motivo
    })
    .done(() => {
        document.activeElement.blur();

        const modalEl = document.getElementById('modalSangria');
        const modal = bootstrap.Modal.getInstance(modalEl);

        if (modal) modal.hide();

        setTimeout(() => {
            $('.modal-backdrop').remove();
            $('body').removeClass('modal-open').css('padding-right', '');

            carregarFechamentoCaixa();
        }, 300);

        showNotification('Sangria registrada com sucesso.', 'success');
    })
    .fail((xhr) => {
        console.error(xhr.responseText);

        showNotification(
            xhr.responseJSON?.error || 'Erro ao registrar sangria.',
            'danger'
        );
    });
}

function abrirModalFecharCaixa() {
    $('#caixa-modals').html(`
        <div class="modal fade" id="modalFecharCaixa" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header"><h5>Fechar Caixa</h5></div>
                    <div class="modal-body">
                        <label>Valor contado no caixa</label>
                        <input type="number" id="valor_fechamento_caixa" class="form-control mb-2" step="0.01" min="0">

                        <label>Observação</label>
                        <textarea id="observacao_fechamento" class="form-control"></textarea>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button class="btn btn-danger" onclick="confirmarFecharCaixa()">Fechar Caixa</button>
                    </div>
                </div>
            </div>
        </div>
    `);

    new bootstrap.Modal(document.getElementById('modalFecharCaixa')).show();
}

function confirmarFecharCaixa() {
    $.post(`${API_URL}/caixa/fechar`, {
        valor_informado: Number($('#valor_fechamento_caixa').val() || 0),
        observacao: $('#observacao_fechamento').val()
    })
    .done(res => {
        bootstrap.Modal.getInstance(document.getElementById('modalFecharCaixa')).hide();
        showNotification(`Caixa fechado. Diferença: ${moedaCaixa(res.diferenca)}`, 'success');
        carregarFechamentoCaixa();
    })
    .fail(xhr => {
        showNotification(xhr.responseJSON?.error || 'Erro ao fechar caixa.', 'danger');
    });
}