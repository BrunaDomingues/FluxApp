import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  Modal,
  Pressable,
  Dimensions,
} from 'react-native';
import Ionicons from './Icons';
import { colors } from '../constants/theme';

const FAB_SIZE = 56;
const BOLINHA_SIZE = 48;
const ARC_RADIUS = 90;
const ARC_ANGLE_SPREAD = 100; // graus totais (ex: -50 a +50)

export default function FABMenu({
  onAddReceita,
  onAddDespesa,
  onAddDespesaCartao,
  onAddTransferencia,
  hasCartoes,
}) {
  const [open, setOpen] = useState(false);
  const anim = React.useRef(new Animated.Value(0)).current;
  const { width: SCREEN_WIDTH } = Dimensions.get('window');
  const centerX = SCREEN_WIDTH / 2;

  const toggle = () => {
    const toValue = open ? 0 : 1;
    setOpen(!open);
    Animated.spring(anim, {
      toValue,
      useNativeDriver: true,
      friction: 6,
      tension: 80,
    }).start();
  };

  const handleAction = (fn) => {
    toggle();
    setTimeout(() => fn?.(), 150);
  };

  const baseItems = [
    { label: 'Receita', icon: 'trending-up-outline', onPress: onAddReceita, color: colors.positive },
    ...(hasCartoes
      ? [{ label: 'Despesa cartão', icon: 'card-outline', onPress: onAddDespesaCartao, color: colors.positive }]
      : []),
    { label: 'Transferência', icon: 'swap-horizontal-outline', onPress: onAddTransferencia, color: colors.secondary },
    { label: 'Despesa', icon: 'trending-down-outline', onPress: onAddDespesa, color: colors.spending },
  ];

  const numItems = baseItems.length;
  const startAngle = -ARC_ANGLE_SPREAD / 2;
  const stepAngle = numItems > 1 ? ARC_ANGLE_SPREAD / (numItems - 1) : 0;

  return (
    <>
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={toggle}
      >
        <Pressable style={styles.backdrop} onPress={toggle}>
          <View style={styles.arcContainer} pointerEvents="box-none">
            {baseItems.map((item, index) => {
              const angleDeg = startAngle + index * stepAngle;
              const angleRad = (angleDeg * Math.PI) / 180;
              const x = centerX + ARC_RADIUS * Math.sin(angleRad) - BOLINHA_SIZE / 2;
              const y = ARC_RADIUS * Math.cos(angleRad) - BOLINHA_SIZE / 2;
              return (
                <TouchableOpacity
                  key={item.label}
                  style={[
                    styles.bolinha,
                    {
                      backgroundColor: item.color,
                      left: x,
                      top: Math.max(0, y),
                    },
                  ]}
                  onPress={() => handleAction(item.onPress)}
                  activeOpacity={0.9}
                >
                  <Ionicons name={item.icon} size={24} color={colors.textPrimary} />
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Modal>

      <TouchableOpacity style={styles.fab} onPress={toggle} activeOpacity={0.9}>
        <Animated.View
          style={{
            transform: [
              {
                rotate: anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '45deg'],
                }),
              },
            ],
          }}
        >
          <Ionicons name="add" size={28} color={colors.textPrimary} />
        </Animated.View>
      </TouchableOpacity>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 90,
  },
  arcContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 100,
    height: ARC_RADIUS + BOLINHA_SIZE,
  },
  bolinha: {
    position: 'absolute',
    width: BOLINHA_SIZE,
    height: BOLINHA_SIZE,
    borderRadius: BOLINHA_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
