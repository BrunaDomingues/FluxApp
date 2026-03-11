import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { G, Path, Circle } from 'react-native-svg';
import { colors, spacing } from '../constants/theme';

const SIZE = 200;
const STROKE = 24;
const R = (SIZE - STROKE) / 2;
const CX = SIZE / 2;
const CY = SIZE / 2;

function polarToCartesian(cx, cy, r, angleDeg) {
  const angleRad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}

function describeArc(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? '0' : '1';
  return [
    'M', start.x, start.y,
    'A', r, r, 0, largeArc, 0, end.x, end.y,
  ].join(' ');
}

/**
 * data: array de { label, value, color } (apenas itens com value > 0)
 * Com 1 categoria: mostra o donut no mesmo tamanho, mas em arco (3/4 do círculo) em vez de 100% fechado.
 */
export default function DonutChart({ data = [] }) {
  const total = data.reduce((s, c) => s + c.value, 0);

  if (data.length === 0 || total <= 0) {
    return (
      <View style={styles.wrapper}>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>Nenhum gasto por categoria neste mês</Text>
          <Text style={styles.emptySub}>As despesas lançadas aparecerão aqui</Text>
        </View>
      </View>
    );
  }

  let startAngle = 0;
  const segments = data.length === 1
    ? [{ ...data[0], pct: 100, d: describeArc(CX, CY, R, 0, 270) }]
    : data.map((cat) => {
      const pct = (cat.value / total) * 100;
      
        const angle = (pct / 100) * 360;
        const endAngle = startAngle + angle;
        const d = describeArc(CX, CY, R, startAngle, endAngle);
        startAngle = endAngle;
        return { ...cat, pct, d };
      });

  return (
    <View style={styles.wrapper}>
      <Svg width={SIZE} height={SIZE} style={styles.svg}>
        <G>
          {segments.map((seg, i) => (
            <Path
              key={`${seg.label}-${i}`}
              d={seg.d}
              fill="none"
              stroke={seg.color}
              strokeWidth={STROKE}
              strokeLinecap="round"
            />
          ))}
          <Circle
            cx={CX}
            cy={CY}
            r={R - STROKE / 2 - 4}
            fill={colors.backgroundCard}
          />
        </G>
      </Svg>
      <View style={styles.legend}>
        {segments.map((seg, i) => (
          <View key={`${seg.label}-${i}`} style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: seg.color }]} />
            <Text style={styles.legendText}>
              {seg.label} R$ {seg.value.toFixed(2)} ({seg.pct.toFixed(0)}%)
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  svg: {
    marginBottom: spacing.md,
  },
  legend: {
    width: '100%',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.sm,
  },
  legendText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  emptyWrap: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  emptySub: {
    fontSize: 13,
    color: colors.textMuted,
  },
});
