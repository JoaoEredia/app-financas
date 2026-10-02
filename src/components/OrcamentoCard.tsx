import { StyleSheet, Text, View } from 'react-native';
import { OrcamentoResumoItem } from '../services/api';

interface Props {
  item: OrcamentoResumoItem;
}

export const OrcamentoCard = ({ item }: Props) => {
  const getStatusColor = () => {
    switch (item.status) {
      case 'ULTRAPASSADO': return '#EF4444';
      case 'ATENCAO': return '#F59E0B';
      default: return '#10B981';
    }
  };

  const corStatus = getStatusColor();
  const larguraBarra = Math.min(item.percentualUtilizado, 100);

  return (
    <View style={[
      styles.card, 
      item.status === 'ULTRAPASSADO' && { borderColor: 'rgba(239, 68, 68, 0.5)' }
    ]}>
      {/* Cabeçalho do Cartão */}
      <View style={styles.header}>
        <Text style={styles.categoriaTitulo}>{item.categoriaNome}</Text>
        <View style={[styles.badge, { backgroundColor: corStatus }]}>
          <Text style={styles.badgeTexto}>{item.percentualUtilizado.toFixed(0)}%</Text>
        </View>
      </View>

      {/* Barra de Progresso */}
      <View style={styles.progressFundo}>
        <View style={[styles.progressBar, { width: `${larguraBarra}%`, backgroundColor: corStatus }]} />
      </View>

      {/* Informações Numéricas */}
      <View style={styles.valoresContainer}>
        <Text style={styles.textoValor}>
          Gasto: <Text style={styles.valorNegrito}>R$ {Number(item.gasto).toFixed(2)}</Text>
        </Text>
        <Text style={styles.textoValor}>
          Limite: <Text style={styles.valorNegrito}>R$ {Number(item.limite).toFixed(2)}</Text>
        </Text>
      </View>

      {/* Saldo Restante */}
      <Text style={[
        styles.saldoTexto, 
        { color: item.saldoRestante < 0 ? '#EF4444' : '#8E9CAE' }
      ]}>
        {item.saldoRestante < 0
          ? `Ultrapassado em R$ ${Math.abs(item.saldoRestante).toFixed(2)}`
          : `Restam: R$ ${Number(item.saldoRestante).toFixed(2)}`}
      </Text>

      {/* Banner de Alerta se Estourado */}
      {item.status === 'ULTRAPASSADO' && (
        <View style={styles.boxAlerta}>
          <Text style={styles.textoAlerta}>⚠️ Orçamento da categoria ultrapassado!</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#172338',
    borderRadius: 18,
    padding: 18,
    marginVertical: 7,
    borderWidth: 1,
    borderColor: '#24344D',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoriaTitulo: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeTexto: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  progressFundo: {
    height: 7,
    backgroundColor: '#0F1826',
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: 8,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  valoresContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  textoValor: {
    fontSize: 13,
    color: '#8E9CAE',
  },
  valorNegrito: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
  saldoTexto: {
    fontSize: 13,
    marginTop: 8,
    fontWeight: '600',
  },
  boxAlerta: {
    marginTop: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  textoAlerta: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
});