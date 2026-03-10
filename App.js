import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppProvider, useApp } from './src/context/AppContext';
import CustomTabBar from './src/components/CustomTabBar';
import HomeScreen from './src/screens/HomeScreen';
import TransactionsScreen from './src/screens/TransactionsScreen';
import PlaceholderScreen from './src/screens/PlaceholderScreen';
import AddAccountScreen from './src/screens/AddAccountScreen';
import AddCardScreen from './src/screens/AddCardScreen';
import CategoriesScreen from './src/screens/CategoriesScreen';
import AddTransactionScreen from './src/screens/AddTransactionScreen';
import PlanningScreen from './src/screens/PlanningScreen';
import DefinirOrcamentoScreen from './src/screens/DefinirOrcamentoScreen';
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
      <Tab.Screen name="Mais" component={PlaceholderScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <NavigationContainer>
          <StatusBar style="light" />
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
            }}
          >
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen name="AddAccount" component={AddAccountScreen} />
            <Stack.Screen name="AddCard" component={AddCardScreen} />
            <Stack.Screen name="Categories" component={CategoriesScreen} />
            <Stack.Screen name="AddTransaction" component={AddTransactionScreen} />
            <Stack.Screen name="DefinirOrcamento" component={DefinirOrcamentoScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </AppProvider>
    </SafeAreaProvider>
  );
}
