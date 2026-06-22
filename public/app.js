/*
  URL base da API local.

  window.location.origin pega automaticamente o endereço atual do navegador.
  Exemplo:
  http://localhost:3000

  Assim o front-end consegue chamar:
  http://localhost:3000/api/meals
  http://localhost:3000/api/login
*/
const API_BASE_URL = window.location.origin;


/*
  Chaves usadas para salvar dados no localStorage.

*/
const STORAGE_KEYS = {
  user: 'nutrimais:user',
  meals: 'nutrimais:meals',
};


/*
  Estado principal da aplicação.

*/
const state = {
  user: null,
  page: 1,
  totalPages: 1,
  activeFilter: '',
  showingForm: false,
  meals: [],
};


/*
  Mapeamento dos elementos HTML.

*/
const els = {
  companyLogo: document.getElementById('company-logo'),
  companyName: document.getElementById('company-name'),
  totalMeals: document.getElementById('total-meals'),
  totalCalories: document.getElementById('total-calories'),
  authBtn: document.getElementById('auth-btn'),
  filters: document.getElementById('filters'),
  mealsList: document.getElementById('meals-list'),
  pagination: document.getElementById('pagination'),
  loginModal: document.getElementById('login-modal'),
  closeModal: document.getElementById('close-modal'),
  cancelLogin: document.getElementById('cancel-login'),
  submitLogin: document.getElementById('submit-login'),
  loginEmail: document.getElementById('login-email'),
  loginPassword: document.getElementById('login-password'),
  loginError: document.getElementById('login-error'),
  mealTab: document.getElementById('meal-tab'),
  mealFormSection: document.getElementById('meal-form-section'),
  createMeal: document.getElementById('create-meal'),
  mealType: document.getElementById('meal-type'),
  mealDescription: document.getElementById('meal-description'),
  mealCalories: document.getElementById('meal-calories'),
  mealProtein: document.getElementById('meal-protein'),
  errorType: document.getElementById('error-type'),
  errorDescription: document.getElementById('error-description'),
  errorCalories: document.getElementById('error-calories'),
  errorProtein: document.getElementById('error-protein'),
};


/*
  Salva ou remove o usuário no localStorage.
  
*/
function saveUser(user) {
  if (!user) {
    localStorage.removeItem(STORAGE_KEYS.user);
    return;
  }

  localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
}


/*
  Carrega o usuário salvo no localStorage.

*/
function loadSavedUser() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.user));
  } catch {
    return null;
  }
}


/*
  Salva a lista atual de refeições no localStorage.

  

  Assim, as alterações continuam existindo ao recarregar a página.
*/
function saveMeals() {
  localStorage.setItem(STORAGE_KEYS.meals, JSON.stringify(state.meals));
}


/*
  Carrega as refeições salvas no localStorage.

 
*/
function loadSavedMeals() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.meals));
    return Array.isArray(saved) ? saved : null;
  } catch {
    return null;
  }
}


/*
  Função auxiliar para fazer requisições à API local.

 
*/
async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Erro na comunicação com a API local.');
  }

  return data;
}


/*
  Carrega as refeições iniciais do sistema.

*/
async function loadInitialMeals() {
  const saved = loadSavedMeals();

  if (saved) {
    state.meals = saved;
    return;
  }

  const data = await fetchJson(`${API_BASE_URL}/api/meals?limit=1000`);

  state.meals = data.data.map((meal) => ({
    ...meal,
    likes: meal.likes || [],
    comments: meal.comments || [],
  }));

  saveMeals();
}


/*
  Abre o modal de login.

  Remove a classe hidden para o modal aparecer na tela.
*/
function showLoginModal() {
  els.loginModal.classList.remove('hidden');
}


/*
  Fecha o modal de login.

  Adiciona a classe hidden para esconder o modal.
*/
function hideLoginModal() {
  els.loginModal.classList.add('hidden');
}


/*
  Verifica se o usuário está logado.
 
*/
function requireAuth() {
  if (state.user) return true;

  showLoginModal();
  return false;
}


/*
  Formata a data da refeição.

*/
function formatDate(dateIso) {
  const d = new Date(dateIso);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const MM = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(2);

  return `${hh}:${mm} - ${dd}/${MM}/${yy}`;
}


