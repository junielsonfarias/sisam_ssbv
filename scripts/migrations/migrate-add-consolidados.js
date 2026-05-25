const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'sisam',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function migrate() {
  try {
    console.log('🔄 Criando tabela de resultados consolidados...\n');

    // Criar tabela de resultados consolidados
    await pool.query(`
      CREATE TABLE IF NOT EXISTS resultados_consolidados (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
        escola_id UUID NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
        turma_id UUID REFERENCES turmas(id) ON DELETE SET NULL,
        ano_letivo VARCHAR(10) NOT NULL,
        serie VARCHAR(50),
        presenca VARCHAR(10) DEFAULT 'P',
        total_acertos_lp INTEGER DEFAULT 0,
        total_acertos_ch INTEGER DEFAULT 0,
        total_acertos_mat INTEGER DEFAULT 0,
        total_acertos_cn INTEGER DEFAULT 0,
        nota_lp DECIMAL(5,2),
        nota_ch DECIMAL(5,2),
        nota_mat DECIMAL(5,2),
        nota_cn DECIMAL(5,2),
        media_aluno DECIMAL(5,2),
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(aluno_id, ano_letivo)
      )
    `);
    console.log('✅ Tabela resultados_consolidados criada');

    // Criar índices
    await pool.query('CREATE INDEX IF NOT EXISTS idx_resultados_consolidados_aluno ON resultados_consolidados(aluno_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_resultados_consolidados_escola ON resultados_consolidados(escola_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_resultados_consolidados_ano ON resultados_consolidados(ano_letivo)');
    console.log('✅ Índices criados');

    // Criar trigger
    await pool.query(`
      DROP TRIGGER IF EXISTS update_resultados_consolidados_updated_at ON resultados_consolidados;
      CREATE TRIGGER update_resultados_consolidados_updated_at BEFORE UPDATE ON resultados_consolidados
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);
    console.log('✅ Trigger criado');

    console.log('\n🎉 Migração concluída!');
  } catch (error) {
    console.error('❌ Erro na migração:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();

