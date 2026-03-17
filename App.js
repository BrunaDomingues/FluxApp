import "react-native-gesture-handler";
import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { AppProvider, useApp } from './src/context/AppContext';
import CustomTabBar from './src/components/CustomTabBar';
import HomeScreen from './src/screens/HomeScreen';
import TransactionsScreen from './src/screens/TransactionsScreen';
import PlaceholderScreen from './src/screens/PlaceholderScreen';
import ContasScreen from './src/screens/ContasScreen';
import SaldoEmContasScreen from './src/screens/SaldoEmContasScreen';
import ContaDetalhesScreen from './src/screens/ContaDetalhesScreen';
import AddAccountScreen from './src/screens/AddAccountScreen';
import AddCardScreen from './src/screens/AddCardScreen';
import CartoesScreen from './src/screens/CartoesScreen';
import CategoriesScreen from './src/screens/CategoriesScreen';
import AddTransactionScreen from './src/screens/AddTransactionScreen';
import PlanningScreen from './src/screens/PlanningScreen';
import MaisScreen from './src/screens/MaisScreen';
import DefinirOrcamentoScreen from './src/screens/DefinirOrcamentoScreen';
import CardsDaTelaInicialScreen from './src/screens/CardsDaTelaInicialScreen';
import FinanciamentosScreen from './src/screens/FinanciamentosScreen';
import AddFinanciamentoScreen from './src/screens/AddFinanciamentoScreen';
import FinanciamentoDetalhesScreen from './src/screens/FinanciamentoDetalhesScreen';
import BalancoMensalScreen from './src/screens/BalancoMensalScreen';
import GraficosScreen from './src/screens/GraficosScreen';
import ObjetivosScreen from './src/screens/ObjetivosScreen';
import ObjetivoDetalhesScreen from './src/screens/ObjetivoDetalhesScreen';
import AddObjetivoScreen from './src/screens/AddObjetivoScreen';
import ExportImportScreen from './src/screens/ExportImportScreen';
import UsuariosScreen from './src/screens/UsuariosScreen';
import CobrancaUsuarioScreen from './src/screens/CobrancaUsuarioScreen';
import DespesasCompartilhadasPendentesScreen from './src/screens/DespesasCompartilhadasPendentesScreen';
import PagamentosSinalizadosScreen from './src/screens/PagamentosSinalizadosScreen';
import CobrancasRecebidasScreen from './src/screens/CobrancasRecebidasScreen';
import PerfilScreen from './src/screens/PerfilScreen';
import GerenciarContasScreen from './src/screens/GerenciarContasScreen';
import LembreteDiarioScreen from './src/screens/LembreteDiarioScreen';
import LoginScreen from './src/screens/LoginScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import ResetPasswordCodeScreen from './src/screens/ResetPasswordCodeScreen';
import ResetPasswordConfirmScreen from './src/screens/ResetPasswordConfirmScreen';
import { AppAlertProvider } from './src/components/AppAlert';
import { colors } from './src/constants/theme';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  const { hasCartoes } = useApp();
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} hasCartoes={hasCartoes} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Início" component={HomeScreen} />
      <Tab.Screen name="Transações" component={TransactionsScreen} />
      <Tab.Screen
        name="FAB"
        component={PlaceholderScreen}
        listeners={{ tabPress: (e) => e.preventDefault() }}
      />
      <Tab.Screen name="Planejamento" component={PlanningScreen} />
      <Tab.Screen name="Mais" component={MaisScreen} />
    </Tab.Navigator>
  );
}

function MainStack() {
  return (
    <Stack.Navigator
      initialRouteName="MainTabs"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="Contas" component={ContasScreen} />
      <Stack.Screen name="SaldoEmContas" component={SaldoEmContasScreen} />
      <Stack.Screen name="ContaDetalhes" component={ContaDetalhesScreen} />
      <Stack.Screen name="AddAccount" component={AddAccountScreen} />
      <Stack.Screen name="AddCard" component={AddCardScreen} />
      <Stack.Screen name="Cartoes" component={CartoesScreen} />
      <Stack.Screen name="Categories" component={CategoriesScreen} />
      <Stack.Screen name="AddTransaction" component={AddTransactionScreen} />
      <Stack.Screen name="DefinirOrcamento" component={DefinirOrcamentoScreen} />
      <Stack.Screen name="CardsDaTelaInicial" component={CardsDaTelaInicialScreen} />
      <Stack.Screen name="Financiamentos" component={FinanciamentosScreen} />
      <Stack.Screen name="AddFinanciamento" component={AddFinanciamentoScreen} />
      <Stack.Screen name="FinanciamentoDetalhes" component={FinanciamentoDetalhesScreen} />
      <Stack.Screen name="Graficos" component={GraficosScreen} />
      <Stack.Screen name="BalancoMensal" component={BalancoMensalScreen} />
      <Stack.Screen name="Objetivos" component={ObjetivosScreen} />
      <Stack.Screen name="ObjetivoDetalhes" component={ObjetivoDetalhesScreen} />
      <Stack.Screen name="AddObjetivo" component={AddObjetivoScreen} />
      <Stack.Screen name="ExportImport" component={ExportImportScreen} />
      <Stack.Screen name="Usuarios" component={UsuariosScreen} />
      <Stack.Screen name="CobrancaUsuario" component={CobrancaUsuarioScreen} />
      <Stack.Screen name="DespesasCompartilhadasPendentes" component={DespesasCompartilhadasPendentesScreen} />
      <Stack.Screen name="PagamentosSinalizados" component={PagamentosSinalizadosScreen} />
      <Stack.Screen name="CobrancasRecebidas" component={CobrancasRecebidasScreen} />
      <Stack.Screen name="Perfil" component={PerfilScreen} />
      <Stack.Screen name="GerenciarContas" component={GerenciarContasScreen} />
      <Stack.Screen name="LembreteDiario" component={LembreteDiarioScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="ResetPasswordCode" component={ResetPasswordCodeScreen} />
    </Stack.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ResetPasswordCode" component={ResetPasswordCodeScreen} />
    </Stack.Navigator>
  );
}

function RootNavigator() {
  const { session, loading, isSupabaseConfigured, requiresNewPassword, clearRequiresNewPassword } = useAuth();
  const showAuth = isSupabaseConfigured && !session;

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Carregando…</Text>
      </View>
    );
  }

  if (showAuth) {
    return <AuthStack />;
  }

  if (session && requiresNewPassword) {
    return <ResetPasswordConfirmScreen onDone={clearRequiresNewPassword} />;
  }

  return (
    <AppProvider>
      <MainAppGate />
    </AppProvider>
  );
}

function MainAppGate() {
  const { isHydrating } = useApp();
  if (isHydrating) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Carregando seus dados…</Text>
      </View>
    );
  }
  return <MainStack />;
}

function AppNavigator() {
  const { session } = useAuth();
  return (
    <NavigationContainer key={session ? 'main' : 'auth'}>
      <StatusBar style="light" />
      <RootNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <AppAlertProvider>
            <AppNavigator />
          </AppAlertProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  loadingText: { marginTop: 12, fontSize: 16, color: colors.textMuted },
});
