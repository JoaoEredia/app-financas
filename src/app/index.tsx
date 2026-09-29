import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { api } from '../services/api';

interface Transacao {
  id?: number;
  descricao: string;
  valor: number;
  tipo: 'RECEITA' | 'DESPESA';
  categoria?: string;
}

export default function HomeScreen() {
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // Lista dinâmica de categorias criadas pelo utilizador
  interface CategoriaItem {
    id: number;
    nome: string;
  }

  interface ResumoMes {
    ano: number;
    mes: number;
    receitas: number;
    despesas: number;
    saldo: number;
    despesasMesAnterior: number;
    diferencaDespesas: number;
    gastosPorCategoria: {
      categoria: string;
      total: number;
    }[];
  }

  const [categorias, setCategorias] = useState<CategoriaItem[]>([]);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<CategoriaItem | null>(null);

  const [resumo, setResumo] = useState<ResumoMes | null>(null);
  const [categoriaFiltroGrafico, setCategoriaFiltroGrafico] = useState<string | null>(null);

  // Controlo do modal para adicionar nova categoria
  const [modalVisible, setModalVisible] = useState(false);
  const [novaCategoria, setNovaCategoria] = useState('');

  // Estados do formulário de lançamento
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [tipo, setTipo] = useState<'RECEITA' | 'DESPESA'>('DESPESA');

async function carregarDados() {
    try {
      setLoading(true);
      const [resTransacoes, resCategorias, resDashboard] = await Promise.all([
        api.get('/transacoes'),
        api.get('/categorias'),
        api.get('/dashboard/resumo-mes'),
      ]);
      setTransacoes(resTransacoes.data);
      setCategorias(resCategorias.data);
      setResumo(resDashboard.data);

      if (resCategorias.data.length > 0 && !categoriaSelecionada) {
        setCategoriaSelecionada(resCategorias.data[0]);
      }
    } catch (error) {
      console.log('Erro ao carregar dados:', error);
      Alert.alert('Erro', 'Não foi possível ligar ao backend.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarDados();
  }, []);

  async function handleAdicionarCategoria() {
    const nomeLimpo = novaCategoria.trim();
    if (!nomeLimpo) {
      Alert.alert('Aviso', 'Indique um nome para a categoria.');
      return;
    }

    if (categorias.some(c => c.nome.toLocaleUpperCase() === nomeLimpo.toLocaleLowerCase())) {
      Alert.alert('Aviso', 'Essa categoria já existe.');
      return;
    }

    try {
      const response = await api.post('/categorias', { nome: nomeLimpo});
      const novaCatSalva: CategoriaItem = response.data;

      setCategorias(prev => [...prev, novaCatSalva]);
      setCategoriaSelecionada(novaCatSalva);
      setNovaCategoria('');
      setModalVisible(false);
    } catch (error) {
      console.log('Erro ao criar categoria:', error);
      Alert.alert('Erro', 'Não foi possivel salvar a categoria no backend.');
    }
  }

  async function confirmarExclusaoCategoria(cat: CategoriaItem) {
    Alert.alert(
      'Excluir Categoria',
      `Tem certeza de que deseja excluir "${cat.nome}"? Todas as transações vinculadas a ela também serão apagadas.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await api.delete(`/categorias/${cat.id}`);

              // Se a categoria deletada for a atualmente selecionada, limpa a seleção
              if (categoriaSelecionada?.id === cat.id) {
                setCategoriaSelecionada(null);
              }

              // Recarrega todos os dados (categorias, lançamentos e resumo)
              await carregarDados();
            } catch (err) {
              console.log('Erro ao excluir categoria:', err);
              Alert.alert('Erro', 'Não foi possível excluir a categoria.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  }

  async function handleSalvar() {
    if (!descricao.trim()) {
      Alert.alert('Aviso', 'Preencha a descrição do lançamento.');
      return;
    }
    const valorNumerico = parseFloat(valor.replace(',', '.'));
    if (isNaN(valorNumerico) || valorNumerico <= 0) {
      Alert.alert('Aviso', 'Indique um valor válido maior que zero.');
      return;
    }

    try {
      setSalvando(true);
      const dataHoje = new Date().toISOString().split('T')[0];

    const novaTransacao = {
      descricao: `[${categoriaSelecionada?.nome || 'Geral'}] ${descricao.trim()}`,
      valor: valorNumerico,
      tipo: tipo,
      data: dataHoje,
      categoria: {
        id: categoriaSelecionada?.id
      }
    };

      await api.post('/transacoes', novaTransacao);

      setDescricao('');
      setValor('');
      Alert.alert('Sucesso', 'Lançamento adicionado!');
      carregarDados();
    } catch (error: any) {
      console.log('Status do erro:', error.response?.status);
      console.log('Dados do Erro Backend:', JSON.stringify(error.response?.data, null, 2));
      Alert.alert('Erro', 'Falha ao guardar no backend.');
    } finally {
      setSalvando(false);
    }
  }

  const totalReceitas = transacoes
    .filter(t => t.tipo === 'RECEITA')
    .reduce((acc, t) => acc + t.valor, 0);

  const totalDespesas = transacoes
    .filter(t => t.tipo === 'DESPESA')
    .reduce((acc, t) => acc + t.valor, 0);

  const saldoTotal = totalReceitas - totalDespesas;

  const coresGrafico = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  const dadosGrafico = resumo?.gastosPorCategoria?.map((item, index) => ({
    value: item.total,
    color: coresGrafico[index % coresGrafico.length],
    text: `${item.total}`,
    focused: categoriaFiltroGrafico === item.categoria,
    onPress: () => {
      if (categoriaFiltroGrafico === item.categoria) {
        setCategoriaFiltroGrafico(null);
      } else {
        setCategoriaFiltroGrafico(item.categoria);
      }
    },
  })) || [];

  const transacoesFiltradas = categoriaFiltroGrafico
    ? transacoes.filter(t => t.descricao.toLowerCase().includes(categoriaFiltroGrafico.toLowerCase()))
    : transacoes;

  // 1. Maior gasto individual
  const listaDespesas = transacoes.filter((t) => t.tipo === 'DESPESA');
  const maiorGastoIndividual = listaDespesas.length > 0
    ? listaDespesas.reduce((max, t) => (Number(t.valor) > Number(max.valor) ? t : max), listaDespesas[0])
    : null;

  // 2. Categoria com maior gasto acumulado
  const categoriaTop = (resumo?.gastosPorCategoria && resumo.gastosPorCategoria.length > 0)
    ? [...resumo.gastosPorCategoria].sort((a, b) => b.total - a.total)[0]
    : null;

  // 3. Economia do mês (reaproveitando o seu saldoTotal já calculado)
  const economiaMes = saldoTotal;

  // 4. Média diária de gastos
  const diaAtual = new Date().getDate();
  const mediaDiaria = diaAtual > 0 ? (totalDespesas / diaAtual) : 0;

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.greeting}>Controlo Financeiro</Text>
        <Text style={styles.title}>Minhas Finanças</Text>

        {/* Resumo de Saldo */}
        <View style={styles.cardSaldo}>
          <Text style={styles.saldoLabel}>Saldo Total</Text>
          <Text style={[
            styles.saldoValor, 
            { color: saldoTotal >= 0 ? '#38BDF8' : '#F87171' }
          ]}>
            R$ {saldoTotal.toFixed(2).replace('.', ',')}
          </Text>

          <View style={styles.metricasContainer}>
            <View>
              <Text style={styles.metricaLabel}>Receitas</Text>
              <Text style={styles.metricaReceita}>+ R$ {totalReceitas.toFixed(2).replace('.', ',')}</Text>
            </View>
            <View>
              <Text style={styles.metricaLabel}>Despesas</Text>
              <Text style={styles.metricaDespesa}>- R$ {totalDespesas.toFixed(2).replace('.', ',')}</Text>
            </View>
          </View>
        </View>

        {/* Bloco Analítico: Comparação e Gráfico de Rosca */}
        {resumo && (
          <View style={styles.cardAnalitico}>
            <Text style={styles.cardAnaliticoTitulo}>Análise Mensal</Text>
            
            {/* Comparativo com mês anterior */}
            <Text style={styles.textoComparativo}>
              {resumo.diferencaDespesas <= 0
                ? `💡 As despesas diminuíram R$ ${Math.abs(resumo.diferencaDespesas).toFixed(2)} em relação ao mês anterior.`
                : `⚠️ As despesas aumentaram R$ ${resumo.diferencaDespesas.toFixed(2)} em relação ao mês anterior.`}
            </Text>

            {/* Gráfico de Rosca Interativo */}
            {dadosGrafico.length > 0 ? (
              <View style={styles.containerGrafico}>
                <PieChart
                  data={dadosGrafico}
                  donut
                  radius={90}
                  innerRadius={60}
                  innerCircleColor={'#1E293B'}
                  centerLabelComponent={() => (
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ color: '#94A3B8', fontSize: 11 }}>
                        {categoriaFiltroGrafico ? categoriaFiltroGrafico : 'Total'}
                      </Text>
                      <Text style={{ color: '#F8FAFC', fontWeight: 'bold', fontSize: 13 }}>
                        R$ {categoriaFiltroGrafico 
                          ? (resumo.gastosPorCategoria.find(c => c.categoria === categoriaFiltroGrafico)?.total.toFixed(2) || '0.00')
                          : (resumo.despesas?.toFixed(2) || '0.00')}
                      </Text>
                    </View>
                  )}
                />

                {categoriaFiltroGrafico && (
                  <TouchableOpacity 
                    onPress={() => setCategoriaFiltroGrafico(null)}
                    style={styles.btnLimparFiltro}
                  >
                    <Text style={styles.btnLimparFiltroTxt}>✕ Limpar filtro: {categoriaFiltroGrafico}</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <Text style={styles.textoVazio}>Sem despesas registadas este mês.</Text>
            )}
            {/* Destaque da Maior Categoria */}
          {categoriaTop && (
            <View style={styles.topCategoriaBadge}>
              <Text style={styles.topCategoriaText}>
                🔥 Maior impacto: <Text style={{ fontWeight: 'bold', color: '#60a5fa' }}>{categoriaTop.categoria}</Text> (R$ {categoriaTop.total.toFixed(2)})
              </Text>
            </View>
          )}

          {/* Grid de Métricas: Maior Gasto Individual, Economia do Mês e Média Diária */}
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Maior Gasto</Text>
              <Text style={styles.metricValue}>
                R$ {maiorGastoIndividual ? Number(maiorGastoIndividual.valor).toFixed(2) : '0.00'}
              </Text>
              {maiorGastoIndividual?.descricao ? (
                <Text style={styles.metricSubtext} numberOfLines={1}>
                  {maiorGastoIndividual.descricao}
                </Text>
              ) : null}
            </View>

            <View style={[styles.metricItem, styles.metricBorder]}>
              <Text style={styles.metricLabel}>Economia</Text>
              <Text style={[styles.metricValue, { color: economiaMes >= 0 ? '#34d399' : '#f87171' }]}>
                R$ {economiaMes.toFixed(2)}
              </Text>
              <Text style={styles.metricSubtext}>
                {economiaMes >= 0 ? 'Poupado' : 'Défice'}
              </Text>
            </View>

            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Média / dia</Text>
              <Text style={styles.metricValue}>
                R$ {mediaDiaria.toFixed(2)}
              </Text>
              <Text style={styles.metricSubtext}>no mês</Text>
            </View>
          </View>
          </View>
        )}

        {/* Formulário */}
        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>Novo Lançamento</Text>

          {/* Seletor Tipo */}
          <View style={styles.tipoSelector}>
            <TouchableOpacity 
              style={[styles.tipoBtn, tipo === 'DESPESA' && styles.tipoBtnDespesa]}
              onPress={() => setTipo('DESPESA')}
            >
              <Text style={[styles.tipoTxt, tipo === 'DESPESA' && styles.tipoTxtAtivo]}>Despesa</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.tipoBtn, tipo === 'RECEITA' && styles.tipoBtnReceita]}
              onPress={() => setTipo('RECEITA')}
            >
              <Text style={[styles.tipoTxt, tipo === 'RECEITA' && styles.tipoTxtAtivo]}>Receita</Text>
            </TouchableOpacity>
          </View>

          {/* Seleção e Criação de Categorias */}
          <View style={styles.categoriaHeader}>
            <Text style={styles.inputLabel}>Categoria:</Text>
            <TouchableOpacity onPress={() => setModalVisible(true)}>
              <Text style={styles.novaCatBtn}>+ Nova Categoria</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
            {categorias.map((item) => (
              <TouchableOpacity
            key={item.id}
            style={[
              styles.catTag,
              categoriaSelecionada?.id === item.id && styles.catTagAtiva,
            ]}
            onPress={() => setCategoriaSelecionada(item)}
            onLongPress={() => confirmarExclusaoCategoria(item)}
            delayLongPress={500}
          >
            <Text
              style={[
                styles.catTxt,
                categoriaSelecionada?.id === item.id && styles.catTxtAtivo,
              ]}
            >
              {item.nome}
            </Text>
          </TouchableOpacity>
            ))}
          </ScrollView>

          <TextInput
            style={styles.input}
            placeholder="Descrição (ex: Combustível, Concerto, Bilhete)"
            placeholderTextColor="#64748B"
            value={descricao}
            onChangeText={setDescricao}
          />

          <TextInput
            style={styles.input}
            placeholder="Valor R$ (ex: 50,00)"
            placeholderTextColor="#64748B"
            keyboardType="numeric"
            value={valor}
            onChangeText={setValor}
          />

          <TouchableOpacity 
            style={styles.btnSalvar}
            onPress={handleSalvar}
            disabled={salvando}
          >
            {salvando ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.btnSalvarTxt}>Adicionar Lançamento</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Histórico */}
        <View style={styles.historicoHeader}>
          <Text style={styles.historicoTitle}>Histórico Recente</Text>
          <TouchableOpacity onPress={carregarDados}>
            <Text style={styles.refreshTxt}>Atualizar</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color="#38BDF8" style={{ marginTop: 20 }} />
        ) : transacoesFiltradas.length === 0 ? (
          <Text style={styles.emptyTxt}>Nenhum registo encontrado.</Text>
        ) : (
          transacoesFiltradas.slice().reverse().map((item, index) => (
            <View key={item.id ?? index} style={styles.itemCard}>
              <Text style={styles.itemDesc}>{item.descricao}</Text>
              <Text style={[
                styles.itemVal,
                { color: item.tipo === 'RECEITA' ? '#4ADE80' : '#F87171' }
              ]}>
                {item.tipo === 'RECEITA' ? '+ ' : '- '}
                R$ {item.valor.toFixed(2).replace('.', ',')}
              </Text>
            </View>
          ))
        )}

        {/* Modal para criar nova categoria */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Criar Categoria</Text>
              <TextInput
                style={styles.input}
                placeholder="Nome da categoria (ex: Moto, Lazer)"
                placeholderTextColor="#64748B"
                value={novaCategoria}
                onChangeText={setNovaCategoria}
                autoFocus
              />
              <View style={styles.modalAcoes}>
                <TouchableOpacity 
                  style={[styles.modalBtn, styles.modalBtnCancelar]} 
                  onPress={() => {
                    setNovaCategoria('');
                    setModalVisible(false);
                  }}
                >
                  <Text style={styles.modalBtnTxt}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.modalBtn, styles.modalBtnConfirmar]} 
                  onPress={handleAdicionarCategoria}
                >
                  <Text style={[styles.modalBtnTxt, { fontWeight: 'bold' }]}>Criar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1120',
    paddingHorizontal: 20,
    paddingTop: 50,
  },
  greeting: {
    fontSize: 14,
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 16,
  },
  cardSaldo: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
  },
  saldoLabel: {
    fontSize: 13,
    color: '#94A3B8',
  },
  saldoValor: {
    fontSize: 32,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  metricasContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 10,
  },
  metricaLabel: {
    fontSize: 12,
    color: '#94A3B8',
  },
  metricaReceita: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#4ADE80',
  },
  metricaDespesa: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#F87171',
  },
  formContainer: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 12,
  },
  tipoSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  tipoBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#0F172A',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  tipoBtnDespesa: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  tipoBtnReceita: {
    backgroundColor: '#16A34A',
    borderColor: '#16A34A',
  },
  tipoTxt: {
    color: '#94A3B8',
    fontWeight: '600',
  },
  tipoTxtAtivo: {
    color: '#FFFFFF',
  },
  categoriaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 12,
    color: '#94A3B8',
  },
  novaCatBtn: {
    fontSize: 12,
    color: '#38BDF8',
    fontWeight: '600',
  },
  catScroll: {
    marginBottom: 12,
  },
  catTag: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  catTagAtiva: {
    backgroundColor: '#2563EB',
    borderColor: '#38BDF8',
  },
  catTxt: {
    color: '#94A3B8',
    fontSize: 13,
  },
  catTxtAtivo: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 12,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 10,
  },
  btnSalvar: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  btnSalvarTxt: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  historicoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  historicoTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  refreshTxt: {
    color: '#38BDF8',
    fontSize: 13,
  },
  emptyTxt: {
    color: '#64748B',
    textAlign: 'center',
    marginVertical: 20,
  },
  itemCard: {
    backgroundColor: '#1E293B',
    padding: 14,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  itemDesc: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '500',
  },
  itemVal: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1E293B',
    width: '100%',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 14,
  },
  modalAcoes: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 6,
  },
  modalBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  modalBtnCancelar: {
    backgroundColor: '#334155',
  },
  modalBtnConfirmar: {
    backgroundColor: '#2563EB',
  },
  modalBtnTxt: {
    color: '#FFFFFF',
    fontSize: 14,
  },

  cardAnalitico: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginVertical: 12,
  },
  cardAnaliticoTitulo: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  textoComparativo: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  containerGrafico: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  btnLimparFiltro: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#334155',
    borderRadius: 20,
  },
  btnLimparFiltroTxt: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '600',
  },
  textoVazio: {
    color: '#64748B',
    textAlign: 'center',
    fontStyle: 'italic',
    marginVertical: 12,
  },
  topCategoriaBadge: {
    marginTop: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#0f172a',
    borderRadius: 8,
    alignSelf: 'center',
  },
  topCategoriaText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  metricBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#1e293b',
  },
  metricLabel: {
    color: '#64748b',
    fontSize: 10,
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  metricValue: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: 'bold',
  },
  metricSubtext: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 2,
  },
});