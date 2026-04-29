const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Caminho do banco de dados
const dbPath = path.join(__dirname, 'dados', 'mercadao.db');
const db = new sqlite3.Database(dbPath);

console.log('🔄 Zerando dados do caixa...');
console.log('📍 Banco:', dbPath);

db.serialize(() => {
    // 1. Limpar tabela caixa_movimentacoes
    console.log('🗑️  Limpando movimentações do caixa...');
    db.run('DELETE FROM caixa_movimentacoes', function(err) {
        if (err) {
            console.error('❌ Erro ao limpar caixa_movimentacoes:', err);
            return;
        }
        console.log(`✅ ${this.changes} movimentações removidas`);
    });

    // 2. Limpar tabela caixa
    console.log('🗑️  Limpando registros do caixa...');
    db.run('DELETE FROM caixa', function(err) {
        if (err) {
            console.error('❌ Erro ao limpar caixa:', err);
            return;
        }
        console.log(`✅ ${this.changes} registros do caixa removidos`);
    });

    // 3. Resetar autoincrement
    console.log('🔄 Resetando sequências...');
    db.run('DELETE FROM sqlite_sequence WHERE name IN ("caixa", "caixa_movimentacoes")', function(err) {
        if (err) {
            console.error('❌ Erro ao resetar sequências:', err);
            return;
        }
        console.log('✅ Sequências resetadas');
    });

    // 4. Verificar resultado
    setTimeout(() => {
        console.log('\n📊 Verificando resultado...');
        
        db.get('SELECT COUNT(*) as total FROM caixa', (err, row) => {
            if (err) {
                console.error('❌ Erro ao verificar caixa:', err);
            } else {
                console.log(`📋 Registros na tabela caixa: ${row.total}`);
            }
        });

        db.get('SELECT COUNT(*) as total FROM caixa_movimentacoes', (err, row) => {
            if (err) {
                console.error('❌ Erro ao verificar caixa_movimentacoes:', err);
            } else {
                console.log(`📋 Movimentações na tabela caixa_movimentacoes: ${row.total}`);
            }
        });

        console.log('\n🎉 Caixa zerado com sucesso!');
        console.log('💡 Agora você pode começar a usar o caixa novamente');
        console.log('📝 As vendas foram mantidas (apenas o caixa foi zerado)');
        
        db.close();
    }, 1000);
});

// Opção para limpar tudo (inclusive vendas)
console.log('\n⚠️  AVISO: Este script apenas zera o caixa');
console.log('🔒 As vendas foram mantidas para não perder histórico');
console.log('💡 Se quiser limpar tudo (inclusive vendas), crie outro script');
