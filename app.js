// =============================================
// Dropfort IA - App Principal
// =============================================

// --- Init Supabase ---
let supabaseClient;

try {
  supabaseClient = supabase.createClient(
    window.SUPABASE_URL || '',
    window.SUPABASE_ANON_KEY || ''
  );
} catch (e) {
  console.error('Erro ao iniciar Supabase:', e);
}

// --- Init PDF.js ---
if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// =============================================
// STATE
// =============================================
const state = {
  currentUser: null,
  isAdmin: false,
  selectedMonth: new Date().getMonth(),
  selectedYear: new Date().getFullYear(),
  uploadedFile: null,
  uploadedFileUrl: null,
  extractedValue: null,
  confirmedValue: null,
  editingId: null,
  deletingId: null,
  payments: [],
  loading: false,
};

const MONTHS = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

const MONTHS_FULL = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

// =============================================
// DOM REFERENCES
// =============================================
const $ = (id) => document.getElementById(id);

const dom = {
  screens: {
    login: $('loginScreen'),
    dashboard: $('dashboard'),
  },
  login: {
    userForm: $('userLoginForm'),
    adminForm: $('adminLoginForm'),
    nameInput: $('nameInput'),
    adminPasswordInput: $('adminPasswordInput'),
    loginBtn: $('loginBtn'),
    adminLoginBtn: $('adminLoginBtn'),
    backToUserBtn: $('backToUserBtn'),
    toggleAdminLink: $('toggleAdminLink'),
    error: $('loginError'),
  },
  dashboard: {
    userBadge: $('userBadge'),
    userAvatar: $('userAvatar'),
    userNameDisplay: $('userNameDisplay'),
    adminToggleBtn: $('adminToggleBtn'),
    logoutBtn: $('logoutBtn'),
  },
  upload: {
    monthSelect: $('monthSelect'),
    yearInput: $('yearInput'),
    dropZone: $('dropZone'),
    fileInput: $('fileInput'),
    fileInfo: $('fileInfo'),
    fileName: $('fileName'),
    removeFileBtn: $('removeFileBtn'),
    valueSection: $('valueSection'),
    extractedValueDisplay: $('extractedValueDisplay'),
    extractedValue: $('extractedValue'),
    confirmValueBtn: $('confirmValueBtn'),
    editValueBtn: $('editValueBtn'),
    manualValueInput: $('manualValueInput'),
    manualValue: $('manualValue'),
    manualConfirmBtn: $('manualConfirmBtn'),
    submitBtn: $('submitBtn'),
    uploadStatus: $('uploadStatus'),
  },
  table: {
    body: $('tableBody'),
    emptyState: $('emptyState'),
    yearSelect: $('tableYearSelect'),
  },
  modals: {
    pdf: $('pdfModal'),
    pdfViewer: $('pdfViewer'),
    edit: $('editModal'),
    editValueInput: $('editValueInput'),
    editConfirmBtn: $('editConfirmBtn'),
    editCancelBtn: $('editCancelBtn'),
    editError: $('editError'),
    delete: $('deleteModal'),
    deleteConfirmBtn: $('deleteConfirmBtn'),
  },
};

// =============================================
// HELPERS
// =============================================

