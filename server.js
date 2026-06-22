// Importa o módulo path do Node.js.
// Ele ajuda a montar caminhos de arquivos e pastas de forma segura,
// independente do sistema operacional.
const path = require('path');

// Importa o módulo fs do Node.js.
const fs = require('fs');

// Importa o Express.
const express = require('express');

// Importa o CORS.
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

// Habilita o CORS na aplicação.
app.use(cors());

// Permite que a API receba dados em formato JSON no corpo das requisições.
app.use(express.json());

// Define a pasta "public" como pasta pública do projeto.

app.use(express.static(path.join(__dirname, 'public')));

// Caminho do arquivo CSV de usuários.
const USERS_CSV = path.join(__dirname, 'data', 'usuarios.csv');

// Caminho do arquivo CSV de refeições.
const MEALS_CSV = path.join(__dirname, 'data', 'refeicoes.csv');

// Função responsável por ler um arquivo CSV e transformar em uma lista de objetos JavaScript.
function parseCsv(filePath) {

  const raw = fs.readFileSync(filePath, 'utf8').trim();

  const [header, ...lines] = raw.split(/\r?\n/);


  const keys = header.split(',').map((key) => key.trim());

  // Percorre cada linha do CSV e transforma em objeto.
  return lines.map((line) => {
   
    const values = line.split(',');

    // Monta um objeto usando as chaves do cabeçalho.
    return keys.reduce((acc, key, index) => {
   
      acc[key] = (values[index] || '').trim();

      // Retorna o objeto atualizado.
      return acc;
    }, {});
  });
}

// Função que transforma o tipo da refeição em um título mais bonito.
function titleFromType(type) {
  const labels = {
    cafe_da_manha: 'Café da manhã',
    almoco: 'Almoço',
    jantar: 'Jantar',
    lanche: 'Lanche',
  };

  return labels[type] || type;
}

// Lê os usuários do arquivo usuarios.csv e transforma em objetos JavaScript.
const users = parseCsv(USERS_CSV).map((user) => ({
  // Converte o id para número.
  id: Number(user.id),

  // Pega o nome do usuário vindo do CSV.
  name: user.nome,

  email: user.email,

  password: user.senha,

  photoUrl: user.foto_url,
}));

// Lê as refeições do arquivo refeicoes.csv e transforma em objetos JavaScript.
const meals = parseCsv(MEALS_CSV).map((meal) => {
  
  const user = users.find((item) => item.id === Number(meal.usuario_id));

  // Retorna o objeto da refeição já formatado para uso na API.
  return {

    id: Number(meal.id),

    title: titleFromType(meal.tipo),
 
    type: meal.tipo,

    // Descrição da refeição.
    description: meal.descricao,

      user: {
      id: user.id,
      name: user.name,
      photoUrl: user.photoUrl,
    },

    // Quantidade de calorias da refeição.
    calories: Number(meal.calorias),

    // Quantidade de proteínas em gramas.
    proteinGrams: Number(meal.proteinas_g),

    createdAt: new Date(meal.data_iso).toISOString(),

    // Lista de curtidas.

    likes: [],

    comments: [],
  };
});

// Função que prepara uma refeição para ser enviada ao front-end.
function toClientMeal(meal, currentUserId = 0) {
  return {
    id: meal.id,
    title: meal.title,
    type: meal.type,
    description: meal.description,
    user: meal.user,
    calories: meal.calories,
    proteinGrams: meal.proteinGrams,
    createdAt: meal.createdAt,

    // Envia a lista de likes.
    likes: meal.likes,

    // Envia a lista de comentários.
    comments: meal.comments,

    // Quantidade total de curtidas.
    likesCount: meal.likes.length,

    // Quantidade total de comentários.
    commentsCount: meal.comments.length,

    // Informa se o usuário logado já curtiu essa refeição.
    likedByCurrentUser: meal.likes.includes(Number(currentUserId)),
  };
}

// Função que calcula estatísticas gerais ou de um usuário específico.
function getStats(userId = 0) {

  const filtered = userId
    ? meals.filter((meal) => meal.user.id === Number(userId))
    : meals;

 
  const totalCalories = filtered.reduce((total, meal) => {
    return total + Number(meal.calories || 0);
  }, 0);

  return {
    totalMeals: filtered.length,
    totalCalories,
  };
}

// Rota de teste da API.

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: false,
    persistence: 'localStorage no navegador',
  });
});

// Rota que retorna os dados da empresa/projeto.
app.get('/api/company', (req, res) => {

  const userId = Number(req.query.userId || 0);

  // Retorna informações da empresa e estatísticas.
  res.json({
    company: {
      id: 1,
      name: 'NutriMais',
      logoUrl: './img/nutrimais-logo.svg',
    },

    // Calcula estatísticas gerais ou do usuário informado.
    stats: getStats(userId),
  });
});

// Rota que retorna todos os usuários.
app.get('/api/users', (req, res) => {
  res.json({
    users: users.map(({ password, ...user }) => user),
  });
});

// Rota de login.
app.post('/api/login', (req, res) => {

  const { email, password } = req.body;

  // Valida se os campos foram preenchidos.
  if (!email || !password) {
    return res.status(400).json({
      message: 'email ou senha obrigatório',
    });
  }

  // Procura um usuário com o mesmo email e senha.
  const user = users.find((item) => {
    return item.email === email && item.password === password;
  });

  // Se não encontrar usuário, retorna erro 401.
  if (!user) {
    return res.status(401).json({
      message: 'email ou senha incorreta',
    });
  }

  // Se encontrar, retorna os dados do usuário logado.
  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      photoUrl: user.photoUrl,
    },
    stats: getStats(user.id),
  });
});

