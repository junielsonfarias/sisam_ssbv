"""
Banco de dados local SQLite para cache de alunos,
embeddings e fila de registros offline.
"""

import sqlite3
import json
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

SCHEMA = """
CREATE TABLE IF NOT EXISTS alunos (
    aluno_id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    codigo TEXT,
    turma_id TEXT,
    serie TEXT,
    embedding_base64 TEXT NOT NULL,
    versao_modelo TEXT,
    qualidade REAL,
    atualizado_em TEXT
);

CREATE TABLE IF NOT EXISTS fila_offline (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    aluno_id TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    confianca REAL NOT NULL,
    criado_em TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sync_status (
    chave TEXT PRIMARY KEY,
    valor TEXT NOT NULL
);
"""


class LocalDB:
    def __init__(self, db_path: str = 'cache.db'):
        self.db_path = db_path
        self.conn = sqlite3.connect(db_path)
        self.conn.row_factory = sqlite3.Row
        self.conn.executescript(SCHEMA)
        self.conn.commit()
        logger.info('Cache local inicializado: %s', db_path)

    def salvar_alunos(self, alunos: list):
        """Salva ou atualiza alunos no cache local."""
        cursor = self.conn.cursor()
        salvos = 0
        for aluno in alunos:
            cursor.execute(
                """INSERT OR REPLACE INTO alunos
                   (aluno_id, nome, codigo, turma_id, serie,
                    embedding_base64, versao_modelo, qualidade, atualizado_em)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    aluno.get('aluno_id'),
                    aluno.get('nome'),
                    aluno.get('codigo'),
                    aluno.get('turma_id'),
                    aluno.get('serie'),
                    aluno.get('embedding_base64'),
                    aluno.get('versao_modelo'),
                    aluno.get('qualidade'),
                    aluno.get('atualizado_em'),
                ),
            )
            salvos += 1
        self.conn.commit()
        logger.info('Cache: %d alunos salvos', salvos)
        return salvos

    def remover_alunos(self, aluno_ids: list):
        """Remove alunos do cache (transferidos, inativos)."""
        if not aluno_ids:
            return
        placeholders = ','.join(['?'] * len(aluno_ids))
        self.conn.execute(
            f'DELETE FROM alunos WHERE aluno_id IN ({placeholders})',
            aluno_ids,
        )
        self.conn.commit()
        logger.info('Cache: %d alunos removidos', len(aluno_ids))

    def carregar_alunos(self) -> list:
        """Carrega todos os alunos do cache local."""
        cursor = self.conn.execute('SELECT * FROM alunos')
        alunos = [dict(row) for row in cursor.fetchall()]
        logger.info('Cache: %d alunos carregados', len(alunos))
        return alunos

    def total_alunos(self) -> int:
        """Retorna o total de alunos no cache."""
        cursor = self.conn.execute('SELECT COUNT(*) FROM alunos')
        return cursor.fetchone()[0]

    # ---- Fila Offline ----

    def adicionar_fila_offline(self, aluno_id: str, confianca: float):
        """Adiciona registro à fila offline."""
        self.conn.execute(
            'INSERT INTO fila_offline (aluno_id, timestamp, confianca) VALUES (?, ?, ?)',
            (aluno_id, datetime.utcnow().isoformat() + 'Z', round(confianca, 4)),
        )
        self.conn.commit()

    def obter_fila_offline(self, limite: int = 500) -> list:
        """Retorna registros pendentes da fila offline."""
        cursor = self.conn.execute(
            'SELECT aluno_id, timestamp, confianca FROM fila_offline ORDER BY id LIMIT ?',
            (limite,),
        )
        return [dict(row) for row in cursor.fetchall()]

    def tamanho_fila_offline(self) -> int:
        """Retorna o número de registros na fila offline."""
        cursor = self.conn.execute('SELECT COUNT(*) FROM fila_offline')
        return cursor.fetchone()[0]

    def limpar_fila_offline(self, limite: int = 500):
        """Remove registros já enviados da fila offline."""
        self.conn.execute(
            'DELETE FROM fila_offline WHERE id IN (SELECT id FROM fila_offline ORDER BY id LIMIT ?)',
            (limite,),
        )
        self.conn.commit()

    # ---- Sync Status ----

    def get_sync_status(self, chave: str) -> str | None:
        """Obtém valor de controle de sync."""
        cursor = self.conn.execute(
            'SELECT valor FROM sync_status WHERE chave = ?', (chave,)
        )
        row = cursor.fetchone()
        return row['valor'] if row else None

    def set_sync_status(self, chave: str, valor: str):
        """Define valor de controle de sync."""
        self.conn.execute(
            'INSERT OR REPLACE INTO sync_status (chave, valor) VALUES (?, ?)',
            (chave, valor),
        )
        self.conn.commit()

    def close(self):
        """Fecha conexão com o banco."""
        self.conn.close()