function formatBRL(value) {
  if (value === null || value === undefined) return '-';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '-';
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function parseBRL(str) {
  if (!str) return null;
  let cleaned = str.replace(/R\$\s*/gi, '').trim();
  cleaned = cleaned.replace(/\./g, '');
  cleaned = cleaned.replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function formatBRLInput(value) {
  return value.toFixed(2).replace('.', ',');
}

function getCurrentYear() {
  return new Date().getFullYear();
}

function getCurrentMonth() {
  return new Date().getMonth();
}

function showError(el, msg) {
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
}

function hideError(el) {
  if (!el) return;
  el.classList.remove('show');
  el.textContent = '';
}

function showStatus(msg, type) {
  const el = dom.upload.uploadStatus;
  el.style.display = 'block';
  el.style.padding = '10px 14px';
  el.style.borderRadius = '8px';
  el.style.fontSize = '13px';
  el.style.fontWeight = '500';
  el.textContent = msg;

  if (type === 'success') {
    el.style.background = 'rgba(16, 185, 129, 0.1)';
    el.style.color = '#059669';
  } else if (type === 'error') {
    el.style.background = 'rgba(239, 68, 68, 0.1)';
    el.style.color = '#dc2626';
  } else {
    el.style.background = 'rgba(37, 99, 235, 0.1)';
    el.style.color = '#2563eb';
  }
}

function hideStatus() {
  dom.upload.uploadStatus.style.display = 'none';
}

function setLoading(btn, loading) {
  if (loading) {
    btn.classList.add('loading');
    btn.disabled = true;
  } else {
    btn.classList.remove('loading');
    btn.disabled = false;
  }
}

function updateSteps() {
  const steps = document.querySelectorAll('.step');
  steps.forEach(s => s.classList.remove('active', 'done'));

  let current = 1;
  if (state.currentUser) current = 2;
  if (state.uploadedFile) current = 3;
  if (state.confirmedValue !== null) current = 4;

  steps.forEach((s, i) => {
    const idx = i + 1;
    if (idx < current) s.classList.add('done');
    else if (idx === current) s.classList.add('active');
  });
}

function isSupabaseConfigured() {
  return window.SUPABASE_URL && window.SUPABASE_ANON_KEY;
}

// =============================================
// AUTH
// =============================================

function handleLogin() {
  const name = dom.login.nameInput.value.trim();
  if (!name) {
    showError(dom.login.error, 'Por favor, digite seu nome.');
    return;
  }
  hideError(dom.login.error);

  state.currentUser = name;
  state.isAdmin = false;
  sessionStorage.setItem('dropfort_user', name);
  sessionStorage.setItem('dropfort_admin', 'false');

  enterDashboard();
}

function handleAdminLogin() {
  const password = dom.login.adminPasswordInput.value.trim();
  if (!password) {
    showError(dom.login.error, 'Digite a senha do administrador.');
    return;
  }
  hideError(dom.login.error);

  if (password !== window.ADMIN_PASSWORD) {
    showError(dom.login.error, 'Senha incorreta.');
    return;
  }

  state.currentUser = 'Administrador';
  state.isAdmin = true;
  sessionStorage.setItem('dropfort_user', 'Administrador');
  sessionStorage.setItem('dropfort_admin', 'true');

  enterDashboard();
}

function handleLogout() {
  state.currentUser = null;
  state.isAdmin = false;
  state.uploadedFile = null;
  state.uploadedFileUrl = null;
  state.extractedValue = null;
  state.confirmedValue = null;
  resetUploadUI();

  sessionStorage.removeItem('dropfort_user');
  sessionStorage.removeItem('dropfort_admin');

  dom.screens.dashboard.classList.remove('active');
  dom.screens.login.classList.add('active');
  dom.login.nameInput.value = '';
  dom.login.adminPasswordInput.value = '';
  hideError(dom.login.error);
}

function enterDashboard() {
  dom.screens.login.classList.remove('active');
  dom.screens.dashboard.classList.add('active');

  dom.dashboard.userNameDisplay.textContent = state.currentUser;
  const initial = state.currentUser.charAt(0).toUpperCase();
  dom.dashboard.userAvatar.textContent = initial;

  if (state.isAdmin) {
    dom.dashboard.userBadge.classList.add('admin-badge');
    dom.dashboard.adminToggleBtn.innerHTML =
      '<i class="fas fa-shield-alt"></i> <span>Admin</span>';
    dom.dashboard.adminToggleBtn.style.borderColor = '#f59e0b';
    dom.dashboard.adminToggleBtn.style.color = '#d97706';
  } else {
    dom.dashboard.userBadge.classList.remove('admin-badge');
    dom.dashboard.adminToggleBtn.innerHTML =
      '<i class="fas fa-shield-alt"></i> <span>Admin</span>';
      dom.dashboard.adminToggleBtn.style.borderColor = '';
      dom.dashboard.adminToggleBtn.style.color = '';
    }

    state.selectedMonth = getCurrentMonth();
  state.selectedYear = getCurrentYear();
  dom.upload.monthSelect.value = state.selectedMonth;
  dom.upload.yearInput.value = state.selectedYear;

  updateSteps();
  loadData();
}

function toggleAdminLoginMode() {
  const isAdminMode = dom.login.adminForm.style.display !== 'none';
  dom.login.userForm.style.display = isAdminMode ? '' : 'none';
  dom.login.adminForm.style.display = isAdminMode ? 'none' : '';
  dom.login.toggleAdminLink.textContent = isAdminMode
    ? 'Acesso do Administrador'
    : 'Voltar para login de usuário';
  dom.login.nameInput.value = '';
  dom.login.adminPasswordInput.value = '';
  hideError(dom.login.error);
}

// =============================================
// PDF HANDLING
// =============================================

function handleFileSelect(file) {
  if (!file) return;
  if (file.type !== 'application/pdf') {
    showStatus('O arquivo precisa ser um PDF.', 'error');
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    showStatus('O arquivo é muito grande. Máximo 10MB.', 'error');
    return;
  }

  hideStatus();
  state.uploadedFile = file;
  dom.upload.dropZone.style.display = 'none';
  dom.upload.fileInfo.style.display = 'flex';
  dom.upload.fileName.textContent = file.name;
  dom.upload.valueSection.style.display = 'none';
  state.extractedValue = null;
  state.confirmedValue = null;
  dom.upload.submitBtn.disabled = true;

  updateSteps();
  extractValueFromPDF(file);
}

function removeFile() {
  state.uploadedFile = null;
  state.uploadedFileUrl = null;
  state.extractedValue = null;
  state.confirmedValue = null;
  dom.upload.dropZone.style.display = '';
  dom.upload.fileInfo.style.display = 'none';
  dom.upload.valueSection.style.display = 'none';
  dom.upload.submitBtn.disabled = true;
  dom.upload.fileInput.value = '';
  hideStatus();
  updateSteps();
}

async function extractValueFromPDF(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map(item => item.str).join(' ');
      fullText += pageText + '\n';
    }

    const value = findBRLValue(fullText);

    if (value !== null) {
      state.extractedValue = value;
      dom.upload.extractedValue.textContent = formatBRL(value);
      dom.upload.extractedValueDisplay.style.display = '';
      dom.upload.manualValueInput.style.display = 'none';
      dom.upload.valueSection.style.display = '';
      state.confirmedValue = value;
      dom.upload.submitBtn.disabled = false;
      showStatus('Valor extraído com sucesso!', 'success');
      updateSteps();
    } else {
      showManualInput();
    }
  } catch (err) {
    console.error('Erro ao ler PDF:', err);
    showManualInput();
  }
}

