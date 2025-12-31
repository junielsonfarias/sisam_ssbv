const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'sisam',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function atualizarCodigos() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('🔄 Atualizando códigos dos alunos para formato simplificado...\n');

    // Buscar todos os alunos que têm códigos no formato antigo
    const alunos = await client.query(`
      SELECT id, codigo, nome 
      FROM alunos 
      WHERE codigo IS NOT NULL 
      AND (codigo LIKE 'ALU_%' OR codigo NOT LIKE 'ALU%')
      ORDER BY criado_em
    `);

    console.log(`📋 Encontrados ${alunos.rows.length} alunos com códigos antigos\n`);

    let atualizados = 0;
    let numeroAtual = 1;

    // Primeiro, encontrar o maior número já usado no formato novo
    const maiorCodigo = await client.query(`
      SELECT codigo FROM alunos 
      WHERE codigo LIKE 'ALU%' 
      AND codigo ~ '^ALU[0-9]+$'
      ORDER BY CAST(SUBSTRING(codigo FROM 4) AS INTEGER) DESC 
      LIMIT 1
    `);

    if (maiorCodigo.rows.length > 0 && maiorCodigo.rows[0].codigo) {
      const numero = parseInt(maiorCodigo.rows[0].codigo.replace('ALU', ''));
      numeroAtual = numero + 1;
      console.log(`📊 Próximo código disponível: ALU${numeroAtual.toString().padStart(4, '0')}\n`);
    }

    for (const aluno of alunos.rows) {
      // Verificar se já existe um código no formato novo
      const codigoNovo = `ALU${numeroAtual.toString().padStart(4, '0')}`;
      
      // Verificar se o código já existe
      const existe = await client.query(
        'SELECT id FROM alunos WHERE codigo = $1 AND id != $2',
        [codigoNovo, aluno.id]
      );

      if (existe.rows.length === 0) {
        await client.query(
          'UPDATE alunos SET codigo = $1 WHERE id = $2',
          [codigoNovo, aluno.id]
        );
        console.log(`   ✓ ${aluno.nome.substring(0, 40).padEnd(40)} ${aluno.codigo?.substring(0, 30).padEnd(30)} → ${codigoNovo}`);
        atualizados++;
        numeroAtual++;
      } else {
        console.log(`   ⚠ ${aluno.nome.substring(0, 40).padEnd(40)} Código ${codigoNovo} já existe, pulando...`);
        numeroAtual++;
        // Tentar o próximo número
        const codigoAlternativo = `ALU${numeroAtual.toString().padStart(4, '0')}`;
        await client.query(
          'UPDATE alunos SET codigo = $1 WHERE id = $2',
          [codigoAlternativo, aluno.id]
        );
        console.log(`   ✓ ${aluno.nome.substring(0, 40).padEnd(40)} ${aluno.codigo?.substring(0, 30).padEnd(30)} → ${codigoAlternativo}`);
        atualizados++;
        numeroAtual++;
      }
    }

    await client.query('COMMIT');

    console.log('\n✅ Processo concluído!');
    console.log(`   📊 Total de alunos processados: ${alunos.rows.length}`);
    console.log(`   ✓ Códigos atualizados: ${atualizados}\n`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro ao atualizar códigos:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

atualizarCodigos().catch(console.error);

