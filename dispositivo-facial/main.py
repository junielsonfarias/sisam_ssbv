"""
SISAM — Aplicação de Reconhecimento Facial para Dispositivo

Aplicação principal que roda no totem/câmera da escola.
Captura frames da câmera, reconhece alunos e registra
presenças na API do SISAM.

Uso:
    python main.py              # Modo normal
    python main.py --no-video   # Sem janela de vídeo (headless)
    python main.py --test       # Testar conexão e sair
"""

import argparse
import json
import logging
import os
import signal
import sys
import time
from datetime import datetime, timedelta

import cv2

from api_client import SisamApiClient
from local_db import LocalDB
from recognizer import FacialRecognizer

# ============================================================================
# Logging
# ============================================================================


def setup_logging(level: str = 'INFO'):
    os.makedirs('logs', exist_ok=True)

    log_file = f'logs/dispositivo_{datetime.now().strftime("%Y-%m-%d")}.log'

    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler(log_file, encoding='utf-8'),
        ],
    )


logger = logging.getLogger(__name__)

# ============================================================================
# Configuração
# ============================================================================


def carregar_config(path: str = 'config.json') -> dict:
    if not os.path.exists(path):
        logger.error('Arquivo de configuração não encontrado: %s', path)
        logger.error('Copie config.json.example para config.json e configure.')
        sys.exit(1)

    with open(path, 'r') as f:
        config = json.load(f)

    if config.get('api_key', '').startswith('COLE_'):
        logger.error('Configure a API key em config.json')
        sys.exit(1)

    return config


# ============================================================================
# Display (janela de vídeo com informações)
# ============================================================================