/*
  Converte o tipo técnico da refeição para um nome amigável.
*/
function titleFromType(type) {
  const labels = {
    cafe_da_manha: 'Café da manhã',
    almoco: 'Almoço',
    jantar: 'Jantar',
    lanche: 'Lanche',
  };

  return labels[type] || type;
}


/*
  Limpa os erros visuais do formulário de login.

*/
function clearLoginValidation() {
  els.loginEmail.classList.remove('invalid');
  els.loginPassword.classList.remove('invalid');
  els.loginError.textContent = '';
}


/*
  Retorna as refeições que devem aparecer na tela.

*/
function getVisibleMeals() {
  return state.meals
    .filter((meal) => (state.activeFilter ? meal.type === state.activeFilter : true))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}


/*
  Calcula as estatísticas do perfil.

*/
function getStats() {
  const list = state.user
    ? state.meals.filter((meal) => meal.user.id === state.user.id)
    : state.meals;

  const totalCalories = list.reduce((total, meal) => total + Number(meal.calories || 0), 0);

  return {
    totalMeals: list.length,
    totalCalories,
  };
}


/*
  Carrega os dados do perfil lateral.

*/
async function loadCompany() {
  let company = {
    name: 'NutriMais',
    logoUrl: './img/nutrimais-logo.svg',
  };

  try {
    const data = await fetchJson(`${API_BASE_URL}/api/company`);
    company = data.company;
  } catch {
    // Mantém dados locais caso a API esteja indisponível.
  }

  const stats = getStats();

  els.companyLogo.src = state.user?.photoUrl || company.logoUrl;
  els.companyName.textContent = state.user?.name || company.name;
  els.totalMeals.textContent = stats.totalMeals;
  els.totalCalories.textContent = stats.totalCalories;
}


/*
  Controla a paginação da lista de refeições.

*/
async function loadMeals() {
  const limit = 4;
  const visibleMeals = getVisibleMeals();

  state.totalPages = Math.max(Math.ceil(visibleMeals.length / limit), 1);

  if (state.page > state.totalPages) state.page = state.totalPages;

  const start = (state.page - 1) * limit;

  renderMeals(visibleMeals.slice(start, start + limit));
  renderPagination();
}


