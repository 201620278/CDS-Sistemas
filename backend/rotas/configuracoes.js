const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const router = express.Router();
const db = require('../database');
const backup = require('../backup');

const logoStoragePath = path.join(__dirname, '../../storage/logos');
fs.mkdirSync(logoStoragePath, { recursive: true });

const logoUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, logoStoragePath),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname) || '.png';
      cb(null, `logo_${Date.now()}${ext}`);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/svg+xml'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error('Tipo de arquivo inválido. Use PNG, JPG, JPEG, GIF ou SVG.'));
    }
    cb(null, true);
  }
});

const saveLogoConfig = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Arquivo de logo não enviado.' });
  }

  const logoPath = `/storage/logos/${req.file.filename}`;
  db.run(
    `UPDATE configuracoes SET valor = ?, updated_at = CURRENT_TIMESTAMP WHERE chave = 'logo'`,
    [logoPath],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (this.changes === 0) {
        db.run(
          `INSERT INTO configuracoes (chave, valor, tipo, descricao) VALUES ('logo', ?, 'text', 'Logo do cliente')`,
          [logoPath],
          function(insertErr) {
            if (insertErr) {
              return res.status(500).json({ error: insertErr.message });
            }
            res.json({ success: true, path: logoPath });
          }
        );
        return;
      }

      res.json({ success: true, path: logoPath });
    }
  );
};

router.post('/logo', logoUpload.single('logo'), saveLogoConfig);
router.post('/upload-logo', logoUpload.single('logo'), saveLogoConfig);

router.get('/backup', (req, res) => {
  const config = backup.loadConfigSync();
  res.json(config);
});

router.post('/backup', (req, res) => {
  const config = req.body;
  backup.saveConfig(config);
  backup.scheduleBackup(config);
  res.json({ success: true });
});

router.post('/backup/manual', async (req, res) => {
  const config = backup.loadConfig();
  if (!config.enabled) return res.status(400).json({ error: 'Backup não está habilitado.' });
  const result = await backup.uploadBackupToDrive(config.google);
  if (result.success) {
    res.json({ success: true, file: result.file });
  } else {
    res.status(500).json({ error: result.error });
  }
});

router.get('/', (req, res) => {
  db.all('SELECT * FROM configuracoes ORDER BY chave', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

router.get('/:chave', (req, res) => {
  const { chave } = req.params;
  db.get('SELECT * FROM configuracoes WHERE chave = ?', [chave], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(row);
  });
});

router.put('/:chave', (req, res) => {
  const { chave } = req.params;
  const { valor } = req.body;

  db.run(`
    UPDATE configuracoes
    SET valor = ?, updated_at = CURRENT_TIMESTAMP
    WHERE chave = ?
  `, [valor, chave], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'Configuração atualizada com sucesso' });
  });
});

router.post('/', (req, res) => {
  const { chave, valor, tipo, descricao } = req.body;

  db.run(`
    INSERT INTO configuracoes (chave, valor, tipo, descricao)
    VALUES (?, ?, ?, ?)
  `, [chave, valor, tipo, descricao], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ id: this.lastID, message: 'Configuração criada com sucesso' });
  });
});

module.exports = router;
