require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

// Configuração do PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(fileUpload());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Criar pasta de uploads se não existir
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Rota para envio de currículos
app.post('/api/careers', async (req, res) => {
  const { name, email, phone, job_position, message } = req.body;
  const resume = req.files?.resume;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  // Validação básica
  if (!name || !email || !phone || !job_position || !message || !resume) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
  }

  // Verificar se é PDF
  if (resume.mimetype !== 'application/pdf') {
    return res.status(400).json({ error: 'Apenas arquivos PDF são permitidos' });
  }

  // Tamanho máximo 5MB
  if (resume.size > 5 * 1024 * 1024) {
    return res.status(400).json({ error: 'Arquivo muito grande (máximo 5MB)' });
  }

  try {
    // Verificar limitações de spam
    const spamCheck = await pool.query(
      `SELECT * FROM spam_protection 
       WHERE (email = $1 OR ip_address = $2) 
       AND last_submission > NOW() - INTERVAL '10 days'`,
      [email, ip]
    );
    
    if (spamCheck.rows.length > 0) {
      return res.status(429).json({ 
        error: 'Você já enviou um currículo recentemente. Tente novamente após 10 dias.' 
      });
    }

    // Salvar arquivo
    const fileName = `${Date.now()}_${resume.name}`;
    const filePath = path.join(__dirname, 'uploads', fileName);
    await resume.mv(filePath);

    // Salvar no banco de dados
    await pool.query(
      `INSERT INTO applications 
       (name, email, phone, job_position, message, resume_path, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [name, email, phone, job_position, message, fileName, ip]
    );

    // Atualizar proteção contra spam
    await pool.query(
      `INSERT INTO spam_protection (email, ip_address, last_submission)
       VALUES ($1, $2, NOW())
       ON CONFLICT (email) 
       DO UPDATE SET last_submission = NOW(), submission_count = spam_protection.submission_count + 1`,
      [email, ip]
    );

    res.status(201).json({ 
      success: true, 
      message: 'Currículo enviado com sucesso!' 
    });
    
  } catch (error) {
    console.error('Erro no servidor:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota para listar aplicações (protegida)
app.get('/api/applications', async (req, res) => {
  const authHeader = req.headers.authorization;
  
  // Verificação básica de autenticação
  if (!authHeader || authHeader !== `Bearer ${process.env.API_KEY}`) {
    return res.status(401).json({ error: 'Acesso não autorizado' });
  }

  try {
    const result = await pool.query('SELECT * FROM applications ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar aplicações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Iniciar servidor
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});


document.getElementById('careerForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  
  const form = e.target;
  const formData = new FormData(form);
  const submitButton = document.getElementById('submitBtn');
  const statusMessage = document.getElementById('statusMessage');
  
  // ... validações anteriores ...
  
  try {
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
    submitButton.disabled = true;
    
    const response = await fetch(form.action, {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    
    if (response.ok) {
      showStatus(result.message, 'success');
      form.reset();
    } else {
      showStatus(result.error, 'error');
    }
  } catch (error) {
    showStatus('Erro de conexão. Tente novamente.', 'error');
  } finally {
    submitButton.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar Currículo';
    submitButton.disabled = false;
  }
});