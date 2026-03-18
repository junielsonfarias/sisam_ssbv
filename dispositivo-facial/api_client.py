"""
Cliente HTTP para comunicação com a API do SISAM.

Gerencia autenticação via API key, envio de presenças,
sincronização de alunos e heartbeat.
"""

import httpx
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


class SisamApiClient:
    def __init__(self, url: str, api_key: str, timeout: int = 15):
        self.url = url.rstrip('/')
        self.headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
        }
        self.client = httpx.Client(timeout=timeout)
        self.online = False

    def autenticar(self) -> dict | None:
        """Testa conexão e autentica o dispositivo no SISAM."""
        try:
            r = self.client.post(
                f'{self.url}/api/facial/auth',
                headers=self.headers,
            )
            if r.status_code == 200:
                self.online = True
                data = r.json()
                logger.info(
                    'Autenticado: %s (escola: %s)',
                    data.get('dispositivo', {}).get('nome'),
                    data.get('escola', {}).get('nome'),
                )
                return data
            else:
                logger.error('Falha na autenticação: %s', r.text)
                self.online = False
                return None
        except httpx.ConnectError:
            logger.warning('Sem conexão com o servidor SISAM')
            self.online = False
            return None
        except Exception as e:
            logger.error('Erro ao autenticar: %s', e)
            self.online = False
            return None

    def sync_alunos(self, atualizado_apos: str | None = None) -> dict | None:
        """Baixa alunos com embeddings faciais do SISAM."""
        try:
            params = {}
            if atualizado_apos:
                params['atualizado_apos'] = atualizado_apos

            r = self.client.get(
                f'{self.url}/api/facial/sync/alunos',
                headers=self.headers,
                params=params,
            )

            if r.status_code == 200:
                data = r.json()
                total = len(data.get('alunos', []))
                removidos = len(data.get('removidos', []))
                logger.info('Sync: %d alunos recebidos, %d removidos', total, removidos)
                self.online = True
                return data
            else:
                logger.error('Erro no sync: %s', r.text)
                return None
        except httpx.ConnectError:
            logger.warning('Sem conexão para sync')
            self.online = False
            return None
        except Exception as e:
            logger.error('Erro no sync: %s', e)
            return None

    def registrar_presenca(self, aluno_id: str, confianca: float) -> dict | None:
        """Envia registro de presença unitário."""
        try:
            payload = {
                'aluno_id': aluno_id,
                'timestamp': datetime.utcnow().isoformat() + 'Z',
                'confianca': round(confianca, 4),
            }

            r = self.client.post(
                f'{self.url}/api/facial/presencas',
                headers=self.headers,
                json=payload,
            )

            if r.status_code == 200:
                self.online = True
                return r.json()
            else:
                logger.warning('Erro ao registrar presença: %s', r.text)
                return None
        except httpx.ConnectError:
            self.online = False
            return None
        except Exception as e:
            logger.error('Erro ao registrar presença: %s', e)
            return None

    def registrar_lote(self, registros: list) -> dict | None:
        """Envia presenças em lote (fila offline)."""
        if not registros:
            return None

        try:
            r = self.client.post(
                f'{self.url}/api/facial/presencas/lote',
                headers=self.headers,
                json={'registros': registros},
            )

            if r.status_code == 200:
                self.online = True
                data = r.json()
                logger.info(
                    'Lote enviado: %d inseridos, %d atualizados, %d erros',
                    data.get('inseridos', 0),
                    data.get('atualizados', 0),
                    data.get('erros', 0),
                )
                return data
            else:
                logger.warning('Erro no lote: %s', r.text)
                return None
        except httpx.ConnectError:
            self.online = False
            return None
        except Exception as e:
            logger.error('Erro no lote: %s', e)
            return None

    def ping(self, metadata: dict | None = None) -> bool:
        """Envia heartbeat ao SISAM."""
        try:
            r = self.client.post(
                f'{self.url}/api/facial/ping',
                headers=self.headers,
                json=metadata or {},
            )
            self.online = r.status_code == 200
            return self.online
        except Exception:
            self.online = False
            return False

    def close(self):
        """Fecha o client HTTP."""
        self.client.close()
