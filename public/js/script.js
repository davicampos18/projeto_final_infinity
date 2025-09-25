// Application State
let currentUser = null;
let currentPage = 'login';
let resources = [];
let currentEditingId = null;

const API_BASE_URL = 'http://localhost:5000/api'

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    console.log('Wayne Industries System - Initializing...');

    // Load saved user data (token e role)
    loadFromStorage();

    // Setup event listeners
    setupEventListeners();

    // Check if user is already logged in
    // Se currentUser existe e tem um token, tenta ir para o dashboard
    if (currentUser && currentUser.token) {
        showPage('dashboard');
    } else {
        showPage('login');
    }
});

// Storage functions
function saveToStorage() {
    localStorage.setItem('wayneUser', JSON.stringify(currentUser));
    // NÃO salve resources no localStorage, eles sempre virão da API
    // localStorage.removeItem('wayneResources'); // Garanta que não há dados mock antigos
}

function loadFromStorage() {
    const savedUser = localStorage.getItem('wayneUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
    } else {
        currentUser = null; // Garante que currentUser é null se não houver login
    }
    // resources não serão mais carregados do storage, mas sim da API
    resources = []; // Inicia vazio, será preenchido pela API
}

// Event listeners setup (sem grandes mudanças aqui, mas prepare-se para AJAX)
function setupEventListeners() {
    // Login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Logout buttons
    document.getElementById('logout-btn')?.addEventListener('click', handleLogout);
    document.getElementById('logout-btn-resources')?.addEventListener('click', handleLogout);

    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const page = e.target.dataset.page;
            showPage(page);
        });
    });

    // Resource management
    document.getElementById('add-resource-btn')?.addEventListener('click', () => {
        openResourceModal();
    });

    document.getElementById('resource-form')?.addEventListener('submit', handleResourceSubmit);

    // Modal controls
    document.querySelectorAll('.modal-close, .cancel-button').forEach(btn => {
        btn.addEventListener('click', closeModals);
    });

    // Confirm delete
    document.getElementById('confirm-delete')?.addEventListener('click', handleConfirmDelete);

    // Close modals on backdrop click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModals();
            }
        });
    });
}

// --- FUNÇÕES DE AUTENTICAÇÃO ---
async function handleLogin(e) { // Tornar a função async
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('login-error');

    errorDiv.style.display = 'none'; // Esconder erro anterior

    if (!username || !password) {
        errorDiv.textContent = 'Por favor, preencha o usuário e a senha.';
        errorDiv.style.display = 'block';
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, { // Chama a API de login do Flask
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json(); // Pega a resposta JSON

        if (response.ok) { // Status 2xx indica sucesso
            currentUser = {
                id: data.user.id,
                username: data.user.username,
                role: data.user.role,
                nome: data.user.nome,
                token: data.token // Armazena o token JWT
            };

            saveToStorage(); // Salva os dados do usuário (incluindo token) no localStorage
            console.log('Login successful:', currentUser);
            showPage('dashboard');

            // Limpa o formulário de login
            document.getElementById('login-form').reset();
        } else { // Status de erro
            console.log('Login failed:', data.message);
            errorDiv.textContent = data.message || 'Erro no login. Verifique suas credenciais.';
            errorDiv.style.display = 'block';
        }
    } catch (error) {
        console.error('Erro de rede ou na requisição de login:', error);
        errorDiv.textContent = 'Erro de rede. Verifique sua conexão.';
        errorDiv.style.display = 'block';
    }
}

function handleLogout() {
    console.log('Logout');
    currentUser = null;
    localStorage.removeItem('wayneUser'); // Limpa dados do usuário
    localStorage.removeItem('token'); // Garante que o token também seja removido
    showPage('login');
}

// Page navigation (sem mudanças na estrutura, mas o conteúdo será carregado da API)
function showPage(pageName) {
    console.log('Showing page:', pageName);
    currentPage = pageName;

    // Redireciona para login se não estiver autenticado e tentar acessar dashboard/resources
    if (!currentUser || !currentUser.token) {
        if (pageName !== 'login') {
            window.alert('Sessão expirada ou não autenticada. Por favor, faça login novamente.');
            showPage('login');
            return;
        }
    }

    // Esconder todas as páginas
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    // Mostrar a página selecionada
    const targetPage = document.getElementById(`${pageName}-page`);
    if (targetPage) {
        targetPage.classList.add('active');
    }

    // Atualizar navegação
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === pageName) {
            item.classList.add('active');
        }
    });

    // Atualizar conteúdo da página e permissões
    if (currentUser) {
        updateUserInfo();
        updateRoleBasedAccess(); // Esconde/mostra botões baseado no papel

        if (pageName === 'dashboard') {
            loadDashboardData(); // Carrega dados do dashboard da API
        } else if (pageName === 'resources') {
            loadResources(); // Carrega recursos da API
        }
    }
}

