// Contas a Receber
function renderContasReceber(periodo) {
  const conteudo = document.getElementById('financeiroConteudo');

  conteudo.innerHTML = `
    <div class="financeiro-filtros">
      <div class="financeiro-filtro-grupo">
        <label for="filtroClienteReceber">Cliente:</label>
        <select id="filtroClienteReceber" class="form-control">
          <option value="">Todos os clientes</option>
        </select>
      </div>
      <div class="financeiro-filtro-grupo">
        <label for="filtroStatusReceber">Status:</label>
        <select id="filtroStatusReceber" class="form-control">
          <option value="todas">Todas</option>
          <option value="vencidas">Vencidas</option>
          <option value="a_vencer">A Vencer</option>
          <option value="recebidas">Recebidas</option>
        </select>
      </div>
      <div class="financeiro-filtro-grupo">
        <label for="filtroDocumentoReceber">Documento:</label>
        <input type="text" id="filtroDocumentoReceber" class="form-control" placeholder="Número do documento">
      </div>
      <div class="financeiro-filtro-grupo">
        <label for="filtroDataInicioReceber">Data Início:</label>
        <input type="date" id="filtroDataInicioReceber" class="form-control" value="${periodo.dataInicio}">
      </div>
      <div class="financeiro-filtro-grupo">
        <label for="filtroDataFimReceber">Data Fim:</label>
        <input type="date" id="filtroDataFimReceber" class="form-control" value="${periodo.dataFim}">
      </div>
      <div class="financeiro-acoes">
        <button class="btn btn-primary" onclick="novoRecebimento()">
          <i class="fas fa-plus"></i> Nova Conta a Receber
        </button>
        <button class="btn btn-success" onclick="exportarReceber('pdf')">
          <i class="fas fa-file-pdf"></i> Exportar PDF
        </button>
        <button class="btn btn-success" onclick="exportarReceber('excel')">
          <i class="fas fa-file-excel"></i> Exportar Excel
        </button>
        <button class="btn btn-secondary" onclick="filtrarReceber()">
          <i class="fas fa-filter"></i> Filtrar
        </button>
      </div>
    </div>

    <div class="financeiro-tabela">
      <table id="tabelaReceber">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Descrição</th>
            <th>Documento</th>
            <th>Vencimento</th>
            <th>Valor</th>
            <th>Parcela</th>
            <th>Status</th>
            <th>Origem</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colspan="9" class="text-center">Carregando...</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;

  // Configurar filtros
  configurarFiltrosReceber();

  // Carregar dados
  carregarContasReceber(coletarFiltrosReceber(periodo));
}

function configurarFiltrosReceber() {
  // Carregar lista de clientes
  carregarClientesReceber();

  // Configurar eventos de filtro
  document.getElementById('filtroClienteReceber').addEventListener('change', () => filtrarReceber());
  document.getElementById('filtroStatusReceber').addEventListener('change', () => filtrarReceber());
  document.getElementById('filtroDocumentoReceber').addEventListener('input', () => filtrarReceber());
}

async function carregarClientesReceber() {
  try {
    const response = await fetch('/api/clientes', {
      headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      }
    });
    const dados = await response.json();

    if (dados.success) {
      const select = document.getElementById('filtroClienteReceber');
      dados.clientes.forEach(cliente => {
        const option = document.createElement('option');
        option.value = cliente.id;
        option.textContent = cliente.nome;
        select.appendChild(option);
      });
    }
  } catch (error) {
    console.error('Erro ao carregar clientes:', error);
  }
}

async function carregarContasReceber(filtros) {
  try {
    const queryString = new URLSearchParams(filtros).toString();
    const response = await fetch(`/api/financeiro/receber?${queryString}`, {
      headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      }
    });
    const dados = await response.json();

    preencherTabelaContasReceber(dados.contas || []);
  } catch (error) {
    console.error('Erro ao carregar contas a receber:', error);
    document.querySelector('#tabelaReceber tbody').innerHTML =
      '<tr><td colspan="9" class="text-center text-danger">Erro ao carregar dados</td></tr>';
  }
}

function preencherTabelaContasReceber(contas) {
  const tbody = document.querySelector('#tabelaReceber tbody');

  if (contas.length > 0) {
    tbody.innerHTML = contas.map(conta => `
      <tr>
        <td>${conta.cliente || '-'}</td>
        <td>${conta.descricao}</td>
        <td>${conta.documento || '-'}</td>
        <td>${formatarData(conta.vencimento)}</td>
        <td class="font-weight-bold">${formatarMoeda(conta.valor)}</td>
        <td>${conta.numero_parcela || '-'} / ${conta.total_parcelas || '-'}</td>
        <td><span class="status-${conta.status}">${conta.status}</span></td>
        <td>${conta.origem || 'manual'}</td>
        <td>
          <button class="btn btn-sm btn-outline-success" onclick="baixarRecebimento(${conta.id})" title="Baixar">
            <i class="fas fa-check"></i>
          </button>
          <button class="btn btn-sm btn-outline-info" onclick="abrirDetalhesReceber(${conta.id})" title="Detalhes">
            <i class="fas fa-eye"></i>
          </button>
          <button class="btn btn-sm btn-outline-primary" onclick="editarContaReceber(${conta.id})" title="Editar">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-sm btn-outline-warning" onclick="renegociarContaReceber(${conta.id})" title="Renegociar">
            <i class="fas fa-handshake"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger" onclick="cancelarContaReceber(${conta.id})" title="Cancelar">
            <i class="fas fa-times"></i>
          </button>
        </td>
      </tr>
    `).join('');
  } else {
    tbody.innerHTML = '<tr><td colspan="9" class="text-center">Nenhuma conta a receber encontrada</td></tr>';
  }
}

function coletarFiltrosReceber(periodo) {
  return {
    cliente: document.getElementById('filtroClienteReceber').value,
    status: document.getElementById('filtroStatusReceber').value,
    documento: document.getElementById('filtroDocumentoReceber').value,
    dataInicio: document.getElementById('filtroDataInicioReceber').value || periodo.dataInicio,
    dataFim: document.getElementById('filtroDataFimReceber').value || periodo.dataFim
  };
}

function filtrarReceber() {
  const filtros = coletarFiltrosReceber(obterPeriodoFinanceiro());
  carregarContasReceber(filtros);
}

async function baixarRecebimento(id) {
  if (!confirm('Tem certeza que deseja baixar este recebimento?')) return;

  try {
    const response = await fetch(`/api/financeiro/receber/${id}/baixar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      }
    });

    const dados = await response.json();

    if (dados.success) {
      alert('Recebimento baixado com sucesso!');
      const periodo = obterPeriodoFinanceiro();
      carregarContasReceber(coletarFiltrosReceber(periodo));
      // Atualizar dashboard se estiver ativo
      if (typeof carregarDashboardFinanceiro === 'function') {
        carregarDashboardFinanceiro(obterPeriodoFinanceiro());
      }
    } else {
      alert('Erro ao baixar recebimento: ' + (dados.error || 'Erro desconhecido'));
    }
  } catch (error) {
    console.error('Erro ao baixar recebimento:', error);
    alert('Erro ao baixar recebimento');
  }
}

function abrirDetalhesReceber(id) {
  // Implementar modal de detalhes
  alert(`Detalhes do recebimento ${id} - Em desenvolvimento`);
}

function editarContaReceber(id) {
  // Implementar edição
  alert(`Editar conta a receber ${id} - Em desenvolvimento`);
}

function renegociarContaReceber(id) {
  // Implementar renegociação
  alert(`Renegociar conta a receber ${id} - Em desenvolvimento`);
}

function cancelarContaReceber(id) {
  if (!confirm('Tem certeza que deseja cancelar este recebimento?')) return;

  // Implementar cancelamento
  alert(`Cancelar recebimento ${id} - Em desenvolvimento`);
}

function novoRecebimento() {
  // Implementar modal ou navegação para novo recebimento
  alert('Nova conta a receber - Em desenvolvimento');
}

function exportarReceber(tipo) {
  // Implementar exportação
  alert(`Exportação ${tipo.toUpperCase()} em desenvolvimento`);
}

function formatarData(data) {
  return new Date(data).toLocaleDateString('pt-BR');
}

function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor);
}