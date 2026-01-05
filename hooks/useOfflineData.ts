'use client';

import { useState, useEffect, useCallback } from 'react';
import { offlineDB, STORES, isOnline, isIndexedDBAvailable } from '@/lib/offline-db';

interface Resultado {
  id: number;
  aluno_id: number;
  escola_id: number;
  turma_id: number;
  ano_letivo: string;
  serie: string;
  presenca: string;
  total_acertos_lp: number;
  total_acertos_ch: number;
  total_acertos_mat: number;
  total_acertos_cn: number;
  nota_lp: number;
  nota_ch: number;
  nota_mat: number;
  nota_cn: number;
  media_aluno: number;
  nota_producao?: number;
  nivel_aprendizagem?: string;
  aluno_nome: string;
  escola_nome: string;
  polo_id: number;
  turma_codigo: string;
}

interface Escola {
  id: number;
  nome: string;
  polo_id: number;
  polo_nome?: string;
}

interface Polo {
  id: number;
  nome: string;
}

interface Turma {
  id: number;
  codigo: string;
  escola_id: number;
  serie: string;
}

interface Aluno {
  id: number;
  nome: string;
  escola_id: number;
  turma_id: number;
}

interface UseOfflineDataReturn {
  isOfflineMode: boolean;
  hasOfflineData: boolean;
  resultados: Resultado[];
  escolas: Escola[];
  polos: Polo[];
  turmas: Turma[];
  alunos: Aluno[];
  loading: boolean;
  error: string | null;
  loadOfflineData: () => Promise<void>;
  filterResultados: (filters: FilterOptions) => Resultado[];
  getEstatisticas: (resultados: Resultado[]) => Estatisticas;
}

interface FilterOptions {
  polo_id?: number | string;
  escola_id?: number | string;
  turma_id?: number | string;
  serie?: string;
  ano_letivo?: string;
  presenca?: string;
}

interface Estatisticas {
  total: number;
  presentes: number;
  faltosos: number;
  media_lp: number;
  media_mat: number;
  media_ch: number;
  media_cn: number;
  media_geral: number;
}

export function useOfflineData(): UseOfflineDataReturn {
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [hasOfflineData, setHasOfflineData] = useState(false);
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [escolas, setEscolas] = useState<Escola[]>([]);
  const [polos, setPolos] = useState<Polo[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Verificar status online/offline
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateOnlineStatus = () => {
      setIsOfflineMode(!navigator.onLine);
    };

    updateOnlineStatus();

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  // Verificar se há dados offline
  useEffect(() => {
    const checkOfflineData = async () => {
      if (!isIndexedDBAvailable()) {
        setHasOfflineData(false);
        return;
      }

      try {
        const count = await offlineDB.count(STORES.RESULTADOS);
        setHasOfflineData(count > 0);
      } catch (error) {
        setHasOfflineData(false);
      }
    };

    checkOfflineData();
  }, []);

  // Carregar dados offline
  const loadOfflineData = useCallback(async () => {
    if (!isIndexedDBAvailable()) {
      setError('IndexedDB não disponível');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [
        resultadosData,
        escolasData,
        polosData,
        turmasData,
        alunosData
      ] = await Promise.all([
        offlineDB.getData<Resultado>(STORES.RESULTADOS),
        offlineDB.getData<Escola>(STORES.ESCOLAS),
        offlineDB.getData<Polo>(STORES.POLOS),
        offlineDB.getData<Turma>(STORES.TURMAS),
        offlineDB.getData<Aluno>(STORES.ALUNOS)
      ]);

      setResultados(resultadosData);
      setEscolas(escolasData);
      setPolos(polosData);
      setTurmas(turmasData);
      setAlunos(alunosData);
      setHasOfflineData(resultadosData.length > 0);
    } catch (err: any) {
      console.error('Erro ao carregar dados offline:', err);
      setError(err.message || 'Erro ao carregar dados offline');
    } finally {
      setLoading(false);
    }
  }, []);

  // Filtrar resultados
  const filterResultados = useCallback((filters: FilterOptions): Resultado[] => {
    let filtered = [...resultados];

    if (filters.polo_id && filters.polo_id !== '' && filters.polo_id !== 'todos') {
      const poloId = Number(filters.polo_id);
      // Filtrar por polo através das escolas
      const escolasDoPolo = escolas.filter(e => e.polo_id === poloId).map(e => e.id);
      filtered = filtered.filter(r => escolasDoPolo.includes(r.escola_id));
    }

    if (filters.escola_id && filters.escola_id !== '' && filters.escola_id !== 'todas') {
      filtered = filtered.filter(r => r.escola_id === Number(filters.escola_id));
    }

    if (filters.turma_id && filters.turma_id !== '' && filters.turma_id !== 'todas') {
      filtered = filtered.filter(r => r.turma_id === Number(filters.turma_id));
    }

    if (filters.serie && filters.serie !== '' && filters.serie !== 'todas') {
      filtered = filtered.filter(r => r.serie === filters.serie);
    }

    if (filters.ano_letivo && filters.ano_letivo !== '' && filters.ano_letivo !== 'todos') {
      filtered = filtered.filter(r => r.ano_letivo === filters.ano_letivo);
    }

    if (filters.presenca && filters.presenca !== '' && filters.presenca !== 'Todas') {
      const presencaUpper = filters.presenca.toUpperCase();
      filtered = filtered.filter(r => r.presenca?.toUpperCase() === presencaUpper);
    }

    return filtered;
  }, [resultados, escolas]);

  // Calcular estatísticas
  const getEstatisticas = useCallback((data: Resultado[]): Estatisticas => {
    const presentes = data.filter(r => r.presenca?.toUpperCase() === 'P');
    const faltosos = data.filter(r => r.presenca?.toUpperCase() === 'F');

    const calcMedia = (arr: number[]): number => {
      if (arr.length === 0) return 0;
      const sum = arr.reduce((a, b) => a + (b || 0), 0);
      return Number((sum / arr.length).toFixed(2));
    };

    const notasLP = presentes.map(r => r.nota_lp).filter(n => n != null);
    const notasMat = presentes.map(r => r.nota_mat).filter(n => n != null);
    const notasCH = presentes.map(r => r.nota_ch).filter(n => n != null);
    const notasCN = presentes.map(r => r.nota_cn).filter(n => n != null);
    const mediasAlunos = presentes.map(r => r.media_aluno).filter(n => n != null);

    return {
      total: data.length,
      presentes: presentes.length,
      faltosos: faltosos.length,
      media_lp: calcMedia(notasLP),
      media_mat: calcMedia(notasMat),
      media_ch: calcMedia(notasCH),
      media_cn: calcMedia(notasCN),
      media_geral: calcMedia(mediasAlunos)
    };
  }, []);

  return {
    isOfflineMode,
    hasOfflineData,
    resultados,
    escolas,
    polos,
    turmas,
    alunos,
    loading,
    error,
    loadOfflineData,
    filterResultados,
    getEstatisticas
  };
}