function findBRLValue(text) {
  const patterns = [
    /(?:total\s*a\s*pagar|total|valor\s*do\s*documento|valor\s*por\s*parcela|valor\s*a\s*pagar|valor|vencimento)[:\s]*R?\$?\s*([\d.]+,\d{2})/gi,
    /R\$\s*([\d.]+,\d{2})/g,
    /([\d]{1,3}(?:\.\d{3})*,\d{2})/g,
    /(\d+,\d{2})/g,
  ];

  for (const pattern of patterns) {
    const matches = [...text.matchAll(pattern)];
    if (matches.length > 0) {
      const candidates = matches
        .map(m => {
          const val = m[1] || m[0];
          return parseBRL(val);
        })
        .filter(v => v !== null && v > 0);

      if (candidates.length > 0) {
        candidates.sort((a, b) => b - a);
        return candidates[0];
      }
    }
  }
  return null;
}

function showManualInput() {
  state.extractedValue = null;
  state.confirmedValue = null;
  dom.upload.extractedValueDisplay.style.display = 'none';
  dom.upload.manualValueInput.style.display = '';
  dom.upload.manualValue.value = '';
  dom.upload.valueSection.style.display = '';
  dom.upload.submitBtn.disabled = true;
  showStatus('Não foi possível extrair o valor automaticamente. Digite manualmente.', '');
}

function confirmManualValue() {
  const raw = dom.upload.manualValue.value.trim();
  if (!raw) {
    showStatus('Digite um valor válido.', 'error');
    return;
  }

  const value = parseBRL(raw);
  if (value === null || value <= 0) {
    showStatus('Valor inválido. Use o formato 1500,00', 'error');
    return;
  }

  state.confirmedValue = value;
  dom.upload.submitBtn.disabled = false;
  dom.upload.manualValueInput.style.display = 'none';
  dom.upload.extractedValueDisplay.style.display = '';
  dom.upload.extractedValue.textContent = formatBRL(value);
  showStatus('Valor confirmado!', 'success');
  updateSteps();
}

