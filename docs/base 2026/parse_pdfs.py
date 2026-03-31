#!/usr/bin/env python3
"""
Extrator de dados de alunos dos PDFs de matrícula 2026
SEMED - São Sebastião da Boa Vista
"""

import os
import re
import json
from collections import defaultdict

import PyPDF2

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# ── Mapeamento de escolas ────────────────────────────────────────────────
ESCOLA_MAP = {
    "BELOS PRAZERES.pdf":       ("BELOS PRAZERES", "15572242"),
    "CASTANHAL.pdf":            ("CASTANHAL", "15027902"),
    "EMMANOEL LOBATO.pdf":      ("EMMANOEL DA SILVA LOBATO", "15028070"),
    "INDEPENDENCIA.pdf":        ("INDEPENDENCIA", "15027988"),
    "LOURIVAL CAMARÃO.pdf":     ("LOURIVAL CAMARÃO", "15518930"),
    "MALOCA.pdf":               ("MALOCA", "15028038"),
    "MAPA DE MATRICULA 2026 N. S. Lourdes - Maternal ao 9º Ano.pdf":
                                ("NOSSA SENHORA DE LOURDES", "15560350"),
    "OS INTELIGENTES.pdf":      ("OS INTELIGENTES", "15028453"),
    "PADRE SILVÉRIO.pdf":       ("PADRE SILVÉRIO", "15027937"),
    "PORTO ALEGRE.pdf":         ("PORTO ALEGRE", "15028097"),
    "RELAÇÃO NOMINAL RAQUEL - COM A COR DO ALUNO - 2026.pdf":
                                ("RAQUEL", ""),
    "RELAÇÃO NOMINAL REI SALOMÃO - COM A COR DO ALUNO - 2026.pdf":
                                ("REI SALOMÃO", ""),
    "SÃO FÉLIX.pdf":           ("SÃO FÉLIX", "15028208"),
    "SAO LUCAS.pdf":            ("SÃO LUCAS", "15569519"),
    "SAO SEBASTIAO.pdf":        ("SÃO SEBASTIÃO", "15028305"),
    "VEREADOR ENGRÁCIO.pdf":    ("VEREADOR ENGRÁCIO", "15028356"),
}

VALID_SERIES = [
    "CRECHE", "PRÉ I", "PRÉ II",
    "1º ANO", "2º ANO", "3º ANO", "4º ANO", "5º ANO",
    "6º ANO", "7º ANO", "8º ANO", "9º ANO",
]

# Turma code -> serie mapping
# I* = Infantil, F#* = Fundamental #º ano
# ICM01 = Creche Manhã, I1MP01 = Pré I Manhã, I2MP01 = Pré II Manhã
# IUMP01 = Unificada (Creche + Pré), F1M901 = 1ºANO, F2M901 = 2ºANO, etc.
TURMA_SERIE_MAP = {
    "ICM": "CRECHE",
    "I1M": "PRÉ I", "I1T": "PRÉ I",
    "I2M": "PRÉ II", "I2T": "PRÉ II",
    # IUM = unificada, don't map to single serie
}
# F#M/F#T -> #º ANO
for n in range(1, 10):
    TURMA_SERIE_MAP[f"F{n}M"] = f"{n}º ANO"
    TURMA_SERIE_MAP[f"F{n}T"] = f"{n}º ANO"


def serie_from_turma_code(code: str) -> str:
    """Infer serie from turma code like F7T901 -> 7º ANO."""
    if not code or len(code) < 3:
        return ""
    prefix = code[:3].upper()
    return TURMA_SERIE_MAP.get(prefix, "")


# Date and CPF patterns
DATE_PAT = r'\d{1,2}/+\d{1,2}/+\d{2,4}'
CPF_PAT = r'\d{3}[\.\s]*\d{3}[\.\s]*\d{3}[\.\s]*[-\.]\s*\d{2}'


