import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { OrcamentoCard } from '../components/OrcamentoCard';
import {
    OrcamentoResumoItem,
    api,
    getOrcamentosResumo,
    salvarOrcamento
} from '../services/api';

interface CategoriaSimples {
  id: number;
  nome: string;
}

export default function OrcamentoScreen() {
  const [orcamentos, setOrcamentos] = useState<OrcamentoResumoItem[]>([]);
  const [categorias, setCategorias] = useState<CategoriaSimples[]>([]);
  const [loading, setLoading] = useState(true);

  const dataAtual = new Date();
  const [mes] = useState(dataAtual.getMonth() + 1);
  const [ano] = useState(dataAtual.getFullYear());

  const [modalVisible, setModalVisible] = useState(false);
  const [categoriaId, setCategoriaId] = useState<number | null>(null);
  const [valorLimite, setValorLimite] = useState('');
  const [salvando, setSalvando] = useState(false);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [resumoRes, categoriasRes] = await Promise.all([
        getOrcamentosResumo(mes, ano),
        api.get<CategoriaSimples[]>('/categorias')
      ]);
      setOrcamentos(resumoRes);
      setCategorias(categoriasRes.data);
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Não foi possível carregar os dados de orçamento.');
    } finally {
      setLoading(false);
    }
  };

  // useFocusEffect garante atualização imediata sempre que você navega para esta aba
  useFocusEffect(
    useCallback(() => {
      carregarDados();
    }, [mes, ano])
  );

  const handleSalvarLimite = async () => {
    if (!categoriaId || !valorLimite) {
      Alert.alert('Atenção', 'Selecione uma categoria e informe o valor limite.');
      return;
    }

    try {
      setSalvando(true);
      await salvarOrcamento({
        valorLimite: parseFloat(valorLimite.replace(',', '.')),
        mes,
        ano,
        categoria: { id: categoriaId }
      });

      setModalVisible(false);
      setValorLimite('');
      setCategoriaId(null);
      carregarDados();
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Falha ao salvar o limite de orçamento.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Cabeçalho idêntico à Home e Relatórios */}
        <View style={styles.topBar}>
          <View>
            <Text style={styles.miniHeader}>GESTÃO DE METAS</Text>
            <Text style={styles.titulo}>Orçamento Mensal</Text>
            <Text style={styles.subtitulo}>
              Referência: {String(mes).padStart(2, '0')}/{ano}
            </Text>
          </View>

          <TouchableOpacity 
            style={styles.btnNovo} 
            onPress={() => setModalVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.btnNovoTexto}>+ Definir Limite</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#1D7BF6" />
          </View>
        ) : (
          <FlatList
            data={orcamentos}
            keyExtractor={(item) => item.categoriaId.toString()}
            renderItem={({ item }) => <OrcamentoCard item={item} />}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyCard}>
                <Text style={styles.vazioTexto}>
                  Nenhum limite configurado para este mês.
                </Text>
                <Text style={styles.vazioDica}>
                  Toque em "+ Definir Limite" para definir metas de gasto por categoria.
                </Text>
              </View>
            }
          />
        )}

        {/* Modal de Limite integrado à paleta escura */}
        <Modal visible={modalVisible} animationType="fade" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitulo}>Definir Limite de Categoria</Text>

              <Text style={styles.label}>SELECIONE A CATEGORIA:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriasScroll}>
                <View style={styles.categoriasList}>
                  {categorias.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.categoriaChip,
                        categoriaId === cat.id && styles.categoriaChipSelecionado
                      ]}
                      onPress={() => setCategoriaId(cat.id)}
                    >
                      <Text style={[
                        styles.categoriaChipTexto,
                        categoriaId === cat.id && styles.categoriaChipTextoSelecionado
                      ]}>
                        {cat.nome}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <Text style={styles.label}>VALOR LIMITE (R$):</Text>
              <TextInput
                style={styles.input}
                placeholder="0,00"
                placeholderTextColor="#5A6D85"
                keyboardType="decimal-pad"
                value={valorLimite}
                onChangeText={setValorLimite}
              />

              <View style={styles.modalAcoes}>
                <TouchableOpacity 
                  style={styles.btnCancelar} 
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.btnCancelarTexto}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.btnConfirmar} 
                  onPress={handleSalvarLimite}
                  disabled={salvando}
                  activeOpacity={0.8}
                >
                  {salvando ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.btnConfirmarTexto}>Guardar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0B111E',
  },
  container: { 
    flex: 1, 
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 8,
  },
  miniHeader: {
    color: '#8E9CAE',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  titulo: { 
    fontSize: 24, 
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  subtitulo: {
    fontSize: 13,
    color: '#8E9CAE',
    marginTop: 2,
    fontWeight: '500',
  },
  btnNovo: {
    backgroundColor: '#1D7BF6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
  },
  btnNovoTexto: { 
    color: '#FFFFFF', 
    fontWeight: '700', 
    fontSize: 13 
  },
  listContent: { 
    paddingBottom: 40,
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyCard: {
    backgroundColor: '#172338',
    borderRadius: 18,
    padding: 24,
    borderWidth: 1,
    borderColor: '#24344D',
    alignItems: 'center',
    marginTop: 20,
  },
  vazioTexto: { 
    textAlign: 'center', 
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  vazioDica: {
    textAlign: 'center',
    fontSize: 13,
    color: '#8E9CAE',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#172338',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: '#24344D',
  },
  modalTitulo: { 
    fontSize: 18, 
    fontWeight: '800', 
    color: '#FFFFFF',
    marginBottom: 18, 
  },
  label: { 
    fontSize: 12, 
    fontWeight: '700', 
    color: '#8E9CAE',
    marginBottom: 8,
    letterSpacing: 0.8,
  },
  categoriasScroll: {
    marginBottom: 16,
  },
  categoriasList: { 
    flexDirection: 'row', 
    gap: 8,
  },
  categoriaChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#0F1826',
    borderWidth: 1,
    borderColor: '#24344D',
  },
  categoriaChipSelecionado: {
    backgroundColor: '#1D7BF6',
    borderColor: '#1D7BF6',
  },
  categoriaChipTexto: { 
    fontSize: 13, 
    fontWeight: '600',
    color: '#8E9CAE',
  },
  categoriaChipTextoSelecionado: { 
    color: '#FFFFFF', 
  },
  input: {
    backgroundColor: '#0F1826',
    borderWidth: 1,
    borderColor: '#24344D',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 22,
  },
  modalAcoes: { 
    flexDirection: 'row', 
    justifyContent: 'flex-end', 
    alignItems: 'center',
    gap: 12 
  },
  btnCancelar: { 
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  btnCancelarTexto: { 
    fontWeight: '600',
    fontSize: 14,
    color: '#8E9CAE',
  },
  btnConfirmar: {
    backgroundColor: '#1D7BF6',
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 14,
  },
  btnConfirmarTexto: { 
    color: '#FFFFFF', 
    fontWeight: '700',
    fontSize: 14,
  },
});