import React, {useState, useMemo} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from 'react-native';

// Tipos de elementos para medición de torque
export const ELEMENTO_TYPES = [
  'MONTANTE',
  'DIAGONAL',
  'CIERRE',
  'ESCALERILLA',
  'BRIDA',
] as const;

export type ElementoType = (typeof ELEMENTO_TYPES)[number];

// Franjas de altura (10 franjas de 6m cada una)
export const FRANJAS = [
  {id: '0-6', label: 'FRANJA 0 - 6 m', min: 0, max: 6},
  {id: '6-12', label: 'FRANJA 6 - 12 m', min: 6, max: 12},
  {id: '12-18', label: 'FRANJA 12 - 18 m', min: 12, max: 18},
  {id: '18-24', label: 'FRANJA 18 - 24 m', min: 18, max: 24},
  {id: '24-30', label: 'FRANJA 24 - 30 m', min: 24, max: 30},
  {id: '30-36', label: 'FRANJA 30 - 36 m', min: 30, max: 36},
  {id: '36-42', label: 'FRANJA 36 - 42 m', min: 36, max: 42},
  {id: '42-48', label: 'FRANJA 42 - 48 m', min: 42, max: 48},
  {id: '48-54', label: 'FRANJA 48 - 54 m', min: 48, max: 54},
  {id: '54-60', label: 'FRANJA 54 - 60 m', min: 54, max: 60},
] as const;

// Tabla de referencia de torques por diámetro
export const TORQUE_REFERENCE = [
  {diametro: 'M16 (5/8")', torqueNm: 50},
  {diametro: 'M18 (3/4")', torqueNm: 80},
  {diametro: 'M20 (7/8")', torqueNm: 110},
  {diametro: 'M22', torqueNm: 140},
  {diametro: 'M24 (1")', torqueNm: 180},
  {diametro: 'M27 (1-1/8")', torqueNm: 320},
  {diametro: 'M30 (1-1/4")', torqueNm: 515},
  {diametro: 'M33 (1-3/8")', torqueNm: 775},
] as const;

// Opciones de diámetro de tornillo
export const DIAMETRO_OPTIONS = [
  '1/2"',
  '9/16"',
  '5/8"',
  '3/4"',
  '7/8"',
  '1"',
  '1-1/8"',
  '1-1/4"',
  '1-3/8"',
] as const;

// Datos de un tornillo (ahora con ID único)
export interface TornilloData {
  id: string;
  diametroTornillo: string;
  torqueAplicar: string;
  cantidadTornillos: string;
  noPasan: string;
}

// Datos de un elemento (ahora es un array de tornillos)
export interface ElementoTorqueData {
  tornillos: TornilloData[];
}

// Datos de una franja completa
export interface FranjaTorqueData {
  [elemento: string]: ElementoTorqueData;
}

// Todos los datos de torque
export interface TorqueData {
  [franjaId: string]: FranjaTorqueData;
}

// Props del componente
interface TorqueTabProps {
  torqueData: TorqueData;
  onUpdate: (newData: TorqueData) => void;
  alturaMaxima?: number;
}

