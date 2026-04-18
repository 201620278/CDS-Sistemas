// Contas a Pagar
function renderContasPagar(periodo) {
  const conteudo = document.getElementById('financeiroConteudo');

  conteudo.innerHTML = `
    <div class="financeiro-filtros">
      <div class="financeiro-filtro-grupo">
        <label for="filtroStatusPagar">Status:</label>
        <select id="filtroStatusPagar" class="form-control">
          <option value="todos">Todos</option>
          <option value="pendente">Pendente</option>
          <option value="pago">Pago</option>
          <option value="parcial">Parcial</option>
          <option value="vencido">Vencido</option>
        </select>
      </div>
      <div class="financeiro-filtro-grupo">
        <label for="filtroFornecedorPagar">Fornecedor:</label>
        <select id="filtroFornecedorPagar" class="form-control">
          <option value="">Todos os fornecedores</option>
        </select>
      </div>
      <div class="financeiro-acoes">
        <button class="btn btn-danger" onclick="novaDespesa()">
          <i class="fas fa-plus"></i> Nova Despesa
        </button>
        <button class="btn btn-success" onclick="exportarPagar()">
          <i class="fas fa-download"></i> Exportar
        </button>
      </div>
    </div>

    <div class="financeiro-tabela">
      <table id="tabelaPagar">
        <thead>
          <tr>
            <th>Data</th>
            <th>Vencimento</th>
            <th>Fornecedor</th>
            <th>Descrição</th>
            <th>Valor</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colspan="7" class="text-center">Carregando...</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;

  // Configurar filtros
  configurarFiltrosPagar();

  // Carregar dados iniciais com o período atual
  carregarContasPagar(coletarFiltrosPagar(periodo));
}

function configurarFiltrosPagar() {
  const statusField = document.getElementById('filtroStatusPagar');
  const fornecedorField = document.getElementById('filtroFornecedorPagar');

  if (statusField) {
    statusField.addEventListener('change', filtrarPagar);
  }
  if (fornecedorField) {
    fornecedorField.addEventListener('change', filtrarPagar);
  }

  // Carregar lista de fornecedores
  carregarFornecedoresPagar();
}

async function carregarFornecedoresPagar() {
  try {
    const response = await fetch('/api/fornecedores', {
      headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      }
    });
    const dados = await response.json();

    if (dados.success) {
      const select = document.getElementById('filtroFornecedorPagar');
      dados.fornecedores.forEach(fornecedor => {
        const option = document.createElement('option');
        option.value = fornecedor.id;
        option.textContent = fornecedor.nome;
        select.appendChild(option);
      });
    }
  } catch (error) {
    console.error('Erro ao carregar fornecedores:', error);
  }
}

async function carregarContasPagarDados(filtros) {
  try {
    const queryString = new URLSearchParams(filtros).toString();
    const response = await fetch(`/api/financeiro/contas-pagar?${queryString}`, {
      headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      }
    });
    const dados = await response.json();

    const tbody = document.querySelector('#tabelaPagar tbody');

    if (dados.success && dados.contas.length > 0) {
      tbody.innerHTML = dados.contas.map(conta => `
        <tr>
          <td>${formatarData(conta.dataEmissao)}</td>
          <td>${formatarData(conta.dataVencimento)}</td>
          <td>${conta.fornecedor || '-'}</td>
          <td>${conta.descricao}</td>
          <td class="font-weight-bold">${formatarMoeda(conta.valor)}</td>
          <td><span class="status-${conta.status}">${conta.status}</span></td>
          <td>
            <button class="btn btn-sm btn-outline-primary" onclick="editarPagamento(${conta.id})">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-sm btn-outline-success" onclick="pagarConta(${conta.id})">
              <i class="fas fa-check"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger" onclick="excluirPagamento(${conta.id})">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        </tr>
      `).join('');
    } else {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center">Nenhuma conta a pagar encontrada</td></tr>';
    }
  } catch (error) {
    console.error('Erro ao carregar contas a pagar:', error);
    document.querySelector('#tabelaPagar tbody').innerHTML =
      '<tr><td colspan="7" class="text-center text-danger">Erro ao carregar dados</td></tr>';
  }
}

function filtrarPagar() {
  const periodo = obterPeriodoFinanceiro();
  const filtros = coletarFiltrosPagar(periodo);
  carregarContasPagar(filtros);
}

function novaDespesa() {
  // Implementar modal ou navegação para nova despesa
  alert('Funcionalidade de nova despesa em desenvolvimento');
}

function editarPagamento(id) {
  // Implementar edição
  alert(`Editar pagamento ${id} - Em desenvolvimento`);
}

function pagarConta(id) {
  // Implementar pagamento
  if (confirm('Confirmar pagamento desta conta?')) {
    baixarPagamento(id);
  }
}

function excluirPagamento(id) {
  if (confirm('Tem certeza que deseja excluir este pagamento?')) {
    // Implementar exclusão
    alert(`Excluir pagamento ${id} - Em desenvolvimento`);
  }
}

function exportarPagar() {
  // Implementar exportação
  alert('Exportação em desenvolvimento');
}

// Funções obrigatórias do prompt
async function carregarContasPagar(filtros) {
  return carregarContasPagarDados(filtros);
}

function preencherTabelaContasPagar(lista) {
  const tbody = document.querySelector('#tabelaPagar tbody');
  
  if (lista && lista.length > 0) {
    tbody.innerHTML = lista.map(conta => `
      <tr>
        <td>${conta.fornecedor || '-'}</td>
        <td>${conta.descricao}</td>
        <td>${conta.documento || '-'}</td>
        <td>${conta.categoria || '-'}</td>
        <td>${formatarData(conta.dataVencimento)}</td>
        <td class="font-weight-bold">${formatarMoeda(conta.valor)}</td>
        <td><span class="status-${conta.status}">${conta.status}</span></td>
        <td>${conta.forma_pagamento || '-'}</td>
        <td>${conta.origem || '-'}</td>
        <td>
          <button class="btn btn-sm btn-outline-success" onclick="baixarPagamento(${conta.id})" title="Pagar">
            <i class="fas fa-check"></i>
          </button>
          <button class="btn btn-sm btn-outline-primary" onclick="abrirDetalhesPagar(${conta.id})" title="Detalhes">
            <i class="fas fa-eye"></i>
          </button>
          <button class="btn btn-sm btn-outline-warning" onclick="editarContaPagar(${conta.id})" title="Editar">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-sm btn-outline-info" onclick="remarcarVencimento(${conta.id})" title="Remarcar">
            <i class="fas fa-calendar"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger" onclick="excluirContaPagar(${conta.id})" title="Excluir">
            <i class="fas fa-trash"></i>
          </button>
          <button class="btn btn-sm btn-outline-secondary" onclick="anexarComprovante(${conta.id})" title="Anexar">
            <i class="fas fa-paperclip"></i>
          </button>
        </td>
      </tr>
    `).join('');
  } else {
    tbody.innerHTML = '<tr><td colspan="10" class="text-center">Nenhuma conta a pagar encontrada</td></tr>';
  }
}

async function baixarPagamento(id) {
  if (!confirm('Tem certeza que deseja realizar este pagamento?')) return;

  try {
    const response = await fetch(`/api/financeiro/pagar/${id}/baixar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      }
    });
    
    const result = await response.json();
    
    if (result.success) {
      alert('Pagamento realizado com sucesso!');
      const periodo = obterPeriodoFinanceiro();
      carregarContasPagar(coletarFiltrosPagar(periodo));
      // Atualizar dashboard se estiver ativo
      if (typeof carregarDashboardFinanceiro === 'function') {
        carregarDashboardFinanceiro(obterPeriodoFinanceiro());
      }
    } else {
      alert('Erro ao realizar pagamento: ' + (result.error || 'Erro desconhecido'));
    }
  } catch (error) {
    console.error('Erro ao baixar pagamento:', error);
    alert('Erro ao conectar com o servidor');
  }
}

function abrirDetalhesPagar(id) {
  alert(`Detalhes do pagamento ${id} - Em desenvolvimento`);
}

function editarContaPagar(id) {
  alert(`Editar conta a pagar ${id} - Em desenvolvimento`);
}

function remarcarVencimento(id) {
  alert(`Remarcar vencimento ${id} - Em desenvolvimento`);
}

function excluirContaPagar(id) {
  if (confirm('Tem certeza que deseja excluir esta conta a pagar?')) {
    alert(`Excluir conta a pagar ${id} - Em desenvolvimento`);
  }
}

function anexarComprovante(id) {
  alert(`Anexar comprovante ${id} - Em desenvolvimento`);
}

function coletarFiltrosPagar(periodo) {
  const statusField = document.getElementById('filtroStatusPagar');
  const fornecedorField = document.getElementById('filtroFornecedorPagar');

  return {
    dataInicio: periodo.dataInicio,
    dataFim: periodo.dataFim,
    status: statusField ? statusField.value : 'todos',
    fornecedor: fornecedorField ? fornecedorField.value : ''
  };
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