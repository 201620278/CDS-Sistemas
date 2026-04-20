const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'dados', 'mercadao.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('DB ERR', err);
    process.exit(1);
  }
});
db.all('SELECT id, nome, estoque_atual, estoque_minimo, preco_compra FROM produtos LIMIT 20', [], (err, rows) => {
  if (err) {
    console.error('QUERY ERR', err);
  } else {
    console.log(JSON.stringify(rows, null, 2));
  }
  db.close();
});
