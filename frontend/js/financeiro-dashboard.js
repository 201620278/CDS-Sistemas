// Dashboard Financeiro
function renderDashboardFinanceiro(periodo) {
  const conteudo = document.getElementById('financeiroConteudo');

  // Estrutura HTML do dashboard
  conteudo.innerHTML = `
    <div class="dashboard-cards">
      <div class="dashboard-card recebido">
        <h3>Total Recebido</h3>
        <p class="valor" id="totalRecebido">R$ 0,00</p>
      </div>
      <div class="dashboard-card pagar">
        <h3>Total Pago</h3>
        <p class="valor" id="totalPago">R$ 0,00</p>
      </div>
      <div class="dashboard-card receber">
        <h3>Total a Receber</h3>
        <p class="valor" id="totalReceber">R$ 0,00</p>
      </div>
      <div class="dashboard-card saldo">
        <h3>Saldo do Período</h3>
        <p class="valor" id="saldoPeriodo">R$ 0,00</p>
      </div>
    </div>

    <div class="dashboard-grid">
      <div class="dashboard-box">
        <div class="dashboard-box-header">
          <h4>Próximos Recebimentos</h4>
          <button class="btn btn-sm btn-outline-primary" onclick="abrirAbaFinanceiro('receber')">Ver Todos</button>
        </div>
        <div id="proximosRecebimentos" class="dashboard-lista">
          <div class="text-center text-muted">Carregando...</div>
        </div>
      </div>

      <div class="dashboard-box">
        <div class="dashboard-box-header">
          <h4>Próximos Pagamentos</h4>
          <button class="btn btn-sm btn-outline-primary" onclick="abrirAbaFinanceiro('pagar')">Ver Todos</button>
        </div>
        <div id="proximosPagamentos" class="dashboard-lista">
          <div class="text-center text-muted">Carregando...</div>
        </div>
      </div>
    </div>

    <div id="alertasFinanceiros" class="dashboard-box">
      <div class="dashboard-box-header">
        <h4>Alertas Financeiros</h4>
      </div>
      <div id="listaAlertas" class="dashboard-lista">
        <div class="text-center text-muted">Carregando...</div>
      </div>
    </div>

    <div class="dashboard-box">
      <div class="dashboard-box-header">
        <h4>Gráfico Gerencial</h4>
      </div>
      <div id="graficoFinanceiro" style="height: 300px;">
        <canvas id="chartFinanceiro"></canvas>
      </div>
    </div>

    <div class="dashboard-acoes">
      <button class="btn btn-primary" onclick="abrirAbaFinanceiro('receber')">
        <i class="fas fa-plus"></i> Contas a Receber
      </button>
      <button class="btn btn-danger" onclick="abrirAbaFinanceiro('pagar')">
        <i class="fas fa-minus"></i> Contas a Pagar
      </button>
      <button class="btn btn-info" onclick="abrirAbaFinanceiro('relatorios')">
        <i class="fas fa-chart-bar"></i> Relatórios
      </button>
    </div>
  `;

  // Carregar dados do dashboard
  carregarDashboardFinanceiro(periodo);
}

async function carregarDashboardFinanceiro(periodo) {
  try {
    const response = await fetch(`/api/financeiro/dashboard?dataInicio=${periodo.dataInicio}&dataFim=${periodo.dataFim}`, {
      headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      }
    });
    const dados = await response.json();

    if (dados.success) {
      preencherCardsDashboard(dados.resumo);
      preencherProximosRecebimentos(dados.proximos_recebimentos || []);
      preencherProximosPagamentos(dados.proximos_pagamentos || []);
      preencherAlertasFinanceiros(dados.alertas || []);
      renderGraficoFinanceiro(dados.grafico || {});
    } else {
      mostrarErro('Erro ao carregar dados do dashboard');
    }
  } catch (error) {
    console.error('Erro ao carregar dashboard:', error);
    mostrarErro('Erro ao carregar dados do dashboard');
  }
}

