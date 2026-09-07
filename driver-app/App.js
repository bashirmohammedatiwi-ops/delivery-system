import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { AppDataProvider } from './src/context/AppDataContext';
import LoginScreen from './src/screens/LoginScreen';
import MainTabs from './src/components/MainTabs';
import OrderDetailScreen from './src/screens/OrderDetailScreen';
import LoadingView from './src/components/LoadingView';
import { THEME } from './src/theme';

const Stack = createNativeStackNavigator();

function AuthenticatedApp() {
  const { token } = useAuth();
  return (
    <AppDataProvider token={token}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: THEME.primaryDeeper },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '800', fontSize: 17 },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: THEME.bg },
          headerBackTitleVisible: false,
          animation: 'slide_from_left',
        }}
      >
        <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen
          name="OrderDetail"
          component={OrderDetailScreen}
          options={{ title: 'تفاصيل الطلب' }}
        />
      </Stack.Navigator>
    </AppDataProvider>
  );
}

function AppNavigator() {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingView message="جاري التحميل..." />;
  }

  if (!token) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
      </Stack.Navigator>
    );
  }

  return <AuthenticatedApp />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <AppNavigator />
          <StatusBar style="light" />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