def normalize_serie(raw: str) -> str:
    """Normalize a serie string to standard form."""
    if not raw:
        return ""
    s = raw.strip().upper()
    # Remove garbled chars
    s = s.replace("�", "").replace("\ufffd", "")
    # Collapse whitespace
    s = re.sub(r'\s+', ' ', s).strip()

    # Remove extra spaces within serie (e.g., "CREC HE" -> "CRECHE")
    s_nospace = re.sub(r'\s', '', s)

    # Direct check for Nº ANO patterns (including AN0 with zero)
    m = re.match(r'(\d)\s*[ºª°]?\s*AN[O0]\s*(?:[AB]?\s*(?:\(.*\))?)?', s)
    if m:
        return f"{m.group(1)}º ANO"
    # Also check without spaces
    m = re.match(r'(\d)[ºª°]?AN[O0]', s_nospace)
    if m:
        return f"{m.group(1)}º ANO"

    # Creche variants (including with internal spaces)
    if re.search(r'^(?:CRECH|CHECHE|CRECHE|MATERNAL|CH)$', s) or s_nospace in ("CRECHE", "CRECH", "CHECHE", "CRECHE"):
        return "CRECHE"
    if re.search(r'MATERNAL', s):
        return "CRECHE"

    # PRÉ-ESCOLAR variants (Emmanoel Lobato uses ESC0LAR with zero)
    if re.search(r'PR.*ESC[O0]LAR\s*II|PR.*II', s):
        return "PRÉ II"
    if re.search(r'PR.*ESC[O0]LAR\s*I', s):
        return "PRÉ I"

    # PRÉ II variants: PRÉII, PRÉ II, PRÉ1 I, PRÉI I, PRE II, etc.
    if re.match(r'^PR[EÉ]\s*II$', s) or re.match(r'^PR[EÉ]II$', s):
        return "PRÉ II"
    if re.match(r'^PR[EÉ]1?\s*I\s*$', s):
        # Distinguish: "PRÉI" = PRÉ I, "PRÉ1 I" = PRÉ II, "PRÉI I" = PRÉ II
        # But in context, "PRÉ1 I" means PRÉ II (the 1 is misread I)
        if re.match(r'^PR[EÉ]1\s*I$', s):
            return "PRÉ II"
        return "PRÉ I"
    if re.match(r'^PR[EÉ]\s*I$', s) or re.match(r'^PR[EÉ]I$', s) or re.match(r'^PREI$', s):
        return "PRÉ I"
    if re.match(r'^PR[EÉ]I\s*I$', s):
        return "PRÉ II"
    if re.match(r'^PRE\s*I$', s):
        return "PRÉ I"
    if re.match(r'^PRE\s*II$', s) or re.match(r'^PRE\s*Il$', s):
        return "PRÉ II"

    # Handle "Il" (lowercase L) as II
    if re.match(r'^PR[EÉ]\s*Il$', s):
        return "PRÉ II"

    # N ANO with extra text: "5 º ANO A", "8 º ANO (9 ANOS)"
    m = re.search(r'(\d)\s*[ºª°]?\s*AN[O0]', s)
    if m:
        return f"{m.group(1)}º ANO"

    # Last resort regex
    if re.search(r'CREC|CRECHE', s):
        return "CRECHE"
    if re.search(r'PR.*II', s):
        return "PRÉ II"
    if re.search(r'PR.*I(?!I)', s):
        return "PRÉ I"

    return s


def normalize_cpf(raw: str) -> str:
    """Clean up CPF string."""
    if not raw:
        return ""
    digits = re.sub(r'[^\d]', '', raw.strip())
    if len(digits) == 11:
        return f"{digits[:3]}.{digits[3:6]}.{digits[6:9]}-{digits[9:]}"
    return raw.strip()


def normalize_date(raw: str) -> str:
    """Clean up date string."""
    if not raw:
        return ""
    s = raw.strip()
    s = re.sub(r'/+', '/', s)
    # Fix: 29/12/20-21 -> 29/12/2021
    s = re.sub(r'(\d{2}/\d{2}/\d{2})-(\d{2})', r'\g<1>\g<2>', s)
    # Fix: 24/062/2015 -> 24/06/2015
    s = re.sub(r'(\d{2})/0?(\d)(\d)/(\d{4})', lambda m: f"{m.group(1)}/{m.group(2).zfill(2)}/{m.group(4)}" if len(m.group(2)+m.group(3)) > 2 else m.group(0), s)
    # Simpler fix for typos like 24/062/2015
    m = re.match(r'(\d{1,2})/(\d{2,3})/(\d{4})', s)
    if m and len(m.group(2)) == 3:
        # Take first 2 digits of month
        s = f"{m.group(1)}/{m.group(2)[:2]}/{m.group(3)}"
    m = re.match(r'(\d{1,2})/(\d{1,2})/(\d{4})', s)
    if m:
        return f"{int(m.group(1)):02d}/{int(m.group(2)):02d}/{m.group(3)}"
    m = re.match(r'(\d{1,2})/(\d{1,2})/(\d{2})$', s)
    if m:
        yy = int(m.group(3))
        year = 2000 + yy if yy < 50 else 1900 + yy
        return f"{int(m.group(1)):02d}/{int(m.group(2)):02d}/{year}"
    return s


