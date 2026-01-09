import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {useRouter} from 'expo-router';
import {useFormsStore} from '@store/forms/formsStore';
import {Form} from '@core/entities/Form';

export default function FormsListScreen() {
  const router = useRouter();
  const {forms, isLoading, isSyncing, error, loadForms, syncForms, clearError} =
    useFormsStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    initializeForms();
  }, []);

  const initializeForms = async () => {
    try {
      await loadForms();

      // If no forms in local DB, sync from server
      if (forms.length === 0) {
        await handleSync();
      }
    } catch (error) {
      console.error('Error initializing forms:', error);
    }
  };

  const handleSync = async () => {
    try {
      clearError();
      await syncForms();
      Alert.alert('Éxito', 'Formularios sincronizados correctamente');
    } catch (error: any) {
      Alert.alert(
        'Error de Sincronización',
        error.message || 'No se pudieron sincronizar los formularios',
      );
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await handleSync();
    } finally {
      setRefreshing(false);
    }
  };

  const handleFormPress = (form: Form) => {
    router.push({
      pathname: '/form-detail',
      params: {formId: form.id},
    });
  };

  const renderFormItem = ({item}: {item: Form}) => (
    <TouchableOpacity
      onPress={() => handleFormPress(item)}
      activeOpacity={0.7}
      style={styles.formCard}>
      <Text style={styles.formName}>{item.name}</Text>
      {item.description && (
        <Text style={styles.formDescription} numberOfLines={2}>
          {item.description}
        </Text>
      )}
      <View style={styles.formFooter}>
        <Text style={styles.formMeta}>
          {item.steps.length} paso{item.steps.length !== 1 ? 's' : ''}
        </Text>
        <Text style={styles.formVersion}>v{item.version}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>No hay formularios</Text>
      <Text style={styles.emptyText}>
        Presiona el botón de sincronizar para obtener formularios del servidor
      </Text>
      <TouchableOpacity
        style={styles.syncButton}
        onPress={handleSync}
        disabled={isSyncing}>
        {isSyncing ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.syncButtonText}>Sincronizar Formularios</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  if (isLoading && forms.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Cargando formularios...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Formularios</Text>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleSync}
          disabled={isSyncing}>
          <Text style={styles.headerButtonText}>
            {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
          </Text>
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <FlatList
        data={forms}
        renderItem={renderFormItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#007AFF',
  },
  headerButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
  },
  listContent: {
    padding: 16,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  formDescription: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 12,
  },
  formFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  formMeta: {
    fontSize: 12,
    color: '#999999',
  },
  formVersion: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 32,
  },
  syncButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 200,
    alignItems: 'center',
  },
  syncButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666666',
  },
});
