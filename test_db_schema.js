const db = require('./backend/database');

console.log('Verificando schema da tabela fornecedores...');

db.all("PRAGMA table_info(fornecedores)", [], (err, columns) => {
    if (err) {
        console.error('Erro ao verificar schema:', err);
        process.exit(1);
    }

    console.log('Colunas da tabela fornecedores:');
    columns.forEach(col => {
        console.log(`- ${col.name} (${col.type})`);
    });

    const hasInscricaoEstadual = columns.some(col => col.name === 'inscricao_estadual');
    
    if (hasInscricaoEstadual) {
        console.log('\n✅ Coluna "inscricao_estadual" encontrada!');
    } else {
        console.log('\n❌ Coluna "inscricao_estadual" NÃO encontrada!');
        console.log('Adicionando coluna manualmente...');
        
        db.run(`ALTER TABLE fornecedores ADD COLUMN inscricao_estadual VARCHAR(20)`, (alterErr) => {
            if (alterErr) {
                console.error('Erro ao adicionar coluna:', alterErr);
            } else {
                console.log('✅ Coluna "inscricao_estadual" adicionada com sucesso!');
            }
            process.exit(0);
        });
    }
    
    process.exit(0);
});