function confirmExtractedValue() {
  if (state.extractedValue !== null) {
    state.confirmedValue = state.extractedValue;
    dom.upload.submitBtn.disabled = false;
    dom.upload.extractedValueDisplay.style.display = '';
    dom.upload.manualValueInput.style.display = 'none';
    showStatus('Valor confirmado!', 'success');
    updateSteps();
  }
}

function editExtractedValue() {
  dom.upload.extractedValueDisplay.style.display = 'none';
  dom.upload.manualValueInput.style.display = '';
  dom.upload.manualValue.value = state.extractedValue
    ? formatBRLInput(state.extractedValue)
    : '';
  dom.upload.submitBtn.disabled = true;
  state.confirmedValue = null;
}

function resetUploadUI() {
  state.uploadedFile = null;
  state.uploadedFileUrl = null;
  state.extractedValue = null;
  state.confirmedValue = null;
  dom.upload.dropZone.style.display = '';
  dom.upload.fileInfo.style.display = 'none';
  dom.upload.valueSection.style.display = 'none';
  dom.upload.fileInput.value = '';
  dom.upload.submitBtn.disabled = true;
  dom.upload.manualValue.value = '';
  hideStatus();
}

// =============================================
// CRUD - SUPABASE
// =============================================

async function handleSubmit() {
  if (!state.currentUser || state.confirmedValue === null || !state.uploadedFile) {
    showStatus('Complete todas as etapas antes de adicionar.', 'error');
    return;
  }

  if (!isSupabaseConfigured()) {
    showStatus(
      'Configure o Supabase no arquivo supabase-config.js primeiro.',
      'error'
    );
    return;
  }

  setLoading(dom.upload.submitBtn, true);
  showStatus('Enviando comprovante...', '');

  try {
    const pdfUrl = await uploadPDF(state.uploadedFile);

    const { error } = await supabaseClient.from('payments').insert({
      user_name: state.currentUser,
      month: state.selectedMonth,
      year: state.selectedYear,
      amount: state.confirmedValue,
      pdf_url: pdfUrl,
    });

    if (error) throw error;

    showStatus('Comprovante adicionado com sucesso!', 'success');
    resetUploadUI();
    state.selectedMonth = getCurrentMonth();
    state.selectedYear = getCurrentYear();
    dom.upload.monthSelect.value = state.selectedMonth;
    dom.upload.yearInput.value = state.selectedYear;
    updateSteps();
    await loadData();
  } catch (err) {
    console.error('Erro ao adicionar pagamento:', err);
    showStatus('Erro ao adicionar: ' + err.message, 'error');
  } finally {
    setLoading(dom.upload.submitBtn, false);
  }
}

async function uploadPDF(file) {
  const bucketName = 'receipts';
  const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

  const { data, error } = await supabaseClient.storage
    .from(bucketName)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    if (error.message && error.message.includes('bucket')) {
      throw new Error(
        'Bucket de storage não encontrado. Execute o setup.sql no Supabase.'
      );
    }
    throw error;
  }

  const { data: urlData } = supabaseClient.storage
    .from(bucketName)
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}

async function loadData() {
  if (!isSupabaseConfigured()) return;

  try {
    const { data, error } = await supabaseClient
      .from('payments')
      .select('*')
      .order('year', { ascending: false })
      .order('month', { ascending: true });

    if (error) throw error;

    state.payments = data || [];
    populateYearSelect();
    renderTable();
  } catch (err) {
    console.error('Erro ao carregar dados:', err);
  }
}

async function handleEditSubmit() {
  const raw = dom.modals.editValueInput.value.trim();
  if (!raw) {
    showError(dom.modals.editError, 'Digite um valor.');
    return;
  }

  const value = parseBRL(raw);
  if (value === null || value <= 0) {
    showError(dom.modals.editError, 'Valor inválido.');
    return;
  }

  hideError(dom.modals.editError);
  setLoading(dom.modals.editConfirmBtn, true);

  try {
    const { error } = await supabaseClient
      .from('payments')
      .update({ amount: value, updated_at: new Date().toISOString() })
      .eq('id', state.editingId);

    if (error) throw error;

    closeEditModal();
    showStatus('Valor atualizado com sucesso!', 'success');
    await loadData();
  } catch (err) {
    console.error('Erro ao editar:', err);
    showError(dom.modals.editError, 'Erro ao editar: ' + err.message);
  } finally {
    setLoading(dom.modals.editConfirmBtn, false);
  }
}

