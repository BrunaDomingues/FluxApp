import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '../components/Icons';
import { colors, spacing, borderRadius } from '../constants/theme';
import { bandeirasCartao } from '../constants/bandeiras';

const iconPorBandeira = {
  visa: 'card-outline',
  mastercard: 'card-outline',
  hipercard: 'card-outline',
  amex: 'card-outline',
  sorocred: 'card-outline',
  bndes: 'card-outline',
  diners: 'card-outline',
  outro: 'cash-outline',
  elo: 'card-outline',
};

export default function SelectCardTypeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [selecionada, setSelecionada] = useState(null);

  const handleContinuar = () => {
    if (!selecionada) return;
    const bandeira = bandeirasCartao.find((b) => b.id === selecionada);
    navigation.navigate('AddCard', { bandeira: bandeira?.nome ?? 'Outro Cartão' });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={[styles.header, { backgroundColor: colors.positive }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Novo cartão</Text>
      </View>
      <View style={styles.cardList}>
        {bandeirasCartao.map((b) => (
          <TouchableOpacity
            key={b.id}
            style={[styles.row, selecionada === b.id && styles.rowActive]}
            onPress={() => setSelecionada(b.id)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconWrap, selecionada === b.id && styles.iconWrapActive]}>
              <Ionicons
                name={iconPorBandeira[b.id] || 'card-outline'}
                size={24}
                color={selecionada === b.id ? colors.textPrimary : colors.positive}
              />
            </View>
            <Text style={[styles.rowLabel, selecionada === b.id && styles.rowLabelActive]}>{b.nome}</Text>
            <View style={[styles.radio, selecionada === b.id && styles.radioChecked]}>
              {selecionada === b.id ? (
                <Ionicons name="checkmark" size={18} color={colors.textPrimary} />
              ) : null}
            </View>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity
        style={[styles.button, !selecionada && styles.buttonDisabled]}
        onPress={handleContinuar}
        disabled={!selecionada}
      >
        <Text style={styles.buttonText}>Continuar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  backBtn: { padding: spacing.xs, marginRight: spacing.sm },
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  cardList: {
    flex: 1,
    backgroundColor: colors.backgroundCard,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    marginTop: spacing.md,
    padding: spacing.md,
    paddingTop: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  rowActive: {
    backgroundColor: colors.positive + '25',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.positive + '30',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  iconWrapActive: {
    backgroundColor: colors.positive,
  },
  rowLabel: { flex: 1, fontSize: 16, color: colors.textPrimary, fontWeight: '500' },
  rowLabelActive: { fontWeight: '600' },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioChecked: {
    backgroundColor: colors.positive,
    borderColor: colors.positive,
  },
  button: {
    backgroundColor: colors.positive,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
});