// Generar ID único
const generateId = () => `tornillo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Componente para mostrar la tabla de referencia
function TorqueReferenceTable({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Tabla de Torques de Referencia</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
              <Text style={styles.modalCloseText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.referenceTable}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, styles.tableHeaderText, {flex: 2}]}>
                Diámetro Tornillo
              </Text>
              <Text style={[styles.tableCell, styles.tableHeaderText, {flex: 1}]}>
                Torque (N·m)
              </Text>
            </View>
            {TORQUE_REFERENCE.map((ref, index) => (
              <View
                key={ref.diametro}
                style={[styles.tableRow, index % 2 === 0 && styles.tableRowAlt]}>
                <Text style={[styles.tableCell, {flex: 2}]}>{ref.diametro}</Text>
                <Text style={[styles.tableCell, styles.torqueValue, {flex: 1}]}>
                  {ref.torqueNm}
                </Text>
              </View>
            ))}
          </View>
          <Text style={styles.referenceNote}>* Mínimo 30 tornillos por franja</Text>
        </View>
      </View>
    </Modal>
  );
}

// Componente para un tornillo individual
function TornilloInput({
  tornillo,
  index,
  onUpdate,
  onDelete,
  canDelete,
}: {
  tornillo: TornilloData;
  index: number;
  onUpdate: (data: Partial<TornilloData>) => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const [showDiametroPicker, setShowDiametroPicker] = useState(false);

  const cantidadNum = parseInt(tornillo.cantidadTornillos) || 0;
  const noPasanNum = parseInt(tornillo.noPasan) || 0;
  const porcentajeCumple =
    cantidadNum > 0
      ? (((cantidadNum - noPasanNum) / cantidadNum) * 100).toFixed(1)
      : '0.0';

  return (
    <View style={styles.tornilloCard}>
      <View style={styles.tornilloHeader}>
        <Text style={styles.tornilloIndex}>Tornillo #{index + 1}</Text>
        {canDelete && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => {
              Alert.alert(
                'Eliminar Tornillo',
                '¿Está seguro de eliminar este registro?',
                [
                  {text: 'Cancelar', style: 'cancel'},
                  {text: 'Eliminar', style: 'destructive', onPress: onDelete},
                ],
              );
            }}>
            <Text style={styles.deleteButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.tornilloRow}>
        {/* Diámetro Tornillo */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Diám. Tornillo</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowDiametroPicker(true)}>
            <Text style={styles.pickerButtonText}>
              {tornillo.diametroTornillo || 'Seleccionar'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Torque Aplicar */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Torque (N·m)</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            keyboardType="numeric"
            value={tornillo.torqueAplicar}
            onChangeText={text => onUpdate({torqueAplicar: text})}
          />
        </View>
      </View>

      <View style={styles.tornilloRow}>
        {/* Cantidad Tornillos */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Cant. Tornillos</Text>
          <TextInput
            style={styles.input}
            placeholder="30"
            keyboardType="numeric"
            value={tornillo.cantidadTornillos}
            onChangeText={text => onUpdate({cantidadTornillos: text})}
          />
        </View>

        {/* NO PASAN */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>No Pasan</Text>
          <TextInput
            style={[styles.input, noPasanNum > 0 && styles.inputWarning]}
            placeholder="0"
            keyboardType="numeric"
            value={tornillo.noPasan}
            onChangeText={text => onUpdate({noPasan: text})}
          />
        </View>

        {/* % Cumplimiento */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>% Cumple</Text>
          <View
            style={[
              styles.percentageBox,
              parseFloat(porcentajeCumple) >= 95
                ? styles.percentageGood
                : parseFloat(porcentajeCumple) >= 80
                ? styles.percentageWarning
                : styles.percentageBad,
            ]}>
            <Text style={styles.percentageText}>{porcentajeCumple}%</Text>
          </View>
        </View>
      </View>

      {/* Modal de selección de diámetro */}
      <Modal visible={showDiametroPicker} transparent animationType="fade">
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setShowDiametroPicker(false)}>
          <View style={styles.pickerContent}>
            <Text style={styles.pickerTitle}>Seleccionar Diámetro</Text>
            {DIAMETRO_OPTIONS.map(option => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.pickerOption,
                  tornillo.diametroTornillo === option && styles.pickerOptionSelected,
                ]}
                onPress={() => {
                  onUpdate({diametroTornillo: option});
                  setShowDiametroPicker(false);
                }}>
                <Text
                  style={[
                    styles.pickerOptionText,
                    tornillo.diametroTornillo === option &&
                      styles.pickerOptionTextSelected,
                  ]}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// Componente para un elemento (MONTANTE, DIAGONAL, etc.)
function ElementoSection({
  elemento,
  tornillos,
  onAddTornillo,
  onUpdateTornillo,
  onDeleteTornillo,
}: {
  elemento: ElementoType;
  tornillos: TornilloData[];
  onAddTornillo: () => void;
  onUpdateTornillo: (tornilloId: string, data: Partial<TornilloData>) => void;
  onDeleteTornillo: (tornilloId: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(tornillos.length > 0);

  // Calcular resumen del elemento
  const resumen = useMemo(() => {
    let totalTornillos = 0;
    let totalNoPasan = 0;

    tornillos.forEach(t => {
      totalTornillos += parseInt(t.cantidadTornillos) || 0;
      totalNoPasan += parseInt(t.noPasan) || 0;
    });

    const porcentajeCumple =
      totalTornillos > 0
        ? (((totalTornillos - totalNoPasan) / totalTornillos) * 100).toFixed(1)
        : '0.0';

    return {totalTornillos, totalNoPasan, porcentajeCumple};
  }, [tornillos]);

  return (
    <View style={styles.elementoSection}>
      <TouchableOpacity
        style={styles.elementoHeader}
        onPress={() => setIsExpanded(!isExpanded)}>
        <View style={styles.elementoHeaderLeft}>
          <Text style={styles.elementoTitle}>{elemento}</Text>
          <View style={styles.elementoStats}>
            <Text style={styles.elementoStatText}>
              {tornillos.length} registro{tornillos.length !== 1 ? 's' : ''}
            </Text>
            {resumen.totalTornillos > 0 && (
              <>
                <Text style={styles.elementoStatText}>
                  {resumen.totalTornillos} torn.
                </Text>
                <View
                  style={[
                    styles.elementoCumpleTag,
                    parseFloat(resumen.porcentajeCumple) >= 95
                      ? styles.tagGood
                      : parseFloat(resumen.porcentajeCumple) >= 80
                      ? styles.tagWarning
                      : styles.tagBad,
                  ]}>
                  <Text style={styles.elementoCumpleText}>
                    {resumen.porcentajeCumple}%
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>
        <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.elementoContent}>
          {tornillos.map((tornillo, index) => (
            <TornilloInput
              key={tornillo.id}
              tornillo={tornillo}
              index={index}
              onUpdate={data => onUpdateTornillo(tornillo.id, data)}
              onDelete={() => onDeleteTornillo(tornillo.id)}
              canDelete={tornillos.length > 0}
            />
          ))}

          <TouchableOpacity style={styles.addButton} onPress={onAddTornillo}>
            <Text style={styles.addButtonText}>+ Agregar Tornillo</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// Componente para una franja
function FranjaSection({
  franja,
  data,
  onUpdate,
  isExpanded,
  onToggle,
}: {
  franja: (typeof FRANJAS)[number];
  data: FranjaTorqueData;
  onUpdate: (newData: FranjaTorqueData) => void;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  // Calcular resumen de la franja
  const resumen = useMemo(() => {
    let totalTornillos = 0;
    let totalNoPasan = 0;
    let elementosConDatos = 0;

    ELEMENTO_TYPES.forEach(elemento => {
      const elemData = data[elemento];
      if (elemData && elemData.tornillos && elemData.tornillos.length > 0) {
        elementosConDatos++;
        elemData.tornillos.forEach(t => {
          totalTornillos += parseInt(t.cantidadTornillos) || 0;
          totalNoPasan += parseInt(t.noPasan) || 0;
        });
      }
    });

    const porcentajeCumple =
      totalTornillos > 0
        ? (((totalTornillos - totalNoPasan) / totalTornillos) * 100).toFixed(1)
        : '0.0';

    return {totalTornillos, totalNoPasan, elementosConDatos, porcentajeCumple};
  }, [data]);

  const handleAddTornillo = (elemento: ElementoType) => {
    const newTornillo: TornilloData = {
      id: generateId(),
      diametroTornillo: '',
      torqueAplicar: '',
      cantidadTornillos: '',
      noPasan: '',
    };

    const newData = {...data};
    if (!newData[elemento]) {
      newData[elemento] = {tornillos: []};
    }
    newData[elemento] = {
      tornillos: [...newData[elemento].tornillos, newTornillo],
    };
    onUpdate(newData);
  };

  const handleUpdateTornillo = (
    elemento: ElementoType,
    tornilloId: string,
    tornilloData: Partial<TornilloData>,
  ) => {
    const newData = {...data};
    if (newData[elemento] && newData[elemento].tornillos) {
      newData[elemento] = {
        tornillos: newData[elemento].tornillos.map(t =>
          t.id === tornilloId ? {...t, ...tornilloData} : t,
        ),
      };
      onUpdate(newData);
    }
  };

  const handleDeleteTornillo = (elemento: ElementoType, tornilloId: string) => {
    const newData = {...data};
    if (newData[elemento] && newData[elemento].tornillos) {
      newData[elemento] = {
        tornillos: newData[elemento].tornillos.filter(t => t.id !== tornilloId),
      };
      onUpdate(newData);
    }
  };

  return (
    <View style={styles.franjaSection}>
      <TouchableOpacity style={styles.franjaHeader} onPress={onToggle}>
        <View style={styles.franjaHeaderLeft}>
          <Text style={styles.franjaTitle}>{franja.label}</Text>
          <View style={styles.franjaStats}>
            <Text style={styles.franjaStatText}>
              {resumen.elementosConDatos}/{ELEMENTO_TYPES.length} elementos
            </Text>
            <Text style={styles.franjaStatText}>
              {resumen.totalTornillos} tornillos
            </Text>
            {resumen.totalTornillos > 0 && (
              <View
                style={[
                  styles.franjaCumpleTag,
                  parseFloat(resumen.porcentajeCumple) >= 95
                    ? styles.tagGood
                    : parseFloat(resumen.porcentajeCumple) >= 80
                    ? styles.tagWarning
                    : styles.tagBad,
                ]}>
                <Text style={styles.franjaCumpleText}>
                  {resumen.porcentajeCumple}% cumple
                </Text>
              </View>
            )}
          </View>
        </View>
        <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.franjaContent}>
          {ELEMENTO_TYPES.map(elemento => (
            <ElementoSection
              key={elemento}
              elemento={elemento}
              tornillos={data[elemento]?.tornillos || []}
              onAddTornillo={() => handleAddTornillo(elemento)}
              onUpdateTornillo={(tornilloId, tornilloData) =>
                handleUpdateTornillo(elemento, tornilloId, tornilloData)
              }
              onDeleteTornillo={tornilloId =>
                handleDeleteTornillo(elemento, tornilloId)
              }
            />
          ))}

          {/* Resumen de la franja */}
          {resumen.totalTornillos > 0 && (
            <View style={styles.franjaSummary}>
              <Text style={styles.summaryTitle}>TOTAL FRANJA</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Tornillos:</Text>
                <Text style={styles.summaryValue}>{resumen.totalTornillos}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>No Pasan:</Text>
                <Text
                  style={[
                    styles.summaryValue,
                    resumen.totalNoPasan > 0 && styles.summaryValueWarning,
                  ]}>
                  {resumen.totalNoPasan}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>% Cumplimiento:</Text>
                <Text
                  style={[
                    styles.summaryValue,
                    parseFloat(resumen.porcentajeCumple) >= 95
                      ? styles.summaryValueGood
                      : parseFloat(resumen.porcentajeCumple) >= 80
                      ? styles.summaryValueWarning
                      : styles.summaryValueBad,
                  ]}>
                  {resumen.porcentajeCumple}%
                </Text>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// Función para obtener datos vacíos de torque
export function getDefaultTorqueData(): TorqueData {
  const data: TorqueData = {};
  FRANJAS.forEach(franja => {
    data[franja.id] = {};
    ELEMENTO_TYPES.forEach(elemento => {
      data[franja.id][elemento] = {tornillos: []};
    });
  });
  return data;
}

// Componente principal
export function TorqueTab({
  torqueData,
  onUpdate,
  alturaMaxima = 60,
}: TorqueTabProps) {
  const [expandedFranjas, setExpandedFranjas] = useState<{[key: string]: boolean}>({
    '0-6': true,
  });
  const [showReference, setShowReference] = useState(false);

  // Filtrar franjas según altura máxima del sitio
  const franjasVisibles = FRANJAS.filter(f => f.min < alturaMaxima);

  // Calcular resumen general
  const resumenGeneral = useMemo(() => {
    let totalTornillos = 0;
    let totalNoPasan = 0;
    let franjasConDatos = 0;

    franjasVisibles.forEach(franja => {
      const franjaData = torqueData[franja.id] || {};
      let franjaConDatos = false;

      ELEMENTO_TYPES.forEach(elemento => {
        const elemData = franjaData[elemento];
        if (elemData && elemData.tornillos) {
          elemData.tornillos.forEach(t => {
            const cantidad = parseInt(t.cantidadTornillos) || 0;
            if (cantidad > 0) franjaConDatos = true;
            totalTornillos += cantidad;
            totalNoPasan += parseInt(t.noPasan) || 0;
          });
        }
      });

      if (franjaConDatos) franjasConDatos++;
    });

    const porcentajeCumple =
      totalTornillos > 0
        ? (((totalTornillos - totalNoPasan) / totalTornillos) * 100).toFixed(1)
        : '0.0';

    return {totalTornillos, totalNoPasan, franjasConDatos, porcentajeCumple};
  }, [torqueData, franjasVisibles]);

  const toggleFranja = (franjaId: string) => {
    setExpandedFranjas(prev => ({
      ...prev,
      [franjaId]: !prev[franjaId],
    }));
  };

  const handleFranjaUpdate = (franjaId: string, franjaData: FranjaTorqueData) => {
    const newData = {...torqueData, [franjaId]: franjaData};
    onUpdate(newData);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header con información */}
      <View style={styles.infoCard}>
        <View style={styles.infoHeader}>
          <Text style={styles.infoTitle}>Pruebas de Torque</Text>
          <TouchableOpacity
            style={styles.referenceButton}
            onPress={() => setShowReference(true)}>
            <Text style={styles.referenceButtonText}>Ver Tabla Ref.</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.infoText}>
          Registre las mediciones de torque por franja de altura. Puede agregar
          múltiples tipos de tornillos por elemento.
        </Text>
      </View>

      {/* Resumen general */}
      <View style={styles.generalSummary}>
        <Text style={styles.generalSummaryTitle}>RESUMEN GENERAL</Text>
        <View style={styles.generalSummaryStats}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>
              {resumenGeneral.franjasConDatos}/{franjasVisibles.length}
            </Text>
            <Text style={styles.statLabel}>Franjas</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{resumenGeneral.totalTornillos}</Text>
            <Text style={styles.statLabel}>Tornillos</Text>
          </View>
          <View style={styles.statBox}>
            <Text
              style={[
                styles.statValue,
                resumenGeneral.totalNoPasan > 0 && styles.statValueWarning,
              ]}>
              {resumenGeneral.totalNoPasan}
            </Text>
            <Text style={styles.statLabel}>No Pasan</Text>
          </View>
          <View
            style={[
              styles.statBox,
              parseFloat(resumenGeneral.porcentajeCumple) >= 95
                ? styles.statBoxGood
                : parseFloat(resumenGeneral.porcentajeCumple) >= 80
                ? styles.statBoxWarning
                : styles.statBoxBad,
            ]}>
            <Text style={styles.statValuePercent}>
              {resumenGeneral.porcentajeCumple}%
            </Text>
            <Text style={styles.statLabel}>Cumple</Text>
          </View>
        </View>
      </View>

      {/* Franjas */}
      {franjasVisibles.map(franja => (
        <FranjaSection
          key={franja.id}
          franja={franja}
          data={torqueData[franja.id] || {}}
          onUpdate={franjaData => handleFranjaUpdate(franja.id, franjaData)}
          isExpanded={expandedFranjas[franja.id] || false}
          onToggle={() => toggleFranja(franja.id)}
        />
      ))}

      {/* Modal de tabla de referencia */}
      <TorqueReferenceTable
        visible={showReference}
        onClose={() => setShowReference(false)}
      />

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F5F5F5',
  },
  infoCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  infoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1565C0',
  },
  infoText: {
    fontSize: 14,
    color: '#1976D2',
    lineHeight: 20,
  },
  referenceButton: {
    backgroundColor: '#1976D2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  referenceButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  generalSummary: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  generalSummaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 12,
    textAlign: 'center',
  },
  generalSummaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    marginHorizontal: 4,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  statBoxGood: {
    backgroundColor: '#E8F5E9',
  },
  statBoxWarning: {
    backgroundColor: '#FFF3E0',
  },
  statBoxBad: {
    backgroundColor: '#FFEBEE',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333333',
  },
  statValueWarning: {
    color: '#F57C00',
  },
  statValuePercent: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333333',
  },
  statLabel: {
    fontSize: 11,
    color: '#666666',
    marginTop: 2,
  },
  franjaSection: {
    marginBottom: 12,
  },
  franjaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  franjaHeaderLeft: {
    flex: 1,
  },
  franjaTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  franjaStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  franjaStatText: {
    fontSize: 12,
    color: '#666666',
  },
  franjaCumpleTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  tagGood: {
    backgroundColor: '#C8E6C9',
  },
  tagWarning: {
    backgroundColor: '#FFE0B2',
  },
  tagBad: {
    backgroundColor: '#FFCDD2',
  },
  franjaCumpleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333333',
  },
  expandIcon: {
    fontSize: 12,
    color: '#666666',
    marginLeft: 12,
  },
  franjaContent: {
    marginTop: 8,
    marginLeft: 8,
  },
  elementoSection: {
    marginBottom: 8,
  },
  elementoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  elementoHeaderLeft: {
    flex: 1,
  },
  elementoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 2,
  },
  elementoStats: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  elementoStatText: {
    fontSize: 11,
    color: '#666666',
  },
  elementoCumpleTag: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  elementoCumpleText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#333333',
  },
  elementoContent: {
    marginTop: 8,
    marginLeft: 12,
  },
  tornilloCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tornilloHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  tornilloIndex: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
  },
  deleteButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFEBEE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    fontSize: 14,
    color: '#C62828',
    fontWeight: '600',
  },
  tornilloRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#666666',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
    textAlign: 'center',
  },
  inputWarning: {
    borderColor: '#F57C00',
    backgroundColor: '#FFF3E0',
  },
  pickerButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    padding: 10,
    alignItems: 'center',
  },
  pickerButtonText: {
    fontSize: 14,
    color: '#333333',
  },
  percentageBox: {
    borderRadius: 6,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentageGood: {
    backgroundColor: '#C8E6C9',
  },
  percentageWarning: {
    backgroundColor: '#FFE0B2',
  },
  percentageBad: {
    backgroundColor: '#FFCDD2',
  },
  percentageText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333333',
  },
  addButton: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#90CAF9',
    borderStyle: 'dashed',
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976D2',
  },
  franjaSummary: {
    backgroundColor: '#F0F4F8',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 8,
    textAlign: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#666666',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333333',
  },
  summaryValueGood: {
    color: '#2E7D32',
  },
  summaryValueWarning: {
    color: '#F57C00',
  },
  summaryValueBad: {
    color: '#C62828',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
  referenceTable: {
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1976D2',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  tableHeaderText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tableRowAlt: {
    backgroundColor: '#F5F5F5',
  },
  tableCell: {
    fontSize: 14,
    color: '#333333',
  },
  torqueValue: {
    fontWeight: '600',
    textAlign: 'center',
  },
  referenceNote: {
    marginTop: 12,
    fontSize: 12,
    color: '#666666',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  // Picker modal
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  pickerContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    width: '100%',
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 12,
    textAlign: 'center',
  },
  pickerOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  pickerOptionSelected: {
    backgroundColor: '#E3F2FD',
  },
  pickerOptionText: {
    fontSize: 16,
    color: '#333333',
    textAlign: 'center',
  },
  pickerOptionTextSelected: {
    color: '#1976D2',
    fontWeight: '600',
  },
  bottomPadding: {
    height: 24,
  },
});
