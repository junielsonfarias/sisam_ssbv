import json
import re
from difflib import SequenceMatcher

# Load parsed PDF data
with open('C:/Users/JUNIELSON/Documents/Project 2026/SISAM/Docs/base 2026/parsed_2026.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Load N.S. Lourdes seed names
with open('C:/Users/JUNIELSON/Documents/Project 2026/SISAM/Docs/base 2026/lourdes_seed_names.txt', 'r', encoding='utf-8') as f:
    seed_names = set(line.strip() for line in f if line.strip())

# School name mapping: PDF name -> DB name (known)
school_mapping = {
    'BELOS PRAZERES': {'db': None, 'status': 'NOVA'},
    'CASTANHAL': {'db': 'EMEIF CASTANHAL', 'status': 'EXISTENTE'},
    'EMMANOEL DA SILVA LOBATO': {'db': 'EMEB EMMANOEL', 'status': 'EXISTENTE'},
    'INDEPENDENCIA': {'db': 'EMEIF INDEPENDENCIA', 'status': 'EXISTENTE'},
    'LOURIVAL CAMARAO': {'db': None, 'status': 'NOVA'},
    'MALOCA': {'db': 'EMEIF MALOCA', 'status': 'EXISTENTE'},
    'NOSSA SENHORA DE LOURDES': {'db': 'EMEI F NOSSA SENHORA DE LOURDES', 'status': 'EXISTENTE (seed 2026 JA FEITA)'},
    'OS INTELIGENTES': {'db': None, 'status': 'NOVA'},
    'PADRE SILVERIO': {'db': 'EMEIF PADRE SILVERIO', 'status': 'EXISTENTE'},
    'PORTO ALEGRE': {'db': None, 'status': 'NOVA'},
    'RAQUEL': {'db': 'EMEIF RAQUEL', 'status': 'EXISTENTE'},
    'REI SALOMAO': {'db': None, 'status': 'NOVA'},
    'SAO FELIX': {'db': None, 'status': 'NOVA'},
    'SAO LUCAS': {'db': 'EMEIF SAO LUCAS', 'status': 'EXISTENTE'},
    'SAO SEBASTIAO': {'db': None, 'status': 'NOVA'},
    'VEREADOR ENGRACIO': {'db': 'EMEF VER. ENGRACIO (P. DA SILVA)', 'status': 'EXISTENTE'},
}

# Normalize escola names for matching
def normalize_escola(name):
    return re.sub(r'[^A-Z0-9 ]', '', name.upper().replace('Ã', 'A').replace('É', 'E').replace('Í', 'I').replace('Ó', 'O').replace('Ú', 'U').replace('Ç', 'C').replace('Â', 'A').replace('Ê', 'E'))

def get_mapping(pdf_name):
    norm = normalize_escola(pdf_name)
    for key, val in school_mapping.items():
        if normalize_escola(key) == norm:
            return val
    return {'db': None, 'status': 'NOVA'}

# =============================================
# 1. MAPEAMENTO DE ESCOLAS
# =============================================
print("=" * 80)
print("1. MAPEAMENTO DE ESCOLAS (PDF -> BANCO DE DADOS)")
print("=" * 80)
existentes = 0
novas = 0
for e in data['escolas']:
    pdf_name = e['nome_pdf']
    info = get_mapping(pdf_name)
    n_alunos = sum(len(t['alunos']) for t in e['turmas'])
    inep = e.get('inep', 'N/A')
    if info['status'].startswith('EXISTENTE'):
        existentes += 1
        print(f"  OK  {pdf_name} -> {info['db']} ({n_alunos} alunos, INEP: {inep})")
    else:
        novas += 1
        print(f"  NEW {pdf_name} -> NAO CADASTRADA ({n_alunos} alunos, INEP: {inep})")

print(f"\n  RESUMO: {existentes} escolas existentes, {novas} escolas novas")
alunos_existentes = sum(
    sum(len(t['alunos']) for t in e['turmas'])
    for e in data['escolas']
    if get_mapping(e['nome_pdf'])['status'].startswith('EXISTENTE')
)
alunos_novas = data['total_alunos'] - alunos_existentes
print(f"  Alunos em escolas existentes: {alunos_existentes}")
print(f"  Alunos em escolas novas: {alunos_novas}")

# =============================================
# 2. ANALISE N.S. LOURDES (JA SEMEADA)
# =============================================
print("\n" + "=" * 80)
print("2. ANALISE N.S. LOURDES - COMPARACAO SEED vs PDF 2026")
print("=" * 80)

lourdes = next(e for e in data['escolas'] if 'LOURDES' in e['nome_pdf'].upper())
pdf_names = set()
for t in lourdes['turmas']:
    for a in t['alunos']:
        pdf_names.add(a['nome'].strip().upper())

print(f"  Alunos no SEED (ja migrado): {len(seed_names)}")
print(f"  Alunos no PDF 2026: {len(pdf_names)}")

# Exact matches
exact = seed_names & pdf_names
print(f"  Correspondencia EXATA: {len(exact)}")

# Fuzzy matching for remaining
seed_remaining = seed_names - exact
pdf_remaining = pdf_names - exact
fuzzy_matches = []
for s in sorted(seed_remaining):
    best_match = None
    best_score = 0
    for p in pdf_remaining:
        score = SequenceMatcher(None, s, p).ratio()
        if score > best_score:
            best_score = score
            best_match = p
    if best_score >= 0.80:
        fuzzy_matches.append((s, best_match, best_score))

print(f"  Correspondencia FUZZY (>=80%): {len(fuzzy_matches)}")
total_match = len(exact) + len(fuzzy_matches)
print(f"  TOTAL correspondencias: {total_match}/{len(seed_names)} seed = {total_match*100//len(seed_names)}%")

if fuzzy_matches:
    print(f"\n  Exemplos de correspondencia fuzzy:")
    for s, p, score in fuzzy_matches[:15]:
        print(f"    SEED: {s}")
        print(f"    PDF:  {p}  ({score:.0%})")
        print()

# Students in PDF not in seed
fuzzy_pdf_matched = set(m[1] for m in fuzzy_matches)
novos_pdf = pdf_remaining - fuzzy_pdf_matched
if novos_pdf:
    print(f"  ALUNOS NO PDF 2026 que NAO estao no SEED ({len(novos_pdf)}):")
    for n in sorted(novos_pdf):
        print(f"    + {n}")

# Students in seed not in PDF
fuzzy_seed_matched = set(m[0] for m in fuzzy_matches)
faltando_pdf = seed_remaining - fuzzy_seed_matched
if faltando_pdf:
    print(f"\n  ALUNOS NO SEED que NAO estao no PDF 2026 ({len(faltando_pdf)}):")
    for n in sorted(faltando_pdf):
        print(f"    - {n}")

# =============================================
# 3. ANALISE POR SERIE
# =============================================
print("\n" + "=" * 80)
print("3. ANALISE POR SERIE - DISTRIBUICAO 2026")
print("=" * 80)

serie_order = ['CRECHE', 'PRE I', 'PRE II', '1 ANO', '2 ANO', '3 ANO', '4 ANO', '5 ANO', '6 ANO', '7 ANO', '8 ANO', '9 ANO']

def norm_serie(s):
    return re.sub(r'[^A-Z0-9 ]', '', s.upper())

serie_totals = {}
for e in data['escolas']:
    for t in e['turmas']:
        for a in t['alunos']:
            s = a.get('serie', 'N/A')
            serie_totals[s] = serie_totals.get(s, 0) + 1

for s in sorted(serie_totals.keys()):
    count = serie_totals[s]
    bar = '#' * (count // 5)
    print(f"  {s:>12}: {count:>4} {bar}")
print(f"  {'TOTAL':>12}: {sum(serie_totals.values()):>4}")

# =============================================
# 4. ANALISE DE CPFs
# =============================================
print("\n" + "=" * 80)
print("4. ANALISE DE CPFs - QUALIDADE DOS DADOS")
print("=" * 80)

total = 0
com_cpf = 0
sem_cpf = 0
cpf_set = set()
cpf_duplicados = []

for e in data['escolas']:
    escola_total = 0
    escola_cpf = 0
    for t in e['turmas']:
        for a in t['alunos']:
            total += 1
            escola_total += 1
            cpf = a.get('cpf', '')
            if cpf and cpf not in ('N.T', 'N/A', '', 'None'):
                com_cpf += 1
                escola_cpf += 1
                clean = re.sub(r'[^0-9]', '', cpf)
                if len(clean) >= 9:
                    if clean in cpf_set:
                        cpf_duplicados.append((clean, a['nome'], e['nome_pdf']))
                    cpf_set.add(clean)
            else:
                sem_cpf += 1
    pct = escola_cpf * 100 // escola_total if escola_total > 0 else 0
    print(f"  {e['nome_pdf'][:35]:35} {escola_cpf:>4}/{escola_total:<4} CPFs ({pct}%)")

print(f"\n  TOTAL: {com_cpf}/{total} com CPF ({com_cpf*100//total}%), {sem_cpf} sem CPF")
print(f"  CPFs unicos: {len(cpf_set)}")
if cpf_duplicados:
    print(f"  CPFs duplicados encontrados: {len(cpf_duplicados)}")
    for cpf, nome, escola in cpf_duplicados[:10]:
        print(f"    CPF {cpf}: {nome} ({escola})")

# =============================================
# 5. ALUNOS QUE SAIRAM
# =============================================
print("\n" + "=" * 80)
print("5. ALUNOS QUE SAIRAM (TRANSFERIDOS)")
print("=" * 80)
for e in data['escolas']:
    for t in e['turmas']:
        for a in t['alunos']:
            if a.get('saiu', False):
                print(f"  {a['nome']} - {a.get('serie', 'N/A')} - {e['nome_pdf']}")

# =============================================
# 6. RESUMO FINAL
# =============================================
print("\n" + "=" * 80)
print("6. RESUMO FINAL DA MIGRACAO")
print("=" * 80)

lourdes_count = sum(len(t['alunos']) for t in lourdes['turmas'])
remaining = data['total_alunos'] - lourdes_count

print(f"""
  TOTAL GERAL DE ALUNOS 2026: {data['total_alunos']}

  JA MIGRADO:
    N.S. Lourdes (seed existente): {len(seed_names)} alunos
    N.S. Lourdes (PDF completo): {lourdes_count} alunos
    Diferenca (novos no PDF): {lourdes_count - len(seed_names)} alunos extras no PDF

  A MIGRAR (demais 15 escolas): {remaining} alunos
    Em escolas JA CADASTRADAS: {alunos_existentes - lourdes_count} alunos (8 escolas)
    Em escolas NOVAS a criar: {alunos_novas} alunos (7 escolas)

  ESCOLAS NOVAS A CRIAR (7):
""")

for e in data['escolas']:
    info = get_mapping(e['nome_pdf'])
    if not info['status'].startswith('EXISTENTE'):
        n = sum(len(t['alunos']) for t in e['turmas'])
        print(f"    - {e['nome_pdf']} (INEP: {e.get('inep', 'N/A')}) - {n} alunos")

print(f"""
  PERCENTUAL DE MIGRACAO:
    Escolas: {existentes}/{data['total_escolas']} = {existentes*100//data['total_escolas']}% ja cadastradas
    Alunos em escolas existentes: {alunos_existentes}/{data['total_alunos']} = {alunos_existentes*100//data['total_alunos']}%
    N.S. Lourdes seed vs PDF: {total_match}/{len(seed_names)} = {total_match*100//len(seed_names)}% correspondencia
""")
