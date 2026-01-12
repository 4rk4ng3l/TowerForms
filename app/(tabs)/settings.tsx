import { StyleSheet, ScrollView, TouchableOpacity, Alert, View } from 'react-native';
import { useState, useEffect } from 'react';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { DatabaseUtils } from '@/app/src/infrastructure/database/db-utils';
import { useSubmissionsStore } from '@/app/src/store/submissions/submissionsStore';

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { loadCompletedSubmissions } = useSubmissionsStore();

  const [stats, setStats] = useState({
    submissions: 0,
    answers: 0,
    files: 0,
    forms: 0,
  });

  const [syncStats, setSyncStats] = useState({
    totalSubmissions: 0,
    pendingSubmissions: 0,
    syncedSubmissions: 0,
    failedSubmissions: 0,
    totalFiles: 0,
    pendingFiles: 0,
    syncedFiles: 0,
    failedFiles: 0,
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [dbStats, syncStatsData] = await Promise.all([
        DatabaseUtils.getStats(),
        DatabaseUtils.getSyncStats(),
      ]);
      setStats(dbStats);
      setSyncStats(syncStatsData);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleClearSubmissions = () => {
    Alert.alert(
      'Limpiar Datos de Submissions',
      `¿Estás seguro de que deseas eliminar:\n\n• ${stats.submissions} submissions\n• ${stats.answers} respuestas\n• ${stats.files} archivos\n\nEsta acción NO se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await DatabaseUtils.clearSubmissionData();
              await loadStats();
              await loadCompletedSubmissions();
              Alert.alert('Éxito', 'Todos los datos de submissions han sido eliminados');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'No se pudieron eliminar los datos');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleClearAllData = () => {
    Alert.alert(
      '⚠️ Advertencia Crítica',
      `Esto eliminará TODOS los datos locales:\n\n• ${stats.forms} formularios\n• ${stats.submissions} submissions\n• ${stats.answers} respuestas\n• ${stats.files} archivos\n\nDeberás volver a descargar los formularios.\n\n¿Estás COMPLETAMENTE seguro?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar Todo',
          style: 'destructive',
          onPress: () => {
            // Second confirmation
            Alert.alert(
              'Última Confirmación',
              'Esta es tu última oportunidad. ¿Deseas continuar?',
              [
                { text: 'No, Cancelar', style: 'cancel' },
                {
                  text: 'Sí, Eliminar Todo',
                  style: 'destructive',
                  onPress: async () => {
                    setLoading(true);
                    try {
                      await DatabaseUtils.clearAllData();
                      await loadStats();
                      await loadCompletedSubmissions();
                      Alert.alert(
                        'Completado',
                        'Todos los datos han sido eliminados. Reinicia la app y vuelve a descargar los formularios.'
                      );
                    } catch (error: any) {
                      Alert.alert('Error', error.message || 'No se pudieron eliminar los datos');
                    } finally {
                      setLoading(false);
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const handleRetryFailedSync = () => {
    if (syncStats.failedSubmissions === 0 && syncStats.failedFiles === 0) {
      Alert.alert('Información', 'No hay elementos fallidos para reintentar');
      return;
    }

    Alert.alert(
      'Reintentar Sincronización',
      `Se marcarán como pendientes:\n\n• ${syncStats.failedSubmissions} submissions fallidos\n• ${syncStats.failedFiles} archivos fallidos\n\n¿Deseas continuar?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Reintentar',
          onPress: async () => {
            setLoading(true);
            try {
              const result = await DatabaseUtils.retryFailedSync();
              await loadStats();
              Alert.alert(
                'Éxito',
                `Se marcaron como pendientes:\n• ${result.submissionsReset} submissions\n• ${result.filesReset} archivos\n\nAhora puedes intentar sincronizar nuevamente desde la pantalla de Descargas.`
              );
            } catch (error: any) {
              Alert.alert('Error', error.message || 'No se pudo reintentar la sincronización');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <ThemedView style={styles.header}>
        <ThemedText type="title" style={styles.headerTitle}>
          Configuración
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Gestiona tus datos locales y sincronización
        </ThemedText>
      </ThemedView>

      {/* Database Stats */}
      <ThemedView style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Estadísticas de Base de Datos
        </ThemedText>

        <ThemedView style={[styles.card, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Ionicons name="document-text-outline" size={24} color="#007AFF" />
              <ThemedText style={styles.statNumber}>{stats.forms}</ThemedText>
              <ThemedText style={styles.statLabel}>Formularios</ThemedText>
            </View>

            <View style={styles.statItem}>
              <Ionicons name="checkmark-circle-outline" size={24} color="#34C759" />
              <ThemedText style={styles.statNumber}>{stats.submissions}</ThemedText>
              <ThemedText style={styles.statLabel}>Submissions</ThemedText>
            </View>
          </View>

          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Ionicons name="chatbox-outline" size={24} color="#FF9500" />
              <ThemedText style={styles.statNumber}>{stats.answers}</ThemedText>
              <ThemedText style={styles.statLabel}>Respuestas</ThemedText>
            </View>

            <View style={styles.statItem}>
              <Ionicons name="images-outline" size={24} color="#AF52DE" />
              <ThemedText style={styles.statNumber}>{stats.files}</ThemedText>
              <ThemedText style={styles.statLabel}>Archivos</ThemedText>
            </View>
          </View>
        </ThemedView>
      </ThemedView>

      {/* Sync Stats */}
      <ThemedView style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Estado de Sincronización
        </ThemedText>

        <ThemedView style={[styles.card, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
          <View style={styles.syncStatRow}>
            <View style={styles.syncStatItem}>
              <View style={[styles.syncStatusBadge, { backgroundColor: '#34C75920' }]}>
                <View style={[styles.syncStatusDot, { backgroundColor: '#34C759' }]} />
                <ThemedText style={[styles.syncStatusText, { color: '#34C759' }]}>
                  Sincronizados
                </ThemedText>
              </View>
              <ThemedText style={styles.syncStatNumber}>{syncStats.syncedSubmissions}</ThemedText>
            </View>

            <View style={styles.syncStatItem}>
              <View style={[styles.syncStatusBadge, { backgroundColor: '#FF950020' }]}>
                <View style={[styles.syncStatusDot, { backgroundColor: '#FF9500' }]} />
                <ThemedText style={[styles.syncStatusText, { color: '#FF9500' }]}>
                  Pendientes
                </ThemedText>
              </View>
              <ThemedText style={styles.syncStatNumber}>{syncStats.pendingSubmissions}</ThemedText>
            </View>
          </View>

          <View style={styles.syncStatRow}>
            <View style={styles.syncStatItem}>
              <View style={[styles.syncStatusBadge, { backgroundColor: '#FF3B3020' }]}>
                <View style={[styles.syncStatusDot, { backgroundColor: '#FF3B30' }]} />
                <ThemedText style={[styles.syncStatusText, { color: '#FF3B30' }]}>
                  Fallidos
                </ThemedText>
              </View>
              <ThemedText style={styles.syncStatNumber}>{syncStats.failedSubmissions}</ThemedText>
            </View>

            <View style={styles.syncStatItem}>
              <ThemedText style={styles.syncStatLabel}>
                Total: {syncStats.totalSubmissions} submissions
              </ThemedText>
            </View>
          </View>
        </ThemedView>
      </ThemedView>

      {/* Actions */}
      <ThemedView style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Acciones de Mantenimiento
        </ThemedText>

        {/* Retry Failed Sync */}
        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: isDark ? '#1a1a1a' : '#fff' },
            loading && styles.actionButtonDisabled
          ]}
          onPress={handleRetryFailedSync}
          disabled={loading}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#007AFF20' }]}>
            <Ionicons name="sync-outline" size={24} color="#007AFF" />
          </View>
          <View style={styles.actionContent}>
            <ThemedText style={styles.actionTitle}>Reintentar Sincronización Fallida</ThemedText>
            <ThemedText style={styles.actionDescription}>
              Marca los elementos fallidos como pendientes para reintentar
            </ThemedText>
          </View>
          <Ionicons name="chevron-forward" size={20} color={isDark ? '#666' : '#ccc'} />
        </TouchableOpacity>

        {/* Refresh Stats */}
        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: isDark ? '#1a1a1a' : '#fff' },
            loading && styles.actionButtonDisabled
          ]}
          onPress={loadStats}
          disabled={loading}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#34C75920' }]}>
            <Ionicons name="refresh-outline" size={24} color="#34C759" />
          </View>
          <View style={styles.actionContent}>
            <ThemedText style={styles.actionTitle}>Actualizar Estadísticas</ThemedText>
            <ThemedText style={styles.actionDescription}>
              Recarga las estadísticas de la base de datos
            </ThemedText>
          </View>
          <Ionicons name="chevron-forward" size={20} color={isDark ? '#666' : '#ccc'} />
        </TouchableOpacity>

        {/* Clear Submissions */}
        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.dangerButton,
            { backgroundColor: isDark ? '#1a1a1a' : '#fff' },
            loading && styles.actionButtonDisabled
          ]}
          onPress={handleClearSubmissions}
          disabled={loading}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#FF950020' }]}>
            <Ionicons name="trash-outline" size={24} color="#FF9500" />
          </View>
          <View style={styles.actionContent}>
            <ThemedText style={styles.actionTitle}>Limpiar Datos de Submissions</ThemedText>
            <ThemedText style={styles.actionDescription}>
              Elimina todos los submissions, respuestas y archivos
            </ThemedText>
          </View>
          <Ionicons name="chevron-forward" size={20} color={isDark ? '#666' : '#ccc'} />
        </TouchableOpacity>

        {/* Clear All Data */}
        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.dangerButton,
            { backgroundColor: isDark ? '#1a1a1a' : '#fff' },
            loading && styles.actionButtonDisabled
          ]}
          onPress={handleClearAllData}
          disabled={loading}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#FF3B3020' }]}>
            <Ionicons name="nuclear-outline" size={24} color="#FF3B30" />
          </View>
          <View style={styles.actionContent}>
            <ThemedText style={[styles.actionTitle, { color: '#FF3B30' }]}>
              Eliminar Todos los Datos
            </ThemedText>
            <ThemedText style={styles.actionDescription}>
              ⚠️ Elimina TODO incluyendo formularios descargados
            </ThemedText>
          </View>
          <Ionicons name="chevron-forward" size={20} color={isDark ? '#666' : '#ccc'} />
        </TouchableOpacity>
      </ThemedView>

      {/* Info */}
      <ThemedView style={styles.infoSection}>
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color="#007AFF" />
          <ThemedText style={styles.infoText}>
            Usa "Limpiar Datos de Submissions" para resolver problemas de sincronización.
            {'\n\n'}
            Los formularios descargados NO se eliminarán y podrás volver a llenarlos.
          </ThemedText>
        </View>
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
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 4,
  },
  section: {
    padding: 20,
    paddingTop: 0,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  card: {
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.7,
    textAlign: 'center',
  },
  syncStatRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  syncStatItem: {
    flex: 1,
    gap: 8,
  },
  syncStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  syncStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  syncStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  syncStatNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  syncStatLabel: {
    fontSize: 12,
    opacity: 0.7,
    textAlign: 'center',
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    gap: 12,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  dangerButton: {
    borderWidth: 1,
    borderColor: '#FF3B3010',
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionContent: {
    flex: 1,
    gap: 4,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  actionDescription: {
    fontSize: 13,
    opacity: 0.6,
  },
  infoSection: {
    padding: 20,
    paddingTop: 0,
    marginTop: 20,
    marginBottom: 40,
  },
  infoBox: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: '#007AFF10',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#007AFF20',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.8,
  },
});