def extract_turma_code(page_text: str) -> str:
    """Extract turma code from page text."""
    # Common codes: IUMP01, I1MP01, I2MP01, ICM01, FMM901, FMM902, F1M901, F1M902,
    # F2M901, F3M901, F4M901, F5T901, F6T901, F7T901, F8T901, F9T901
    # Pattern: starts with I or F, has letters/digits, ends with 2+ digits

    # First try to find turma code after TURMA keyword
    # Handle spaces in the code: "IU MP01" -> "IUMP01"
    lines = page_text.replace('\n', ' ')

    # Look for "TURMA" or "Turma:" followed by the code
    # The code might have spaces: "IU MP01", "IUMPO1"
    patterns = [
        r'TURMA[:\s=]+(?:MULTI\s*ETAPA\s*=?\s*)?([IF]\d?\w{1,5}\d{2})',
        r'Turma[:\s]+([IF]\d?\w{1,5}\d{2})',
        r'TURMA\s*=?\s*([IF]\d?\w{1,5}\d{2})',
    ]
    for pat in patterns:
        m = re.search(pat, lines, re.IGNORECASE)
        if m:
            code = m.group(1).upper().replace(' ', '')
            # Fix common OCR: O -> 0 in specific positions, IUMPO1 -> IUMP01
            code = re.sub(r'O(\d)', r'0\1', code)
            code = re.sub(r'(\d)O', r'\g<1>0', code)
            return code

    # Handle spaces in code: "TURMA =IU MP01" or "TURMA IUMPO1"
    m = re.search(r'TURMA\s*=?\s*([IF][\w\s]{2,8}\d{2})', lines, re.IGNORECASE)
    if m:
        code = re.sub(r'\s+', '', m.group(1)).upper()
        code = re.sub(r'O(\d)', r'0\1', code)
        code = re.sub(r'(\d)O', r'\g<1>0', code)
        # Validate: should be 5-7 chars
        if 4 <= len(code) <= 8:
            return code

    # For N.S. Lourdes: "NOME DA TURMA: ICM01" or "F2M901"
    m = re.search(r'NOME DA TURMA:\s*(\w{4,8})', lines, re.IGNORECASE)
    if m:
        return m.group(1).upper()

    return ""


def extract_turno(page_text: str, turma_code: str) -> str:
    """Extract turno from page."""
    if re.search(r'TURNO[:\s]*\(?\s*TARDE\s*\)?|2\s*[ºª°]?\s*\(\s*TARDE\s*\)', page_text, re.IGNORECASE):
        return "Tarde"
    if re.search(r'TURNO[:\s]*\(?\s*MANH|1\s*[ºª°]?\s*\(\s*MANH', page_text, re.IGNORECASE):
        return "Manhã"
    if re.search(r'Turno:\s*Tarde', page_text, re.IGNORECASE):
        return "Tarde"
    if re.search(r'Turno:\s*Manh', page_text, re.IGNORECASE):
        return "Manhã"
    if re.search(r'TURNO:\s*TARDE', page_text, re.IGNORECASE):
        return "Tarde"
    if re.search(r'TURNO:\s*MANH', page_text, re.IGNORECASE):
        return "Manhã"
    # Infer from turma code: T in position 2+ = Tarde, M = Manhã
    if turma_code:
        # F6T901 -> Tarde, FMM901 -> Manhã, I2MP01 -> Manhã
        if len(turma_code) >= 3 and 'T' in turma_code[1:4]:
            return "Tarde"
        if len(turma_code) >= 3 and 'M' in turma_code[1:4]:
            return "Manhã"
    return ""