function preencherCardsDashboard(resumo) {
  document.getElementById('totalRecebido').textContent = formatarMoeda(resumo.totalRecebido || 0);
  document.getElementById('totalPago').textContent = formatarMoeda(resumo.totalPago || 0);
  document.getElementById('totalReceber').textContent = formatarMoeda(resumo.totalReceber || 0);
  document.getElementById('saldoPeriodo').textContent = formatarMoeda(resumo.saldoPeriodo || 0);
}

function preencherProximosRecebimentos(lista) {
  const container = document.getElementById('proximosRecebimentos');

  if (lista.length > 0) {
    container.innerHTML = lista.map(item => `
      <div class="dashboard-item">
        <div>
          <strong>${item.descricao}</strong><br>
          <small class="text-muted">${item.cliente || '-'}</small>
        </div>
        <div class="text-right">
          <div class="alerta ${getClasseAlerta(item.diasRestantes)}">
            ${formatarData(item.dataVencimento)}
          </div>
          <div class="font-weight-bold">${formatarMoeda(item.valor)}</div>
        </div>
      </div>
    `).join('');
  } else {
    container.innerHTML = '<div class="text-center text-muted">Nenhum recebimento próximo</div>';
  }
}

function preencherProximosPagamentos(lista) {
  const container = document.getElementById('proximosPagamentos');

  if (lista.length > 0) {
    container.innerHTML = lista.map(item => `
      <div class="dashboard-item">
        <div>
          <strong>${item.descricao}</strong><br>
          <small class="text-muted">${item.fornecedor || '-'}</small>
        </div>
        <div class="text-right">
          <div class="alerta ${getClasseAlerta(item.diasRestantes)}">
            ${formatarData(item.dataVencimento)}
          </div>
          <div class="font-weight-bold">${formatarMoeda(item.valor)}</div>
        </div>
      </div>
    `).join('');
  } else {
    container.innerHTML = '<div class="text-center text-muted">Nenhum pagamento próximo</div>';
  }
}

function preencherAlertasFinanceiros(alertas) {
  const container = document.getElementById('listaAlertas');

  if (alertas.length > 0) {
    container.innerHTML = alertas.map(alerta => `
      <div class="alerta ${alerta.tipo}">
        <strong>${alerta.titulo}</strong><br>
        <small>${alerta.descricao}</small>
      </div>
    `).join('');
  } else {
    container.innerHTML = '<div class="text-center text-muted">Nenhum alerta financeiro</div>';
  }
}

function renderGraficoFinanceiro(dados) {
  const ctx = document.getElementById('chartFinanceiro');

  if (typeof Chart !== 'undefined' && ctx) {
    // Destruir gráfico anterior se existir
    if (window.chartFinanceiro && typeof window.chartFinanceiro.destroy === 'function') {
      window.chartFinanceiro.destroy();
    }

    window.chartFinanceiro = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Recebido', 'Pago', 'A Receber', 'A Pagar'],
        datasets: [{
          label: 'Valores (R$)',
          data: [
            dados.recebido || 0,
            dados.pago || 0,
            dados.receber || 0,
            dados.pagar || 0
          ],
          backgroundColor: [
            '#28a745',
            '#dc3545',
            '#ffc107',
            '#6f42c1'
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return formatarMoeda(value);
              }
            }
          }
        },
        plugins: {
          legend: {
            display: false
          }
        }
      }
    });
  } else {
    // Fallback se Chart.js não estiver disponível ou canvas não encontrado
    if (ctx && ctx.parentElement) {
      ctx.parentElement.innerHTML = `
        <div class="text-center text-muted" style="padding: 50px;">
          <i class="fas fa-chart-bar fa-3x mb-3"></i>
          <p>Gráfico não disponível<br>Chart.js necessário</p>
        </div>
      `;
    }
  }
}

function getClasseAlerta(dias) {
  if (dias < 0) return 'vencido';
  if (dias === 0) return 'hoje';
  if (dias === 1) return 'amanha';
  if (dias <= 7) return 'proximo';
  return 'boleto';
}

function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor);
}

function formatarData(data) {
  return new Date(data).toLocaleDateString('pt-BR');
}

function mostrarErro(mensagem) {
  console.error(mensagem);
  // Implementar notificação visual se necessário
}