def desenhar_overlay(frame, info: dict):
    """Desenha informações na tela de vídeo."""
    h, w = frame.shape[:2]

    # Barra superior (status)
    cv2.rectangle(frame, (0, 0), (w, 40), (40, 40, 40), -1)

    status_cor = (0, 255, 0) if info.get('online') else (0, 0, 255)
    status_txt = 'ONLINE' if info.get('online') else 'OFFLINE'
    cv2.putText(frame, status_txt, (10, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.6, status_cor, 2)

    alunos_txt = f'Alunos: {info.get("total_alunos", 0)}'
    cv2.putText(frame, alunos_txt, (140, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)

    hora_txt = datetime.now().strftime('%H:%M:%S')
    cv2.putText(frame, hora_txt, (w - 120, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)

    fila = info.get('fila_offline', 0)
    if fila > 0:
        fila_txt = f'Fila offline: {fila}'
        cv2.putText(frame, fila_txt, (300, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 165, 255), 1)

    # Mensagem de reconhecimento (barra inferior)
    msg = info.get('mensagem')
    msg_cor = info.get('mensagem_cor', (255, 255, 255))
    if msg:
        cv2.rectangle(frame, (0, h - 50), (w, h), (40, 40, 40), -1)
        cv2.putText(frame, msg, (10, h - 18), cv2.FONT_HERSHEY_SIMPLEX, 0.7, msg_cor, 2)

    return frame


# ============================================================================
# Loop Principal
# ============================================================================


def executar(config: dict, show_video: bool = True):
    """Loop principal de reconhecimento facial."""

    # Inicializar componentes
    api = SisamApiClient(config['sisam_url'], config['api_key'])
    db = LocalDB('cache.db')
    recognizer = FacialRecognizer(
        model=config.get('model', 'buffalo_sc'),
        threshold=config.get('confidence_threshold', 0.85),
    )

    # Carregar modelo
    logger.info('Carregando modelo de reconhecimento facial...')
    recognizer.inicializar()

    # Autenticar e sincronizar
    logger.info('Conectando ao SISAM...')
    auth_data = api.autenticar()

    if auth_data:
        # Sync completo
        sync_data = api.sync_alunos()
        if sync_data:
            alunos = sync_data.get('alunos', [])
            removidos = sync_data.get('removidos', [])
            db.salvar_alunos(alunos)
            db.remover_alunos(removidos)
            db.set_sync_status('ultimo_sync', sync_data.get('sincronizado_em', ''))
            recognizer.carregar_alunos(alunos)
        else:
            # API ok mas sync falhou — usar cache
            alunos_cache = db.carregar_alunos()
            recognizer.carregar_alunos(alunos_cache)
    else:
        # Sem conexão — usar cache local
        logger.warning('Sem conexão — usando cache local')
        alunos_cache = db.carregar_alunos()
        recognizer.carregar_alunos(alunos_cache)

    if recognizer.total_alunos == 0:
        logger.warning('Nenhum aluno carregado! Verifique a configuração e o enrollment.')

    # Abrir câmera
    camera_index = config.get('camera_index', 0)
    logger.info('Abrindo câmera %s...', camera_index)
    camera = cv2.VideoCapture(camera_index)
    camera.set(cv2.CAP_PROP_FRAME_WIDTH, config.get('camera_width', 640))
    camera.set(cv2.CAP_PROP_FRAME_HEIGHT, config.get('camera_height', 480))

    if not camera.isOpened():
        logger.error('Não foi possível abrir a câmera %s', camera_index)
        sys.exit(1)

    logger.info('Câmera aberta. Iniciando reconhecimento...')

    # Estado
    ultimos_registros: dict[str, datetime] = {}
    cooldown = timedelta(seconds=config.get('cooldown_seconds', 1800))
    fps_delay = 1.0 / config.get('fps_limit', 10)
    ultimo_ping = datetime.now()
    ultimo_sync_check = datetime.now()
    sync_interval = timedelta(minutes=config.get('sync_interval_minutes', 5))
    ping_interval = timedelta(minutes=config.get('ping_interval_minutes', 5))

    # Info do overlay
    display_info = {
        'online': api.online,
        'total_alunos': recognizer.total_alunos,
        'fila_offline': db.tamanho_fila_offline(),
        'mensagem': 'Aguardando reconhecimento...',
        'mensagem_cor': (200, 200, 200),
    }
    mensagem_timeout = datetime.now()

    # Controle de parada
    rodando = True

    def handler_sinal(sig, frame):
        nonlocal rodando
        logger.info('Sinal de parada recebido. Encerrando...')
        rodando = False

    signal.signal(signal.SIGINT, handler_sinal)
    signal.signal(signal.SIGTERM, handler_sinal)

    # ---- LOOP ----
    try:
        while rodando:
            inicio_frame = time.time()

            ret, frame = camera.read()
            if not ret:
                logger.warning('Falha na leitura da câmera')
                time.sleep(1)
                continue

            agora = datetime.now()

            # --- Reconhecimento ---
            aluno_id, confianca, nome = recognizer.reconhecer(frame)

            if aluno_id:
                # Anti-duplicata
                ultimo = ultimos_registros.get(aluno_id)
                if ultimo and agora - ultimo < cooldown:
                    # Já registrou recentemente — mostrar msg mas não registrar
                    if agora < mensagem_timeout:
                        pass  # Manter mensagem atual
                    else:
                        display_info['mensagem'] = f'{nome} — ja registrado'
                        display_info['mensagem_cor'] = (0, 200, 255)
                        mensagem_timeout = agora + timedelta(seconds=3)
                else:
                    # Registrar presença
                    resultado = api.registrar_presenca(aluno_id, confianca)

                    if resultado:
                        tipo = resultado.get('tipo', 'entrada')
                        tipo_label = 'Entrada' if tipo == 'entrada' else 'Saida'
                        logger.info(
                            'Presenca registrada: %s (%.1f%%) — %s',
                            nome, confianca * 100, tipo_label,
                        )
                        display_info['mensagem'] = f'{nome} — {tipo_label} registrada!'
                        display_info['mensagem_cor'] = (0, 255, 0)
                    else:
                        # Sem conexão — salvar offline
                        db.adicionar_fila_offline(aluno_id, confianca)
                        logger.info('Presenca offline: %s (%.1f%%)', nome, confianca * 100)
                        display_info['mensagem'] = f'{nome} — salvo offline'
                        display_info['mensagem_cor'] = (0, 165, 255)

                    ultimos_registros[aluno_id] = agora
                    mensagem_timeout = agora + timedelta(seconds=5)

            # Limpar mensagem após timeout
            if agora > mensagem_timeout:
                display_info['mensagem'] = 'Aguardando reconhecimento...'
                display_info['mensagem_cor'] = (200, 200, 200)

            # --- Tarefas periódicas ---

            # Ping + envio de fila offline
            if agora - ultimo_ping > ping_interval:
                metadata = {
                    'alunos_cache': recognizer.total_alunos,
                    'fila_offline': db.tamanho_fila_offline(),
                    'uptime': agora.isoformat(),
                }
                api.ping(metadata)
                display_info['online'] = api.online

                # Enviar fila offline
                fila = db.obter_fila_offline()
                if fila:
                    resultado_lote = api.registrar_lote(fila)
                    if resultado_lote:
                        db.limpar_fila_offline(len(fila))
                        logger.info('Fila offline sincronizada: %d registros', len(fila))

                display_info['fila_offline'] = db.tamanho_fila_offline()
                ultimo_ping = agora

            # Sync incremental de alunos
            if agora - ultimo_sync_check > sync_interval:
                ultimo_sync_ts = db.get_sync_status('ultimo_sync')
                sync_data = api.sync_alunos(atualizado_apos=ultimo_sync_ts)
                if sync_data:
                    novos = sync_data.get('alunos', [])
                    removidos = sync_data.get('removidos', [])
                    if novos:
                        db.salvar_alunos(novos)
                        # Recarregar todos os alunos do cache
                        todos = db.carregar_alunos()
                        recognizer.carregar_alunos(todos)
                        logger.info('Sync incremental: %d novos/atualizados', len(novos))
                    if removidos:
                        db.remover_alunos(removidos)
                        todos = db.carregar_alunos()
                        recognizer.carregar_alunos(todos)
                    db.set_sync_status('ultimo_sync', sync_data.get('sincronizado_em', ''))
                    display_info['total_alunos'] = recognizer.total_alunos

                ultimo_sync_check = agora

            # --- Display ---
            if show_video:
                display_info['online'] = api.online
                display_info['total_alunos'] = recognizer.total_alunos
                frame_display = desenhar_overlay(frame.copy(), display_info)
                cv2.imshow('SISAM - Reconhecimento Facial', frame_display)

                key = cv2.waitKey(1) & 0xFF
                if key == ord('q') or key == 27:  # Q ou ESC
                    logger.info('Encerrado pelo usuario (tecla Q/ESC)')
                    break

            # Controle de FPS
            tempo_frame = time.time() - inicio_frame
            espera = fps_delay - tempo_frame
            if espera > 0:
                time.sleep(espera)

    finally:
        # Cleanup
        logger.info('Encerrando...')

        # Enviar fila offline restante
        fila = db.obter_fila_offline()
        if fila:
            logger.info('Enviando %d registros offline restantes...', len(fila))
            api.registrar_lote(fila)
            db.limpar_fila_offline(len(fila))

        camera.release()
        cv2.destroyAllWindows()
        api.close()
        db.close()
        logger.info('Dispositivo encerrado.')


# ============================================================================
# Entry Point
# ============================================================================


def main():
    parser = argparse.ArgumentParser(description='SISAM - Dispositivo de Reconhecimento Facial')
    parser.add_argument('--no-video', action='store_true', help='Modo headless (sem janela de vídeo)')
    parser.add_argument('--test', action='store_true', help='Testar conexão e sair')
    parser.add_argument('--config', default='config.json', help='Caminho do arquivo de configuração')
    args = parser.parse_args()

    config = carregar_config(args.config)
    setup_logging(config.get('log_level', 'INFO'))

    logger.info('=' * 60)
    logger.info('  SISAM — Dispositivo de Reconhecimento Facial')
    logger.info('=' * 60)

    if args.test:
        # Modo teste — verificar conexão e sair
        api = SisamApiClient(config['sisam_url'], config['api_key'])
        auth = api.autenticar()
        if auth:
            print('\n[OK] Conexão com SISAM estabelecida')
            print(f'  Dispositivo: {auth["dispositivo"]["nome"]}')
            print(f'  Escola: {auth["escola"]["nome"]}')

            sync = api.sync_alunos()
            if sync:
                print(f'  Alunos disponíveis: {len(sync["alunos"])}')
            else:
                print('  [AVISO] Não foi possível sincronizar alunos')
        else:
            print('\n[ERRO] Falha na conexão com SISAM')
            print('  Verifique sisam_url e api_key no config.json')
        api.close()
        return

    show_video = config.get('show_video', True) and not args.no_video
    executar(config, show_video=show_video)


if __name__ == '__main__':
    main()
