import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import {useLocalSearchParams, useRouter, Stack} from 'expo-router';
import {useFormsStore} from '@store/forms/formsStore';
import {useSubmissionsStore} from '@store/submissions/submissionsStore';
import {useAuthStore} from '@store/auth/authStore';
import {Form} from '@core/entities/Form';

export default function FormDetailScreen() {
  const {formId} = useLocalSearchParams<{formId: string}>();
  const router = useRouter();
  const {getFormById} = useFormsStore();
  const {createSubmission} = useSubmissionsStore();
  const {user} = useAuthStore();
  const [form, setForm] = useState<Form | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingSubmission, setIsCreatingSubmission] = useState(false);

  useEffect(() => {
    loadForm();
  }, [formId]);

  const loadForm = async () => {
    if (!formId) return;

    try {
      setIsLoading(true);
      const loadedForm = await getFormById(formId);
      setForm(loadedForm);
    } catch (error) {
      console.error('Error loading form:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Cargando...',
            headerBackTitle: 'Volver',
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Cargando formulario...</Text>
        </View>
      </>
    );
  }

  if (!form) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Formulario no encontrado',
            headerBackTitle: 'Volver',
          }}
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Formulario no encontrado</Text>
          <Text style={styles.errorText}>
            El formulario solicitado no existe
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: form.name,
          headerBackTitle: 'Volver',
        }}
      />
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{form.name}</Text>
          {form.description && (
            <Text style={styles.description}>{form.description}</Text>
          )}
          <View style={styles.meta}>
            <Text style={styles.metaText}>
              {form.steps.length} paso{form.steps.length !== 1 ? 's' : ''}
            </Text>
            <Text style={styles.version}>Versión {form.version}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pasos del Formulario</Text>
          {form.steps.map((step, index) => (
            <View key={step.id} style={styles.stepCard}>
              <View style={styles.stepHeader}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{step.stepNumber}</Text>
                </View>
                <Text style={styles.stepTitle}>{step.title}</Text>
              </View>

              <View style={styles.questionsContainer}>
                <Text style={styles.questionsCount}>
                  {step.questions.length} pregunta
                  {step.questions.length !== 1 ? 's' : ''}
                </Text>

                {step.questions.map((question, qIndex) => (
                  <View key={question.id} style={styles.questionItem}>
                    <View style={styles.questionHeader}>
                      <Text style={styles.questionNumber}>{qIndex + 1}.</Text>
                      <Text style={styles.questionText}>
                        {question.questionText}
                      </Text>
                    </View>
                    <View style={styles.questionMeta}>
                      <Text style={styles.questionType}>{question.type}</Text>
                      {question.isRequired && (
                        <Text style={styles.requiredBadge}>Requerida</Text>
                      )}
                    </View>
                    {question.options && question.options.length > 0 && (
                      <View style={styles.optionsContainer}>
                        {question.options.map((option, oIndex) => (
                          <Text key={oIndex} style={styles.optionText}>
                            • {option}
                          </Text>
                        ))}
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.startButton}
            disabled={isCreatingSubmission}
            onPress={async () => {
              if (!user) {
                console.error('No user logged in');
                return;
              }

              try {
                setIsCreatingSubmission(true);
                const submission = await createSubmission(form.id, user.id);
                console.log('Submission created:', submission.id);

                // Navigate to fill submission screen
                router.push({
                  pathname: '/fill-submission',
                  params: {submissionId: submission.id},
                });
              } catch (error) {
                console.error('Error creating submission:', error);
              } finally {
                setIsCreatingSubmission(false);
              }
            }}>
            {isCreatingSubmission ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.startButtonText}>Comenzar Formulario</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 16,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 14,
    color: '#999999',
  },
  version: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  stepCard: {
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
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  stepTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  questionsContainer: {
    marginTop: 8,
  },
  questionsCount: {
    fontSize: 12,
    color: '#999999',
    marginBottom: 12,
  },
  questionItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  questionHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  questionNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginRight: 8,
  },
  questionText: {
    flex: 1,
    fontSize: 14,
    color: '#1A1A1A',
  },
  questionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  questionType: {
    fontSize: 12,
    color: '#666666',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  requiredBadge: {
    fontSize: 12,
    color: '#DC2626',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  optionsContainer: {
    marginTop: 8,
    paddingLeft: 16,
  },
  optionText: {
    fontSize: 13,
    color: '#666666',
    marginBottom: 4,
  },
  footer: {
    padding: 16,
    paddingBottom: 32,
  },
  startButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
