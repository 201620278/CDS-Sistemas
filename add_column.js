const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', '..', 'MercantilFiscal', 'dados', 'mercadao.db');
const db = new sqlite3.Database(dbPath);

console.log('Adicionando coluna inscricao_estadual à tabela fornecedores...');

db.run(`ALTER TABLE fornecedores ADD COLUMN inscricao_estadual VARCHAR(20)`, (err) => {
    if (err) {
        if (err.message.includes('duplicate column name')) {
            console.log('✅ Coluna "inscricao_estadual" já existe!');
        } else {
            console.error('❌ Erro ao adicionar coluna:', err);
        }
    } else {
        console.log('✅ Coluna "inscricao_estadual" adicionada com sucesso!');
    }
    
    db.close();
    process.exit(0);
});
