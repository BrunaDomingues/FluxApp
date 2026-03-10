import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import FABMenu from './FABMenu';
import { colors, spacing } from '../constants/theme';

const TAB_BAR_HEIGHT = 64;
const FAB_SIZE = 56;
const ICON_SIZE = 24;

export default function CustomTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const bottomSafe = insets.bottom || 12;

  const renderTab = (route, index) => {
    const isFocused = state.index === index;
    const label = route.name === 'Início' ? 'Início' : 'Transações';
    const iconName = route.name === 'Início' ? 'home-outline' : 'list-outline';

    const onPress = () => {
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });
      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    };

    return (
      <TouchableOpacity
        key={route.key}
        onPress={onPress}
        style={styles.tab}
        activeOpacity={0.7}
      >
        <Ionicons
          name={iconName}
          size={ICON_SIZE}
          color={isFocused ? colors.primary : colors.textMuted}
          style={styles.tabIcon}
        />
        <Text style={[styles.tabLabel, isFocused && styles.tabLabelFocused]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingBottom: bottomSafe }]}>
      <View style={styles.tabBar}>
        <View style={styles.tabWrapper}>
          {state.routes.map((route, index) => {
            if (index === 1) {
              return (
                <View key={route.key} style={styles.fabPlaceholder}>
                  <FABMenu
                    onAddReceita={() => {}}
                    onAddDespesa={() => {}}
                    onAddTransferencia={() => {}}
                  />
                </View>
              );
            }
            return renderTab(route, index);
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.backgroundCard,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  tabBar: {
    height: TAB_BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  tabWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  tabIcon: {
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  tabLabelFocused: {
    color: colors.primary,
    fontWeight: '600',
  },
  fabPlaceholder: {
    width: FAB_SIZE + 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -FAB_SIZE / 2 - 8,
  },
});