function updateUserInfo() {
    const userInfoElements = document.querySelectorAll('.user-info');
    const userText = `${currentUser.nome} (${getRoleDisplayName(currentUser.role)})`;

    userInfoElements.forEach(element => {
        element.textContent = userText;
    });
}

function getRoleDisplayName(role) {
    const roleNames = {
        'admin_seguranca': 'Admin de Segurança',
        'gerente': 'Gerente',
        'funcionario': 'Funcionário'
    };
    return roleNames[role] || role;
}

function updateRoleBasedAccess() {
    const addButton = document.getElementById('add-resource-btn');
    const resourcesTableBody = document.getElementById('resources-table-body'); // Precisamos do tbody para esconder colunas de ação

    if (currentUser.role === 'funcionario') {
        addButton?.classList.add('hidden'); // Esconde botão de adicionar para funcionário
        // Esconder coluna de "Ações" e botões de editar/excluir na tabela para funcionário
        if (resourcesTableBody) {
            resourcesTableBody.classList.add('hide-actions-for-funcionario'); // Adiciona classe para esconder
        }
    } else {
        addButton?.classList.remove('hidden');
        if (resourcesTableBody) {
            resourcesTableBody.classList.remove('hide-actions-for-funcionario');
        }
    }
    // As permissões de editar/excluir em linhas individuais são tratadas no updateResourcesTable
}

// --- FUNÇÕES DO DASHBOARD (Agora chamando a API) ---
async function loadDashboardData() {
    console.log('Loading dashboard data...');
    // Exibe mensagem de carregamento ou valores padrão
    document.getElementById('total-resources').textContent = 'Carregando...';
    document.getElementById('active-resources').textContent = 'Carregando...';
    document.getElementById('in-use-resources').textContent = 'Carregando...';
    document.getElementById('maintenance-resources').textContent = 'Carregando...';
    document.getElementById('resources-by-type').innerHTML = '<p>Carregando...</p>';
    document.getElementById('upcoming-maintenance').innerHTML = '<p>Carregando...</p>';

    try {
        const response = await fetch(`${API_BASE_URL}/resources`, { // Chama a API de recursos
            headers: {
                'Authorization': `Bearer ${currentUser.token}` // Envia o token JWT
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erro ao carregar dados do dashboard.');
        }

        const data = await response.json();
        resources = data; // Atualiza a lista global de recursos com dados da API

        // --- Calcula e exibe as estatísticas ---
        const stats = {
            total: resources.length,
            active: resources.filter(r => r.status === 'ativo').length,
            inUse: resources.filter(r => r.status === 'em_uso').length,
            maintenance: resources.filter(r => r.status === 'em_manutencao').length
        };

        document.getElementById('total-resources').textContent = stats.total;
        document.getElementById('active-resources').textContent = stats.active;
        document.getElementById('in-use-resources').textContent = stats.inUse;
        document.getElementById('maintenance-resources').textContent = stats.maintenance;

        // Atualiza recursos por tipo
        updateResourcesByType();

        // Atualiza lista de manutenções
        updateMaintenanceList();

    } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error);
        // Exibir mensagens de erro no dashboard, se houver um elemento para isso
        const dashboardMessageDiv = document.getElementById('dashboardMessage'); // Adicione este div no dashboard.html se não existir
        if (dashboardMessageDiv) {
            dashboardMessageDiv.textContent = `Erro ao carregar dashboard: ${error.message}`;
            dashboardMessageDiv.classList.remove('hidden');
        }
        // Limpar dados ou mostrar erro nos spans
        document.getElementById('total-resources').textContent = 'Erro';
        // ... (outros spans de dashboard para "Erro") ...
    }
}

