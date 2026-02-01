import React, {useEffect, useState, useRef} from 'react';
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
  Platform,
  Modal,
  FlatList,
  Dimensions,
} from 'react-native';
import {useLocalSearchParams, useRouter, Stack} from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import {Video, ResizeMode, AVPlaybackStatus} from 'expo-av';
import {useSubmissionsStore} from '@store/submissions/submissionsStore';
import {useFormsStore} from '@store/forms/formsStore';
import {useFilesStore} from '@store/files/filesStore';
import {Form, Question} from '@core/entities/Form';
import {SubmissionEntity, Answer} from '@core/entities/Submission';
import {Site, SiteInventory} from '@core/entities/Site';
import {useSitesStore} from '@store/sites/sitesStore';
import {
  TabBar,
  TabType,
  InventoryTab,
  SecurityTab,
  TorqueTab,
  getDefaultSecurityData,
  getDefaultTorqueData,
  TorqueData,
} from '@components/submission-tabs';

export default function FillSubmissionScreen() {
  const {submissionId} = useLocalSearchParams<{submissionId: string}>();
  const router = useRouter();
  const {currentSubmission, loadSubmission, updateAnswer, updateMetadata, completeSubmission} =
    useSubmissionsStore();
  const {getFormById} = useFormsStore();
  const {addFile, loadFilesForQuestion, deleteFile, files} = useFilesStore();
  const {loadSitesByType, getSiteWithInventory} = useSitesStore();
  const [form, setForm] = useState<Form | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1); // -1 = metadata screen
  const [answers, setAnswers] = useState<{[questionId: string]: any}>({});
  const [metadataValues, setMetadataValues] = useState<{[key: string]: any}>({});
  const [showDatePicker, setShowDatePicker] = useState<string | null>(null);
  const [showTimePicker, setShowTimePicker] = useState<string | null>(null);

  // Site selector states
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [siteInventory, setSiteInventory] = useState<SiteInventory | null>(null);
  const [showSiteSelector, setShowSiteSelector] = useState(false);
  const [isLoadingSites, setIsLoadingSites] = useState(false);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);

  // Video player modal states
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [selectedVideoUri, setSelectedVideoUri] = useState<string | null>(null);
  const videoRef = useRef<Video>(null);

  // Tab states
  const [activeTab, setActiveTab] = useState<TabType>('principal');
  const [showTabs, setShowTabs] = useState(false);

  // Tab data states
  const [inventoryData, setInventoryData] = useState<{
    ee: {[id: string]: {estado: string; observaciones: string}};
    ep: {[id: string]: {estado: string; observaciones: string}};
  }>({ee: {}, ep: {}});

  // New elements added locally
  const [newInventoryElements, setNewInventoryElements] = useState<{
    ee: any[];
    ep: any[];
  }>({ee: [], ep: []});

  const [securityData, setSecurityData] = useState(getDefaultSecurityData());

  const [torqueData, setTorqueData] = useState<TorqueData>(getDefaultTorqueData());

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
        console.log('[FillSubmission] Form loaded:', loadedForm?.name);
        console.log('[FillSubmission] Form metadataSchema:', loadedForm?.metadataSchema);
        console.log('[FillSubmission] Form siteType:', loadedForm?.siteType);
        setForm(loadedForm);

        // Load existing answers
        const existingAnswers: {[questionId: string]: any} = {};
        currentSubmission.answers.forEach(answer => {
          existingAnswers[answer.questionId] = answer.value;
        });
        setAnswers(existingAnswers);

        // Load existing metadata
        const existingMetadata = {...currentSubmission.metadata};

        // Extract tab data from metadata if present
        if (existingMetadata.torqueData) {
          setTorqueData(existingMetadata.torqueData);
          delete existingMetadata.torqueData;
        }
        if (existingMetadata.securityData) {
          setSecurityData(existingMetadata.securityData);
          delete existingMetadata.securityData;
        }
        if (existingMetadata.inventoryData) {
          setInventoryData(existingMetadata.inventoryData);
          delete existingMetadata.inventoryData;
        }
        if (existingMetadata.newInventoryElements) {
          setNewInventoryElements(existingMetadata.newInventoryElements);
          delete existingMetadata.newInventoryElements;
        }

        setMetadataValues(existingMetadata);

        // Load files for all questions
        if (loadedForm) {
          for (const step of loadedForm.steps) {
            for (const question of step.questions) {
              await loadFilesForQuestion(currentSubmission.id, question.id);
            }
          }

          // Load sites for the form's siteType
          if (loadedForm.siteType) {
            await loadSitesForType(loadedForm.siteType);
          }

          // If metadata has a codigoSitio, load the selected site and its inventory
          if (existingMetadata.codigoSitio) {
            await loadSiteInventory(existingMetadata.codigoSitio);
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

  const loadSitesForType = async (siteType: string) => {
    try {
      setIsLoadingSites(true);
      console.log('[FillSubmission] Loading sites for type from local DB:', siteType);
      const loadedSites = await loadSitesByType(siteType as any);
      console.log('[FillSubmission] Loaded sites from local DB:', loadedSites?.length);
      setSites(loadedSites || []);
    } catch (error) {
      console.error('[FillSubmission] Error loading sites:', error);
      // Sites are optional, don't show error
    } finally {
      setIsLoadingSites(false);
    }
  };

  const loadSiteInventory = async (codigoSitio: string) => {
    try {
      setIsLoadingInventory(true);
      console.log('[FillSubmission] Loading inventory for site from local DB:', codigoSitio);
      const inventory = await getSiteWithInventory(codigoSitio);
      console.log('[FillSubmission] Loaded inventory from local DB:', {
        ee: inventory?.inventoryEE?.length,
        ep: inventory?.inventoryEP?.length,
      });
      setSiteInventory(inventory);
      setSelectedSite(inventory?.site || null);
    } catch (error) {
      console.error('[FillSubmission] Error loading inventory:', error);
      // Don't show error, inventory might not exist locally yet
    } finally {
      setIsLoadingInventory(false);
    }
  };

  const handleSiteSelect = async (site: Site) => {
    setSelectedSite(site);
    setShowSiteSelector(false);

    // Update metadata with selected site
    setMetadataValues(prev => ({
      ...prev,
      codigoSitio: site.codigoTowernex,
      nombreSitio: site.name,
    }));

    // Load inventory for the selected site
    await loadSiteInventory(site.codigoTowernex);
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

  const validateMetadata = (): boolean => {
    // Validate site selection if form has siteType
    if (form?.siteType && !selectedSite) {
      if (sites.length === 0) {
        Alert.alert(
          'Error',
          'No hay sitios disponibles. Por favor sincronice los datos primero.',
        );
      } else {
        Alert.alert('Error', 'Debe seleccionar un sitio');
      }
      return false;
    }

    if (!form || !form.metadataSchema) return true;

    const schema = form.metadataSchema;
    for (const [key, field] of Object.entries(schema)) {
      if (field.required && !metadataValues[key]) {
        Alert.alert('Error', `El campo "${field.label}" es requerido`);
        return false;
      }
    }
    return true;
  };

  const handleMetadataChange = (key: string, value: any) => {
    setMetadataValues(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const saveMetadata = async () => {
    if (!currentSubmission) return;

    try {
      // Combine all metadata including tab data
      const fullMetadata = {
        ...metadataValues,
        // Include tab data in metadata
        torqueData: torqueData,
        securityData: securityData,
        inventoryData: inventoryData,
        newInventoryElements: newInventoryElements,
      };

      // Update submission with full metadata
      await updateMetadata(currentSubmission.id, fullMetadata);
      console.log('Metadata saved:', {
        ...metadataValues,
        torqueDataKeys: Object.keys(torqueData),
        securityDataKeys: Object.keys(securityData),
        inventoryDataKeys: Object.keys(inventoryData),
      });
    } catch (error) {
      console.error('Error saving metadata:', error);
      Alert.alert('Error', 'No se pudo guardar los metadatos');
      throw error;
    }
  };

  // Tab data handlers
  const handleInventoryEEUpdate = (
    id: string,
    data: {estado: string; observaciones: string},
  ) => {
    setInventoryData(prev => ({
      ...prev,
      ee: {...prev.ee, [id]: data},
    }));
  };

  const handleInventoryEPUpdate = (
    id: string,
    data: {estado: string; observaciones: string},
  ) => {
    setInventoryData(prev => ({
      ...prev,
      ep: {...prev.ep, [id]: data},
    }));
  };

  const handleAddInventoryEE = (element: any) => {
    setNewInventoryElements(prev => ({
      ...prev,
      ee: [...prev.ee, element],
    }));
  };

  const handleAddInventoryEP = (element: any) => {
    setNewInventoryElements(prev => ({
      ...prev,
      ep: [...prev.ep, element],
    }));
  };

  const handleDeleteInventoryEE = (id: string) => {
    setNewInventoryElements(prev => ({
      ...prev,
      ee: prev.ee.filter(e => e.id !== id),
    }));
  };

  const handleDeleteInventoryEP = (id: string) => {
    setNewInventoryElements(prev => ({
      ...prev,
      ep: prev.ep.filter(e => e.id !== id),
    }));
  };

  const handleEditInventoryEE = (element: any) => {
    // Check if it's a new local element or existing one from server
    if (element.isLocal || element.id?.startsWith('local_')) {
      // Update in newInventoryElements
      setNewInventoryElements(prev => ({
        ...prev,
        ee: prev.ee.map(e => e.id === element.id ? element : e),
      }));
    } else {
      // For server elements, we need to track edits separately
      // Store edited elements in newInventoryElements with a flag
      setNewInventoryElements(prev => {
        const existingIndex = prev.ee.findIndex(e => e.id === element.id);
        if (existingIndex >= 0) {
          // Already edited, update it
          const updated = [...prev.ee];
          updated[existingIndex] = {...element, isEdited: true};
          return {...prev, ee: updated};
        } else {
          // First edit, add to tracked changes
          return {...prev, ee: [...prev.ee, {...element, isEdited: true}]};
        }
      });
    }
  };

  const handleEditInventoryEP = (element: any) => {
    // Check if it's a new local element or existing one from server
    if (element.isLocal || element.id?.startsWith('local_')) {
      // Update in newInventoryElements
      setNewInventoryElements(prev => ({
        ...prev,
        ep: prev.ep.map(e => e.id === element.id ? element : e),
      }));
    } else {
      // For server elements, track edits
      setNewInventoryElements(prev => {
        const existingIndex = prev.ep.findIndex(e => e.id === element.id);
        if (existingIndex >= 0) {
          const updated = [...prev.ep];
          updated[existingIndex] = {...element, isEdited: true};
          return {...prev, ep: updated};
        } else {
          return {...prev, ep: [...prev.ep, {...element, isEdited: true}]};
        }
      });
    }
  };

  const handleSecurityUpdate = (data: Partial<typeof securityData>) => {
    setSecurityData(prev => ({...prev, ...data}));
  };

  const handleTorqueUpdate = (newData: TorqueData) => {
    setTorqueData(newData);
  };

  // Auto-save when changing tabs
  const handleTabChange = async (newTab: TabType) => {
    // Save current data before switching tabs
    if (currentSubmission && showTabs) {
      try {
        await saveMetadata();
      } catch (error) {
        console.error('Error auto-saving on tab change:', error);
      }
    }
    setActiveTab(newTab);
  };

  // Check if form has any additional sections
  const hasSections = form?.sections && (
    form.sections.security?.required ||
    form.sections.inventory?.required ||
    form.sections.torque?.required
  );

  // Calculate tab progress
  const getTabProgress = () => {
    const progress: {[key in TabType]?: {completed: boolean; progress: number}} = {
      principal: {
        completed: currentStepIndex >= (form?.steps.length || 0) - 1,
        progress: form?.steps.length
          ? ((currentStepIndex + 1) / form.steps.length) * 100
          : 0,
      },
    };

    if (form?.sections?.inventory?.required && siteInventory) {
      const totalEE = siteInventory.inventoryEE.length;
      const totalEP = siteInventory.inventoryEP.length;
      const completedEE = Object.keys(inventoryData.ee).filter(
        id => inventoryData.ee[id]?.estado,
      ).length;
      const completedEP = Object.keys(inventoryData.ep).filter(
        id => inventoryData.ep[id]?.estado,
      ).length;
      const total = totalEE + totalEP;
      const completed = completedEE + completedEP;

      progress.inventory = {
        completed: total > 0 && completed === total,
        progress: total > 0 ? (completed / total) * 100 : 0,
      };
    }

    if (form?.sections?.torque?.required && siteInventory) {
      const totalEE = siteInventory.inventoryEE.length;
      const completedTorque = Object.keys(torqueData).filter(
        id => torqueData[id]?.torqueAplicado,
      ).length;

      progress.torque = {
        completed: totalEE > 0 && completedTorque === totalEE,
        progress: totalEE > 0 ? (completedTorque / totalEE) * 100 : 0,
      };
    }

    if (form?.sections?.security?.required) {
      const requiredFields = [
        securityData.condicionesAcceso,
        securityData.condicionesIluminacion,
        securityData.firmaConformidad,
      ];
      const completedFields = requiredFields.filter(Boolean).length;

      progress.security = {
        completed: securityData.firmaConformidad,
        progress: (completedFields / requiredFields.length) * 100,
      };
    }

    return progress;
  };

  const handleNext = async () => {
    if (!form) return;

    // If on metadata screen, validate and save metadata
    if (currentStepIndex === -1) {
      if (!validateMetadata()) return;
      await saveMetadata();

      // If form has sections, show tabs
      if (hasSections) {
        setShowTabs(true);
        setActiveTab('principal');
      }
      setCurrentStepIndex(0);
      return;
    }

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
          // Save all tab data before completing
          await saveMetadata();

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
    if (currentStepIndex > -1) {
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
    console.log('[FillSubmission] handleTakePhoto called', { questionId, currentSubmission: currentSubmission?.id, form: form?.id, currentStepIndex });

    if (!currentSubmission || !form || currentStepIndex === -1) {
      console.log('[FillSubmission] Early return - missing data');
      return;
    }

    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      console.log('[FillSubmission] No camera permission');
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      console.log('[FillSubmission] Camera result:', { canceled: result.canceled, hasAssets: (result.assets?.length || 0) > 0 });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const fileName = `photo_${Date.now()}.jpg`;
        const currentStep = form.steps[currentStepIndex];

        console.log('[FillSubmission] Adding file:', {
          submissionId: currentSubmission.id,
          stepId: currentStep.id,
          questionId,
          uri: asset.uri,
          fileName,
          fileSize: asset.fileSize,
        });

        await addFile(
          currentSubmission.id,
          currentStep.id,
          questionId,
          asset.uri,
          fileName,
          'image/jpeg',
          asset.fileSize || 0,
        );

        console.log('[FillSubmission] File added successfully');

        // Reload files for this question
        await loadFilesForQuestion(currentSubmission.id, questionId);
      }
    } catch (error) {
      console.error('[FillSubmission] Error taking photo:', error);
      Alert.alert('Error', 'No se pudo tomar la foto');
    }
  };

  const handlePickImage = async (questionId: string) => {
    if (!currentSubmission || !form || currentStepIndex === -1) return;

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
        const currentStep = form.steps[currentStepIndex];

        await addFile(
          currentSubmission.id,
          currentStep.id,
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

  const handleRecordVideo = async (questionId: string) => {
    if (!currentSubmission || !form || currentStepIndex === -1) return;

    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 0.7,
        videoMaxDuration: 60, // Max 60 seconds
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const fileName = `video_${Date.now()}.mp4`;
        const currentStep = form.steps[currentStepIndex];

        console.log('[FillSubmission] Adding video:', {
          uri: asset.uri,
          duration: asset.duration,
          fileSize: asset.fileSize,
        });

        await addFile(
          currentSubmission.id,
          currentStep.id,
          questionId,
          asset.uri,
          fileName,
          asset.mimeType || 'video/mp4',
          asset.fileSize || 0,
        );

        await loadFilesForQuestion(currentSubmission.id, questionId);
      }
    } catch (error) {
      console.error('Error recording video:', error);
      Alert.alert('Error', 'No se pudo grabar el video');
    }
  };

  const handlePickVideo = async (questionId: string) => {
    if (!currentSubmission || !form || currentStepIndex === -1) return;

    const hasPermission = await requestGalleryPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const fileName = asset.fileName || `video_${Date.now()}.mp4`;
        const currentStep = form.steps[currentStepIndex];

        console.log('[FillSubmission] Adding video from gallery:', {
          uri: asset.uri,
          duration: asset.duration,
          fileSize: asset.fileSize,
        });

        await addFile(
          currentSubmission.id,
          currentStep.id,
          questionId,
          asset.uri,
          fileName,
          asset.mimeType || 'video/mp4',
          asset.fileSize || 0,
        );

        await loadFilesForQuestion(currentSubmission.id, questionId);
      }
    } catch (error) {
      console.error('Error picking video:', error);
      Alert.alert('Error', 'No se pudo seleccionar el video');
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

  const renderMetadataField = (key: string, field: any) => {
    const value = metadataValues[key];

    switch (field.type) {
      case 'text':
        return (
          <View key={key} style={styles.questionContainer}>
            <Text style={styles.questionText}>
              {field.label}
              {field.required && <Text style={styles.required}> *</Text>}
            </Text>
            <TextInput
              style={styles.textInput}
              value={value || ''}
              onChangeText={text => handleMetadataChange(key, text)}
              placeholder={`Ingrese ${field.label.toLowerCase()}`}
            />
          </View>
        );

      case 'date':
        return (
          <View key={key} style={styles.questionContainer}>
            <Text style={styles.questionText}>
              {field.label}
              {field.required && <Text style={styles.required}> *</Text>}
            </Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(key)}>
              <Text style={styles.dateButtonText}>
                {value
                  ? new Date(value).toLocaleDateString('es-ES')
                  : 'Seleccionar fecha'}
              </Text>
            </TouchableOpacity>
            {showDatePicker === key && (
              <DateTimePicker
                value={value ? new Date(value) : new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, selectedDate) => {
                  setShowDatePicker(null);
                  if (selectedDate) {
                    handleMetadataChange(key, selectedDate.toISOString());
                  }
                }}
              />
            )}
          </View>
        );

      case 'time':
        return (
          <View key={key} style={styles.questionContainer}>
            <Text style={styles.questionText}>
              {field.label}
              {field.required && <Text style={styles.required}> *</Text>}
            </Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowTimePicker(key)}>
              <Text style={styles.dateButtonText}>
                {value
                  ? new Date(value).toLocaleTimeString('es-ES', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Seleccionar hora'}
              </Text>
            </TouchableOpacity>
            {showTimePicker === key && (
              <DateTimePicker
                value={value ? new Date(value) : new Date()}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, selectedTime) => {
                  setShowTimePicker(null);
                  if (selectedTime) {
                    handleMetadataChange(key, selectedTime.toISOString());
                  }
                }}
              />
            )}
          </View>
        );

      case 'select':
        return (
          <View key={key} style={styles.questionContainer}>
            <Text style={styles.questionText}>
              {field.label}
              {field.required && <Text style={styles.required}> *</Text>}
            </Text>
            <View style={styles.optionsContainer}>
              {field.options?.map((option: string, index: number) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.optionButton,
                    value === option && styles.optionButtonSelected,
                  ]}
                  onPress={() => handleMetadataChange(key, option)}>
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

      default:
        return null;
    }
  };

  const renderFileAttachments = (questionId: string) => {
    const questionFiles = files[questionId] || [];

    return (
      <>
        {/* Photo Buttons */}
        <View style={styles.uploadButtonsContainer}>
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={() => handleTakePhoto(questionId)}>
            <Text style={styles.uploadButtonText}>📷 Foto</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={() => handlePickImage(questionId)}>
            <Text style={styles.uploadButtonText}>🖼️ Galería</Text>
          </TouchableOpacity>
        </View>

        {/* Video Buttons */}
        <View style={styles.uploadButtonsContainer}>
          <TouchableOpacity
            style={[styles.uploadButton, styles.uploadButtonVideo]}
            onPress={() => handleRecordVideo(questionId)}>
            <Text style={styles.uploadButtonText}>🎬 Grabar Video</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.uploadButton, styles.uploadButtonVideo]}
            onPress={() => handlePickVideo(questionId)}>
            <Text style={styles.uploadButtonText}>📹 Video Galería</Text>
          </TouchableOpacity>
        </View>

        {/* Display uploaded files */}
        {questionFiles.length > 0 && (
          <View style={styles.filesContainer}>
            {questionFiles.map(file => (
              <View key={file.id} style={styles.filePreview}>
                {file.isImage() && file.localPath && (
                  <Image
                    source={{uri: file.localPath}}
                    style={styles.imagePreview}
                    resizeMode="cover"
                  />
                )}
                {file.isVideo() && file.localPath && (
                  <TouchableOpacity
                    style={styles.videoPreviewContainer}
                    onPress={() => {
                      setSelectedVideoUri(file.localPath!);
                      setVideoModalVisible(true);
                    }}>
                    <Video
                      source={{uri: file.localPath}}
                      style={styles.videoThumbnail}
                      resizeMode={ResizeMode.COVER}
                      shouldPlay={false}
                      isMuted={true}
                      positionMillis={0}
                    />
                    <View style={styles.videoPlayOverlay}>
                      <Text style={styles.videoPlayIcon}>▶</Text>
                    </View>
                  </TouchableOpacity>
                )}
                {!file.isImage() && !file.isVideo() && (
                  <View style={styles.fileIconContainer}>
                    <Text style={styles.fileIcon}>📄</Text>
                  </View>
                )}
                <View style={styles.fileInfo}>
                  <Text style={styles.fileName} numberOfLines={1}>
                    {file.fileName}
                  </Text>
                  <Text style={styles.fileSize}>
                    {file.fileSize >= 1024 * 1024
                      ? `${(file.fileSize / (1024 * 1024)).toFixed(1)} MB`
                      : `${(file.fileSize / 1024).toFixed(1)} KB`}
                  </Text>
                  {file.isVideo() && (
                    <Text style={styles.fileType}>Video</Text>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteFile(file.id, questionId)}>
                  <Text style={styles.deleteButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </>
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
            {renderFileAttachments(question.id)}
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
            {renderFileAttachments(question.id)}
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
            {renderFileAttachments(question.id)}
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
            {renderFileAttachments(question.id)}
          </View>
        );

      case 'file_upload':
        return (
          <View key={question.id} style={styles.questionContainer}>
            <Text style={styles.questionText}>
              {question.questionText}
              {question.isRequired && <Text style={styles.required}> *</Text>}
            </Text>
            {renderFileAttachments(question.id)}
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

  // Determine what to show
  const isMetadataScreen = currentStepIndex === -1;
  const hasMetadata = form.metadataSchema && Object.keys(form.metadataSchema).length > 0;

  let progress = 0;
  let stepTitle = '';

  if (isMetadataScreen) {
    progress = 0;
    stepTitle = 'Información del Formulario';
  } else {
    const totalSteps = form.steps.length;
    progress = ((currentStepIndex + 1) / totalSteps) * 100;
    stepTitle = form.steps[currentStepIndex].title;
  }

  // Render tab content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'principal':
        return (
          <ScrollView style={styles.stepContent}>
            <Text style={styles.stepTitle}>{stepTitle}</Text>
            {form.steps[currentStepIndex]?.questions.map(question =>
              renderQuestion(question),
            )}
          </ScrollView>
        );

      case 'inventory':
        return (
          <InventoryTab
            siteInventory={siteInventory}
            inventoryData={inventoryData}
            newElements={newInventoryElements}
            onUpdateEE={handleInventoryEEUpdate}
            onUpdateEP={handleInventoryEPUpdate}
            onAddEE={handleAddInventoryEE}
            onAddEP={handleAddInventoryEP}
            onEditEE={handleEditInventoryEE}
            onEditEP={handleEditInventoryEP}
            onDeleteEE={handleDeleteInventoryEE}
            onDeleteEP={handleDeleteInventoryEP}
          />
        );

      case 'torque':
        return (
          <TorqueTab
            torqueData={torqueData}
            onUpdate={handleTorqueUpdate}
          />
        );

      case 'security':
        return (
          <SecurityTab
            securityData={securityData}
            onUpdate={handleSecurityUpdate}
          />
        );

      default:
        return null;
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: form.name,
          headerBackTitle: 'Volver',
        }}
      />
      <View style={styles.container}>
        {/* Site Header - show when tabs are visible */}
        {showTabs && selectedSite && (
          <View style={styles.siteHeader}>
            <Text style={styles.siteHeaderCode}>{selectedSite.codigoTowernex}</Text>
            <Text style={styles.siteHeaderName}>{selectedSite.name}</Text>
          </View>
        )}

        {/* Tab Bar - show when not in metadata screen and form has sections */}
        {showTabs && hasSections && (
          <TabBar
            sections={form.sections}
            activeTab={activeTab}
            onTabPress={handleTabChange}
            tabProgress={getTabProgress()}
          />
        )}

        {/* Progress Bar - only show on metadata screen or for principal tab */}
        {(!showTabs || activeTab === 'principal') && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, {width: `${progress}%`}]} />
            </View>
            <Text style={styles.progressText}>
              {isMetadataScreen
                ? 'Información Inicial'
                : `Paso ${currentStepIndex + 1} de ${form.steps.length}`}
            </Text>
          </View>
        )}

        {/* Content Area */}
        {showTabs ? (
          // Render tab content when tabs are visible
          renderTabContent()
        ) : (
          // Metadata screen
          <ScrollView style={styles.stepContent}>
            <Text style={styles.stepTitle}>{stepTitle}</Text>

            {/* Site Type - Read-only, assigned from form */}
            {form.siteType && (
              <View style={styles.questionContainer}>
                <Text style={styles.questionText}>Tipo de Sitio</Text>
                <View style={styles.siteTypeContainer}>
                  <View style={[
                    styles.siteTypeBadge,
                    form.siteType === 'GREENFIELD' ? styles.siteTypeBadgeGreenfield : styles.siteTypeBadgeRooftop
                  ]}>
                    <Text style={styles.siteTypeBadgeText}>
                      {form.siteType === 'GREENFIELD' ? 'Greenfield' : 'Rooftop'}
                    </Text>
                  </View>
                  <Text style={styles.siteTypeDescription}>
                    {form.siteType === 'GREENFIELD'
                      ? 'Sitio en terreno abierto con torre'
                      : 'Sitio en azotea de edificio'}
                  </Text>
                </View>
              </View>
            )}

            {/* Site Selector - show if form has siteType */}
            {form.siteType && (
              <View style={styles.questionContainer}>
                <Text style={styles.questionText}>
                  Seleccionar Sitio <Text style={styles.required}>*</Text>
                </Text>
                {isLoadingSites ? (
                  <View style={styles.loadingSitesContainer}>
                    <ActivityIndicator size="small" color="#007AFF" />
                    <Text style={styles.loadingSitesText}>Cargando sitios...</Text>
                  </View>
                ) : sites.length === 0 ? (
                  <View style={styles.noSitesContainer}>
                    <Text style={styles.noSitesText}>
                      No hay sitios disponibles para {form.siteType}.
                    </Text>
                    <Text style={styles.noSitesHint}>
                      Sincronice los datos desde la pantalla de formularios.
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.siteSelector}
                    onPress={() => setShowSiteSelector(true)}>
                    {selectedSite ? (
                      <View>
                        <Text style={styles.siteSelectorText}>
                          {selectedSite.codigoTowernex} - {selectedSite.name}
                        </Text>
                        <Text style={styles.siteSelectorSubtext}>
                          {selectedSite.direccion || 'Sin dirección'}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.siteSelectorPlaceholderContainer}>
                        <Text style={styles.siteSelectorPlaceholder}>
                          Toque para seleccionar un sitio...
                        </Text>
                        <Text style={styles.siteSelectorCount}>
                          {sites.length} sitio{sites.length !== 1 ? 's' : ''} disponible{sites.length !== 1 ? 's' : ''}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )}

                {/* Show inventory summary if site is selected */}
                {selectedSite && siteInventory && (
                  <View style={styles.inventorySummary}>
                    <Text style={styles.inventorySummaryTitle}>
                      Inventario del Sitio
                    </Text>
                    {isLoadingInventory ? (
                      <ActivityIndicator size="small" color="#007AFF" />
                    ) : (
                      <>
                        <Text style={styles.inventorySummaryText}>
                          Elementos en Estructura (EE): {siteInventory.totals.totalEE}
                        </Text>
                        <Text style={styles.inventorySummaryText}>
                          Equipos en Piso (EP): {siteInventory.totals.totalEP}
                        </Text>
                      </>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* Render other metadata fields */}
            {hasMetadata &&
              form.metadataSchema &&
              Object.entries(form.metadataSchema).map(([key, field]) =>
                renderMetadataField(key, field),
              )}
          </ScrollView>
        )}

        {/* Site Selector Modal */}
        <Modal
          visible={showSiteSelector}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowSiteSelector(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Seleccionar Sitio</Text>
                  <Text style={styles.modalSubtitle}>
                    {form?.siteType === 'GREENFIELD' ? 'Greenfield' : 'Rooftop'} - {sites.length} sitio{sites.length !== 1 ? 's' : ''}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowSiteSelector(false)}
                  style={styles.modalCloseButton}>
                  <Text style={styles.modalCloseText}>Cerrar</Text>
                </TouchableOpacity>
              </View>

              <FlatList
                data={sites}
                keyExtractor={item => item.id}
                renderItem={({item}) => (
                  <TouchableOpacity
                    style={[
                      styles.siteItem,
                      selectedSite?.id === item.id && styles.siteItemSelected,
                    ]}
                    onPress={() => handleSiteSelect(item)}>
                    <Text style={styles.siteItemCode}>{item.codigoTowernex}</Text>
                    <Text style={styles.siteItemName}>{item.name}</Text>
                    <Text style={styles.siteItemAddress}>
                      {item.direccion || 'Sin dirección'}
                    </Text>
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={styles.siteItemSeparator} />}
                ListEmptyComponent={
                  <Text style={styles.emptyListText}>No hay sitios disponibles</Text>
                }
              />
            </View>
          </View>
        </Modal>

        {/* Video Player Modal */}
        <Modal
          visible={videoModalVisible}
          animationType="fade"
          transparent={true}
          onRequestClose={() => {
            setVideoModalVisible(false);
            setSelectedVideoUri(null);
          }}>
          <View style={styles.videoModalOverlay}>
            <View style={styles.videoModalContent}>
              <View style={styles.videoModalHeader}>
                <Text style={styles.videoModalTitle}>Reproduciendo Video</Text>
                <TouchableOpacity
                  onPress={() => {
                    setVideoModalVisible(false);
                    setSelectedVideoUri(null);
                  }}
                  style={styles.videoModalCloseButton}>
                  <Text style={styles.videoModalCloseText}>Cerrar</Text>
                </TouchableOpacity>
              </View>
              {selectedVideoUri && (
                <Video
                  ref={videoRef}
                  source={{uri: selectedVideoUri}}
                  style={styles.videoPlayer}
                  resizeMode={ResizeMode.CONTAIN}
                  useNativeControls={true}
                  shouldPlay={true}
                  isLooping={false}
                />
              )}
            </View>
          </View>
        </Modal>

        {/* Navigation Buttons */}
        <View style={styles.navigationContainer}>
          {showTabs && activeTab === 'principal' && currentStepIndex > 0 && (
            <TouchableOpacity
              style={styles.navButton}
              onPress={handlePrevious}>
              <Text style={styles.navButtonText}>Anterior</Text>
            </TouchableOpacity>
          )}
          {!showTabs && currentStepIndex > -1 && (
            <TouchableOpacity
              style={styles.navButton}
              onPress={handlePrevious}>
              <Text style={styles.navButtonText}>Anterior</Text>
            </TouchableOpacity>
          )}
          {/* Show navigation buttons based on context */}
          {showTabs && activeTab === 'principal' && (
            <TouchableOpacity
              style={[styles.navButton, styles.navButtonPrimary]}
              onPress={handleNext}>
              <Text style={[styles.navButtonText, styles.navButtonTextPrimary]}>
                {currentStepIndex < form.steps.length - 1 ? 'Siguiente' : 'Completar Inspección'}
              </Text>
            </TouchableOpacity>
          )}
          {showTabs && activeTab !== 'principal' && (
            <View style={styles.tabInfoContainer}>
              <Text style={styles.tabInfoText}>
                Complete esta sección antes de finalizar
              </Text>
            </View>
          )}
          {!showTabs && (
            <TouchableOpacity
              style={[styles.navButton, styles.navButtonPrimary]}
              onPress={handleNext}>
              <Text style={[styles.navButtonText, styles.navButtonTextPrimary]}>
                Continuar
              </Text>
            </TouchableOpacity>
          )}
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
  siteHeader: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  siteHeaderCode: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  siteHeaderName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    flex: 1,
  },
  tabInfoContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  tabInfoText: {
    fontSize: 14,
    color: '#666666',
    fontStyle: 'italic',
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
  uploadButtonVideo: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
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
  videoPreview: {
    width: 60,
    height: 60,
    borderRadius: 4,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoIcon: {
    fontSize: 24,
  },
  fileIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileIcon: {
    fontSize: 24,
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
  fileType: {
    fontSize: 11,
    color: '#8B5CF6',
    fontWeight: '500',
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
  // Date/Time Button Styles
  dateButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 14,
    alignItems: 'flex-start',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#1A1A1A',
  },
  // Site Type Styles
  siteTypeContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 14,
  },
  siteTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 8,
  },
  siteTypeBadgeGreenfield: {
    backgroundColor: '#D1FAE5',
  },
  siteTypeBadgeRooftop: {
    backgroundColor: '#DBEAFE',
  },
  siteTypeBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  siteTypeDescription: {
    fontSize: 14,
    color: '#666666',
  },
  // Site Selector Styles
  loadingSitesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 14,
    gap: 8,
  },
  loadingSitesText: {
    fontSize: 14,
    color: '#666666',
  },
  noSitesContainer: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 8,
    padding: 14,
  },
  noSitesText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#92400E',
    marginBottom: 4,
  },
  noSitesHint: {
    fontSize: 13,
    color: '#A16207',
  },
  siteSelector: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 14,
    minHeight: 60,
    justifyContent: 'center',
  },
  siteSelectorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  siteSelectorSubtext: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  siteSelectorPlaceholderContainer: {
    gap: 4,
  },
  siteSelectorPlaceholder: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  siteSelectorCount: {
    fontSize: 13,
    color: '#6B7280',
  },
  inventorySummary: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  inventorySummaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0369A1',
    marginBottom: 8,
  },
  inventorySummaryText: {
    fontSize: 14,
    color: '#0369A1',
    marginBottom: 4,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  modalCloseButton: {
    padding: 8,
  },
  modalCloseText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  siteItem: {
    padding: 16,
  },
  siteItemSelected: {
    backgroundColor: '#EBF5FF',
  },
  siteItemCode: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 4,
  },
  siteItemName: {
    fontSize: 15,
    color: '#1A1A1A',
    marginBottom: 2,
  },
  siteItemAddress: {
    fontSize: 13,
    color: '#666666',
  },
  siteItemSeparator: {
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  emptyListText: {
    textAlign: 'center',
    padding: 24,
    fontSize: 16,
    color: '#666666',
  },
  // Video Preview and Player Styles
  videoPreviewContainer: {
    width: 60,
    height: 60,
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  videoThumbnail: {
    width: 60,
    height: 60,
  },
  videoPlayOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoPlayIcon: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  videoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoModalContent: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: '#000000',
    borderRadius: 12,
    overflow: 'hidden',
  },
  videoModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1A1A1A',
  },
  videoModalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  videoModalCloseButton: {
    padding: 8,
  },
  videoModalCloseText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  videoPlayer: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').width * (9 / 16), // 16:9 aspect ratio
  },
});
