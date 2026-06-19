/** Remove SISAM (resultados_*) dos alunos SEED de 1o e 4o anos (series nao avaliadas pelo SISAM: dominio = 2,3,5 / 6-9). So-leitura mostra antes; deleta so dado SEED. */
const fs=require('fs'),path=require('path'),{Pool}=require('pg')
function env(){const p=path.join(__dirname,'..','..','.env.local'),o={};for(const l of fs.readFileSync(p,'utf8').split('\n')){const m=l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);if(!m)continue;let v=m[2].trim();if((v[0]==='"'&&v.endsWith('"'))||(v[0]==="'"&&v.endsWith("'")))v=v.slice(1,-1);o[m[1]]=v}return o}
const e=env(),cfg={host:'db.tbbnswuqsqhulserwtcc.supabase.co',port:5432,database:'postgres',user:'postgres',password:e.DB_PASSWORD,ssl:{rejectUnauthorized:false}}
const ALVO=`aluno_id IN (SELECT id FROM alunos WHERE codigo LIKE 'SEED-%' AND COALESCE(serie_numero, REGEXP_REPLACE(serie,'[^0-9]','','g')) IN ('1','4'))`
async function main(){const pool=new Pool(cfg),c=await pool.connect();try{const q=async s=>(await c.query(s)).rows
console.log('Antes:')
for(const t of ['resultados_provas','resultados_consolidados','resultados_producao']) console.log(' ',t,(await q(`SELECT COUNT(*)::int n FROM ${t} WHERE ${ALVO}`))[0].n)
await c.query('BEGIN')
let tot={}
for(const t of ['resultados_provas','resultados_consolidados','resultados_producao']){const r=await c.query(`DELETE FROM ${t} WHERE ${ALVO}`);tot[t]=r.rowCount}
await c.query('COMMIT')
console.log('Deletado:',JSON.stringify(tot))
console.log('SISAM restante por serie (deve faltar 1o e 4o):')
console.table(await q(`SELECT COALESCE(serie_numero, REGEXP_REPLACE(serie,'[^0-9]','','g')) serie, COUNT(DISTINCT aluno_id)::int alunos_com_sisam FROM resultados_consolidados rc JOIN alunos a ON a.id=rc.aluno_id WHERE a.codigo LIKE 'SEED-%' GROUP BY 1 ORDER BY 1`))
}catch(x){await c.query('ROLLBACK');console.error('ROLLBACK',x.message);process.exitCode=1}finally{c.release();await pool.end()}}
main().catch(x=>{console.error('Erro:',x.message);process.exit(1)})