/*
  Renderiza os cards de refeições na tela.

*/
function renderMeals(meals) {
  els.mealsList.innerHTML = '';
  const tpl = document.getElementById('meal-card-template');

  if (!meals.length) {
    els.mealsList.innerHTML = '<p class="empty-state">Nenhuma refeição encontrada.</p>';
    return;
  }

  meals.forEach((meal) => {
    const card = tpl.content.firstElementChild.cloneNode(true);

    card.querySelector('.meal-title').textContent = meal.title;
    card.querySelector('.meal-date').textContent = formatDate(meal.createdAt);
    card.querySelector('.meal-avatar').src = meal.user.photoUrl;
    card.querySelector('.meal-user').textContent = meal.user.name;
    card.querySelector('.meal-description').textContent = meal.description;
    card.querySelector('.calories').textContent = `${meal.calories} kcal`;
    card.querySelector('.protein').textContent = `${meal.proteinGrams} g`;
    card.querySelector('.category').textContent = titleFromType(meal.type);

    const likeBtn = card.querySelector('.like-btn');
    const commentBtn = card.querySelector('.comment-btn');
    const likesCount = card.querySelector('.likes-count');
    const commentsCount = card.querySelector('.comments-count');

    const likes = meal.likes || [];
    const comments = meal.comments || [];
    const likedByCurrentUser = state.user ? likes.includes(state.user.id) : false;

    likesCount.textContent = likes.length;
    commentsCount.textContent = comments.length;

    likeBtn.querySelector('img').src = likedByCurrentUser
      ? './img/heart-filled.svg'
      : './img/heart.svg';

    likeBtn.classList.toggle('liked', likedByCurrentUser);

    /*
      Evento de curtir refeição.

    */
    likeBtn.addEventListener('click', async () => {
      if (!requireAuth()) return;

      const index = state.meals.findIndex((item) => item.id === meal.id);
      if (index < 0) return;

      const selected = state.meals[index];
      selected.likes = selected.likes || [];

      const alreadyLiked = selected.likes.includes(state.user.id);

      selected.likes = alreadyLiked
        ? selected.likes.filter((userId) => userId !== state.user.id)
        : [...selected.likes, state.user.id];

      try {
        await fetchJson(`${API_BASE_URL}/api/meals/${meal.id}/like`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: state.user.id }),
        });
      } catch {
        // A interação permanece salva no localStorage.
      }

      saveMeals();
      await loadMeals();
    });

    const commentBox = card.querySelector('.comment-box');
    const commentInput = card.querySelector('.comment-input');
    const sendComment = card.querySelector('.send-comment');
    const commentError = card.querySelector('.error');

    /*
      Evento para abrir ou fechar a caixa de comentário.

      Só permite abrir se o usuário estiver logado.
    */
    commentBtn.addEventListener('click', () => {
      if (!requireAuth()) return;
      commentBox.classList.toggle('hidden');
    });

    /*
      Evento para enviar comentário.

    */
    sendComment.addEventListener('click', async () => {
      if (!requireAuth()) return;

      commentInput.classList.remove('invalid');
      commentError.textContent = '';

      const content = commentInput.value.trim();

      if (content.length < 2) {
        commentInput.classList.add('invalid');
        commentError.textContent = 'Comentário deve ter no mínimo 2 caracteres.';
        return;
      }

      const index = state.meals.findIndex((item) => item.id === meal.id);
      if (index < 0) return;

      state.meals[index].comments = state.meals[index].comments || [];
      state.meals[index].comments.unshift({
        id: Date.now(),
        content,
        createdAt: new Date().toISOString(),
        userName: state.user.name,
      });

      try {
        await fetchJson(`${API_BASE_URL}/api/meals/${meal.id}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: state.user.id, content }),
        });
      } catch {
        // O comentário permanece salvo no localStorage.
      }

      saveMeals();
      commentInput.value = '';

      await loadMeals();
    });

    els.mealsList.appendChild(card);
  });
}


/*
  Renderiza os botões de paginação.

*/
function renderPagination() {
  els.pagination.innerHTML = '';

  const first = document.createElement('button');
  first.textContent = 'Primeira';
  first.disabled = state.page === 1;
  first.addEventListener('click', () => {
    state.page = 1;
    loadMeals();
  });
  els.pagination.appendChild(first);

  const prev = document.createElement('button');
  prev.textContent = 'Anterior';
  prev.disabled = state.page === 1;
  prev.addEventListener('click', () => {
    state.page -= 1;
    loadMeals();
  });
  els.pagination.appendChild(prev);

  for (let p = 1; p <= state.totalPages; p += 1) {
    const btn = document.createElement('button');
    btn.textContent = p;

    if (p === state.page) btn.classList.add('active');

    btn.addEventListener('click', () => {
      state.page = p;
      loadMeals();
    });

    els.pagination.appendChild(btn);
  }

  const next = document.createElement('button');
  next.textContent = 'Próxima';
  next.disabled = state.page === state.totalPages;
  next.addEventListener('click', () => {
    state.page += 1;
    loadMeals();
  });
  els.pagination.appendChild(next);

  const last = document.createElement('button');
  last.textContent = 'Última';
  last.disabled = state.page === state.totalPages;
  last.addEventListener('click', () => {
    state.page = state.totalPages;
    loadMeals();
  });
  els.pagination.appendChild(last);
}


/*
  Limpa os erros do formulário de criação de refeição.

*/
function resetFormErrors() {
  [els.mealType, els.mealDescription, els.mealCalories, els.mealProtein].forEach((el) =>
    el.classList.remove('invalid')
  );

  [els.errorType, els.errorDescription, els.errorCalories, els.errorProtein].forEach((el) =>
    (el.textContent = '')
  );
}


/*
  Cria uma nova refeição.
*/
async function handleCreateMeal() {
  if (!requireAuth()) return;

  resetFormErrors();

  const type = els.mealType.value;
  const description = els.mealDescription.value.trim();
  const calories = Number(els.mealCalories.value);
  const proteinGrams = Number(els.mealProtein.value);

  let invalid = false;

  if (!type) {
    els.mealType.classList.add('invalid');
    els.errorType.textContent = 'Campo obrigatório';
    invalid = true;
  }

  if (description.length < 3) {
    els.mealDescription.classList.add('invalid');
    els.errorDescription.textContent = 'Informe uma descrição com no mínimo 3 caracteres';
    invalid = true;
  }

  if (!calories || calories <= 0) {
    els.mealCalories.classList.add('invalid');
    els.errorCalories.textContent = 'Informe calorias maiores que zero';
    invalid = true;
  }

  if (!proteinGrams || proteinGrams <= 0) {
    els.mealProtein.classList.add('invalid');
    els.errorProtein.textContent = 'Informe proteínas maiores que zero';
    invalid = true;
  }

  if (invalid) return;

  let meal;

  try {
    const data = await fetchJson(`${API_BASE_URL}/api/meals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: state.user.id,
        type,
        description,
        calories,
        proteinGrams,
      }),
    });

    meal = data.meal;
  } catch {
    meal = {
      id: Date.now(),
      title: titleFromType(type),
      type,
      description,
      user: {
        id: state.user.id,
        name: state.user.name,
        photoUrl: state.user.photoUrl,
      },
      calories,
      proteinGrams,
      createdAt: new Date().toISOString(),
      likes: [],
      comments: [],
    };
  }

  state.meals.unshift({
    ...meal,
    likes: meal.likes || [],
    comments: meal.comments || [],
  });

  saveMeals();

  els.mealType.value = '';
  els.mealDescription.value = '';
  els.mealCalories.value = '';
  els.mealProtein.value = '';
  state.page = 1;

  await Promise.all([loadCompany(), loadMeals()]);
}


