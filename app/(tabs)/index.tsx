import { StyleSheet, ScrollView, TouchableOpacity, RefreshControl, View } from 'react-native';
import { useEffect, useState } from 'react';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuthStore } from '@/app/src/store/auth/authStore';
import { useFormsStore } from '@/app/src/store/forms/formsStore';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';

export default function HomeScreen() {
  const { user } = useAuthStore();
  const { forms, loadForms, syncForms, isSyncing, lastSyncAt } = useFormsStore();
  const [refreshing, setRefreshing] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    loadForms();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await syncForms();
    } catch (error) {
      console.error('Error syncing forms:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const formatLastSync = () => {
    if (!lastSyncAt) return 'Nunca';
    const now = new Date();
    const diff = now.getTime() - new Date(lastSyncAt).getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'Ahora mismo';
    if (minutes < 60) return `Hace ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Hace ${hours}h`;
    const days = Math.floor(hours / 24);
    return `Hace ${days}d`;
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Header */}
      <ThemedView style={styles.header}>
        <ThemedText type="title" style={styles.welcomeText}>
          TowerForms
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Inspecciones de Torres
        </ThemedText>
        {user && (
          <ThemedView style={styles.userInfo}>
            <Ionicons
              name="person-circle-outline"
              size={24}
              color={isDark ? '#fff' : '#333'}
            />
            <ThemedView style={styles.userDetails}>
              <ThemedText type="defaultSemiBold">{user.name}</ThemedText>
              <ThemedText style={styles.userEmail}>{user.email}</ThemedText>
            </ThemedView>
          </ThemedView>
        )}
      </ThemedView>

      {/* Statistics Cards */}
      <ThemedView style={styles.statsContainer}>
        <ThemedView style={[styles.statCard, styles.primaryCard]}>
          <Ionicons name="document-text-outline" size={32} color="#fff" />
          <ThemedText style={styles.statNumber}>{forms.length}</ThemedText>
          <ThemedText style={styles.statLabel}>Formularios</ThemedText>
          <ThemedText style={styles.statLabel}>Disponibles</ThemedText>
        </ThemedView>

        <ThemedView style={[styles.statCard, styles.secondaryCard]}>
          <Ionicons name="sync-outline" size={32} color="#fff" />
          <ThemedText style={styles.statNumber}>{formatLastSync()}</ThemedText>
          <ThemedText style={styles.statLabel}>Última</ThemedText>
          <ThemedText style={styles.statLabel}>Sincronización</ThemedText>
        </ThemedView>
      </ThemedView>

      {/* Quick Access Section */}
      <ThemedView style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Acceso Rápido
        </ThemedText>

        <TouchableOpacity
          style={[styles.quickActionButton, { backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5' }]}
          onPress={() => router.push('/(tabs)/forms')}
        >
          <View style={[styles.iconContainer, { backgroundColor: '#007AFF' }]}>
            <Ionicons name="list-outline" size={24} color="#fff" />
          </View>
          <ThemedView style={styles.actionContent}>
            <ThemedText type="defaultSemiBold">Ver Formularios</ThemedText>
            <ThemedText style={styles.actionDescription}>
              Accede a todos los formularios disponibles
            </ThemedText>
          </ThemedView>
          <Ionicons name="chevron-forward" size={24} color={isDark ? '#888' : '#ccc'} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickActionButton, { backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5' }]}
          onPress={handleRefresh}
          disabled={isSyncing}
        >
          <View style={[styles.iconContainer, { backgroundColor: '#34C759' }]}>
            <Ionicons name="cloud-download-outline" size={24} color="#fff" />
          </View>
          <ThemedView style={styles.actionContent}>
            <ThemedText type="defaultSemiBold">
              {isSyncing ? 'Sincronizando...' : 'Sincronizar Formularios'}
            </ThemedText>
            <ThemedText style={styles.actionDescription}>
              Obtén los últimos formularios del servidor
            </ThemedText>
          </ThemedView>
          <Ionicons name="chevron-forward" size={24} color={isDark ? '#888' : '#ccc'} />
        </TouchableOpacity>
      </ThemedView>

      {/* Info Section */}
      <ThemedView style={styles.section}>
        <ThemedView style={[styles.infoCard, { backgroundColor: isDark ? '#1a1a1a' : '#f9f9f9' }]}>
          <Ionicons name="information-circle-outline" size={24} color="#007AFF" />
          <ThemedView style={styles.infoContent}>
            <ThemedText type="defaultSemiBold">Modo Offline</ThemedText>
            <ThemedText style={styles.infoText}>
              Puedes completar formularios sin conexión. Se sincronizarán automáticamente cuando vuelvas a tener internet.
            </ThemedText>
          </ThemedView>
        </ThemedView>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 60,
  },
  welcomeText: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    marginTop: 4,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  userDetails: {
    marginLeft: 12,
    flex: 1,
  },
  userEmail: {
    fontSize: 14,
    opacity: 0.6,
    marginTop: 2,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginTop: 20,
  },
  statCard: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 140,
  },
  primaryCard: {
    backgroundColor: '#007AFF',
  },
  secondaryCard: {
    backgroundColor: '#34C759',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 12,
  },
  statLabel: {
    fontSize: 13,
    color: '#fff',
    opacity: 0.9,
    textAlign: 'center',
  },
  section: {
    padding: 20,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 20,
    marginBottom: 16,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionContent: {
    flex: 1,
    marginLeft: 16,
  },
  actionDescription: {
    fontSize: 13,
    opacity: 0.6,
    marginTop: 2,
  },
  infoCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    alignItems: 'flex-start',
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoText: {
    fontSize: 13,
    opacity: 0.7,
    marginTop: 4,
    lineHeight: 18,
  },
});
