import axios from 'axios';


export const api = axios.create({
  baseURL: 'http://192.168.0.141:8080',
  timeout: 5000,
});

export interface OrcamentoResumoItem {
  categoriaId: number;
  categoriaNome: string;
  limite: number;
  gasto: number;
  saldoRestante: number;
  percentualUtilizado: number;
  status: 'NORMAL' | 'ATENCAO' | 'ULTRAPASSADO';
}

export interface OrcamentoPayload {
  valorLimite: number;
  mes: number;
  ano: number;
  categoria: {
    id: number;
  };
}

// Funções para consumir os endpoints criados no Spring Boot
export const getOrcamentosResumo = async (mes: number, ano: number) => {
  const response = await api.get<OrcamentoResumoItem[]>('/orcamentos/resumo', {
    params: { mes, ano }
  });
  return response.data;
};

export const salvarOrcamento = async (dados: OrcamentoPayload) => {
  const response = await api.post('/orcamentos', dados);
  return response.data;
};