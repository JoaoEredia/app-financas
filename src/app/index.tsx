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
  const [categorias, setCategorias] = useState<string[]>(['Geral']);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState('Geral');

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
      const response = await api.get('/transacoes');
      setTransacoes(response.data);
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

  function handleAdicionarCategoria() {
    const nomeLimpo = novaCategoria.trim();
    if (!nomeLimpo) {
      Alert.alert('Aviso', 'Indique um nome para a categoria.');
      return;
    }

    if (categorias.some(c => c.toLowerCase() === nomeLimpo.toLowerCase())) {
      Alert.alert('Aviso', 'Essa categoria já existe.');
      return;
    }

    setCategorias(prev => [...prev, nomeLimpo]);
    setCategoriaSelecionada(nomeLimpo);
    setNovaCategoria('');
    setModalVisible(false);
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
      descricao: `[${categoriaSelecionada}] ${descricao.trim()}`,
      valor: valorNumerico,
      tipo: tipo,
      data: dataHoje,
      categoria: {
        id: 1 // Associa à categoria de ID 1 cadastrada no banco
      }
    };

      await api.post('/transacoes', novaTransacao);

      setDescricao('');
      setValor('');
      Alert.alert('Sucesso', 'Lançamento adicionado!');
      carregarDados();
    } catch (error: any) {
      console.log('Status do erro:', error.response?.status);
      console.log('Dados do Erro Backend:', error.response?.data);
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
                key={item}
                style={[styles.catTag, categoriaSelecionada === item && styles.catTagAtiva]}
                onPress={() => setCategoriaSelecionada(item)}
              >
                <Text style={[styles.catTxt, categoriaSelecionada === item && styles.catTxtAtivo]}>
                  {item}
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
        ) : transacoes.length === 0 ? (
          <Text style={styles.emptyTxt}>Nenhum registo encontrado.</Text>
        ) : (
          transacoes.slice().reverse().map((item, index) => (
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
});