function updateResourcesByType() {
    const typeContainer = document.getElementById('resources-by-type');
    typeContainer.innerHTML = ''; // Limpa antes de popular
    const typeCount = {};

    resources.forEach(resource => {
        typeCount[resource.type] = (typeCount[resource.type] || 0) + 1;
    });

    const typeNames = { // Mapeamento de nomes amigáveis para tipos
        'equipamento': 'Equipamentos',
        'veiculo': 'Veículos',
        'dispositivo_seguranca': 'Dispositivos de Segurança',
        'ferramenta': 'Ferramentas' // Se 'ferramenta' for um tipo válido no seu backend
    };

    Object.entries(typeCount).forEach(([type, count]) => {
        const typeItem = document.createElement('div');
        typeItem.className = 'type-item';
        typeItem.innerHTML = `
            <span>${typeNames[type] || type}</span>
            <span class="type-count">${count}</span>
        `;
        typeContainer.appendChild(typeItem);
    });
}

function updateMaintenanceList() {
    const maintenanceContainer = document.getElementById('upcoming-maintenance');
    maintenanceContainer.innerHTML = ''; // Limpa antes de popular
    // Filtrar recursos em manutenção (status pode ser 'em_manutencao' no seu Flask)
    const maintenanceResources = resources.filter(r => r.status === 'em_manutencao');

    if (maintenanceResources.length === 0) {
        maintenanceContainer.innerHTML = '<p style="color: hsl(0, 0%, 70%); font-size: 0.875rem;">Nenhum recurso em manutenção.</p>';
        return;
    }

    maintenanceResources.forEach(resource => {
        const maintenanceItem = document.createElement('div');
        maintenanceItem.className = 'maintenance-item';
        // Formata a data se existir
        const lastMaintenanceDate = resource.last_maintenance_date ? new Date(resource.last_maintenance_date).toLocaleDateString('pt-BR') : 'N/A';
        maintenanceItem.innerHTML = `
            <span>${resource.name} (${resource.type})</span>
            <span style="color: hsl(45, 93%, 60%); font-size: 0.75rem;">Última Manutenção: ${lastMaintenanceDate}</span>
        `;
        maintenanceContainer.appendChild(maintenanceItem);
    });
}

