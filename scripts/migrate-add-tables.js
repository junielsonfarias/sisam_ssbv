const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'sisam',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function migrate() {
  try {
    console.log('🔄 Executando migração do banco de dados...\n');

    // Criar tabela de Turmas
    console.log('📦 Criando tabela turmas...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS turmas (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        codigo VARCHAR(50) NOT NULL,
        nome VARCHAR(255),
        escola_id UUID NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
        serie VARCHAR(50),
        ano_letivo VARCHAR(10) NOT NULL,
        ativo BOOLEAN DEFAULT true,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(escola_id, codigo, ano_letivo)
      )
    `);
    console.log('✅ Tabela turmas criada');

    // Criar tabela de Alunos
    console.log('📦 Criando tabela alunos...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS alunos (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        codigo VARCHAR(100) UNIQUE,
        nome VARCHAR(255) NOT NULL,
        escola_id UUID NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
        turma_id UUID REFERENCES turmas(id) ON DELETE SET NULL,
        serie VARCHAR(50),
        ano_letivo VARCHAR(10),
        ativo BOOLEAN DEFAULT true,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabela alunos criada');

    // Adicionar colunas na tabela resultados_provas se não existirem
    console.log('📦 Atualizando tabela resultados_provas...');
    
    // Verificar e adicionar aluno_id
    const colAlunoId = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='resultados_provas' AND column_name='aluno_id'
    `);
    if (colAlunoId.rows.length === 0) {
      await pool.query('ALTER TABLE resultados_provas ADD COLUMN aluno_id UUID REFERENCES alunos(id) ON DELETE SET NULL');
      console.log('✅ Coluna aluno_id adicionada');
    }

    // Verificar e adicionar turma_id
    const colTurmaId = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='resultados_provas' AND column_name='turma_id'
    `);
    if (colTurmaId.rows.length === 0) {
      await pool.query('ALTER TABLE resultados_provas ADD COLUMN turma_id UUID REFERENCES turmas(id) ON DELETE SET NULL');
      console.log('✅ Coluna turma_id adicionada');
    }

    // Tornar ano_letivo obrigatório (apenas se não houver registros sem ano)
    const countSemAno = await pool.query('SELECT COUNT(*) as total FROM resultados_provas WHERE ano_letivo IS NULL');
    if (parseInt(countSemAno.rows[0].total) === 0) {
      await pool.query(`
        ALTER TABLE resultados_provas 
        ALTER COLUMN ano_letivo SET NOT NULL
      `);
      console.log('✅ Coluna ano_letivo atualizada');
    } else {
      console.log('⚠️  Existem registros sem ano_letivo. Mantendo coluna como opcional.');
    }

    // Criar índices
    console.log('📦 Criando índices...');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_turmas_escola ON turmas(escola_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_turmas_ano ON turmas(ano_letivo)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_alunos_escola ON alunos(escola_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_alunos_turma ON alunos(turma_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_resultados_aluno_id ON resultados_provas(aluno_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_resultados_turma_id ON resultados_provas(turma_id)');
    console.log('✅ Índices criados');

    // Criar triggers
    console.log('📦 Criando triggers...');
    await pool.query(`
      DROP TRIGGER IF EXISTS update_turmas_updated_at ON turmas;
      CREATE TRIGGER update_turmas_updated_at BEFORE UPDATE ON turmas
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);
    await pool.query(`
      DROP TRIGGER IF EXISTS update_alunos_updated_at ON alunos;
      CREATE TRIGGER update_alunos_updated_at BEFORE UPDATE ON alunos
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);
    console.log('✅ Triggers criados');

    console.log('\n🎉 Migração concluída com sucesso!');
  } catch (error) {
    console.error('❌ Erro na migração:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();

