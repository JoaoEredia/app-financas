import { api } from '@/services/api';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

interface Transacao {
  id?: number;
  descricao: string;
  valor: number;
  tipo: 'RECEITA' | 'DESPESA';
  categoria?: any;
  data?: string;
}

type PeriodoFiltro = 'hoje' | '7dias' | '30dias' | 'mes' | '3meses' | '1ano';

const obterNomeCategoria = (cat: any): string => {
  if (!cat) return 'Geral';
  if (typeof cat === 'object' && cat.nome) return cat.nome;
  if (typeof cat === 'string') return cat;
  return 'Geral';
};

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtro, setFiltro] = useState<PeriodoFiltro>('30dias');
  const [categoriaModal, setCategoriaModal] = useState<string | null>(null);

  const carregarTransacoes = async () => {
    try {
      setLoading(true);
      const res = await api.get('/transacoes');
      setTransacoes(res.data || []);
    } catch (err) {
      console.log('Erro ao carregar dados na tela Explore:', err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      carregarTransacoes();
    }, [])
  );

  // 1. Filtragem das transações pelo período selecionado
  const transacoesFiltradas = useMemo(() => {
    const agora = new Date();
    return transacoes.filter((t) => {
      const dataTransacao = t.data ? new Date(t.data) : agora;

      switch (filtro) {
        case 'hoje':
          return dataTransacao.toDateString() === agora.toDateString();
        case '7dias': {
          const limite7 = new Date();
          limite7.setDate(agora.getDate() - 7);
          return dataTransacao >= limite7;
        }
        case '30dias': {
          const limite30 = new Date();
          limite30.setDate(agora.getDate() - 30);
          return dataTransacao >= limite30;
        }
        case 'mes':
          return (
            dataTransacao.getMonth() === agora.getMonth() &&
            dataTransacao.getFullYear() === agora.getFullYear()
          );
        case '3meses': {
          const limite3m = new Date();
          limite3m.setMonth(agora.getMonth() - 3);
          return dataTransacao >= limite3m;
        }
        case '1ano': {
          const limite1ano = new Date();
          limite1ano.setFullYear(agora.getFullYear() - 1);
          return dataTransacao >= limite1ano;
        }
        default:
          return true;
      }
    });
  }, [transacoes, filtro]);

  // 2. Cálculos de Balanço (Receitas, Despesas, Saldo)
  const receitas = useMemo(
    () => transacoesFiltradas.filter((t) => t.tipo === 'RECEITA'),
    [transacoesFiltradas]
  );
  const despesas = useMemo(
    () => transacoesFiltradas.filter((t) => t.tipo === 'DESPESA'),
    [transacoesFiltradas]
  );

  const totalReceitas = useMemo(
    () => receitas.reduce((sum, t) => sum + Number(t.valor), 0),
    [receitas]
  );
  const totalDespesas = useMemo(
    () => despesas.reduce((sum, t) => sum + Number(t.valor), 0),
    [despesas]
  );
  const saldoPeriodo = totalReceitas - totalDespesas;

  // 3. Montagem dos pontos para o Gráfico de Linha (Evolução dos Gastos)
  const dadosGraficoLinha = useMemo(() => {
    if (despesas.length === 0) {
      return [{ value: 0, label: 'Hoje' }];
    }

    const mapaDias: { [chave: string]: number } = {};
    despesas.forEach((d) => {
      const dataObj = d.data ? new Date(d.data) : new Date();
      const diaMes = `${dataObj.getDate()}/${dataObj.getMonth() + 1}`;
      mapaDias[diaMes] = (mapaDias[diaMes] || 0) + Number(d.valor);
    });

    const pontos = Object.entries(mapaDias).map(([dataStr, valorTotal]) => ({
      value: valorTotal,
      label: dataStr,
      dataPointText: `R$${valorTotal}`,
    }));

    return pontos.length > 0 ? pontos : [{ value: 0, label: 'Sem dados' }];
  }, [despesas]);

  // 4. Ranking de Maiores Categorias
  const rankingCategorias = useMemo(() => {
    const mapa: { [cat: string]: number } = {};
    despesas.forEach((d) => {
      const cat = obterNomeCategoria(d.categoria);
      mapa[cat] = (mapa[cat] || 0) + Number(d.valor);
    });

    return Object.entries(mapa)
      .map(([categoria, total]) => ({
        categoria,
        total,
        porcentagem: totalDespesas > 0 ? (total / totalDespesas) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [despesas, totalDespesas]);

  // Transações da categoria selecionada para o Modal
  const transacoesDaCategoria = useMemo(() => {
    if (!categoriaModal) return [];
    return despesas.filter(
      (d) => obterNomeCategoria(d.categoria).toLowerCase() === categoriaModal.toLowerCase()
    );
  }, [despesas, categoriaModal]);

  const totalCategoriaModal = useMemo(() => {
    return transacoesDaCategoria.reduce((acc, t) => acc + Number(t.valor), 0);
  }, [transacoesDaCategoria]);

  // 5. Ranking de Maiores Despesas Individuais
  const rankingDespesasIndividuais = useMemo(() => {
    return [...despesas]
      .sort((a, b) => Number(b.valor) - Number(a.valor))
      .slice(0, 5);
  }, [despesas]);

  const filtrosOpcoes: { id: PeriodoFiltro; label: string }[] = [
    { id: 'hoje', label: 'Hoje' },
    { id: '7dias', label: '7 dias' },
    { id: '30dias', label: '30 dias' },
    { id: 'mes', label: 'Mês' },
    { id: '3meses', label: '3 meses' },
    { id: '1ano', label: '1 ano' },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <Text style={styles.headerSub}>ANÁLISES DETALHADAS</Text>
      <Text style={styles.headerTitle}>Gráficos & Relatórios</Text>

      {/* 1. Barra de Filtros Temporais */}
      <View style={styles.filtrosWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtrosContainer}>
          {filtrosOpcoes.map((op) => {
            const ativo = filtro === op.id;
            return (
              <TouchableOpacity
                key={op.id}
                style={[styles.filtroBtn, ativo && styles.filtroBtnAtivo]}
                onPress={() => setFiltro(op.id)}
              >
                <Text style={[styles.filtroTxt, ativo && styles.filtroTxtAtivo]}>{op.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* 2. Comparativo de Balanço do Período */}
          <View style={styles.card}>
            <Text style={styles.cardTitulo}>Balanço do Período</Text>
            <View style={styles.balancoRow}>
              <View style={styles.balancoItem}>
                <Text style={styles.balancoLabel}>Receitas</Text>
                <Text style={[styles.balancoValor, { color: '#10B981' }]}>
                  + R$ {totalReceitas.toFixed(2)}
                </Text>
              </View>
              <View style={[styles.balancoItem, styles.balancoBorder]}>
                <Text style={styles.balancoLabel}>Despesas</Text>
                <Text style={[styles.balancoValor, { color: '#EF4444' }]}>
                  - R$ {totalDespesas.toFixed(2)}
                </Text>
              </View>
              <View style={styles.balancoItem}>
                <Text style={styles.balancoLabel}>Saldo</Text>
                <Text
                  style={[
                    styles.balancoValor,
                    { color: saldoPeriodo >= 0 ? '#38BDF8' : '#EF4444' },
                  ]}
                >
                  R$ {saldoPeriodo.toFixed(2)}
                </Text>
              </View>
            </View>
          </View>

          {/* 3. Gráfico de Linha: Evolução dos Gastos */}
          <View style={styles.card}>
            <Text style={styles.cardTitulo}>Evolução dos Gastos</Text>
            <Text style={styles.cardSub}>Gastos distribuídos no tempo</Text>
            {despesas.length > 0 ? (
              <View style={styles.chartWrapper}>
                <LineChart
                  data={dadosGraficoLinha}
                  color="#EF4444"
                  thickness={3}
                  startFillColor="rgba(239, 68, 68, 0.3)"
                  endFillColor="rgba(239, 68, 68, 0.01)"
                  areaChart
                  hideDataPoints={false}
                  dataPointsColor="#EF4444"
                  textColor="#94A3B8"
                  textFontSize={10}
                  xAxisColor="#334155"
                  yAxisColor="#334155"
                  yAxisTextStyle={{ color: '#64748B', fontSize: 10 }}
                  xAxisLabelTextStyle={{ color: '#64748B', fontSize: 10 }}
                  width={width - 96}
                  height={170}
                  spacing={dadosGraficoLinha.length > 4 ? 48 : 70}
                  initialSpacing={20}
                  noOfSections={3}
                />
              </View>
            ) : (
              <Text style={styles.textoVazio}>Nenhuma despesa registrada neste período.</Text>
            )}
          </View>

          {/* 4. Ranking de Maiores Categorias */}
          <View style={styles.card}>
            <Text style={styles.cardTitulo}>Top Categorias</Text>
            <Text style={styles.cardSub}>Onde você mais gastou no período</Text>
            {rankingCategorias.length > 0 ? (
              rankingCategorias.map((item, index) => (
                <TouchableOpacity
              key={item.categoria}
              style={styles.rankingLinha}
              activeOpacity={0.7}
              onPress={() => setCategoriaModal(item.categoria)}
            >
              <View style={styles.posicaoBadge}>
                <Text style={styles.posicaoTxt}>{index + 1}º</Text>
              </View>
              <View style={{ flex: 1, marginHorizontal: 10 }}>
                <View style={styles.rankingHeaderItem}>
                  <Text style={styles.rankingNome}>{item.categoria}</Text>
                  <Text style={styles.rankingValor}>R$ {item.total.toFixed(2)}</Text>
                </View>
                <View style={styles.barraFundo}>
                  <View
                    style={[
                      styles.barraProgresso,
                      { width: `${Math.min(item.porcentagem, 100)}%` },
                    ]}
                  />
                </View>
              </View>
              <Text style={styles.porcentagemTxt}>{item.porcentagem.toFixed(0)}%</Text>
            </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.textoVazio}>Sem categorias no período.</Text>
            )}
          </View>

          {/* 5. Ranking de Maiores Gastos Individuais */}
          <View style={[styles.card, { marginBottom: insets.bottom + 30 }]}>
            <Text style={styles.cardTitulo}>Maiores Gastos Individuais</Text>
            <Text style={styles.cardSub}>Top 5 lançamentos mais pesados</Text>
            {rankingDespesasIndividuais.length > 0 ? (
              rankingDespesasIndividuais.map((item, index) => (
                <View key={item.id ?? index} style={styles.gastoItem}>
                  <View style={styles.gastoInfo}>
                    <Text style={styles.gastoTitulo}>{item.descricao}</Text>
                    <Text style={styles.gastoCat}>{obterNomeCategoria(item.categoria)}</Text>
                  </View>
                  <Text style={styles.gastoValor}>- R$ {Number(item.valor).toFixed(2)}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.textoVazio}>Nenhum lançamento no período.</Text>
            )}
          </View>
        </ScrollView>
      )}
      {/* Modal de Detalhes da Categoria */}
      <Modal
        visible={categoriaModal !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCategoriaModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalSub}>DETALHES DA CATEGORIA</Text>
                <Text style={styles.modalTitle}>{categoriaModal}</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setCategoriaModal(null)}
              >
                <Text style={styles.modalCloseTxt}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalTotalCard}>
              <Text style={styles.modalTotalLabel}>Gasto no período</Text>
              <Text style={styles.modalTotalValor}>
                R$ {totalCategoriaModal.toFixed(2)}
              </Text>
            </View>

            <Text style={styles.modalSectionLabel}>
              Lançamentos ({transacoesDaCategoria.length})
            </Text>

            <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
              {transacoesDaCategoria.map((t, idx) => (
                <View key={t.id ?? idx} style={styles.modalItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalItemDesc}>{t.descricao}</Text>
                    {t.data ? (
                      <Text style={styles.modalItemData}>
                        {new Date(t.data).toLocaleDateString('pt-BR')}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={styles.modalItemValor}>
                    - R$ {Number(t.valor).toFixed(2)}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1120',
  },
  headerSub: {
    color: '#64748B',
    fontSize: 11,
    letterSpacing: 1,
    paddingHorizontal: 16,
    fontWeight: '700',
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  filtrosWrapper: {
    marginBottom: 12,
  },
  filtrosContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filtroBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  filtroBtnAtivo: {
    backgroundColor: '#2563EB',
    borderColor: '#3B82F6',
  },
  filtroTxt: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  filtroTxtAtivo: {
    color: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#131d33',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  cardTitulo: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: 'bold',
  },
  cardSub: {
    color: '#64748B',
    fontSize: 11,
    marginBottom: 12,
    marginTop: 2,
  },
  balancoRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  balancoItem: {
    flex: 1,
    alignItems: 'center',
  },
  balancoBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#1e293b',
  },
  balancoLabel: {
    color: '#64748B',
    fontSize: 11,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  balancoValor: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  chartWrapper: {
    marginTop: 8,
    alignItems: 'center',
    overflow: 'hidden',
  },
  rankingLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  posicaoBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  posicaoTxt: {
    color: '#60A5FA',
    fontSize: 11,
    fontWeight: 'bold',
  },
  rankingHeaderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  rankingNome: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '600',
  },
  rankingValor: {
    color: '#94A3B8',
    fontSize: 12,
  },
  barraFundo: {
    height: 5,
    backgroundColor: '#1e293b',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barraProgresso: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 3,
  },
  porcentagemTxt: {
    color: '#64748B',
    fontSize: 11,
    width: 35,
    textAlign: 'right',
  },
  gastoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  gastoInfo: {
    flex: 1,
  },
  gastoTitulo: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '500',
  },
  gastoCat: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  gastoValor: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
  },
  textoVazio: {
    color: '#64748B',
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#131d33',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalSub: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  modalTitle: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseTxt: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalTotalCard: {
    backgroundColor: '#0b1120',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  modalTotalLabel: {
    color: '#64748B',
    fontSize: 11,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  modalTotalValor: {
    color: '#EF4444',
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalSectionLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  modalItemDesc: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '500',
  },
  modalItemData: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  modalItemValor: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
  },
});