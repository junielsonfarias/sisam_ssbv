/**
 * Script para atualizar configuração das séries
 * - Anos iniciais (2º e 3º): LP + MAT + Itens de Produção (sem CH e CN)
 * - Anos finais (6º-9º): LP + CH + MAT + CN
 */

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

async function atualizarConfigSeries() {
  const client = await pool.connect();

  try {
    console.log('=== Atualizando Configuração das Séries ===\n');

    // Verificar séries existentes
    const seriesResult = await client.query(`
      SELECT serie, avalia_lp, avalia_mat, avalia_ch, avalia_cn,
             qtd_questoes_lp, qtd_questoes_mat, qtd_questoes_ch, qtd_questoes_cn,
             qtd_itens_producao
      FROM configuracao_series
      ORDER BY serie
    `);

    console.log('Configurações atuais:');
    for (const s of seriesResult.rows) {
      console.log(`  ${s.serie}: LP=${s.avalia_lp}(${s.qtd_questoes_lp}) MAT=${s.avalia_mat}(${s.qtd_questoes_mat}) CH=${s.avalia_ch}(${s.qtd_questoes_ch}) CN=${s.avalia_cn}(${s.qtd_questoes_cn}) Prod=${s.qtd_itens_producao}`);
    }

    // Atualizar configuração para anos iniciais (2º e 3º ano)
    console.log('\nAtualizando anos iniciais (2º e 3º ano)...');

    const anosIniciais = ['2', '3'];
    for (const serie of anosIniciais) {
      const result = await client.query(`
        UPDATE configuracao_series
        SET
          avalia_lp = true,
          avalia_mat = true,
          avalia_ch = false,
          avalia_cn = false,
          qtd_questoes_lp = 20,
          qtd_questoes_mat = 8,
          qtd_questoes_ch = 0,
          qtd_questoes_cn = 0,
          qtd_itens_producao = 8,
          atualizado_em = CURRENT_TIMESTAMP
        WHERE serie = $1
        RETURNING serie
      `, [serie]);

      if (result.rowCount > 0) {
        console.log(`  ${serie}: Atualizado (LP=20, MAT=8, Prod=8, CH/CN desativados)`);
      } else {
        // Se não existe, criar
        await client.query(`
          INSERT INTO configuracao_series (
            serie, nome_serie, avalia_lp, avalia_mat, avalia_ch, avalia_cn,
            qtd_questoes_lp, qtd_questoes_mat, qtd_questoes_ch, qtd_questoes_cn,
            qtd_itens_producao
          ) VALUES ($1, $2, true, true, false, false, 20, 8, 0, 0, 8)
        `, [serie, serie]);
        console.log(`  ${serie}: Criado (LP=20, MAT=8, Prod=8)`);
      }
    }

    // Atualizar configuração para anos finais (6º ao 9º ano)
    console.log('\nAtualizando anos finais (6º-9º ano)...');

    const anosFinais = ['6', '7', '8', '9'];
    for (const serie of anosFinais) {
      const result = await client.query(`
        UPDATE configuracao_series
        SET
          avalia_lp = true,
          avalia_mat = true,
          avalia_ch = true,
          avalia_cn = true,
          qtd_questoes_lp = 20,
          qtd_questoes_mat = 20,
          qtd_questoes_ch = 10,
          qtd_questoes_cn = 10,
          qtd_itens_producao = 0,
          atualizado_em = CURRENT_TIMESTAMP
        WHERE serie = $1
        RETURNING serie
      `, [serie]);

      if (result.rowCount > 0) {
        console.log(`  ${serie}: Atualizado (LP=20, CH=10, MAT=20, CN=10)`);
      } else {
        // Se não existe, criar
        await client.query(`
          INSERT INTO configuracao_series (
            serie, nome_serie, avalia_lp, avalia_mat, avalia_ch, avalia_cn,
            qtd_questoes_lp, qtd_questoes_mat, qtd_questoes_ch, qtd_questoes_cn,
            qtd_itens_producao
          ) VALUES ($1, $2, true, true, true, true, 20, 20, 10, 10, 0)
        `, [serie, serie]);
        console.log(`  ${serie}: Criado (LP=20, CH=10, MAT=20, CN=10)`);
      }
    }

    // Verificar resultado final
    console.log('\n=== Configurações Finais ===');
    const finalResult = await client.query(`
      SELECT serie, avalia_lp, avalia_mat, avalia_ch, avalia_cn,
             qtd_questoes_lp, qtd_questoes_mat, qtd_questoes_ch, qtd_questoes_cn,
             qtd_itens_producao
      FROM configuracao_series
      ORDER BY serie
    `);

    for (const s of finalResult.rows) {
      const disciplinas = [];
      if (s.avalia_lp) disciplinas.push(`LP(${s.qtd_questoes_lp})`);
      if (s.avalia_ch) disciplinas.push(`CH(${s.qtd_questoes_ch})`);
      if (s.avalia_mat) disciplinas.push(`MAT(${s.qtd_questoes_mat})`);
      if (s.avalia_cn) disciplinas.push(`CN(${s.qtd_questoes_cn})`);
      if (s.qtd_itens_producao > 0) disciplinas.push(`Prod(${s.qtd_itens_producao})`);

      console.log(`  ${s.serie}: ${disciplinas.join(' + ')}`);
    }

    console.log('\nAtualização concluída!');

  } catch (error) {
    console.error('Erro:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

atualizarConfigSeries();