def extract_professor(page_text: str) -> str:
    """Extract professor name."""
    m = re.search(
        r'PROFESSOR(?:A|ES|AS|E)?[:\s(]*\s*([A-ZÁÉÍÓÚÃÕÂÊÔÇ][A-ZÁÉÍÓÚÃÕÂÊÔÇa-záéíóúãõâêôç\s.\/]+?)(?:\s{3,}|\n|TURMA|INEP|MATRICUL|$)',
        page_text
    )
    if not m:
        m = re.search(
            r'Professor\s*\(?a?\)?\s*[:\s]*\s*([A-ZÁÉÍÓÚÃÕÂÊÔÇ][\w\s.\/]+?)(?:\s{3,}|_{3,}|\n|$)',
            page_text
        )
    if m:
        prof = re.sub(r'\s+', ' ', m.group(1)).strip()
        prof = re.sub(r'[_\-]+$', '', prof).strip()
        prof = re.sub(r'\s*(?:TURMA|INEP|MATRICUL|ANO\s*\d{4}|RELA).*', '', prof, flags=re.IGNORECASE).strip()
        if len(prof) > 3:
            return prof
    return ""


def extract_serie_from_header(page_text: str) -> str:
    """Determine the serie from the page header."""
    # N.S. Lourdes: "NOME DA TURMA: ICM01 ( Maternal II )"
    m = re.search(r'NOME DA TURMA:\s*\w+\s*\(\s*([^)]+)\)', page_text, re.IGNORECASE)
    if m:
        raw = m.group(1).strip()
        if re.search(r'maternal', raw, re.IGNORECASE):
            return "CRECHE"
        return normalize_serie(raw)

    # N.S. Lourdes: "F4T901" followed by turno info -- try extracting from turma line
    # "(2º ANO)" or "(PRÉ I)" or "(PRÉ II)" or "(9º ANO)"
    m = re.search(r'\(\s*(\d[ºª°]?\s*ANO)\s*\)', page_text, re.IGNORECASE)
    if m:
        return normalize_serie(m.group(1))
    m = re.search(r'\(\s*(PR[ÉE]\s*I{1,2})\s*\)', page_text, re.IGNORECASE)
    if m:
        return normalize_serie(m.group(1))
    m = re.search(r'\(\s*(Maternal\s*\w*)\s*\)', page_text, re.IGNORECASE)
    if m:
        return "CRECHE"

    # Emmanoel: "Etapa: PRÉ-ESC0LAR I"
    m = re.search(r'Etapa:\s*([^\n]+?)(?:\s{2,}|Turno)', page_text)
    if m:
        return normalize_serie(m.group(1).strip())

    # "SÉRIE: 6º ANO"
    m = re.search(r'S[ÉE]RIE:\s*(\d[ºª°]?\s*ANO)', page_text, re.IGNORECASE)
    if m:
        return normalize_serie(m.group(1))

    # Emmanoel: "Turma: F1M901  Etapa: 1ºANO A" or similar after Etapa
    m = re.search(r'Etapa:\s*(\d[ºª°]?\s*ANO\s*[AB]?)', page_text, re.IGNORECASE)
    if m:
        return normalize_serie(m.group(1))

    # "TURMA: F1M901 =1ºANO A" or "TURMA FMM901   ANO 2026" with "1º/2º/3º... ANO"
    m = re.search(r'=\s*(\d[ºª°]?\s*ANO\s*[AB]?)', page_text, re.IGNORECASE)
    if m:
        return normalize_serie(m.group(1))

    # "NIVEL CRECHE" or "CRECHE 3 ANOS"
    if re.search(r'NIVEL\s*CRECHE|CRECHE\s*\d\s*ANOS', page_text, re.IGNORECASE):
        return "CRECHE"

    # "TURMA: I1MP0I PRÉ I" - turma followed by serie
    m = re.search(r'TURMA:\s*\w+\s+(PR[ÉE]\s*I{1,2})\b', page_text, re.IGNORECASE)
    if m:
        return normalize_serie(m.group(1))

    # "CRECHE/PRÉ I/PRÉ II" - multigrade header (don't assign single serie)
    # "1º/2º/3º/4º/5º ANO" - multigrade

    # Raquel/Rei Salomão: "TURMA: F1M901 – 1º ANO" or "TURMA: F2M901 - 2º ANO"
    m = re.search(r'TURMA:?\s*\w+\s*[-–]\s*(\d[ºª°]?\s*ANO)', page_text, re.IGNORECASE)
    if m:
        return normalize_serie(m.group(1))

    # "F9T901 - 9º ANO"
    m = re.search(r'\w+\s*[-–]\s*(\d[ºª°]?\s*ANO)', page_text, re.IGNORECASE)
    if m:
        return normalize_serie(m.group(1))

    # "TURMA: IUMP01 - CRECHE/PRÉ I"
    m = re.search(r'[-–]\s*(CRECHE)', page_text, re.IGNORECASE)
    if m:
        # Multigrade - don't force
        pass

    # "PRÉ II" standalone in header for Raquel
    m = re.search(r'TURMA:\s*\w+\s*[-–]\s*(PR[ÉE]\s*I{1,2})', page_text, re.IGNORECASE)
    if m:
        return normalize_serie(m.group(1))
    m = re.search(r'[-–]\s*(PR[ÉE]\s*I{1,2})\b', page_text, re.IGNORECASE)
    if m:
        return normalize_serie(m.group(1))

    # "TURMA ICM01" for Padre Silvério - check for level info nearby
    if re.search(r'PR[ÉE]\s*I\s*/', page_text, re.IGNORECASE):
        return "PRÉ I"  # PRÉ I / ... header

    return ""


