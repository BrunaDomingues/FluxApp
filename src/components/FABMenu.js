import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../constants/theme';

const FAB_SIZE = 56;
const MENU_ICON_SIZE = 22;

export default function FABMenu({ onAddReceita, onAddDespesa, onAddTransferencia }) {
  const [open, setOpen] = useState(false);
  const anim = React.useRef(new Animated.Value(0)).current;

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
    setTimeout(() => fn?.(), 200);
  };

  const menuItems = [
    { label: 'Receita', icon: 'trending-up-outline', onPress: onAddReceita, color: colors.positive },
    { label: 'Despesa', icon: 'trending-down-outline', onPress: onAddDespesa, color: colors.spending },
    { label: 'Transferência', icon: 'swap-horizontal-outline', onPress: onAddTransferencia, color: colors.secondary },
  ];

  return (
    <>
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={toggle}
      >
        <Pressable style={styles.backdrop} onPress={toggle}>
          <View style={styles.menuContainer}>
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.label}
                style={[styles.menuItem, { backgroundColor: item.color }]}
                onPress={() => handleAction(item.onPress)}
                activeOpacity={0.8}
              >
                <Ionicons name={item.icon} size={MENU_ICON_SIZE} color={colors.textPrimary} />
                <Text style={styles.menuLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

      <TouchableOpacity
        style={styles.fab}
        onPress={toggle}
        activeOpacity={0.9}
      >
        <Animated.View
          style={{
            transform: [{
              rotate: anim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '45deg'],
              }),
            }],
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
    backgroundColor: colors.primary,
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
    paddingBottom: 100,
    paddingHorizontal: spacing.lg,
  },
  menuContainer: {
    backgroundColor: colors.backgroundCardElevated,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    paddingVertical: spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  menuLabel: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '600',
  },
});
