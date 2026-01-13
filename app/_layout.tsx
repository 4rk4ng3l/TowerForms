import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@store/auth/authStore';
import { database } from '@infrastructure/database/database';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { isAuthenticated, isLoading, loadUser } = useAuthStore();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    async function initialize() {
      try {
        console.log('[RootLayout] Initializing database...');
        try {
          await database.init();
          console.log('[RootLayout] Database initialized successfully');
        } catch (dbError) {
          console.error('[RootLayout] Database init failed, attempting to reset...', dbError);
          // If database initialization fails, drop all tables and try again
          try {
            await database.dropAllTables();
            await database.init();
            console.log('[RootLayout] Database reset and initialized successfully');
          } catch (resetError) {
            console.error('[RootLayout] Database reset also failed:', resetError);
            throw resetError;
          }
        }

        console.log('[RootLayout] Loading user...');
        await loadUser();
        console.log('[RootLayout] User loaded');
      } catch (error) {
        console.error('[RootLayout] Error initializing app:', error);
      } finally {
        setIsInitializing(false);
      }
    }

    initialize();
  }, []);

  if (isInitializing || isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="form-detail" options={{ presentation: 'card' }} />
        <Stack.Screen name="fill-submission" options={{ presentation: 'card' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
});