def parse_students_from_page(page_text: str, header_serie: str = "", turma_code: str = "") -> list:
    """Parse student records from a page."""
    students = []
    lines = page_text.split('\n')

    # Collect "saiu" notes about specific student numbers
    saiu_notes = set()
    for line in lines:
        m = re.search(r'alun[oa]\s*n[ºª°]?\s*(\d+)\s*saiu', line, re.IGNORECASE)
        if m:
            saiu_notes.add(int(m.group(1)))

    # Track current section serie for pages with section headers
    current_section_serie = ""

    for line in lines:
        ls = line.strip()
        if not ls:
            continue

        # Check for section headers: standalone serie labels
        # "CRECHE", "PRÉ I", "1ºANO", "2º ANO" etc. as a line by themselves
        section_match = re.match(
            r'^\s*(CRECHE|CHECHE|PR[ÉE]\s*I{1,2}|PR[ÉE]I|PR[ÉE]\s*ESCOLA|'
            r'\d[ºª°]?\s*ANO)\s*$',
            ls, re.IGNORECASE
        )
        if section_match:
            current_section_serie = normalize_serie(section_match.group(1))
            continue

        # Also handle inline section markers: "  1ºANO  " before student entries
        # or "CRECHE" "PRÉ I" etc. that appear on their own line amid data

        # Match student line: starts with number 01-99
        m = re.match(r'^(\d{1,2})\s+(.+)', ls)
        if not m:
            continue

        num = int(m.group(1))
        rest = m.group(2)

        # Skip header-like lines
        if len(rest) < 10:
            continue
        if re.match(r'(NOME|N[ºª°]|ALUNO|S[ÉE]RIE|DATA|CPF|COR|<)', rest, re.IGNORECASE):
            continue

        # Find a date in the line
        date_match = re.search(DATE_PAT, rest)
        if not date_match:
            continue

        date_str = normalize_date(date_match.group())
        before_date = rest[:date_match.start()].strip()
        after_date = rest[date_match.end():].strip()

        # For N.S. Lourdes there's a second date (data de matricula) right after birth date
        # Skip it when looking for CPF
        second_date = re.match(DATE_PAT, after_date)
        if second_date:
            after_date = after_date[second_date.end():].strip()

        # Extract CPF
        cpf_match = re.search(CPF_PAT, after_date)
        cpf = normalize_cpf(cpf_match.group()) if cpf_match else ""

        # Check saiu
        saiu = num in saiu_notes
        if re.search(r'/\s*saiu|saiu\b', rest, re.IGNORECASE):
            saiu = True
        if re.search(r'/T\s*$|/T\s', rest):
            saiu = True

        # Parse name and possible inline serie from before_date
        name = before_date
        serie_in_line = ""

        # Try to find serie at end of name string or within it
        # Patterns for inline series
        serie_regex = [
            (r'\s+(CRECH(?:E)?)\s*$', None),
            (r'\s+(CHECHE)\s*$', None),
            (r'\s+(CH)\s*$', None),
            (r'\s+(PR[ÉE]\s*I{1,2})\s*$', None),
            (r'\s+(PR[ÉE]I)\s*$', None),
            (r'\s+(PR[ÉE]Il)\s*$', None),
            (r'\s+(PR[ÉE]1\s*I)\s*$', None),
            (r'\s+(PREI)\s*$', None),
            (r'\s+(PREII)\s*$', None),
            (r'\s+(\d[ºª°]?\s*AN[O0])\s*$', None),
            (r'\s+(\d[ºª°]\s*AN[O0])\b', None),
            # Raquel format: "TURMA" column with CRECHE/PRÉ I between name and date
            (r'\s+(CRECHE|CH|PR[ÉE]\s*I{1,2}|PRE\s*I{1,2}|\d[ºª°]?\s*AN[O0])\s', None),
            # CREC HE (with space)
            (r'\s+(CREC\s+HE)\s*$', None),
        ]

        for pat, _ in serie_regex:
            sm = re.search(pat, name, re.IGNORECASE)
            if sm:
                serie_in_line = sm.group(1).strip()
                name = (name[:sm.start()] + name[sm.end():]).strip()
                break

        # Clean the name
        name = re.sub(r'\s*/\s*saiu.*', '', name, flags=re.IGNORECASE)
        name = re.sub(r'\s*saiu\s*(no\s*dia)?.*', '', name, flags=re.IGNORECASE)
        name = re.sub(r'\s*-\s*LAUDO.*', '', name, flags=re.IGNORECASE)
        name = re.sub(r'\s*-\s*PCD.*', '', name, flags=re.IGNORECASE)
        # Remove cor/raça info that might leak into name for Raquel format
        name = re.sub(r'\s+(?:PARDA|BRANCA|PRETA|NEGRA|IND[ÍI]GENA|AMARELA|N[ÃA]O DECLARADA|PCD)\s*$', '', name, flags=re.IGNORECASE)
        # Remove trailing " /T" transfer marker
        name = re.sub(r'\s*/T\s*$', '', name)
        name = re.sub(r'\s+', ' ', name).strip()

        if not name or len(name) < 3:
            continue

        # Fix: name might end with "4º" from "4ºAN0" split across line
        m_trailing = re.search(r'\s+(\d[ºª°])$', name)
        if m_trailing:
            serie_in_line = m_trailing.group(1) + " ANO"
            name = name[:m_trailing.start()].strip()

        # Also check if serie is embedded in the name with spaces: "JEREMIAS DA SILVA FERREIRA CREC HE"
        if not serie_in_line:
            name_nospace = re.sub(r'\s', '', name)
            if name_nospace.endswith('CRECHE') and not name.endswith('CRECHE'):
                serie_in_line = "CRECHE"
                # Remove the split serie from name
                name = re.sub(r'\s*CREC\s*HE\s*$', '', name, flags=re.IGNORECASE).strip()
            elif re.search(r'CREC\s+HE\b', name, re.IGNORECASE):
                serie_in_line = "CRECHE"
                name = re.sub(r'\s*CREC\s+HE\b', '', name, flags=re.IGNORECASE).strip()

        # Determine serie with fallback chain
        if serie_in_line:
            serie_in_line = serie_in_line.replace('Il', 'II')
            serie = normalize_serie(serie_in_line)
        elif current_section_serie:
            serie = current_section_serie
        elif header_serie:
            serie = header_serie
        else:
            # Fallback: infer from turma code
            serie = serie_from_turma_code(turma_code)

        students.append({
            "nome": name,
            "serie": serie,
            "data_nascimento": date_str,
            "cpf": cpf,
            "saiu": saiu,
        })

    return students


