import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ScrollView,
} from 'react-native';
import { colors, spacing, borderRadius } from '../constants/theme';

const AppAlertContext = createContext(null);

export function AppAlertProvider({ children }) {
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [buttons, setButtons] = useState([]);

  const show = useCallback((titleStr, messageStr, buttonsArr) => {
    setTitle(titleStr || '');
    setMessage(messageStr || '');
    setButtons(Array.isArray(buttonsArr) && buttonsArr.length > 0 ? buttonsArr : [{ text: 'OK' }]);
    setVisible(true);
  }, []);

  const hide = useCallback(() => setVisible(false), []);

  useEffect(() => {
    global.__fluxAppAlertShow = show;
    return () => { delete global.__fluxAppAlertShow; };
  }, [show]);

  const handlePress = (btn) => {
    hide();
    if (btn.onPress) setTimeout(() => btn.onPress(), 0);
  };

  return (
    <AppAlertContext.Provider value={{ show }}>
      {children}
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={hide}
        statusBarTranslucent
      >
        <Pressable style={styles.overlay} onPress={hide}>
          <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
            {title ? <Text style={styles.title}>{title}</Text> : null}
            {message ? (
              <ScrollView style={styles.messageScroll} bounces={false} showsVerticalScrollIndicator={false}>
                <Text style={styles.message}>{message}</Text>
              </ScrollView>
            ) : null}
            <View style={styles.actions}>
              {buttons.map((btn, i) => {
                const isCancel = btn.style === 'cancel';
                const isDestructive = btn.style === 'destructive';
                return (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.btn,
                      isCancel && styles.btnCancel,
                      isDestructive && styles.btnDestructive,
                      buttons.length > 2 && styles.btnStacked,
                    ]}
                    onPress={() => handlePress(btn)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.btnText,
                        isCancel && styles.btnTextCancel,
                        isDestructive && styles.btnTextDestructive,
                      ]}
                    >
                      {btn.text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </AppAlertContext.Provider>
  );
}

export function useAppAlert() {
  const ctx = useContext(AppAlertContext);
  return ctx ? ctx.show : () => {};
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.backgroundCardElevated,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  messageScroll: {
    maxHeight: 200,
    marginBottom: spacing.lg,
  },
  message: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  btn: {
    minWidth: 100,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCancel: {
    backgroundColor: colors.backgroundCard,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  btnDestructive: {
    backgroundColor: colors.spending,
  },
  btnStacked: {
    width: '100%',
    minWidth: '100%',
  },
  btnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  btnTextCancel: {
    color: colors.textSecondary,
  },
  btnTextDestructive: {
    color: '#fff',
  },
});

export const AppAlert = {
  alert: (title, message, buttons) => {
    if (typeof global.__fluxAppAlertShow === 'function') {
      global.__fluxAppAlertShow(title, message, buttons);
    } else {
      const { Alert } = require('react-native');
      Alert.alert(title, message, buttons);
    }
  },
};