async function handleDeleteConfirm() {
  if (!state.deletingId) return;

  setLoading(dom.modals.deleteConfirmBtn, true);

  try {
    const { error } = await supabaseClient
      .from('payments')
      .delete()
      .eq('id', state.deletingId);

    if (error) throw error;

    closeDeleteModal();
    showStatus('Comprovante excluído com sucesso!', 'success');
    await loadData();
  } catch (err) {
    console.error('Erro ao excluir:', err);
    showStatus('Erro ao excluir: ' + err.message, 'error');
  } finally {
    setLoading(dom.modals.deleteConfirmBtn, false);
  }
}

// =============================================
// TABLE RENDERING
// =============================================

function populateYearSelect() {
  const currentYear = getCurrentYear();
  const years = new Set();
  years.add(currentYear);

  state.payments.forEach(p => {
    if (p.year) years.add(p.year);
  });

  const sorted = [...years].sort((a, b) => b - a);
  const currentFilter = dom.table.yearSelect.value || String(currentYear);

  dom.table.yearSelect.innerHTML = sorted
    .map(y => `<option value="${y}">${y}</option>`)
    .join('');

  if (sorted.includes(parseInt(currentFilter))) {
    dom.table.yearSelect.value = currentFilter;
  }
}

function renderTable() {
  const selectedYear = parseInt(dom.table.yearSelect.value) || getCurrentYear();
  const tbody = dom.table.body;
  const emptyState = dom.table.emptyState;

  const filtered = state.payments.filter(p => p.year === selectedYear);

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    emptyState.classList.add('show');
    return;
  }

  emptyState.classList.remove('show');

  // Group by user
  const userMap = {};
  filtered.forEach(p => {
    if (!userMap[p.user_name]) {
      userMap[p.user_name] = {};
    }
    if (!userMap[p.user_name][p.month]) {
      userMap[p.user_name][p.month] = [];
    }
    userMap[p.user_name][p.month].push(p);
  });

  const userNames = Object.keys(userMap).sort((a, b) =>
    a.localeCompare(b, 'pt-BR')
  );

  let html = '';
  userNames.forEach(name => {
    html += '<tr>';
    html += `<td class="cell-name">${escapeHtml(name)}</td>`;

    let total = 0;
    for (let m = 0; m < 12; m++) {
      const payments = userMap[name][m] || [];
      const sum = payments.reduce((acc, p) => acc + parseFloat(p.amount), 0);
      total += sum;

      if (sum > 0) {
        html += `<td class="cell-value">`;
        html += `<span>${formatBRL(sum)}</span>`;
        html += `<div style="display:flex;gap:4px;margin-top:2px;flex-wrap:wrap;">`;

        payments.forEach(p => {
          const escapedUrl = p.pdf_url.replace(/'/g, "\\'");
          html += `<button class="btn-icon view-pdf" onclick="viewPDF('${escapedUrl}')" title="Ver comprovante">
            <i class="fas fa-file-pdf"></i>
          </button>`;
          if (state.isAdmin) {
            html += `<button class="btn-icon edit-value" onclick="openEditModal(${p.id}, ${p.amount})" title="Editar">
              <i class="fas fa-edit"></i>
            </button>`;
            html += `<button class="btn-icon delete-value" onclick="openDeleteModal(${p.id})" title="Excluir">
              <i class="fas fa-trash-alt"></i>
            </button>`;
          }
        });

        html += `</div></td>`;
      } else {
        html += '<td>-</td>';
      }
    }

    html += `<td class="cell-total">${formatBRL(total)}</td>`;
    html += '</tr>';
  });

  tbody.innerHTML = html;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// =============================================
// MODALS
// =============================================

function viewPDF(url) {
  if (!url) return;
  dom.modals.pdfViewer.src = url;
  dom.modals.pdf.classList.add('show');
}

function closePdfModal() {
  dom.modals.pdf.classList.remove('show');
  dom.modals.pdfViewer.src = '';
}

function openEditModal(id, currentValue) {
  state.editingId = id;
  dom.modals.editValueInput.value = formatBRLInput(currentValue);
  hideError(dom.modals.editError);
  dom.modals.edit.classList.add('show');
}

function closeEditModal() {
  dom.modals.edit.classList.remove('show');
  state.editingId = null;
  dom.modals.editValueInput.value = '';
  hideError(dom.modals.editError);
}

function openDeleteModal(id) {
  state.deletingId = id;
  dom.modals.delete.classList.add('show');
}

function closeDeleteModal() {
  dom.modals.delete.classList.remove('show');
  state.deletingId = null;
}

// Close modals on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closePdfModal();
    closeEditModal();
    closeDeleteModal();
  }
});