def parse_pdf(filepath: str, escola_nome: str) -> list:
    """Parse a single PDF and return list of turma dicts."""
    reader = PyPDF2.PdfReader(filepath)
    turmas_dict = {}  # turma_code -> dict

    for page_idx, page in enumerate(reader.pages):
        text = page.extract_text()
        if not text or not text.strip():
            continue

        # Skip blank/empty pages (only whitespace or numbers)
        content = re.sub(r'[\s\d]+', '', text)
        if len(content) < 20:
            continue

        # Extract turma info
        turma_code = extract_turma_code(text)
        turno = extract_turno(text, turma_code)
        professor = extract_professor(text)
        header_serie = extract_serie_from_header(text)

        # ESPERANÇA multietapa
        is_esperanca = bool(re.search(r'ESPERAN[ÇC]A', text, re.IGNORECASE))
        if is_esperanca:
            turma_code = turma_code or "ESPERANCA"

        # If no turma code, create one from page index
        if not turma_code:
            if header_serie or page_idx == 0:
                turma_code = f"PAGE_{page_idx}"
            else:
                continue

        # Parse students
        students = parse_students_from_page(text, header_serie, turma_code)
        if not students:
            continue

        # Merge into turma
        if turma_code not in turmas_dict:
            turmas_dict[turma_code] = {
                "codigo": turma_code,
                "turno": turno or "Manhã",
                "professor": professor,
                "alunos": [],
            }
        else:
            if professor and not turmas_dict[turma_code]["professor"]:
                turmas_dict[turma_code]["professor"] = professor
            if turno and turmas_dict[turma_code]["turno"] == "Manhã" and turno != "Manhã":
                turmas_dict[turma_code]["turno"] = turno

        turmas_dict[turma_code]["alunos"].extend(students)

    # Deduplicate within each turma
    for turma in turmas_dict.values():
        seen = set()
        unique = []
        for a in turma["alunos"]:
            key = (a["nome"].upper(), a["data_nascimento"])
            if key not in seen:
                seen.add(key)
                unique.append(a)
        turma["alunos"] = unique

    # Clean up PAGE_X turma codes
    result = []
    for code, turma in turmas_dict.items():
        if code.startswith("PAGE_") and turma["alunos"]:
            # Try to merge into a real turma if there's only one
            result.append(turma)
        elif turma["alunos"]:
            result.append(turma)

    return result