// --- FUNÇÕES DE GESTÃO DE RECURSOS (CRUD com a API) ---
async function loadResources() {
    console.log('Loading resources table...');
    const tbody = document.getElementById('resources-table-body');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Carregando recursos...</td></tr>'; // Mensagem de carregamento

    try {
        const response = await fetch(`${API_BASE_URL}/resources`, {
            headers: {
                'Authorization': `Bearer ${currentUser.token}` // Envia o token JWT
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            // Erros de permissão ou autenticação
            if (response.status === 401 || response.status === 403) {
                tbody.innerHTML = '<tr><td colspan="5">Você não tem permissão para visualizar recursos ou sua sessão expirou.</td></tr>';
                // Opcional: redirecionar para login
                // setTimeout(() => showPage('login'), 1500);
            } else {
                throw new Error(errorData.message || 'Erro ao buscar recursos.');
            }
            return;
        }

        const data = await response.json();
        resources = data; // Atualiza a lista global de recursos com dados da API
        tbody.innerHTML = ''; // Limpa a mensagem de carregamento

        if (resources.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Nenhum recurso cadastrado.</td></tr>';
            return;
        }

        resources.forEach(resource => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${resource.name}</td>
                <td>${getTypeDisplayName(resource.type)}</td>
                <td><span class="status-badge status-${resource.status}">${getStatusDisplayName(resource.status)}</span></td>
                <td>${resource.location || '-'}</td>
                <td>
                    <div class="action-buttons">
                        <button class="edit-button" onclick="editResource(${resource.id})" ${currentUser.role === 'funcionario' || currentUser.role === 'admin_seguranca' ? '' : 'style="display:none;"'}>
                            Editar
                        </button>
                        <button class="delete-button" onclick="deleteResource(${resource.id})" ${currentUser.role === 'admin_seguranca' ? '' : 'style="display:none;"'}>
                            Excluir
                        </button>
                    </div>
                </td>
            `;
            // Nota: O clique nos botões de Editar/Excluir já chama as funções globais.
            // A visibilidade dos botões é controlada por 'display:none' ou pela classe 'hidden'
            // no HTML ou CSS, com base no papel do usuário.
        });
    } catch (error) {
        console.error('Erro ao carregar recursos:', error);
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center;">Erro ao carregar recursos: ${error.message}.</td></tr>`;
    }
}

async function handleResourceSubmit(e) {
    e.preventDefault();

    const form = e.target;
    const resourceData = {
        name: form.elements['name'].value.trim(), // Pega pelo atributo 'name'
        type: form.elements['type'].value.trim(),
        serial_number: form.elements['serial_number'].value.trim() || null,
        plate: form.elements['plate'].value.trim() || null,
        location: form.elements['location'].value.trim(),
        status: form.elements['status'].value.trim(),
        acquisition_date: form.elements['acquisition_date'].value.trim(),
        last_maintenance_date: form.elements['last_maintenance_date'].value.trim() || null
    };

    // Validar campos obrigatórios antes de enviar (como o backend já faz)
    if (!resourceData.name || !resourceData.type || !resourceData.location || !resourceData.status || !resourceData.acquisition_date) {
        alert('Por favor, preencha todos os campos obrigatórios (Nome, Tipo, Localização, Status, Data de Aquisição).');
        return;
    }

    const method = currentEditingId ? 'PUT' : 'POST';
    const url = currentEditingId ? `${API_BASE_URL}/resources/${currentEditingId}` : `${API_BASE_URL}/resources`;

    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentUser.token}`
            },
            body: JSON.stringify(resourceData)
        });

        const data = await response.json();

        if (response.ok) {
            alert(data.message || 'Operação realizada com sucesso!');
            form.reset(); // Limpa o formulário
            currentEditingId = null; // Reseta ID de edição
            document.getElementById('modal-title').textContent = 'Adicionar Recurso'; // Reseta título do modal
            document.querySelector('.save-button').textContent = 'Salvar'; // Reseta texto do botão
            closeModals(); // Fecha o modal
            loadResources(); // Recarrega a tabela de recursos
            loadDashboardData(); // Atualiza o dashboard
        } else {
            alert(data.message || `Erro ao ${currentEditingId ? 'atualizar' : 'adicionar'} recurso.`);
        }
    } catch (error) {
        console.error('Erro na requisição de recurso:', error);
        alert('Erro de rede. Verifique sua conexão e tente novamente.');
    }
}

function fillResourceForm(resource) {
    // AQUI: Os IDs dos campos no HTML e as propriedades do objeto 'resource' devem ser consistentes
    document.getElementById('resource-name').value = resource.name || '';
    document.getElementById('resource-type').value = resource.type || '';
    document.getElementById('resource-serial').value = resource.serial_number || '';
    document.getElementById('resource-plate').value = resource.plate || '';
    document.getElementById('resource-location').value = resource.location || '';
    document.getElementById('resource-status').value = resource.status || '';
    // Para campos de data, certifique-se de que o valor é uma string YYYY-MM-DD
    document.getElementById('resource-acquisition-date').value = resource.acquisition_date ? resource.acquisition_date.split('T')[0] : '';
    document.getElementById('resource-last-maintenance-date').value = resource.last_maintenance_date ? resource.last_maintenance_date.split('T')[0] : '';
}

// Global function to open modal for editing
window.editResource = function(id) { // Torna a função global
    console.log('Edit resource:', id);
    currentEditingId = id;
    const resource = resources.find(r => r.id === id); // 'resources' é a array global
    if (resource) {
        openResourceModal(resource); // Passa o objeto completo para preencher o formulário
    } else {
        console.error('Recurso não encontrado para edição:', id);
    }
};

function openResourceModal(resource = null) {
    const modal = document.getElementById('resource-modal');
    const modalTitle = document.getElementById('modal-title');
    const form = document.getElementById('resource-form');

    form.reset(); // Limpa o formulário antes de abrir

    if (resource) {
        currentEditingId = resource.id;
        modalTitle.textContent = 'Editar Recurso';
        // Preenche os campos do formulário com os dados do recurso
        document.getElementById('resource-name').value = resource.name || ''; // Ajuste nomes de campos
        document.getElementById('resource-type').value = resource.type || '';
        document.getElementById('resource-serial').value = resource.serial_number || '';
        document.getElementById('resource-plate').value = resource.plate || '';
        document.getElementById('resource-location').value = resource.location || '';
        document.getElementById('resource-status').value = resource.status || '';
        // Datas: As datas do backend vêm como strings "YYYY-MM-DD"
        document.getElementById('resource-acquisition-date').value = resource.acquisition_date || '';
        document.getElementById('resource-last-maintenance-date').value = resource.last_maintenance_date || '';
        
        document.querySelector('.save-button').textContent = 'Salvar Alterações';
    } else {
        currentEditingId = null;
        modalTitle.textContent = 'Adicionar Recurso';
        document.querySelector('.save-button').textContent = 'Salvar';
    }
    
    modal.classList.add('active');
}

// Global function to handle resource deletion
async function handleConfirmDelete() { // Tornar async se fizer fetch no futuro
    if (!currentEditingId) return;

    try {
        const response = await fetch(`${API_BASE_URL}/resources/${currentEditingId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${currentUser.token}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            alert(data.message || 'Recurso excluído com sucesso!');
            closeModals();
            currentEditingId = null;
            loadResources();       // Atualiza a tabela
            loadDashboardData();  // Atualiza o dashboard
        } else {
            alert(data.message || 'Erro ao excluir recurso.');
        }
    } catch (error) {
        console.error('Erro ao excluir recurso:', error);
        alert('Erro de rede ao tentar excluir o recurso.');
    }
}

// --- Ajustar deleteResource para não definir a função internamente ---
function deleteResource(id) {
    console.log('Delete resource:', id);
    currentEditingId = id;
    const modal = document.getElementById('confirm-modal');
    modal.classList.add('active');
    // Não defina handleConfirmDelete aqui dentro. Ela já é global.
}

// Global function to close modals
function closeModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
    currentEditingId = null;
}

// Utility function to get display names for types and status
function getTypeDisplayName(type) {
    const typeNames = {
        'equipamento': 'Equipamento',
        'veiculo': 'Veículo',
        'dispositivo_seguranca': 'Dispositivo de Segurança',
        'ferramenta': 'Ferramenta'
    };
    return typeNames[type] || type;
}

function getStatusDisplayName(status) {
    const statusNames = {
        'disponivel': 'Disponível', // Ajustar conforme seu Flask
        'em_uso': 'Em Uso',
        'em_manutencao': 'Em Manutenção',
        'ativo': 'Ativo', // Se seu backend usa 'ativo'/'inativo'
        'inativo': 'Inativo'
    };
    return statusNames[status] || status;
}

console.log('Wayne Industries System - Loaded successfully');