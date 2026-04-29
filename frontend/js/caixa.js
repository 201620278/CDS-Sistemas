function loadCaixa() {
  $('#page-content').html(`
    <div class="container-fluid">
      <h2 class="mb-3">Fechamento de Caixa</h2>

      <div id="status-caixa-area" class="mb-3"></div>
      <div id="caixa-area"></div>
    </div>
  `);

  carregarCaixaAberto();
}

function dinheiro(v) {
  return formatCurrency(Number(v || 0));
}

function carregarCaixaAberto() {
  $.get(`${API_URL}/caixa/aberto`, function(resumo) {
    if (!resumo) {
      renderStatusCaixa(null);
      renderAbrirCaixa();
      return;
    }

    renderStatusCaixa(resumo);
    renderCaixaAberto(resumo);
  }).fail(function(xhr) {
    showNotification(xhr.responseJSON?.error || 'Erro ao carregar caixa.', 'danger');
  });
}

function formatarHora(dataTexto) {
  if (!dataTexto) return '--:--';

  const data = new Date(String(dataTexto).replace(' ', 'T'));

  if (isNaN(data.getTime())) {
    return String(dataTexto).slice(11, 16) || '--:--';
  }

  return data.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

function renderStatusCaixa(resumo) {
  if (!resumo) {
    $('#status-caixa-area').html(`
      <div class="alert alert-danger d-flex align-items-center justify-content-between">
        <strong>🔴 Caixa Fechado</strong>
        <span>Abra o caixa para iniciar as vendas e movimentações.</span>
      </div>
    `);
    return;
  }

  $('#status-caixa-area').html(`
    <div class="alert alert-success d-flex align-items-center justify-content-between">
      <strong>🟢 Caixa Aberto</strong>
      <span>Aberto desde ${formatarHora(resumo.caixa.aberto_em)}</span>
    </div>
  `);
}

function renderAbrirCaixa() {
  $('#caixa-area').html(`
    <div class="card">
      <div class="card-header">
        <strong>Abrir Caixa</strong>
      </div>
      <div class="card-body">
        <label>Valor inicial em dinheiro</label>

        <input 
          type="text"
          inputmode="decimal"
          id="valor-inicial-caixa"
          class="form-control mb-3"
          placeholder="Ex: 50,00"
          autocomplete="off"
        >

        <button type="button" class="btn btn-success" onclick="abrirCaixa()">
          Abrir Caixa
        </button>
      </div>
    </div>
  `);

  setTimeout(() => {
    $('#valor-inicial-caixa').focus();
  }, 100);
}

function pegarValorCampo(id) {
  let valor = String($(id).val() || '')
    .replace(/\./g, '')
    .replace(',', '.');

  return Number(valor || 0);
}

function renderCaixaAberto(resumo) {
  const d = resumo.dinheiro;
  const digital = resumo.digital;

  $('#caixa-area').html(`
    <div class="row">
      <div class="col-md-4">
        <div class="card mb-3">
          <div class="card-header bg-dark text-white">
            Dinheiro Físico
          </div>
          <div class="card-body">
            <p>Valor Inicial: <strong>${dinheiro(d.valor_inicial)}</strong></p>
            <p>Vendas em Dinheiro: <strong>${dinheiro(d.vendas_dinheiro)}</strong></p>
            <p>Suprimentos: <strong>${dinheiro(d.suprimentos)}</strong></p>
            <p>Sangrias: <strong>${dinheiro(d.sangrias)}</strong></p>
            <hr>
            <h4>Dinheiro Esperado: ${dinheiro(d.dinheiro_esperado)}</h4>
          </div>
        </div>
      </div>

      <div class="col-md-4">
        <div class="card mb-3">
          <div class="card-header bg-primary text-white">
            Recebimentos Digitais
          </div>
          <div class="card-body">
            <p>PIX: <strong>${dinheiro(digital.pix)}</strong></p>
            <p>Cartão Crédito: <strong>${dinheiro(digital.cartao_credito)}</strong></p>
            <p>Cartão Débito: <strong>${dinheiro(digital.cartao_debito)}</strong></p>
            <hr>
            <h4>Total Digital: ${dinheiro(digital.total_digital)}</h4>
          </div>
        </div>
      </div>

      <div class="col-md-4">
        <div class="card mb-3">
          <div class="card-header bg-success text-white">
            Resumo Geral
          </div>
          <div class="card-body">
            <p>Total Vendido: <strong>${dinheiro(resumo.total_vendido)}</strong></p>
            <p>Vendas a Prazo: <strong>${dinheiro(resumo.prazo)}</strong></p>
            <p>Outras Formas: <strong>${dinheiro(resumo.outras_formas)}</strong></p>
            <hr>
            <h4>Saldo Geral: ${dinheiro(resumo.saldo_geral)}</h4>
          </div>
        </div>
      </div>
    </div>

    <div class="card mb-3">
      <div class="card-header">
        <strong>Movimentações do Caixa</strong>
      </div>

      <div class="card-body">
        <div class="row">
          <div class="col-md-4">
            <label>Valor da Sangria</label>
            <input type="text" inputmode="decimal" id="valor-sangria" class="form-control" placeholder="Ex: 50,00">
          </div>

          <div class="col-md-5">
            <label>Motivo</label>
            <input type="text" id="motivo-sangria" class="form-control" placeholder="Ex: retirada para pagamento">
          </div>

          <div class="col-md-3 d-flex align-items-end">
            <button type="button" class="btn btn-warning w-100" onclick="registrarSangria()">
              Registrar Sangria
            </button>
          </div>
        </div>

        <hr>

        <div class="row">
          <div class="col-md-4">
            <label>Valor do Suprimento</label>
            <input type="text" inputmode="decimal" id="valor-suprimento" class="form-control" placeholder="Ex: 100,00">
          </div>

          <div class="col-md-5">
            <label>Motivo</label>
            <input type="text" id="motivo-suprimento" class="form-control" placeholder="Ex: reforço de troco">
          </div>

          <div class="col-md-3 d-flex align-items-end">
            <button type="button" class="btn btn-info w-100" onclick="registrarSuprimento()">
              Registrar Suprimento
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header bg-danger text-white">
        <strong>Fechar Caixa</strong>
      </div>

      <div class="card-body">
        <p>Informe abaixo o dinheiro físico contado na gaveta.</p>

        <label>Dinheiro contado no caixa</label>
        <input type="text" inputmode="decimal" id="valor-fechamento" class="form-control mb-3" placeholder="Ex: 100,00">

        <label>Observação</label>
        <textarea id="observacao-fechamento" class="form-control mb-3"></textarea>

        <button type="button" class="btn btn-danger" onclick="fecharCaixa()">
          Fechar Caixa
        </button>
      </div>
    </div>
  `);
}

function abrirCaixa() {
  const valor = pegarValorCampo('#valor-inicial-caixa');

  if (valor < 0) {
    showNotification('Informe um valor inicial válido.', 'warning');
    return;
  }

  $.ajax({
    url: `${API_URL}/caixa/abrir`,
    method: 'POST',
    contentType: 'application/json',
    data: JSON.stringify({ valor_inicial: valor }),
    success: function() {
      showNotification('Caixa aberto com sucesso.', 'success');
      carregarCaixaAberto();
    },
    error: function(xhr) {
      showNotification(xhr.responseJSON?.error || 'Erro ao abrir caixa.', 'danger');
    }
  });
}

function registrarSangria() {
  const valor = pegarValorCampo('#valor-sangria');
  const motivo = $('#motivo-sangria').val();

  if (valor <= 0) {
    showNotification('Informe um valor válido para sangria.', 'warning');
    return;
  }

  const senhaAdmin = prompt(
    `Confirme a sangria de ${dinheiro(valor)}\n\nDigite a senha do administrador:` 
  );

  if (!senhaAdmin) {
    showNotification('Sangria cancelada.', 'warning');
    return;
  }

  $.ajax({
    url: `${API_URL}/caixa/sangria`,
    method: 'POST',
    contentType: 'application/json',
    data: JSON.stringify({
      valor,
      motivo,
      senha_admin: senhaAdmin
    }),
    success: function() {
      showNotification('Sangria registrada com sucesso.', 'success');
      carregarCaixaAberto();
    },
    error: function(xhr) {
      showNotification(xhr.responseJSON?.error || 'Erro ao registrar sangria.', 'danger');
    }
  });
}

function registrarSuprimento() {
  const valor = pegarValorCampo('#valor-suprimento');
  const motivo = $('#motivo-suprimento').val();

  $.ajax({
    url: `${API_URL}/caixa/suprimento`,
    method: 'POST',
    contentType: 'application/json',
    data: JSON.stringify({ valor, motivo }),
    success: function() {
      showNotification('Suprimento registrado com sucesso.', 'success');
      carregarCaixaAberto();
    },
    error: function(xhr) {
      showNotification(xhr.responseJSON?.error || 'Erro ao registrar suprimento.', 'danger');
    }
  });
}

function fecharCaixa() {
  const valorFechamento = pegarValorCampo('#valor-fechamento');
  const observacao = $('#observacao-fechamento').val();

  if (!confirm('Tem certeza que deseja fechar o caixa?')) return;

  $.ajax({
    url: `${API_URL}/caixa/fechar`,
    method: 'POST',
    contentType: 'application/json',
    data: JSON.stringify({
      valor_fechamento: valorFechamento,
      observacao
    }),
    success: function(res) {
      showNotification('Caixa fechado com sucesso.', 'success');
      carregarCaixaAberto();
      console.log('Resumo fechamento:', res.resumo);
    },
    error: function(xhr) {
      showNotification(xhr.responseJSON?.error || 'Erro ao fechar caixa.', 'danger');
    }
  });
}