def main():
    all_escolas = []
    total_alunos = 0
    escola_counts = {}
    serie_counts = defaultdict(int)

    for filename, (escola_nome, inep) in sorted(ESCOLA_MAP.items()):
        filepath = os.path.join(BASE_DIR, filename)
        if not os.path.exists(filepath):
            print(f"  AVISO: Arquivo não encontrado: {filename}")
            continue

        print(f"  Processando: {filename}...")
        turmas = parse_pdf(filepath, escola_nome)

        escola_total = sum(len(t["alunos"]) for t in turmas)
        total_alunos += escola_total
        escola_counts[escola_nome] = escola_total

        for t in turmas:
            for a in t["alunos"]:
                s = a["serie"] if a["serie"] else "(não identificada)"
                serie_counts[s] += 1

        all_escolas.append({
            "nome_pdf": escola_nome,
            "inep": inep,
            "turmas": turmas,
        })

    output = {
        "escolas": all_escolas,
        "total_alunos": total_alunos,
        "total_escolas": len(all_escolas),
    }

    output_path = os.path.join(BASE_DIR, "parsed_2026.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    # ── Summary ──
    print("\n" + "=" * 60)
    print("RESUMO DA EXTRAÇÃO - MATRÍCULA 2026")
    print("=" * 60)

    print(f"\n{'ESCOLA':<40} {'ALUNOS':>8}")
    print("-" * 50)
    for nome, count in sorted(escola_counts.items()):
        print(f"  {nome:<38} {count:>6}")
    print("-" * 50)
    print(f"  {'TOTAL GERAL':<38} {total_alunos:>6}")

    print(f"\n{'SÉRIE':<25} {'ALUNOS':>8}")
    print("-" * 35)
    serie_order = VALID_SERIES + ["(não identificada)"]
    for s in serie_order:
        if s in serie_counts:
            print(f"  {s:<23} {serie_counts[s]:>6}")
    for s, c in sorted(serie_counts.items()):
        if s not in serie_order:
            print(f"  {s:<23} {c:>6}")
    print("-" * 35)
    print(f"  {'TOTAL':<23} {total_alunos:>6}")

    print(f"\nTotal de escolas: {len(all_escolas)}")
    print(f"Arquivo salvo em: {output_path}")

    saiu_count = sum(
        1 for e in all_escolas for t in e["turmas"] for a in t["alunos"] if a["saiu"]
    )
    print(f"Alunos marcados como 'saiu': {saiu_count}")

    # Show any non-standard series
    non_std = {s for s in serie_counts if s not in serie_order}
    if non_std:
        print(f"\n  AVISO: Séries não padronizadas encontradas: {non_std}")


if __name__ == "__main__":
    main()
