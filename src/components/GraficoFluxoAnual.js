import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors, spacing } from '../constants/theme';

const CHART_HEIGHT = 180;
const PADDING_TOP = 16;
const PADDING_BOTTOM = 8;
const LABELS_BIMESTRE = ['JAN-FEV', 'MAR-ABR', 'MAI-JUN', 'JUL-AGO', 'SET-OUT', 'NOV-DEZ'];

/**
 * Gráfico de linhas com área preenchida (fluxo de caixa no ano).
 * values: array de 12 números (balanço por mês); agrupa em 6 bimestres para o eixo X.
 */
export default function GraficoFluxoAnual({ values, width = 320, ano }) {
  const currentYear = ano ?? new Date().getFullYear();

  // Agrupar 12 meses em 6 bimestres (soma de cada par de meses)
  const bimestres = [0, 1, 2, 3, 4, 5].map((i) => (values[2 * i] || 0) + (values[2 * i + 1] || 0));
  const minVal = Math.min(0, ...bimestres);
  const maxVal = Math.max(0, ...bimestres);
  const range = maxVal - minVal || 1;
  const chartH = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
  const corLinha = maxVal >= 0 ? colors.positive : colors.spending;

  const xStep = (width - 1) / Math.max(1, bimestres.length - 1);
  const scaleY = (v) => {
    const normalized = (v - minVal) / range;
    return PADDING_TOP + chartH * (1 - normalized);
  };

  const points = bimestres.map((v, i) => ({ x: i * xStep, y: scaleY(v) }));
  const firstX = points[0]?.x ?? 0;
  const lastX = points[points.length - 1]?.x ?? width;

  // Path da linha (suave)
  const linePath = points
    .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
    .join(' ');

  // Path da área (linha + base fechada para preenchimento)
  const baseY = scaleY(0);
  const areaPath = [
    `M ${firstX} ${baseY}`,
    `L ${points[0]?.x} ${points[0]?.y}`,
    ...points.slice(1).map((p) => `L ${p.x} ${p.y}`),
    `L ${lastX} ${baseY}`,
    'Z',
  ].join(' ');

  return (
    <View style={[styles.wrapper, { width }]}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Fluxo de caixa no ano</Text>
        <Text style={styles.ano}>{currentYear}</Text>
      </View>
      <View style={styles.chartCard}>
        <Svg width={width} height={CHART_HEIGHT}>
          <Defs>
            <LinearGradient id="areaGradient" x1="0" y1="1" x2="0" y2="0">
              <Stop offset="0" stopColor={corLinha} stopOpacity="0.35" />
              <Stop offset="1" stopColor={corLinha} stopOpacity="0.02" />
            </LinearGradient>
          </Defs>
          {/* Área preenchida abaixo da linha */}
          <Path d={areaPath} fill="url(#areaGradient)" />
          {/* Linha principal */}
          <Path
            d={linePath}
            fill="none"
            stroke={corLinha}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
        <View style={styles.labelsRow}>
          {LABELS_BIMESTRE.map((l, i) => (
            <Text key={i} style={styles.label}>
              {l}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  ano: {
    fontSize: 14,
    color: colors.textMuted,
  },
  chartCard: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 16,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    overflow: 'hidden',
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: 4,
  },
  label: {
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'center',
    width: 48,
  },
});