// Rota que lista as refeições.
app.get('/api/meals', (req, res) => {

  const page = Math.max(Number(req.query.page || 1), 1);

  // Quantidade de itens por página.
  const limit = Math.max(Number(req.query.limit || 4), 1);

  // Tipo de refeição usado como filtro.
  const type = req.query.type || '';

  // Usuário atual, usado para saber se ele já curtiu uma refeição.
  const currentUserId = Number(req.query.currentUserId || 0);

  // Filtra as refeições pelo tipo, se houver filtro.
   const filtered = meals
    .filter((meal) => (type ? meal.type === type : true))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // Total de refeições após o filtro.
  const total = filtered.length;

  // Calcula o total de páginas.
  const totalPages = Math.max(Math.ceil(total / limit), 1);

  // Calcula a posição inicial dos itens da página atual.
  const start = (page - 1) * limit;

  const data = filtered
    .slice(start, start + limit)
    .map((meal) => toClientMeal(meal, currentUserId));

  // Retorna os dados paginados.
  res.json({
    data,
    page,
    totalPages,
    total,
  });
});

// Rota para cadastrar uma nova refeição.
app.post('/api/meals', (req, res) => {
  const { userId, type, description, calories, proteinGrams } = req.body;

  // Procura o usuário que está cadastrando a refeição.
  const user = users.find((item) => item.id === Number(userId));

  const parsedCalories = Number(calories);

   const parsedProtein = Number(proteinGrams);

  // Garante que a descrição seja texto e remove espaços extras.
  const parsedDescription = String(description || '').trim();

  // Validação dos campos.
  // Se algo estiver inválido, retorna erro 400.
  if (
    !user ||
    !type ||
    parsedDescription.length < 3 ||
    parsedCalories <= 0 ||
    parsedProtein <= 0
  ) {
    return res.status(400).json({
      message: 'Campos inválidos.',
    });
  }

  // Cria a nova refeição.
  const meal = {
   
    id: meals.length ? Math.max(...meals.map((item) => item.id)) + 1 : 1,

    // Título formatado.
    title: titleFromType(type),

    // Tipo da refeição.
    type,

    // Descrição digitada pelo usuário.
    description: parsedDescription,

    // Dados do usuário dono da refeição.
    user: {
      id: user.id,
      name: user.name,
      photoUrl: user.photoUrl,
    },

    // Calorias.
    calories: parsedCalories,

    // Proteínas.
    proteinGrams: parsedProtein,

    // Data atual.
    createdAt: new Date().toISOString(),

    // Nova refeição começa sem curtidas.
    likes: [],

    // Nova refeição começa sem comentários.
    comments: [],
  };

  // Adiciona a refeição no começo da lista.
  meals.unshift(meal);

  // Retorna status 201, indicando criação com sucesso.
  res.status(201).json({
    meal: toClientMeal(meal, user.id),
  });
});

// Rota para curtir ou remover curtida de uma refeição.
app.post('/api/meals/:id/like', (req, res) => {
  // Procura a refeição pelo id enviado na URL.
  const meal = meals.find((item) => item.id === Number(req.params.id));

  // Pega o id do usuário enviado no corpo da requisição.
  const userId = Number(req.body.userId || 0);

  // Se não encontrar refeição ou usuário, retorna erro.
  if (!meal || !userId) {
    return res.status(400).json({
      message: 'Refeição ou usuário inválido.',
    });
  }

  // Verifica se o usuário já curtiu.
  const liked = meal.likes.includes(userId);

  // Se já curtiu, remove o like.
  // Se ainda não curtiu, adiciona o like.
  meal.likes = liked
    ? meal.likes.filter((id) => id !== userId)
    : [...meal.likes, userId];

  // Retorna se ficou curtido ou não e a quantidade atual.
  res.json({
    liked: !liked,
    likesCount: meal.likes.length,
  });
});

// Rota para listar comentários de uma refeição.
app.get('/api/meals/:id/comments', (req, res) => {
  // Procura a refeição pelo id.
  const meal = meals.find((item) => item.id === Number(req.params.id));

  // Se não encontrar, retorna erro 404.
  if (!meal) {
    return res.status(404).json({
      message: 'Refeição não encontrada.',
    });
  }

  // Retorna os comentários.
  res.json({
    comments: meal.comments,
  });
});

// Rota para adicionar comentário em uma refeição.
app.post('/api/meals/:id/comments', (req, res) => {
  // Procura a refeição pelo id da URL.
  const meal = meals.find((item) => item.id === Number(req.params.id));

  // Procura o usuário pelo id enviado no corpo da requisição.
  const user = users.find((item) => item.id === Number(req.body.userId));

  // Pega o conteúdo do comentário.
  const content = String(req.body.content || '').trim();

  // Valida refeição, usuário e conteúdo.
  if (!meal || !user || content.length < 2) {
    return res.status(400).json({
      message: 'Comentário inválido.',
    });
  }

  // Adiciona o comentário no começo da lista.
  meal.comments.unshift({
    // Usa a data atual em milissegundos como id simples.
    id: Date.now(),

    // Texto do comentário.
    content,

    // Data de criação do comentário.
    createdAt: new Date().toISOString(),

    // Nome do usuário que comentou.
    userName: user.name,
  });

  // Retorna status 201 indicando que o comentário foi criado.
  res.status(201).json({
    commentsCount: meal.comments.length,
  });
});

// Rota coringa.
// Qualquer rota que não seja da API retorna o index.html.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Inicia o servidor.
app.listen(PORT, () => {
  console.log(`NutriMais sem banco rodando em http://localhost:${PORT}`);
  console.log(
    'Dados fixos vêm da API local. Alterações do usuário são salvas no localStorage do navegador.'
  );
});