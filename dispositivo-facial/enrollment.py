"""
Script de Enrollment — Cadastro facial de alunos.

Captura múltiplas fotos do aluno, gera embedding médio
e envia para a API admin do SISAM.

Uso: python enrollment.py

Requer:
- Acesso admin ao SISAM (cookie JWT via browser)
- Câmera conectada
- Consentimento do responsável já registrado no SISAM
"""

import base64
import json
import sys
import time

import cv2
import numpy as np

from recognizer import FacialRecognizer


def carregar_config() -> dict:
    with open('config.json', 'r') as f:
        return json.load(f)


def capturar_embedding(camera, recognizer, num_capturas: int = 5) -> tuple[str | None, float]:
    """
    Captura múltiplas fotos e gera embedding médio.

    Returns:
        (embedding_base64, qualidade_media) ou (None, 0)
    """
    embeddings = []
    qualidades = []

    print(f'\nSerão capturadas {num_capturas} fotos.')
    print('Posicione o aluno de frente para a câmera.\n')

    for i in range(num_capturas):
        input(f'  Foto {i + 1}/{num_capturas} — Pressione ENTER para capturar...')

        # Capturar alguns frames para estabilizar
        for _ in range(5):
            camera.read()

        ret, frame = camera.read()
        if not ret:
            print('  [ERRO] Falha na captura da câmera')
            continue

        # Mostrar preview
        cv2.imshow('Enrollment - Preview', frame)
        cv2.waitKey(500)

        embedding_bytes, qualidade = recognizer.gerar_embedding(frame)

        if embedding_bytes:
            embeddings.append(np.frombuffer(embedding_bytes, dtype=np.float32))
            qualidades.append(qualidade)
            print(f'  [OK] Captura {i + 1} — qualidade: {qualidade:.1f}%')
        else:
            print(f'  [FALHA] Nenhum rosto detectado na captura {i + 1}')

    cv2.destroyAllWindows()

    if len(embeddings) < 3:
        print(f'\nCapturas insuficientes ({len(embeddings)}/3 mínimo)')
        return None, 0

    # Calcular embedding médio (mais robusto que uma única captura)
    embedding_medio = np.mean(embeddings, axis=0).astype(np.float32)
    qualidade_media = sum(qualidades) / len(qualidades)

    embedding_base64 = base64.b64encode(embedding_medio.tobytes()).decode('utf-8')

    print(f'\nEmbedding gerado com sucesso!')
    print(f'  Capturas válidas: {len(embeddings)}/{num_capturas}')
    print(f'  Qualidade média: {qualidade_media:.1f}%')

    return embedding_base64, qualidade_media


def main():
    config = carregar_config()

    print('=' * 60)
    print('  SISAM — Enrollment Facial (Cadastro de Aluno)')
    print('=' * 60)

    # Inicializar reconhecedor
    print('\nCarregando modelo de reconhecimento...')
    recognizer = FacialRecognizer(
        model=config.get('model', 'buffalo_sc'),
        threshold=config.get('confidence_threshold', 0.85),
    )
    recognizer.inicializar()

    # Abrir câmera
    camera = cv2.VideoCapture(config.get('camera_index', 0))
    camera.set(cv2.CAP_PROP_FRAME_WIDTH, config.get('camera_width', 640))
    camera.set(cv2.CAP_PROP_FRAME_HEIGHT, config.get('camera_height', 480))

    if not camera.isOpened():
        print('[ERRO] Não foi possível abrir a câmera')
        sys.exit(1)

    print('Câmera pronta.\n')

    while True:
        print('-' * 60)
        aluno_id = input('ID do aluno (UUID) ou "sair" para encerrar: ').strip()

        if aluno_id.lower() in ('sair', 'exit', 'q'):
            break

        if len(aluno_id) < 36:
            print('[ERRO] ID inválido. Use o UUID do aluno do SISAM.')
            continue

        # Capturar embedding
        embedding_base64, qualidade = capturar_embedding(camera, recognizer)

        if not embedding_base64:
            print('Enrollment cancelado para este aluno.\n')
            continue

        # Salvar embedding em arquivo para upload manual
        output = {
            'aluno_id': aluno_id,
            'embedding_data': embedding_base64,
            'qualidade': qualidade,
        }

        filename = f'embedding_{aluno_id[:8]}.json'
        with open(filename, 'w') as f:
            json.dump(output, f, indent=2)

        print(f'\nEmbedding salvo em: {filename}')
        print('Para enviar ao SISAM, use a página "Cadastro Facial" no painel admin')
        print('ou envie via API:')
        print(f'  POST /api/admin/facial/enrollment')
        print(f'  Body: conteúdo do arquivo {filename}\n')

    camera.release()
    cv2.destroyAllWindows()
    print('\nEnrollment encerrado.')


if __name__ == '__main__':
    main()