/*
  Realiza o login do usuário.

*/
async function handleLogin() {
  clearLoginValidation();

  const email = els.loginEmail.value.trim();
  const password = els.loginPassword.value.trim();

  if (!email || !password) {
    els.loginEmail.classList.add('invalid');
    els.loginPassword.classList.add('invalid');
    els.loginError.textContent = 'email ou senha obrigatório';
    return;
  }

  try {
    const data = await fetchJson(`${API_BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    state.user = data.user;
    saveUser(state.user);
    applyLoggedState();
    hideLoginModal();

    await Promise.all([loadCompany(), loadMeals()]);
  } catch {
    els.loginEmail.classList.add('invalid');
    els.loginPassword.classList.add('invalid');
    els.loginError.textContent = 'email ou senha incorreta';
  }
}


/*
  Aplica o estado visual de usuário logado.
  
*/
function applyLoggedState() {
  state.page = 1;
  els.authBtn.textContent = 'Logout';
  els.mealTab.disabled = false;

  [...els.filters.querySelectorAll('button')].forEach((btn) => (btn.disabled = false));
}


/*
  Aplica o estado visual de visitante.
  */
function applyGuestState() {
  els.authBtn.textContent = 'Login';
  els.mealTab.disabled = true;
  els.mealTab.classList.remove('active');
  els.mealFormSection.classList.add('hidden');

  [...els.filters.querySelectorAll('button')].forEach((btn) => {
    btn.classList.remove('active');
    btn.disabled = true;
  });
}


/*
  Realiza logout.
*/
function handleLogout() {
  state.user = null;
  state.page = 1;
  state.activeFilter = '';
  state.showingForm = false;

  saveUser(null);
  applyGuestState();
  loadCompany();
  loadMeals();
}


/*
  Conecta os eventos da tela com as funções JavaScript.

*/
function bindEvents() {
  els.authBtn.addEventListener('click', () => {
    if (state.user) handleLogout();
    else showLoginModal();
  });

  els.closeModal.addEventListener('click', hideLoginModal);
  els.cancelLogin.addEventListener('click', hideLoginModal);
  els.submitLogin.addEventListener('click', handleLogin);

  els.loginPassword.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') handleLogin();
  });

  els.filters.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-type]');
    if (!button) return;
    if (!requireAuth()) return;

    state.activeFilter = button.dataset.type;
    state.page = 1;

    [...els.filters.querySelectorAll('button')].forEach((btn) =>
      btn.classList.remove('active')
    );

    button.classList.add('active');
    loadMeals();
  });

  els.mealTab.addEventListener('click', () => {
    if (!requireAuth()) return;

    state.showingForm = !state.showingForm;

    els.mealTab.classList.toggle('active', state.showingForm);
    els.mealFormSection.classList.toggle('hidden', !state.showingForm);
  });

  els.createMeal.addEventListener('click', handleCreateMeal);
}


/*
  Função inicial da aplicação.
 */
async function init() {
  state.user = loadSavedUser();

  await loadInitialMeals();

  bindEvents();

  if (state.user) applyLoggedState();
  else applyGuestState();

  await Promise.all([loadCompany(), loadMeals()]);
}


/*
  Executa a aplicação.
  
*/
init();