// =============================================
// EVENT LISTENERS
// =============================================

// Login
dom.login.loginBtn.addEventListener('click', handleLogin);
dom.login.nameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleLogin();
});
dom.login.adminLoginBtn.addEventListener('click', handleAdminLogin);
dom.login.adminPasswordInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleAdminLogin();
});
dom.login.backToUserBtn.addEventListener('click', toggleAdminLoginMode);
dom.login.toggleAdminLink.addEventListener('click', toggleAdminLoginMode);

// Logout
dom.dashboard.logoutBtn.addEventListener('click', handleLogout);

// Month/Year
dom.upload.monthSelect.addEventListener('change', (e) => {
  state.selectedMonth = parseInt(e.target.value);
});
dom.upload.yearInput.addEventListener('change', (e) => {
  state.selectedYear = parseInt(e.target.value) || getCurrentYear();
});

// File upload - file selected
dom.upload.fileInput.addEventListener('change', (e) => {
  if (e.target.files.length > 0) {
    handleFileSelect(e.target.files[0]);
  }
});

// File upload - drag and drop
dom.upload.dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.stopPropagation();
  dom.upload.dropZone.classList.add('dragover');
});

dom.upload.dropZone.addEventListener('dragleave', (e) => {
  e.preventDefault();
  e.stopPropagation();
  dom.upload.dropZone.classList.remove('dragover');
});

dom.upload.dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  e.stopPropagation();
  dom.upload.dropZone.classList.remove('dragover');
  if (e.dataTransfer.files.length > 0) {
    handleFileSelect(e.dataTransfer.files[0]);
  }
});

// Remove file
dom.upload.removeFileBtn.addEventListener('click', removeFile);

// Value controls
dom.upload.confirmValueBtn.addEventListener('click', confirmExtractedValue);
dom.upload.editValueBtn.addEventListener('click', editExtractedValue);
dom.upload.manualConfirmBtn.addEventListener('click', confirmManualValue);
dom.upload.manualValue.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') confirmManualValue();
});

// Submit
dom.upload.submitBtn.addEventListener('click', handleSubmit);

// Edit modal
dom.modals.editConfirmBtn.addEventListener('click', handleEditSubmit);
dom.modals.editValueInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleEditSubmit();
});

// Delete modal
dom.modals.deleteConfirmBtn.addEventListener('click', handleDeleteConfirm);

// Table year filter
dom.table.yearSelect.addEventListener('change', renderTable);

// Admin toggle
dom.dashboard.adminToggleBtn.addEventListener('click', () => {
  if (state.isAdmin) {
    handleLogout();
  } else {
    toggleAdminLoginMode();
    dom.screens.dashboard.classList.remove('active');
    dom.screens.login.classList.add('active');
  }
});

// =============================================
// INIT
// =============================================

function init() {
  dom.upload.yearInput.value = getCurrentYear();
  state.selectedYear = getCurrentYear();
  state.selectedMonth = getCurrentMonth();
  dom.upload.monthSelect.value = state.selectedMonth;

  const savedUser = sessionStorage.getItem('dropfort_user');
  const savedAdmin = sessionStorage.getItem('dropfort_admin');

  if (savedUser) {
    state.currentUser = savedUser;
    state.isAdmin = savedAdmin === 'true';
    enterDashboard();
  }

  populateYearSelect();

  if (!isSupabaseConfigured()) {
    console.warn('Supabase não configurado. Edite supabase-config.js.');
  }
}

init();
