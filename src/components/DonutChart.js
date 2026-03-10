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

const CATEGORIAS = [
  { label: 'Moradia', value: 350, color: colors.categoryMoradia },
  { label: 'Alimentação', value: 450, color: colors.categoryAlimentacao },
  { label: 'Transporte', value: 180, color: colors.categoryTransporte },
  { label: 'Lazer', value: 120, color: colors.categoryLazer },
];

export default function DonutChart() {
  const total = CATEGORIAS.reduce((s, c) => s + c.value, 0);
  let startAngle = 0;

  const segments = CATEGORIAS.map((cat) => {
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
          {segments.map((seg) => (
            <Path
              key={seg.label}
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
        {segments.map((seg) => (
          <View key={seg.label} style={styles.legendRow}>
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
});
