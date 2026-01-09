import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
} from 'react-native';
import {useLocalSearchParams, useRouter, Stack} from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {useSubmissionsStore} from '@store/submissions/submissionsStore';
import {useFormsStore} from '@store/forms/formsStore';
import {useFilesStore} from '@store/files/filesStore';
import {Form, Question} from '@core/entities/Form';
import {SubmissionEntity, Answer} from '@core/entities/Submission';

export default function FillSubmissionScreen() {
  const {submissionId} = useLocalSearchParams<{submissionId: string}>();
  const router = useRouter();
  const {currentSubmission, loadSubmission, updateAnswer, completeSubmission} =
    useSubmissionsStore();
  const {getFormById} = useFormsStore();
  const {addFile, loadFilesForQuestion, deleteFile, files} = useFilesStore();
  const [form, setForm] = useState<Form | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [answers, setAnswers] = useState<{[questionId: string]: any}>({});

  useEffect(() => {
    loadData();
  }, [submissionId]);

  const loadData = async () => {
    if (!submissionId) return;

    try {
      setIsLoading(true);
      await loadSubmission(submissionId);

      if (currentSubmission) {
        const loadedForm = await getFormById(currentSubmission.formId);
        setForm(loadedForm);

        // Load existing answers
        const existingAnswers: {[questionId: string]: any} = {};
        currentSubmission.answers.forEach(answer => {
          existingAnswers[answer.questionId] = answer.value;
        });
        setAnswers(existingAnswers);

        // Load files for file_upload questions
        if (loadedForm) {
          for (const step of loadedForm.steps) {
            for (const question of step.questions) {
              if (question.type === 'file_upload') {
                await loadFilesForQuestion(currentSubmission.id, question.id);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading submission:', error);
      Alert.alert('Error', 'No se pudo cargar el formulario');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleSaveAnswer = async (questionId: string) => {
    if (!currentSubmission) return;

    try {
      const answer: Answer = {
        questionId,
        value: answers[questionId],
      };

      await updateAnswer(currentSubmission.id, answer);
      console.log('Answer saved:', questionId);
    } catch (error) {
      console.error('Error saving answer:', error);
      Alert.alert('Error', 'No se pudo guardar la respuesta');
    }
  };

  const handleNext = async () => {
    if (!form) return;

    // Save all answers for current step
    const currentStep = form.steps[currentStepIndex];
    for (const question of currentStep.questions) {
      if (answers[question.id] !== undefined) {
        await handleSaveAnswer(question.id);
      }
    }

    if (currentStepIndex < form.steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      // Last step, complete the submission
      if (currentSubmission) {
        try {
          await completeSubmission(currentSubmission.id);
          Alert.alert(
            'Completado',
            'Formulario completado exitosamente',
            [
              {
                text: 'OK',
                onPress: () => router.back(),
              },
            ],
          );
        } catch (error) {
          console.error('Error completing submission:', error);
          Alert.alert('Error', 'No se pudo completar el formulario');
        }
      }
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const requestCameraPermission = async () => {
    const {status} = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permiso Denegado',
        'Se necesita permiso para acceder a la cámara',
      );
      return false;
    }
    return true;
  };

  const requestGalleryPermission = async () => {
    const {status} = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permiso Denegado',
        'Se necesita permiso para acceder a la galería',
      );
      return false;
    }
    return true;
  };

  const handleTakePhoto = async (questionId: string) => {
    if (!currentSubmission) return;

    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const fileName = `photo_${Date.now()}.jpg`;

        await addFile(
          currentSubmission.id,
          questionId,
          asset.uri,
          fileName,
          'image/jpeg',
          asset.fileSize || 0,
        );

        // Reload files for this question
        await loadFilesForQuestion(currentSubmission.id, questionId);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'No se pudo tomar la foto');
    }
  };

  const handlePickImage = async (questionId: string) => {
    if (!currentSubmission) return;

    const hasPermission = await requestGalleryPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const fileName = asset.fileName || `image_${Date.now()}.jpg`;

        await addFile(
          currentSubmission.id,
          questionId,
          asset.uri,
          fileName,
          asset.mimeType || 'image/jpeg',
          asset.fileSize || 0,
        );

        // Reload files for this question
        await loadFilesForQuestion(currentSubmission.id, questionId);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  const handleDeleteFile = async (fileId: string, questionId: string) => {
    Alert.alert(
      'Eliminar Archivo',
      '¿Estás seguro de que deseas eliminar este archivo?',
      [
        {text: 'Cancelar', style: 'cancel'},
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteFile(fileId, questionId);
            } catch (error) {
              console.error('Error deleting file:', error);
              Alert.alert('Error', 'No se pudo eliminar el archivo');
            }
          },
        },
      ],
    );
  };

  const renderQuestion = (question: Question) => {
    const value = answers[question.id] || '';

    switch (question.type) {
      case 'text':
        return (
          <View key={question.id} style={styles.questionContainer}>
            <Text style={styles.questionText}>
              {question.questionText}
              {question.isRequired && <Text style={styles.required}> *</Text>}
            </Text>
            <TextInput
              style={styles.textInput}
              value={value}
              onChangeText={text => handleAnswerChange(question.id, text)}
              placeholder="Ingrese su respuesta"
              multiline
            />
          </View>
        );

      case 'number':
        return (
          <View key={question.id} style={styles.questionContainer}>
            <Text style={styles.questionText}>
              {question.questionText}
              {question.isRequired && <Text style={styles.required}> *</Text>}
            </Text>
            <TextInput
              style={styles.textInput}
              value={value.toString()}
              onChangeText={text => {
                const numValue = parseFloat(text);
                handleAnswerChange(question.id, isNaN(numValue) ? 0 : numValue);
              }}
              placeholder="Ingrese un número"
              keyboardType="numeric"
            />
          </View>
        );

      case 'single_choice':
        return (
          <View key={question.id} style={styles.questionContainer}>
            <Text style={styles.questionText}>
              {question.questionText}
              {question.isRequired && <Text style={styles.required}> *</Text>}
            </Text>
            <View style={styles.optionsContainer}>
              {question.options?.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.optionButton,
                    value === option && styles.optionButtonSelected,
                  ]}
                  onPress={() => handleAnswerChange(question.id, option)}>
                  <Text
                    style={[
                      styles.optionText,
                      value === option && styles.optionTextSelected,
                    ]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 'multiple_choice':
        const selectedOptions = Array.isArray(value) ? value : [];
        return (
          <View key={question.id} style={styles.questionContainer}>
            <Text style={styles.questionText}>
              {question.questionText}
              {question.isRequired && <Text style={styles.required}> *</Text>}
            </Text>
            <View style={styles.optionsContainer}>
              {question.options?.map((option, index) => {
                const isSelected = selectedOptions.includes(option);
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.optionButton,
                      isSelected && styles.optionButtonSelected,
                    ]}
                    onPress={() => {
                      const newSelected = isSelected
                        ? selectedOptions.filter(o => o !== option)
                        : [...selectedOptions, option];
                      handleAnswerChange(question.id, newSelected);
                    }}>
                    <Text
                      style={[
                        styles.optionText,
                        isSelected && styles.optionTextSelected,
                      ]}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );

      case 'file_upload':
        const questionFiles = files[question.id] || [];
        return (
          <View key={question.id} style={styles.questionContainer}>
            <Text style={styles.questionText}>
              {question.questionText}
              {question.isRequired && <Text style={styles.required}> *</Text>}
            </Text>

            {/* Upload Buttons */}
            <View style={styles.uploadButtonsContainer}>
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={() => handleTakePhoto(question.id)}>
                <Text style={styles.uploadButtonText}>📷 Tomar Foto</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={() => handlePickImage(question.id)}>
                <Text style={styles.uploadButtonText}>🖼️ Galería</Text>
              </TouchableOpacity>
            </View>

            {/* Display uploaded files */}
            {questionFiles.length > 0 && (
              <View style={styles.filesContainer}>
                {questionFiles.map(file => (
                  <View key={file.id} style={styles.filePreview}>
                    {file.isImage() && (
                      <Image
                        source={{uri: file.localUri}}
                        style={styles.imagePreview}
                        resizeMode="cover"
                      />
                    )}
                    <View style={styles.fileInfo}>
                      <Text style={styles.fileName} numberOfLines={1}>
                        {file.fileName}
                      </Text>
                      <Text style={styles.fileSize}>
                        {(file.size / 1024).toFixed(1)} KB
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteFile(file.id, question.id)}>
                      <Text style={styles.deleteButtonText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        );

      default:
        return null;
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

  if (!form || !currentSubmission) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Error',
            headerBackTitle: 'Volver',
          }}
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No se pudo cargar el formulario</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  const currentStep = form.steps[currentStepIndex];
  const progress = ((currentStepIndex + 1) / form.steps.length) * 100;

  return (
    <>
      <Stack.Screen
        options={{
          title: form.name,
          headerBackTitle: 'Volver',
        }}
      />
      <View style={styles.container}>
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, {width: `${progress}%`}]} />
          </View>
          <Text style={styles.progressText}>
            Paso {currentStepIndex + 1} de {form.steps.length}
          </Text>
        </View>

        {/* Step Content */}
        <ScrollView style={styles.stepContent}>
          <Text style={styles.stepTitle}>{currentStep.title}</Text>

          {currentStep.questions.map(question => renderQuestion(question))}
        </ScrollView>

        {/* Navigation Buttons */}
        <View style={styles.navigationContainer}>
          {currentStepIndex > 0 && (
            <TouchableOpacity
              style={styles.navButton}
              onPress={handlePrevious}>
              <Text style={styles.navButtonText}>Anterior</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.navButton, styles.navButtonPrimary]}
            onPress={handleNext}>
            <Text style={[styles.navButtonText, styles.navButtonTextPrimary]}>
              {currentStepIndex < form.steps.length - 1
                ? 'Siguiente'
                : 'Completar'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
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
  errorText: {
    fontSize: 16,
    color: '#DC2626',
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
  progressContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  progressText: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
  },
  stepContent: {
    flex: 1,
    padding: 16,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 24,
  },
  questionContainer: {
    marginBottom: 24,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  required: {
    color: '#DC2626',
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1A1A1A',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  optionsContainer: {
    gap: 8,
  },
  optionButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
  },
  optionButtonSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#EBF5FF',
  },
  optionText: {
    fontSize: 16,
    color: '#1A1A1A',
  },
  optionTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  uploadButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  uploadButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  filesContainer: {
    gap: 8,
  },
  filePreview: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    gap: 8,
  },
  imagePreview: {
    width: 60,
    height: 60,
    borderRadius: 4,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  fileSize: {
    fontSize: 12,
    color: '#666666',
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    fontSize: 18,
    color: '#DC2626',
    fontWeight: '600',
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 12,
  },
  navButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  navButtonPrimary: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },
  navButtonTextPrimary: {
    color: '#FFFFFF',
  },
});
