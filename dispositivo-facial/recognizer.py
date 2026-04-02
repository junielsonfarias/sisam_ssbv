"""
Motor de reconhecimento facial.

Usa InsightFace para detecção de rosto e geração de embeddings.
Compara embeddings capturados com o cache local de alunos
usando similaridade cosseno.
"""

import base64
import logging

import numpy as np

logger = logging.getLogger(__name__)


class FacialRecognizer:
    def __init__(self, model: str = 'buffalo_sc', threshold: float = 0.85):
        """
        Inicializa o reconhecedor facial.

        Args:
            model: Modelo InsightFace a usar
                   'buffalo_sc' = leve, ideal para Raspberry Pi
                   'buffalo_l'  = mais preciso, requer mais CPU/GPU
            threshold: Confiança mínima para aceitar reconhecimento (0-1)
        """
        self.threshold = threshold
        self.alunos: dict[str, dict] = {}
        self.app = None
        self.model_name = model

    def inicializar(self):
        """Carrega o modelo de reconhecimento facial."""
        try:
            from insightface.app import FaceAnalysis

            logger.info('Carregando modelo %s...', self.model_name)
            self.app = FaceAnalysis(
                name=self.model_name,
                allowed_modules=['detection', 'recognition'],
            )
            # ctx_id=0 = CPU, ctx_id=0 com GPU configurada usa GPU
            self.app.prepare(ctx_id=0, det_size=(640, 640))
            logger.info('Modelo carregado com sucesso')
        except Exception as e:
            logger.error('Erro ao carregar modelo: %s', e)
            raise

    def carregar_alunos(self, alunos_data: list):
        """
        Carrega embeddings dos alunos a partir dos dados da API/cache.
        Suporta embeddings simples (128 floats) ou múltiplos concatenados (N*128 floats).

        Args:
            alunos_data: Lista de dicts com 'aluno_id', 'nome', 'embedding_base64'
        """
        self.alunos = {}
        erros = 0

        for aluno in alunos_data:
            try:
                aluno_id = aluno.get('aluno_id')
                embedding_b64 = aluno.get('embedding_base64')

                if not aluno_id or not embedding_b64:
                    erros += 1
                    continue

                embedding_bytes = base64.b64decode(embedding_b64)
                all_floats = np.frombuffer(embedding_bytes, dtype=np.float32).copy()

                # Suporta 1 embedding (128 floats) ou múltiplos concatenados (N*128)
                num_embeddings = len(all_floats) // 128
                if num_embeddings == 0 or len(all_floats) % 128 != 0:
                    erros += 1
                    continue

                embeddings = []
                for i in range(num_embeddings):
                    emb = all_floats[i * 128:(i + 1) * 128]
                    norma = np.linalg.norm(emb)
                    if norma > 0:
                        emb = emb / norma
                    embeddings.append(emb)

                self.alunos[aluno_id] = {
                    'nome': aluno.get('nome', 'Desconhecido'),
                    'codigo': aluno.get('codigo'),
                    'turma_id': aluno.get('turma_id'),
                    'embeddings': embeddings,
                }
            except Exception as e:
                logger.warning('Erro ao carregar aluno %s: %s', aluno.get('aluno_id'), e)
                erros += 1

        logger.info(
            'Embeddings carregados: %d alunos OK, %d erros',
            len(self.alunos), erros,
        )

    def reconhecer(self, frame) -> tuple[str | None, float, str | None]:
        """
        Reconhece um rosto no frame da câmera.

        Args:
            frame: Frame OpenCV (numpy array BGR)

        Returns:
            (aluno_id, confianca, nome) se reconhecido
            (None, 0.0, None) se não reconhecido
        """
        if self.app is None:
            return None, 0.0, None

        if not self.alunos:
            return None, 0.0, None

        # Detectar rostos
        try:
            faces = self.app.get(frame)
        except Exception as e:
            logger.debug('Erro na detecção: %s', e)
            return None, 0.0, None

        if not faces:
            return None, 0.0, None

        # Selecionar o rosto mais próximo (maior bounding box)
        face = max(
            faces,
            key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]),
        )

        # Obter embedding do rosto detectado
        embedding = face.embedding
        if embedding is None:
            return None, 0.0, None

        # Normalizar
        norma = np.linalg.norm(embedding)
        if norma > 0:
            embedding = embedding / norma

        # Comparar com todos os alunos — similaridade cosseno
        # Suporta múltiplos embeddings por aluno (melhor match entre todos)
        melhor_id = None
        melhor_score = -1.0
        melhor_nome = None

        for aluno_id, dados in self.alunos.items():
            for emb in dados['embeddings']:
                # Com vetores normalizados, dot product = similaridade cosseno
                score = float(np.dot(embedding, emb))
                if score > melhor_score:
                    melhor_score = score
                    melhor_id = aluno_id
                    melhor_nome = dados['nome']

        # Converter para confiança (0-1, clamp)
        confianca = max(0.0, min(1.0, melhor_score))

        if melhor_id and confianca >= self.threshold:
            return melhor_id, confianca, melhor_nome

        return None, confianca, None

    def gerar_embedding(self, frame) -> tuple[bytes | None, float]:
        """
        Gera embedding de um rosto para enrollment.

        Args:
            frame: Frame OpenCV (numpy array BGR)

        Returns:
            (embedding_bytes, qualidade) ou (None, 0.0)
        """
        if self.app is None:
            return None, 0.0

        try:
            faces = self.app.get(frame)
        except Exception:
            return None, 0.0

        if not faces:
            return None, 0.0

        # Selecionar rosto mais proeminente
        face = max(
            faces,
            key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]),
        )

        if face.embedding is None:
            return None, 0.0

        # Qualidade baseada no tamanho do rosto e score de detecção
        bbox_w = face.bbox[2] - face.bbox[0]
        bbox_h = face.bbox[3] - face.bbox[1]
        tamanho_score = min(100.0, (bbox_w * bbox_h) / (640 * 480) * 400)
        det_score = float(face.det_score) * 100 if hasattr(face, 'det_score') else 50.0
        qualidade = (tamanho_score + det_score) / 2

        embedding_bytes = face.embedding.astype(np.float32).tobytes()

        return embedding_bytes, round(qualidade, 1)

    @property
    def total_alunos(self) -> int:
        """Retorna o número de alunos carregados."""
        return len(self.alunos)
