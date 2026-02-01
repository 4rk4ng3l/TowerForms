import React, {useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {SiteInventory, InventoryEE, InventoryEP} from '@core/entities/Site';

// Types for new elements
export interface NewInventoryEE {
  tipoEE: string;
  aristaCaraMastil: string;
  operadorPropietario: string;
  alturaAntena: string;
  diametro: string;
  largo: string;
  ancho: string;
  fondo: string;
  azimut: string;
  epaM2: string;
  usoCompartido: boolean;
  sistemaMovil: string;
  observaciones: string;
}

export interface NewInventoryEP {
  tipoPiso: string;
  ubicacionEquipo: string;
  estadoPiso: string;
  modelo: string;
  fabricante: string;
  usoEP: string;
  operadorPropietario: string;
  ancho: string;       // decimal
  profundidad: string; // decimal
  altura: string;      // decimal
  superficieOcupada: string; // decimal
  situacion: string;   // En servicio, Fuera de servicio
  observaciones: string;
}

interface InventoryTabProps {
  siteInventory: SiteInventory | null;
  inventoryData: {
    ee: {[id: string]: {estado: string; observaciones: string}};
    ep: {[id: string]: {estado: string; observaciones: string}};
  };
  newElements: {
    ee: InventoryEE[];
    ep: InventoryEP[];
  };
  onUpdateEE: (id: string, data: {estado: string; observaciones: string}) => void;
  onUpdateEP: (id: string, data: {estado: string; observaciones: string}) => void;
  onAddEE: (element: InventoryEE) => void;
  onAddEP: (element: InventoryEP) => void;
  onEditEE?: (element: InventoryEE) => void;
  onEditEP?: (element: InventoryEP) => void;
  onDeleteEE?: (id: string) => void;
  onDeleteEP?: (id: string) => void;
}

type SubTab = 'ee' | 'ep';

const ESTADO_OPTIONS = ['Bueno', 'Regular', 'Malo', 'N/A'];

const TIPO_EE_OPTIONS = ['ANTENA', 'RRU', 'MW', 'OTRO'];
const TIPO_PISO_OPTIONS = ['GREENFIELD', 'SHELTER', 'ROOFTOP', 'INDOOR', 'OUTDOOR'];

const generateId = () => `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const getDefaultNewEE = (): NewInventoryEE => ({
  tipoEE: '',
  aristaCaraMastil: '',
  operadorPropietario: '',
  alturaAntena: '',
  diametro: '',
  largo: '',
  ancho: '',
  fondo: '',
  azimut: '',
  epaM2: '',
  usoCompartido: false,
  sistemaMovil: '',
  observaciones: '',
});

const getDefaultNewEP = (): NewInventoryEP => ({
  tipoPiso: '',
  ubicacionEquipo: '',
  estadoPiso: '',
  modelo: '',
  fabricante: '',
  usoEP: '',
  operadorPropietario: '',
  ancho: '',
  profundidad: '',
  altura: '',
  superficieOcupada: '',
  situacion: 'En servicio',
  observaciones: '',
});

export function InventoryTab({
  siteInventory,
  inventoryData,
  newElements,
  onUpdateEE,
  onUpdateEP,
  onAddEE,
  onAddEP,
  onEditEE,
  onEditEP,
  onDeleteEE,
  onDeleteEP,
}: InventoryTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('ee');
  const [showAddEEModal, setShowAddEEModal] = useState(false);
  const [showAddEPModal, setShowAddEPModal] = useState(false);
  const [showEditEEModal, setShowEditEEModal] = useState(false);
  const [showEditEPModal, setShowEditEPModal] = useState(false);
  const [newEE, setNewEE] = useState<NewInventoryEE>(getDefaultNewEE());
  const [newEP, setNewEP] = useState<NewInventoryEP>(getDefaultNewEP());
  const [editingEE, setEditingEE] = useState<InventoryEE | null>(null);
  const [editingEP, setEditingEP] = useState<InventoryEP | null>(null);
  const [editEEData, setEditEEData] = useState<NewInventoryEE>(getDefaultNewEE());
  const [editEPData, setEditEPData] = useState<NewInventoryEP>(getDefaultNewEP());

  // Combine existing and new elements, with edits taking precedence
  const allEE = (() => {
    const serverEE = siteInventory?.inventoryEE || [];
    const editedIds = new Set(newElements.ee.filter(e => e.isEdited).map(e => e.id));
    const newLocalEE = newElements.ee.filter(e => e.isLocal || e.id?.startsWith('local_'));
    const editedEE = newElements.ee.filter(e => e.isEdited);

    // Server elements that haven't been edited + edited versions + new local elements
    return [
      ...serverEE.filter(e => !editedIds.has(e.id)),
      ...editedEE,
      ...newLocalEE,
    ];
  })();

  const allEP = (() => {
    const serverEP = siteInventory?.inventoryEP || [];
    const editedIds = new Set(newElements.ep.filter(e => e.isEdited).map(e => e.id));
    const newLocalEP = newElements.ep.filter(e => e.isLocal || e.id?.startsWith('local_'));
    const editedEP = newElements.ep.filter(e => e.isEdited);

    return [
      ...serverEP.filter(e => !editedIds.has(e.id)),
      ...editedEP,
      ...newLocalEP,
    ];
  })();

  const handleAddEE = () => {
    if (!newEE.tipoEE) {
      Alert.alert('Error', 'El tipo de elemento es requerido');
      return;
    }

    const nextIdEE = allEE.length > 0
      ? Math.max(...allEE.map(e => e.idEE)) + 1
      : 1;

    const element: InventoryEE = {
      id: generateId(),
      idEE: nextIdEE,
      tipoSoporte: null,
      tipoEE: newEE.tipoEE,
      situacion: 'En servicio',
      modelo: null,
      fabricante: null,
      aristaCaraMastil: newEE.aristaCaraMastil || null,
      operadorPropietario: newEE.operadorPropietario || null,
      alturaAntena: newEE.alturaAntena ? parseFloat(newEE.alturaAntena) : null,
      diametro: newEE.diametro ? parseFloat(newEE.diametro) : null,
      largo: newEE.largo ? parseFloat(newEE.largo) : null,
      ancho: newEE.ancho ? parseFloat(newEE.ancho) : null,
      fondo: newEE.fondo ? parseFloat(newEE.fondo) : null,
      azimut: newEE.azimut ? parseFloat(newEE.azimut) : null,
      epaM2: newEE.epaM2 ? parseFloat(newEE.epaM2) : null,
      usoCompartido: newEE.usoCompartido,
      sistemaMovil: newEE.sistemaMovil || null,
      observaciones: newEE.observaciones || null,
      isLocal: true,
    };

    onAddEE(element);
    setNewEE(getDefaultNewEE());
    setShowAddEEModal(false);
    Alert.alert('Éxito', 'Elemento agregado correctamente');
  };

  const handleAddEP = () => {
    if (!newEP.tipoPiso) {
      Alert.alert('Error', 'El tipo de piso es requerido');
      return;
    }

    const nextIdEP = allEP.length > 0
      ? Math.max(...allEP.map(e => e.idEP)) + 1
      : 1;

    const element: InventoryEP = {
      id: generateId(),
      idEP: nextIdEP,
      tipoPiso: newEP.tipoPiso || null,
      ubicacionEquipo: newEP.ubicacionEquipo || null,
      situacion: newEP.situacion || 'En servicio',
      estadoPiso: newEP.estadoPiso || null,
      modelo: newEP.modelo || null,
      fabricante: newEP.fabricante || null,
      usoEP: newEP.usoEP || null,
      operadorPropietario: newEP.operadorPropietario || null,
      dimensiones: {
        ancho: newEP.ancho ? parseFloat(newEP.ancho) : null,
        profundidad: newEP.profundidad ? parseFloat(newEP.profundidad) : null,
        altura: newEP.altura ? parseFloat(newEP.altura) : null,
      },
      superficieOcupada: newEP.superficieOcupada ? parseFloat(newEP.superficieOcupada) : null,
      observaciones: newEP.observaciones || null,
      isLocal: true,
    };

    onAddEP(element);
    setNewEP(getDefaultNewEP());
    setShowAddEPModal(false);
    Alert.alert('Éxito', 'Equipo agregado correctamente');
  };

  const handleDeleteEE = (id: string) => {
    Alert.alert(
      'Eliminar Elemento',
      '¿Está seguro de eliminar este elemento?',
      [
        {text: 'Cancelar', style: 'cancel'},
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => onDeleteEE?.(id),
        },
      ],
    );
  };

  const handleDeleteEP = (id: string) => {
    Alert.alert(
      'Eliminar Equipo',
      '¿Está seguro de eliminar este equipo?',
      [
        {text: 'Cancelar', style: 'cancel'},
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => onDeleteEP?.(id),
        },
      ],
    );
  };

  const handleOpenEditEE = (item: InventoryEE) => {
    setEditingEE(item);
    setEditEEData({
      tipoEE: item.tipoEE || '',
      aristaCaraMastil: item.aristaCaraMastil || '',
      operadorPropietario: item.operadorPropietario || '',
      alturaAntena: item.alturaAntena?.toString() || '',
      diametro: item.diametro?.toString() || '',
      largo: item.largo?.toString() || '',
      ancho: item.ancho?.toString() || '',
      fondo: item.fondo?.toString() || '',
      azimut: item.azimut?.toString() || '',
      epaM2: item.epaM2?.toString() || '',
      usoCompartido: item.usoCompartido || false,
      sistemaMovil: item.sistemaMovil || '',
      observaciones: item.observaciones || '',
    });
    setShowEditEEModal(true);
  };

  const handleSaveEditEE = () => {
    if (!editingEE) return;

    const updatedElement: InventoryEE = {
      ...editingEE,
      tipoEE: editEEData.tipoEE,
      aristaCaraMastil: editEEData.aristaCaraMastil || null,
      operadorPropietario: editEEData.operadorPropietario || null,
      alturaAntena: editEEData.alturaAntena ? parseFloat(editEEData.alturaAntena) : null,
      diametro: editEEData.diametro ? parseFloat(editEEData.diametro) : null,
      largo: editEEData.largo ? parseFloat(editEEData.largo) : null,
      ancho: editEEData.ancho ? parseFloat(editEEData.ancho) : null,
      fondo: editEEData.fondo ? parseFloat(editEEData.fondo) : null,
      azimut: editEEData.azimut ? parseFloat(editEEData.azimut) : null,
      epaM2: editEEData.epaM2 ? parseFloat(editEEData.epaM2) : null,
      usoCompartido: editEEData.usoCompartido,
      sistemaMovil: editEEData.sistemaMovil || null,
      observaciones: editEEData.observaciones || null,
    };

    onEditEE?.(updatedElement);
    setShowEditEEModal(false);
    setEditingEE(null);
    Alert.alert('Éxito', 'Elemento actualizado correctamente');
  };

  const handleOpenEditEP = (item: InventoryEP) => {
    setEditingEP(item);
    setEditEPData({
      tipoPiso: item.tipoPiso || '',
      ubicacionEquipo: item.ubicacionEquipo || '',
      estadoPiso: item.estadoPiso || '',
      modelo: item.modelo || '',
      fabricante: item.fabricante || '',
      usoEP: item.usoEP || '',
      operadorPropietario: item.operadorPropietario || '',
      ancho: item.dimensiones?.ancho?.toString() || '',
      profundidad: item.dimensiones?.profundidad?.toString() || '',
      altura: item.dimensiones?.altura?.toString() || '',
      superficieOcupada: item.superficieOcupada?.toString() || '',
      situacion: item.situacion || 'En servicio',
      observaciones: item.observaciones || '',
    });
    setShowEditEPModal(true);
  };

  const handleSaveEditEP = () => {
    if (!editingEP) return;

    const updatedElement: InventoryEP = {
      ...editingEP,
      tipoPiso: editEPData.tipoPiso || null,
      ubicacionEquipo: editEPData.ubicacionEquipo || null,
      situacion: editEPData.situacion || 'En servicio',
      estadoPiso: editEPData.estadoPiso || null,
      modelo: editEPData.modelo || null,
      fabricante: editEPData.fabricante || null,
      usoEP: editEPData.usoEP || null,
      operadorPropietario: editEPData.operadorPropietario || null,
      dimensiones: {
        ancho: editEPData.ancho ? parseFloat(editEPData.ancho) : null,
        profundidad: editEPData.profundidad ? parseFloat(editEPData.profundidad) : null,
        altura: editEPData.altura ? parseFloat(editEPData.altura) : null,
      },
      superficieOcupada: editEPData.superficieOcupada ? parseFloat(editEPData.superficieOcupada) : null,
      observaciones: editEPData.observaciones || null,
    };

    onEditEP?.(updatedElement);
    setShowEditEPModal(false);
    setEditingEP(null);
    Alert.alert('Éxito', 'Equipo actualizado correctamente');
  };

  const renderEEItem = (item: InventoryEE) => {
    const data = inventoryData.ee[item.id] || {estado: '', observaciones: ''};

    return (
      <View key={item.id} style={[styles.itemCard, item.isLocal && styles.itemCardLocal, item.isEdited && !item.isLocal && styles.itemCardEdited]}>
        <View style={styles.itemHeader}>
          <View style={styles.itemHeaderLeft}>
            <Text style={styles.itemId}>EE-{item.idEE}</Text>
            {item.isLocal && (
              <View style={styles.localBadge}>
                <Text style={styles.localBadgeText}>Nuevo</Text>
              </View>
            )}
            {item.isEdited && !item.isLocal && (
              <View style={styles.editedBadge}>
                <Text style={styles.editedBadgeText}>Editado</Text>
              </View>
            )}
          </View>
          <View style={styles.itemHeaderRight}>
            <Text style={styles.itemType}>{item.tipoEE}</Text>
            {onEditEE && (
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => handleOpenEditEE(item)}>
                <Text style={styles.editButtonText}>✎</Text>
              </TouchableOpacity>
            )}
            {item.isLocal && onDeleteEE && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteEE(item.id)}>
                <Text style={styles.deleteButtonText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.itemDetails}>
          {item.aristaCaraMastil && (
            <Text style={styles.itemDetail}>Arista: {item.aristaCaraMastil}</Text>
          )}
          {item.operadorPropietario && (
            <Text style={styles.itemDetail}>Operador: {item.operadorPropietario}</Text>
          )}
          {item.alturaAntena != null && (
            <Text style={styles.itemDetail}>Altura: {item.alturaAntena.toFixed(4)}m</Text>
          )}
          {item.diametro != null && (
            <Text style={styles.itemDetail}>Diámetro: {item.diametro.toFixed(2)}m</Text>
          )}
          {item.largo != null && (
            <Text style={styles.itemDetail}>Largo: {item.largo.toFixed(3)}m</Text>
          )}
          {item.ancho != null && (
            <Text style={styles.itemDetail}>Ancho: {item.ancho.toFixed(3)}m</Text>
          )}
          {item.fondo != null && (
            <Text style={styles.itemDetail}>Fondo: {item.fondo.toFixed(3)}m</Text>
          )}
          {item.azimut != null && (
            <Text style={styles.itemDetail}>Azimut: {item.azimut.toFixed(3)}°</Text>
          )}
          {item.epaM2 != null && (
            <Text style={styles.itemDetail}>EPA: {item.epaM2.toFixed(10)} m²</Text>
          )}
          <Text style={styles.itemDetail}>
            Uso Compartido: {item.usoCompartido ? 'Sí' : 'No'}
          </Text>
          {item.sistemaMovil && (
            <Text style={styles.itemDetail}>Sistema Móvil: {item.sistemaMovil}</Text>
          )}
          {item.observaciones && (
            <Text style={styles.itemDetail}>Obs: {item.observaciones}</Text>
          )}
        </View>

        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Estado Verificado:</Text>
          <View style={styles.estadoButtons}>
            {ESTADO_OPTIONS.map(estado => (
              <TouchableOpacity
                key={estado}
                style={[
                  styles.estadoButton,
                  data.estado === estado && styles.estadoButtonActive,
                ]}
                onPress={() => onUpdateEE(item.id, {...data, estado})}>
                <Text
                  style={[
                    styles.estadoButtonText,
                    data.estado === estado && styles.estadoButtonTextActive,
                  ]}>
                  {estado}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.inputLabel}>Observaciones Verificación:</Text>
          <TextInput
            style={styles.observacionesInput}
            placeholder="Ingrese observaciones..."
            value={data.observaciones}
            onChangeText={text =>
              onUpdateEE(item.id, {...data, observaciones: text})
            }
            multiline
            numberOfLines={2}
          />
        </View>
      </View>
    );
  };

  const renderEPItem = (item: InventoryEP) => {
    const data = inventoryData.ep[item.id] || {estado: '', observaciones: ''};

    return (
      <View key={item.id} style={[styles.itemCard, item.isLocal && styles.itemCardLocal, item.isEdited && !item.isLocal && styles.itemCardEdited]}>
        <View style={styles.itemHeader}>
          <View style={styles.itemHeaderLeft}>
            <Text style={styles.itemId}>EP-{item.idEP}</Text>
            {item.isLocal && (
              <View style={styles.localBadge}>
                <Text style={styles.localBadgeText}>Nuevo</Text>
              </View>
            )}
            {item.isEdited && !item.isLocal && (
              <View style={styles.editedBadge}>
                <Text style={styles.editedBadgeText}>Editado</Text>
              </View>
            )}
          </View>
          <View style={styles.itemHeaderRight}>
            <Text style={styles.itemType}>{item.tipoPiso || 'Sin tipo'}</Text>
            {onEditEP && (
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => handleOpenEditEP(item)}>
                <Text style={styles.editButtonText}>✎</Text>
              </TouchableOpacity>
            )}
            {item.isLocal && onDeleteEP && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteEP(item.id)}>
                <Text style={styles.deleteButtonText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.itemDetails}>
          <Text style={styles.itemDetail}>
            Situación: {item.situacion}
          </Text>
          {item.estadoPiso && (
            <Text style={styles.itemDetail}>Estado Piso: {item.estadoPiso}</Text>
          )}
          {item.ubicacionEquipo && (
            <Text style={styles.itemDetail}>
              Ubicación: {item.ubicacionEquipo}
            </Text>
          )}
          {item.modelo && (
            <Text style={styles.itemDetail}>Modelo: {item.modelo}</Text>
          )}
          {item.fabricante && (
            <Text style={styles.itemDetail}>Fabricante: {item.fabricante}</Text>
          )}
          {item.usoEP && (
            <Text style={styles.itemDetail}>Uso EP: {item.usoEP}</Text>
          )}
          {item.operadorPropietario && (
            <Text style={styles.itemDetail}>Operador: {item.operadorPropietario}</Text>
          )}
          {item.dimensiones?.ancho != null && (
            <Text style={styles.itemDetail}>Ancho: {item.dimensiones.ancho.toFixed(2)} m</Text>
          )}
          {item.dimensiones?.profundidad != null && (
            <Text style={styles.itemDetail}>Profundidad: {item.dimensiones.profundidad.toFixed(2)} m</Text>
          )}
          {item.dimensiones?.altura != null && (
            <Text style={styles.itemDetail}>Altura: {item.dimensiones.altura.toFixed(2)} m</Text>
          )}
          {item.superficieOcupada != null && (
            <Text style={styles.itemDetail}>Superficie: {item.superficieOcupada.toFixed(2)} m²</Text>
          )}
          {item.observaciones && (
            <Text style={styles.itemDetail}>Obs: {item.observaciones}</Text>
          )}
        </View>

        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Estado Verificado:</Text>
          <View style={styles.estadoButtons}>
            {ESTADO_OPTIONS.map(estado => (
              <TouchableOpacity
                key={estado}
                style={[
                  styles.estadoButton,
                  data.estado === estado && styles.estadoButtonActive,
                ]}
                onPress={() => onUpdateEP(item.id, {...data, estado})}>
                <Text
                  style={[
                    styles.estadoButtonText,
                    data.estado === estado && styles.estadoButtonTextActive,
                  ]}>
                  {estado}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.inputLabel}>Observaciones Verificación:</Text>
          <TextInput
            style={styles.observacionesInput}
            placeholder="Ingrese observaciones..."
            value={data.observaciones}
            onChangeText={text =>
              onUpdateEP(item.id, {...data, observaciones: text})
            }
            multiline
            numberOfLines={2}
          />
        </View>
      </View>
    );
  };

  // Add EE Modal
  const renderAddEEModal = () => (
    <Modal
      visible={showAddEEModal}
      animationType="slide"
      transparent={false}
      onRequestClose={() => setShowAddEEModal(false)}>
      <KeyboardAvoidingView
        style={styles.modalContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Agregar Elemento en Estructura</Text>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowAddEEModal(false)}>
            <Text style={styles.modalCloseText}>Cancelar</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {/* Tipo EE */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Tipo de Elemento *</Text>
            <View style={styles.optionButtons}>
              {TIPO_EE_OPTIONS.map(tipo => (
                <TouchableOpacity
                  key={tipo}
                  style={[
                    styles.optionButton,
                    newEE.tipoEE === tipo && styles.optionButtonActive,
                  ]}
                  onPress={() => setNewEE({...newEE, tipoEE: tipo})}>
                  <Text
                    style={[
                      styles.optionButtonText,
                      newEE.tipoEE === tipo && styles.optionButtonTextActive,
                    ]}>
                    {tipo}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Arista */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Arista/Cara Mástil</Text>
            <TextInput
              style={styles.formInput}
              placeholder="Ej: Arista1, Cara2"
              value={newEE.aristaCaraMastil}
              onChangeText={text => setNewEE({...newEE, aristaCaraMastil: text})}
            />
          </View>

          {/* Operador */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Operador/Propietario</Text>
            <TextInput
              style={styles.formInput}
              placeholder="Ej: TIGO, CLARO"
              value={newEE.operadorPropietario}
              onChangeText={text => setNewEE({...newEE, operadorPropietario: text})}
            />
          </View>

          {/* Altura */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Altura Mitad Antena (m) - 4 decimales</Text>
            <TextInput
              style={styles.formInput}
              placeholder="Ej: 25.5000"
              value={newEE.alturaAntena}
              onChangeText={text => setNewEE({...newEE, alturaAntena: text})}
              keyboardType="decimal-pad"
            />
          </View>

          {/* Diámetro */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Diámetro (m) - 2 decimales</Text>
            <TextInput
              style={styles.formInput}
              placeholder="Ej: 1.20"
              value={newEE.diametro}
              onChangeText={text => setNewEE({...newEE, diametro: text})}
              keyboardType="decimal-pad"
            />
          </View>

          {/* Dimensiones Row */}
          <View style={styles.formRow}>
            <View style={[styles.formGroup, {flex: 1}]}>
              <Text style={styles.formLabel}>Largo (m)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="0.000"
                value={newEE.largo}
                onChangeText={text => setNewEE({...newEE, largo: text})}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={[styles.formGroup, {flex: 1, marginLeft: 8}]}>
              <Text style={styles.formLabel}>Ancho (m)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="0.000"
                value={newEE.ancho}
                onChangeText={text => setNewEE({...newEE, ancho: text})}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={[styles.formGroup, {flex: 1, marginLeft: 8}]}>
              <Text style={styles.formLabel}>Fondo (m)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="0.000"
                value={newEE.fondo}
                onChangeText={text => setNewEE({...newEE, fondo: text})}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* Azimut */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Azimut (°) - 3 decimales</Text>
            <TextInput
              style={styles.formInput}
              placeholder="Ej: 180.000"
              value={newEE.azimut}
              onChangeText={text => setNewEE({...newEE, azimut: text})}
              keyboardType="decimal-pad"
            />
          </View>

          {/* EPA */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>EPA EE M² - 10 decimales</Text>
            <TextInput
              style={styles.formInput}
              placeholder="Ej: 0.1234567890"
              value={newEE.epaM2}
              onChangeText={text => setNewEE({...newEE, epaM2: text})}
              keyboardType="decimal-pad"
            />
          </View>

          {/* Uso Compartido */}
          <View style={styles.formGroupRow}>
            <Text style={styles.formLabel}>Uso Compartido</Text>
            <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>No</Text>
              <Switch
                value={newEE.usoCompartido}
                onValueChange={value => setNewEE({...newEE, usoCompartido: value})}
                trackColor={{false: '#D1D5DB', true: '#007AFF'}}
              />
              <Text style={styles.switchLabel}>Sí</Text>
            </View>
          </View>

          {/* Sistema Móvil */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Sistema Móvil</Text>
            <TextInput
              style={styles.formInput}
              placeholder="Ej: 4G, 5G, LTE"
              value={newEE.sistemaMovil}
              onChangeText={text => setNewEE({...newEE, sistemaMovil: text})}
            />
          </View>

          {/* Observaciones */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Observaciones</Text>
            <TextInput
              style={[styles.formInput, styles.formInputMultiline]}
              placeholder="Observaciones adicionales..."
              value={newEE.observaciones}
              onChangeText={text => setNewEE({...newEE, observaciones: text})}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity style={styles.submitButton} onPress={handleAddEE}>
            <Text style={styles.submitButtonText}>Agregar Elemento</Text>
          </TouchableOpacity>

          <View style={{height: 40}} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );

  // Add EP Modal
  const renderAddEPModal = () => (
    <Modal
      visible={showAddEPModal}
      animationType="slide"
      transparent={false}
      onRequestClose={() => setShowAddEPModal(false)}>
      <KeyboardAvoidingView
        style={styles.modalContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Agregar Equipo en Piso</Text>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowAddEPModal(false)}>
            <Text style={styles.modalCloseText}>Cancelar</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {/* Situación EP */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Situación EP *</Text>
            <View style={styles.optionButtons}>
              {['En servicio', 'Fuera de servicio'].map(sit => (
                <TouchableOpacity
                  key={sit}
                  style={[
                    styles.optionButton,
                    newEP.situacion === sit && styles.optionButtonActive,
                  ]}
                  onPress={() => setNewEP({...newEP, situacion: sit})}>
                  <Text
                    style={[
                      styles.optionButtonText,
                      newEP.situacion === sit && styles.optionButtonTextActive,
                    ]}>
                    {sit}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Tipo Piso */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Tipo de Piso</Text>
            <View style={styles.optionButtons}>
              {TIPO_PISO_OPTIONS.map(tipo => (
                <TouchableOpacity
                  key={tipo}
                  style={[
                    styles.optionButton,
                    newEP.tipoPiso === tipo && styles.optionButtonActive,
                  ]}
                  onPress={() => setNewEP({...newEP, tipoPiso: tipo})}>
                  <Text
                    style={[
                      styles.optionButtonText,
                      newEP.tipoPiso === tipo && styles.optionButtonTextActive,
                    ]}>
                    {tipo}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Estado Piso */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Estado Piso</Text>
            <TextInput
              style={styles.formInput}
              placeholder="Ej: Bueno, Regular, Malo"
              value={newEP.estadoPiso}
              onChangeText={text => setNewEP({...newEP, estadoPiso: text})}
            />
          </View>

          {/* Ubicación */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Ubicación Equipo</Text>
            <TextInput
              style={styles.formInput}
              placeholder="Ej: Cabinet Indoor, Outdoor"
              value={newEP.ubicacionEquipo}
              onChangeText={text => setNewEP({...newEP, ubicacionEquipo: text})}
            />
          </View>

          {/* Modelo */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Modelo</Text>
            <TextInput
              style={styles.formInput}
              placeholder="Modelo del equipo"
              value={newEP.modelo}
              onChangeText={text => setNewEP({...newEP, modelo: text})}
            />
          </View>

          {/* Fabricante */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Fabricante</Text>
            <TextInput
              style={styles.formInput}
              placeholder="Fabricante del equipo"
              value={newEP.fabricante}
              onChangeText={text => setNewEP({...newEP, fabricante: text})}
            />
          </View>

          {/* Uso EP */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Uso EP</Text>
            <TextInput
              style={styles.formInput}
              placeholder="Ej: RADIO, ENERGIA"
              value={newEP.usoEP}
              onChangeText={text => setNewEP({...newEP, usoEP: text})}
            />
          </View>

          {/* Operador */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Operador Propietario / Usuario</Text>
            <TextInput
              style={styles.formInput}
              placeholder="Ej: TIGO, CLARO"
              value={newEP.operadorPropietario}
              onChangeText={text => setNewEP({...newEP, operadorPropietario: text})}
            />
          </View>

          {/* Dimensiones Row */}
          <View style={styles.formRow}>
            <View style={[styles.formGroup, {flex: 1}]}>
              <Text style={styles.formLabel}>Ancho (m)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="0.00"
                value={newEP.ancho}
                onChangeText={text => setNewEP({...newEP, ancho: text})}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={[styles.formGroup, {flex: 1, marginLeft: 8}]}>
              <Text style={styles.formLabel}>Profundidad (m)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="0.00"
                value={newEP.profundidad}
                onChangeText={text => setNewEP({...newEP, profundidad: text})}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* Altura y Superficie Row */}
          <View style={styles.formRow}>
            <View style={[styles.formGroup, {flex: 1}]}>
              <Text style={styles.formLabel}>Altura (m)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="0.00"
                value={newEP.altura}
                onChangeText={text => setNewEP({...newEP, altura: text})}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={[styles.formGroup, {flex: 1, marginLeft: 8}]}>
              <Text style={styles.formLabel}>Superficie Ocupada (m²)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="0.00"
                value={newEP.superficieOcupada}
                onChangeText={text => setNewEP({...newEP, superficieOcupada: text})}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* Observaciones */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Observaciones</Text>
            <TextInput
              style={[styles.formInput, styles.formInputMultiline]}
              placeholder="Observaciones adicionales..."
              value={newEP.observaciones}
              onChangeText={text => setNewEP({...newEP, observaciones: text})}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity style={styles.submitButton} onPress={handleAddEP}>
            <Text style={styles.submitButtonText}>Agregar Equipo</Text>
          </TouchableOpacity>

          <View style={{height: 40}} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );

  // Edit EE Modal
  const renderEditEEModal = () => (
    <Modal
      visible={showEditEEModal}
      animationType="slide"
      transparent={false}
      onRequestClose={() => setShowEditEEModal(false)}>
      <KeyboardAvoidingView
        style={styles.modalContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Editar Elemento EE-{editingEE?.idEE}</Text>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowEditEEModal(false)}>
            <Text style={styles.modalCloseText}>Cancelar</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {/* Tipo EE */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Tipo de Elemento *</Text>
            <View style={styles.optionButtons}>
              {TIPO_EE_OPTIONS.map(tipo => (
                <TouchableOpacity
                  key={tipo}
                  style={[
                    styles.optionButton,
                    editEEData.tipoEE === tipo && styles.optionButtonActive,
                  ]}
                  onPress={() => setEditEEData({...editEEData, tipoEE: tipo})}>
                  <Text
                    style={[
                      styles.optionButtonText,
                      editEEData.tipoEE === tipo && styles.optionButtonTextActive,
                    ]}>
                    {tipo}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Arista */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Arista/Cara Mástil</Text>
            <TextInput
              style={styles.formInput}
              placeholder="Ej: Arista1, Cara2"
              value={editEEData.aristaCaraMastil}
              onChangeText={text => setEditEEData({...editEEData, aristaCaraMastil: text})}
            />
          </View>

          {/* Operador */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Operador/Propietario</Text>
            <TextInput
              style={styles.formInput}
              placeholder="Ej: TIGO, CLARO"
              value={editEEData.operadorPropietario}
              onChangeText={text => setEditEEData({...editEEData, operadorPropietario: text})}
            />
          </View>

          {/* Altura */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Altura Mitad Antena (m)</Text>
            <TextInput
              style={styles.formInput}
              placeholder="Ej: 25.5000"
              value={editEEData.alturaAntena}
              onChangeText={text => setEditEEData({...editEEData, alturaAntena: text})}
              keyboardType="decimal-pad"
            />
          </View>

          {/* Diámetro */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Diámetro (m)</Text>
            <TextInput
              style={styles.formInput}
              placeholder="Ej: 1.20"
              value={editEEData.diametro}
              onChangeText={text => setEditEEData({...editEEData, diametro: text})}
              keyboardType="decimal-pad"
            />
          </View>

          {/* Dimensiones Row */}
          <View style={styles.formRow}>
            <View style={[styles.formGroup, {flex: 1}]}>
              <Text style={styles.formLabel}>Largo (m)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="0.000"
                value={editEEData.largo}
                onChangeText={text => setEditEEData({...editEEData, largo: text})}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={[styles.formGroup, {flex: 1, marginLeft: 8}]}>
              <Text style={styles.formLabel}>Ancho (m)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="0.000"
                value={editEEData.ancho}
                onChangeText={text => setEditEEData({...editEEData, ancho: text})}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={[styles.formGroup, {flex: 1, marginLeft: 8}]}>
              <Text style={styles.formLabel}>Fondo (m)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="0.000"
                value={editEEData.fondo}
                onChangeText={text => setEditEEData({...editEEData, fondo: text})}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* Azimut */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Azimut (°)</Text>
            <TextInput
              style={styles.formInput}
              placeholder="Ej: 180.000"
              value={editEEData.azimut}
              onChangeText={text => setEditEEData({...editEEData, azimut: text})}
              keyboardType="decimal-pad"
            />
          </View>

          {/* EPA */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>EPA EE M²</Text>
            <TextInput
              style={styles.formInput}
              placeholder="Ej: 0.1234567890"
              value={editEEData.epaM2}
              onChangeText={text => setEditEEData({...editEEData, epaM2: text})}
              keyboardType="decimal-pad"
            />
          </View>

          {/* Uso Compartido */}
          <View style={styles.formGroupRow}>
            <Text style={styles.formLabel}>Uso Compartido</Text>
            <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>No</Text>
              <Switch
                value={editEEData.usoCompartido}
                onValueChange={value => setEditEEData({...editEEData, usoCompartido: value})}
                trackColor={{false: '#D1D5DB', true: '#007AFF'}}
              />
              <Text style={styles.switchLabel}>Sí</Text>
            </View>
          </View>

          {/* Sistema Móvil */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Sistema Móvil</Text>
            <TextInput
              style={styles.formInput}
              placeholder="Ej: 4G, 5G, LTE"
              value={editEEData.sistemaMovil}
              onChangeText={text => setEditEEData({...editEEData, sistemaMovil: text})}
            />
          </View>

          {/* Observaciones */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Observaciones</Text>
            <TextInput
              style={[styles.formInput, styles.formInputMultiline]}
              placeholder="Observaciones adicionales..."
              value={editEEData.observaciones}
              onChangeText={text => setEditEEData({...editEEData, observaciones: text})}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity style={styles.submitButton} onPress={handleSaveEditEE}>
            <Text style={styles.submitButtonText}>Guardar Cambios</Text>
          </TouchableOpacity>

          <View style={{height: 40}} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );

  // Edit EP Modal
  const renderEditEPModal = () => (
    <Modal
      visible={showEditEPModal}
      animationType="slide"
      transparent={false}
      onRequestClose={() => setShowEditEPModal(false)}>
      <KeyboardAvoidingView
        style={styles.modalContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Editar Equipo EP-{editingEP?.idEP}</Text>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowEditEPModal(false)}>
            <Text style={styles.modalCloseText}>Cancelar</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {/* Situación EP */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Situación EP</Text>
            <View style={styles.optionButtons}>
              {['En servicio', 'Fuera de servicio'].map(sit => (
                <TouchableOpacity
                  key={sit}
                  style={[
                    styles.optionButton,
                    editEPData.situacion === sit && styles.optionButtonActive,
                  ]}
                  onPress={() => setEditEPData({...editEPData, situacion: sit})}>
                  <Text
                    style={[
                      styles.optionButtonText,
                      editEPData.situacion === sit && styles.optionButtonTextActive,
                    ]}>
                    {sit}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Tipo Piso */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Tipo de Piso</Text>
            <View style={styles.optionButtons}>
              {TIPO_PISO_OPTIONS.map(tipo => (
                <TouchableOpacity
                  key={tipo}
                  style={[
                    styles.optionButton,
                    editEPData.tipoPiso === tipo && styles.optionButtonActive,
                  ]}
                  onPress={() => setEditEPData({...editEPData, tipoPiso: tipo})}>
                  <Text
                    style={[
                      styles.optionButtonText,
                      editEPData.tipoPiso === tipo && styles.optionButtonTextActive,
                    ]}>
                    {tipo}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Estado Piso */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Estado Piso</Text>
            <TextInput
              style={styles.formInput}
              placeholder="Ej: Bueno, Regular, Malo"
              value={editEPData.estadoPiso}
              onChangeText={text => setEditEPData({...editEPData, estadoPiso: text})}
            />
          </View>

          {/* Ubicación */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Ubicación Equipo</Text>
            <TextInput
              style={styles.formInput}
              placeholder="Ej: Cabinet Indoor, Outdoor"
              value={editEPData.ubicacionEquipo}
              onChangeText={text => setEditEPData({...editEPData, ubicacionEquipo: text})}
            />
          </View>

          {/* Modelo */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Modelo</Text>
            <TextInput
              style={styles.formInput}
              placeholder="Modelo del equipo"
              value={editEPData.modelo}
              onChangeText={text => setEditEPData({...editEPData, modelo: text})}
            />
          </View>

          {/* Fabricante */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Fabricante</Text>
            <TextInput
              style={styles.formInput}
              placeholder="Fabricante del equipo"
              value={editEPData.fabricante}
              onChangeText={text => setEditEPData({...editEPData, fabricante: text})}
            />
          </View>

          {/* Uso EP */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Uso EP</Text>
            <TextInput
              style={styles.formInput}
              placeholder="Ej: RADIO, ENERGIA"
              value={editEPData.usoEP}
              onChangeText={text => setEditEPData({...editEPData, usoEP: text})}
            />
          </View>

          {/* Operador */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Operador Propietario / Usuario</Text>
            <TextInput
              style={styles.formInput}
              placeholder="Ej: TIGO, CLARO"
              value={editEPData.operadorPropietario}
              onChangeText={text => setEditEPData({...editEPData, operadorPropietario: text})}
            />
          </View>

          {/* Dimensiones Row */}
          <View style={styles.formRow}>
            <View style={[styles.formGroup, {flex: 1}]}>
              <Text style={styles.formLabel}>Ancho (m)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="0.00"
                value={editEPData.ancho}
                onChangeText={text => setEditEPData({...editEPData, ancho: text})}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={[styles.formGroup, {flex: 1, marginLeft: 8}]}>
              <Text style={styles.formLabel}>Profundidad (m)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="0.00"
                value={editEPData.profundidad}
                onChangeText={text => setEditEPData({...editEPData, profundidad: text})}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* Altura y Superficie Row */}
          <View style={styles.formRow}>
            <View style={[styles.formGroup, {flex: 1}]}>
              <Text style={styles.formLabel}>Altura (m)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="0.00"
                value={editEPData.altura}
                onChangeText={text => setEditEPData({...editEPData, altura: text})}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={[styles.formGroup, {flex: 1, marginLeft: 8}]}>
              <Text style={styles.formLabel}>Superficie Ocupada (m²)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="0.00"
                value={editEPData.superficieOcupada}
                onChangeText={text => setEditEPData({...editEPData, superficieOcupada: text})}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* Observaciones */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Observaciones</Text>
            <TextInput
              style={[styles.formInput, styles.formInputMultiline]}
              placeholder="Observaciones adicionales..."
              value={editEPData.observaciones}
              onChangeText={text => setEditEPData({...editEPData, observaciones: text})}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity style={styles.submitButton} onPress={handleSaveEditEP}>
            <Text style={styles.submitButtonText}>Guardar Cambios</Text>
          </TouchableOpacity>

          <View style={{height: 40}} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );

  if (!siteInventory && newElements.ee.length === 0 && newElements.ep.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            No hay inventario disponible para este sitio.
          </Text>
          <Text style={styles.emptyHint}>
            Puede agregar nuevos elementos usando los botones de abajo.
          </Text>
        </View>

        <View style={styles.addButtonsContainer}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddEEModal(true)}>
            <Text style={styles.addButtonText}>+ Agregar Elemento Estructura</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addButton, styles.addButtonSecondary]}
            onPress={() => setShowAddEPModal(true)}>
            <Text style={styles.addButtonText}>+ Agregar Equipo Piso</Text>
          </TouchableOpacity>
        </View>

        {renderAddEEModal()}
        {renderAddEPModal()}
        {renderEditEEModal()}
        {renderEditEPModal()}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Sub-tabs for EE and EP */}
      <View style={styles.subTabContainer}>
        <TouchableOpacity
          style={[styles.subTab, activeSubTab === 'ee' && styles.subTabActive]}
          onPress={() => setActiveSubTab('ee')}>
          <Text
            style={[
              styles.subTabText,
              activeSubTab === 'ee' && styles.subTabTextActive,
            ]}>
            Elementos Estructura ({allEE.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.subTab, activeSubTab === 'ep' && styles.subTabActive]}
          onPress={() => setActiveSubTab('ep')}>
          <Text
            style={[
              styles.subTabText,
              activeSubTab === 'ep' && styles.subTabTextActive,
            ]}>
            Equipos Piso ({allEP.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content}>
        {activeSubTab === 'ee' ? (
          <>
            {allEE.length > 0 ? (
              allEE.map(renderEEItem)
            ) : (
              <Text style={styles.noItemsText}>
                No hay elementos en estructura registrados.
              </Text>
            )}
            <TouchableOpacity
              style={styles.addItemButton}
              onPress={() => setShowAddEEModal(true)}>
              <Text style={styles.addItemButtonText}>+ Agregar Elemento</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {allEP.length > 0 ? (
              allEP.map(renderEPItem)
            ) : (
              <Text style={styles.noItemsText}>
                No hay equipos en piso registrados.
              </Text>
            )}
            <TouchableOpacity
              style={styles.addItemButton}
              onPress={() => setShowAddEPModal(true)}>
              <Text style={styles.addItemButtonText}>+ Agregar Equipo</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {renderAddEEModal()}
      {renderAddEPModal()}
      {renderEditEEModal()}
      {renderEditEPModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
  },
  addButtonsContainer: {
    padding: 16,
    gap: 12,
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  addButtonSecondary: {
    backgroundColor: '#34C759',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  subTabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    padding: 4,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
  },
  subTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  subTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  subTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666666',
  },
  subTabTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  itemCard: {
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
  itemCardLocal: {
    borderWidth: 2,
    borderColor: '#34C759',
  },
  itemCardEdited: {
    borderWidth: 2,
    borderColor: '#FF9500',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  itemHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemId: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
  },
  localBadge: {
    backgroundColor: '#34C759',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  localBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  editedBadge: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  editedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  itemType: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666666',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  editButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonText: {
    fontSize: 16,
    color: '#1976D2',
    fontWeight: '600',
  },
  deleteButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFEBEE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    fontSize: 16,
    color: '#DC2626',
    fontWeight: '600',
  },
  itemDetails: {
    marginBottom: 12,
  },
  itemDetail: {
    fontSize: 14,
    color: '#333333',
    marginBottom: 4,
  },
  inputSection: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  estadoButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  estadoButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  estadoButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  estadoButtonText: {
    fontSize: 13,
    color: '#666666',
  },
  estadoButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  observacionesInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  noItemsText: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
    padding: 24,
  },
  addItemButton: {
    backgroundColor: '#E3F2FD',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#90CAF9',
    borderStyle: 'dashed',
    marginTop: 8,
    marginBottom: 24,
  },
  addItemButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1976D2',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  modalCloseButton: {
    padding: 8,
  },
  modalCloseText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  formGroupRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
  },
  formRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  formInputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  optionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  optionButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  optionButtonText: {
    fontSize: 14,
    color: '#666666',
  },
  optionButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  switchLabel: {
    fontSize: 14,
    color: '#666666',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});
