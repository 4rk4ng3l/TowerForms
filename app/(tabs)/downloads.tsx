import { StyleSheet, ScrollView, TouchableOpacity, RefreshControl, View, Alert } from 'react-native';
import { useEffect, useState } from 'react';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useSubmissionsStore } from '@/app/src/store/submissions/submissionsStore';
import { useFormsStore } from '@/app/src/store/forms/formsStore';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { Paths, Directory, File } from 'expo-file-system/next';
import * as Sharing from 'expo-sharing';
import axios from 'axios';
import { secureStorageService } from '@/app/src/infrastructure/storage/secureStorageService';
import { SubmissionEntity } from '@/app/src/core/entities/Submission';
import { apiClient } from '@/app/src/data/api/apiClient';
import { API_CONFIG } from '@/app/src/data/api/config';
import { Form } from '@/app/src/core/entities/Form';

export default function DownloadsScreen() {
  const { completedSubmissions, loadCompletedSubmissions, syncSubmissions, fetchRemoteSubmissions, isLoading, isSyncing } = useSubmissionsStore();
  const { forms } = useFormsStore();
  const [refreshing, setRefreshing] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    loadCompletedSubmissions();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadCompletedSubmissions();
    } catch (error) {
      console.error('Error loading submissions:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSync = async () => {
    try {
      console.log('[Downloads] Starting sync process...');
      const unsyncedCount = completedSubmissions.filter(s => s.syncStatus === 'pending' || s.syncStatus === 'failed').length;

      console.log('[Downloads] Unsynced submissions:', unsyncedCount);

      if (unsyncedCount === 0) {
        Alert.alert('Información', 'No hay formularios pendientes de sincronizar');
        return;
      }

      Alert.alert(
        'Sincronizar',
        `Se sincronizarán ${unsyncedCount} formulario(s) con el servidor. ¿Desea continuar?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Sincronizar',
            onPress: async () => {
              try {
                console.log('[Downloads] User confirmed, calling syncSubmissions...');
                const result = await syncSubmissions();

                console.log('[Downloads] Sync result:', result);

                if (result.failedCount > 0) {
                  const errorDetails = result.errors && result.errors.length > 0
                    ? `\n\nErrores:\n${result.errors.map((e: any) => `- ${e.error || e.message || 'Unknown error'}`).join('\n')}`
                    : '';

                  Alert.alert(
                    'Sincronización Parcial',
                    `Sincronizados: ${result.syncedCount}\nFallidos: ${result.failedCount}${errorDetails}\n\nVerifica tu conexión e intenta nuevamente.`
                  );
                } else {
                  Alert.alert(
                    'Sincronización Completa',
                    `Se sincronizaron ${result.syncedCount} formulario(s) exitosamente`
                  );
                }
              } catch (error: any) {
                console.error('[Downloads] Sync error:', error);
                console.error('[Downloads] Error stack:', error.stack);
                console.error('[Downloads] Error response:', error.response?.data);

                const errorMessage = error.response?.data?.error?.message
                  || error.message
                  || 'No se pudo sincronizar. Verifica tu conexión e intenta nuevamente.';

                Alert.alert(
                  'Error de Sincronización',
                  errorMessage
                );
              }
            }
          }
        ]
      );
    } catch (error: any) {
      console.error('[Downloads] Error preparing sync:', error);
      Alert.alert('Error', error.message || 'Error al preparar sincronización');
    }
  };

  const handleFetchRemote = async () => {
    try {
      console.log('[Downloads] Fetching remote submissions...');

      Alert.alert(
        'Descargar Submissions',
        'Se descargarán los formularios completados por otros usuarios del servidor. ¿Desea continuar?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Descargar',
            onPress: async () => {
              try {
                const result = await fetchRemoteSubmissions();

                if (result.errors.length > 0) {
                  Alert.alert(
                    'Descarga Parcial',
                    `Descargados: ${result.fetchedCount}\nErrores: ${result.errors.length}`
                  );
                } else if (result.fetchedCount === 0) {
                  Alert.alert(
                    'Sin Nuevos Datos',
                    'No hay nuevos formularios para descargar'
                  );
                } else {
                  Alert.alert(
                    'Descarga Completa',
                    `Se descargaron ${result.fetchedCount} formulario(s)`
                  );
                }
              } catch (error: any) {
                console.error('[Downloads] Error fetching remote:', error);
                Alert.alert('Error', error.message || 'Error al descargar submissions');
              }
            }
          }
        ]
      );
    } catch (error: any) {
      console.error('[Downloads] Error preparing fetch:', error);
      Alert.alert('Error', error.message || 'Error al preparar descarga');
    }
  };

  const getFormName = (formId: string) => {
    const form = forms.find(f => f.id === formId);
    return form ? form.name : 'Formulario desconocido';
  };

  const getForm = (formId: string): Form | undefined => {
    return forms.find(f => f.id === formId);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (syncStatus: string) => {
    switch (syncStatus) {
      case 'synced':
        return '#34C759';
      case 'syncing':
        return '#007AFF';
      case 'failed':
        return '#FF3B30';
      case 'pending':
      default:
        return '#FF9500';
    }
  };

  const getStatusText = (syncStatus: string) => {
    switch (syncStatus) {
      case 'synced':
        return 'Sincronizado';
      case 'syncing':
        return 'Sincronizando...';
      case 'failed':
        return 'Error de Sync';
      case 'pending':
      default:
        return 'Pendiente';
    }
  };

  // Normalize URL to use the correct base URL instead of localhost
  const normalizeUrl = (url: string): string => {
    // Extract the base URL host from config (e.g., "http://10.0.2.2:3000/api" -> "http://10.0.2.2:3000")
    const baseUrlWithoutApi = API_CONFIG.BASE_URL.replace('/api', '');

    // Replace localhost variations with the correct base URL
    return url
      .replace(/http:\/\/localhost:3000/g, baseUrlWithoutApi)
      .replace(/http:\/\/127\.0\.0\.1:3000/g, baseUrlWithoutApi);
  };

  // Helper function to convert ArrayBuffer to Base64 in React Native
  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const downloadFile = async (url: string, fileName: string) => {
    // Normalize the URL to use correct host
    const normalizedUrl = normalizeUrl(url);
    console.log('[Downloads] Downloading from:', normalizedUrl);

    // Get auth token
    const token = await secureStorageService.getAccessToken();
    if (!token) {
      throw new Error('No authentication token available');
    }

    // Download file using axios with authentication
    const response = await axios.get(normalizedUrl, {
      responseType: 'arraybuffer',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // Create downloads directory if it doesn't exist
    const downloadsDir = new Directory(Paths.document, 'downloads');
    if (!downloadsDir.exists) {
      await downloadsDir.create();
    }

    // Convert arraybuffer to base64
    const base64Data = arrayBufferToBase64(response.data);

    // Create destination file and write data
    const destFile = new File(downloadsDir, fileName);
    await destFile.write(base64Data, { encoding: 'base64' });

    if (!destFile.exists) {
      throw new Error('Download failed - file not created');
    }

    console.log('[Downloads] File saved to:', destFile.uri);
    return destFile.uri;
  };

  const shareFile = async (fileUri: string, fileName: string, mimeType: string) => {
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(fileUri, {
        mimeType,
        dialogTitle: `Compartir ${fileName}`,
      });
    } else {
      Alert.alert('Éxito', `Archivo guardado en: ${fileUri}`);
    }
  };

  const downloadSubmissionPackage = async (submission: SubmissionEntity) => {
    if (downloadingId === submission.id) return;

    setDownloadingId(submission.id);
    const formName = getFormName(submission.formId);
    const form = getForm(submission.formId);

    try {
      // Get package info from backend
      const packageInfo = await apiClient.downloadSubmissionPackage(submission.id);

      // Download Excel file
      Alert.alert(
        'Descargando',
        `Descargando ${formName}...\n\nExcel y ${packageInfo.images.length} archivo(s) ZIP de imágenes`,
        [{ text: 'OK' }]
      );

      const excelUri = await downloadFile(packageInfo.excel.url, packageInfo.excel.fileName);
      await shareFile(excelUri, packageInfo.excel.fileName, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

      // Download each step's images ZIP
      for (const imagePackage of packageInfo.images) {
        const stepName = form?.steps.find(s => s.stepNumber === imagePackage.stepNumber)?.title || `Step ${imagePackage.stepNumber}`;
        const zipUri = await downloadFile(imagePackage.url, imagePackage.fileName);
        await shareFile(zipUri, imagePackage.fileName, 'application/zip');
      }

      Alert.alert(
        'Descarga Completa',
        `Se han descargado:\n- 1 archivo Excel\n- ${packageInfo.images.length} archivo(s) ZIP de imágenes`
      );

    } catch (error: any) {
      console.error('Error downloading package:', error);
      Alert.alert(
        'Error',
        error.message || 'No se pudo descargar el paquete. Verifica tu conexión e intenta nuevamente.'
      );
    } finally {
      setDownloadingId(null);
    }
  };

  const downloadExcelOnly = async (submission: SubmissionEntity) => {
    if (downloadingId === submission.id) return;

    setDownloadingId(submission.id);
    const formName = getFormName(submission.formId);

    try {
      const excelInfo = await apiClient.downloadSubmissionExcel(submission.id);
      const fileUri = await downloadFile(excelInfo.url, excelInfo.fileName);

      await shareFile(fileUri, excelInfo.fileName, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    } catch (error: any) {
      console.error('Error downloading Excel:', error);
      Alert.alert(
        'Error',
        error.message || 'No se pudo descargar el archivo Excel. Verifica tu conexión e intenta nuevamente.'
      );
    } finally {
      setDownloadingId(null);
    }
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
        <ThemedText type="title" style={styles.headerTitle}>
          Descargas
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Exporta tus formularios completados en Excel y descarga las imágenes por step
        </ThemedText>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[
              styles.syncButton,
              { backgroundColor: '#007AFF', flex: 1 },
              isSyncing && styles.syncButtonDisabled
            ]}
            onPress={handleSync}
            disabled={isSyncing}
          >
            <Ionicons
              name={isSyncing ? "sync-outline" : "cloud-upload-outline"}
              size={20}
              color="#fff"
            />
            <ThemedText style={styles.syncButtonText}>
              {isSyncing ? 'Sincronizando...' : 'Subir'}
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.syncButton,
              { backgroundColor: '#34C759', flex: 1 },
              isSyncing && styles.syncButtonDisabled
            ]}
            onPress={handleFetchRemote}
            disabled={isSyncing}
          >
            <Ionicons
              name={isSyncing ? "sync-outline" : "cloud-download-outline"}
              size={20}
              color="#fff"
            />
            <ThemedText style={styles.syncButtonText}>
              {isSyncing ? 'Descargando...' : 'Descargar'}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>

      {/* Statistics */}
      <ThemedView style={styles.statsContainer}>
        <ThemedView style={[styles.statCard, { backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5' }]}>
          <ThemedText style={styles.statNumber}>{completedSubmissions.length}</ThemedText>
          <ThemedText style={styles.statLabel}>Total Completados</ThemedText>
        </ThemedView>

        <ThemedView style={[styles.statCard, { backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5' }]}>
          <ThemedText style={styles.statNumber}>
            {completedSubmissions.filter(s => s.syncStatus === 'synced').length}
          </ThemedText>
          <ThemedText style={styles.statLabel}>Sincronizados</ThemedText>
        </ThemedView>
      </ThemedView>

      {/* Submissions List */}
      <ThemedView style={styles.section}>
        {isLoading && completedSubmissions.length === 0 ? (
          <ThemedView style={styles.emptyContainer}>
            <Ionicons name="hourglass-outline" size={48} color={isDark ? '#666' : '#ccc'} />
            <ThemedText style={styles.emptyText}>Cargando...</ThemedText>
          </ThemedView>
        ) : completedSubmissions.length === 0 ? (
          <ThemedView style={styles.emptyContainer}>
            <Ionicons name="document-outline" size={48} color={isDark ? '#666' : '#ccc'} />
            <ThemedText style={styles.emptyText}>
              No hay formularios completados
            </ThemedText>
            <ThemedText style={styles.emptySubtext}>
              Los formularios que completes aparecerán aquí
            </ThemedText>
          </ThemedView>
        ) : (
          completedSubmissions.map((submission) => {
            const form = getForm(submission.formId);
            const isDownloading = downloadingId === submission.id;

            return (
              <ThemedView
                key={submission.id}
                style={[
                  styles.submissionCard,
                  { backgroundColor: isDark ? '#1a1a1a' : '#fff' }
                ]}
              >
                <ThemedView style={styles.submissionHeader}>
                  <ThemedView style={styles.submissionInfo}>
                    <ThemedText type="defaultSemiBold" style={styles.formName}>
                      {getFormName(submission.formId)}
                    </ThemedText>
                    <ThemedText style={styles.submissionDate}>
                      {formatDate(submission.updatedAt)}
                    </ThemedText>
                  </ThemedView>

                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(submission.syncStatus) + '20' }
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: getStatusColor(submission.syncStatus) }
                      ]}
                    />
                    <ThemedText
                      style={[
                        styles.statusText,
                        { color: getStatusColor(submission.syncStatus) }
                      ]}
                    >
                      {getStatusText(submission.syncStatus)}
                    </ThemedText>
                  </View>
                </ThemedView>

                <ThemedView style={styles.submissionDetails}>
                  <ThemedView style={styles.detailRow}>
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={16}
                      color={isDark ? '#888' : '#666'}
                    />
                    <ThemedText style={styles.detailText}>
                      {submission.answers.length} respuestas
                    </ThemedText>
                  </ThemedView>

                  {form && (
                    <ThemedView style={styles.detailRow}>
                      <Ionicons
                        name="layers-outline"
                        size={16}
                        color={isDark ? '#888' : '#666'}
                      />
                      <ThemedText style={styles.detailText}>
                        {form.steps.length} steps con imágenes
                      </ThemedText>
                    </ThemedView>
                  )}

                  {submission.metadata.completedAt && (
                    <ThemedView style={styles.detailRow}>
                      <Ionicons
                        name="time-outline"
                        size={16}
                        color={isDark ? '#888' : '#666'}
                      />
                      <ThemedText style={styles.detailText}>
                        Completado: {formatDate(submission.metadata.completedAt)}
                      </ThemedText>
                    </ThemedView>
                  )}
                </ThemedView>

                <ThemedView style={styles.downloadButtonsContainer}>
                  <TouchableOpacity
                    style={[
                      styles.downloadButton,
                      styles.downloadButtonPrimary,
                      { backgroundColor: '#007AFF' },
                      isDownloading && styles.downloadButtonDisabled
                    ]}
                    onPress={() => downloadSubmissionPackage(submission)}
                    disabled={isDownloading}
                  >
                    <Ionicons
                      name={isDownloading ? "sync-outline" : "download-outline"}
                      size={20}
                      color="#fff"
                    />
                    <ThemedText style={styles.downloadButtonTextWhite}>
                      {isDownloading ? 'Descargando...' : 'Paquete Completo'}
                    </ThemedText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.downloadButton,
                      styles.downloadButtonSecondary,
                      { backgroundColor: isDark ? '#2a2a2a' : '#f0f0f0' },
                      isDownloading && styles.downloadButtonDisabled
                    ]}
                    onPress={() => downloadExcelOnly(submission)}
                    disabled={isDownloading}
                  >
                    <Ionicons
                      name="document-text-outline"
                      size={20}
                      color="#007AFF"
                    />
                    <ThemedText style={[styles.downloadButtonText, { color: '#007AFF' }]}>
                      Solo Excel
                    </ThemedText>
                  </TouchableOpacity>
                </ThemedView>
              </ThemedView>
            );
          })
        )}
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
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  syncButtonDisabled: {
    opacity: 0.6,
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
    borderRadius: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 13,
    opacity: 0.7,
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    padding: 20,
    gap: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    opacity: 0.6,
  },
  emptySubtext: {
    fontSize: 14,
    opacity: 0.5,
    marginTop: 8,
    textAlign: 'center',
  },
  submissionCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  submissionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  submissionInfo: {
    flex: 1,
  },
  formName: {
    fontSize: 16,
    marginBottom: 4,
  },
  submissionDate: {
    fontSize: 13,
    opacity: 0.6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  submissionDetails: {
    gap: 8,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    opacity: 0.7,
  },
  downloadButtonsContainer: {
    gap: 8,
    marginTop: 8,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 10,
    gap: 8,
  },
  downloadButtonPrimary: {
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  downloadButtonSecondary: {
    borderWidth: 1,
    borderColor: '#007AFF30',
  },
  downloadButtonDisabled: {
    opacity: 0.5,
  },
  downloadButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  downloadButtonTextWhite: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
