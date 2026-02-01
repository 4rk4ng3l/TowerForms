import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';

interface SecurityData {
  // EPP (Elementos de Protección Personal)
  eppCasco: boolean;
  eppArnes: boolean;
  eppGuantes: boolean;
  eppCalzado: boolean;
  eppLentes: boolean;
  eppOtros: string;

  // Condiciones del sitio
  condicionesAcceso: 'bueno' | 'regular' | 'malo' | '';
  condicionesIluminacion: 'bueno' | 'regular' | 'malo' | '';
  condicionesVentilacion: 'bueno' | 'regular' | 'malo' | '';
  condicionesSeñalizacion: 'bueno' | 'regular' | 'malo' | '';

  // Riesgos identificados
  riesgoAltura: boolean;
  riesgoElectrico: boolean;
  riesgoClimatico: boolean;
  riesgoEstructural: boolean;
  otrosRiesgos: string;

  // Observaciones generales
  observacionesSeguridad: string;

  // Confirmación
  firmaConformidad: boolean;
}

interface SecurityTabProps {
  securityData: SecurityData;
  onUpdate: (data: Partial<SecurityData>) => void;
}

const CONDICION_OPTIONS: {value: 'bueno' | 'regular' | 'malo'; label: string}[] = [
  {value: 'bueno', label: 'Bueno'},
  {value: 'regular', label: 'Regular'},
  {value: 'malo', label: 'Malo'},
];

export function SecurityTab({securityData, onUpdate}: SecurityTabProps) {
  const renderCheckbox = (
    label: string,
    checked: boolean,
    onPress: () => void,
  ) => (
    <TouchableOpacity style={styles.checkboxRow} onPress={onPress}>
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked && <Text style={styles.checkboxMark}>✓</Text>}
      </View>
      <Text style={styles.checkboxLabel}>{label}</Text>
    </TouchableOpacity>
  );

  const renderCondicionSelector = (
    label: string,
    value: 'bueno' | 'regular' | 'malo' | '',
    onChange: (val: 'bueno' | 'regular' | 'malo') => void,
  ) => (
    <View style={styles.condicionRow}>
      <Text style={styles.condicionLabel}>{label}</Text>
      <View style={styles.condicionButtons}>
        {CONDICION_OPTIONS.map(option => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.condicionButton,
              value === option.value && styles.condicionButtonActive,
              value === option.value && option.value === 'bueno' && styles.condicionButtonBueno,
              value === option.value && option.value === 'regular' && styles.condicionButtonRegular,
              value === option.value && option.value === 'malo' && styles.condicionButtonMalo,
            ]}
            onPress={() => onChange(option.value)}>
            <Text
              style={[
                styles.condicionButtonText,
                value === option.value && styles.condicionButtonTextActive,
              ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      {/* EPP Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Elementos de Protección Personal (EPP)
        </Text>
        <Text style={styles.sectionSubtitle}>
          Marque los elementos que porta el técnico
        </Text>

        <View style={styles.checkboxGrid}>
          {renderCheckbox('Casco de seguridad', securityData.eppCasco, () =>
            onUpdate({eppCasco: !securityData.eppCasco}),
          )}
          {renderCheckbox('Arnés de seguridad', securityData.eppArnes, () =>
            onUpdate({eppArnes: !securityData.eppArnes}),
          )}
          {renderCheckbox('Guantes', securityData.eppGuantes, () =>
            onUpdate({eppGuantes: !securityData.eppGuantes}),
          )}
          {renderCheckbox('Calzado de seguridad', securityData.eppCalzado, () =>
            onUpdate({eppCalzado: !securityData.eppCalzado}),
          )}
          {renderCheckbox('Lentes de seguridad', securityData.eppLentes, () =>
            onUpdate({eppLentes: !securityData.eppLentes}),
          )}
        </View>

        <Text style={styles.inputLabel}>Otros EPP:</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Especifique otros elementos..."
          value={securityData.eppOtros}
          onChangeText={text => onUpdate({eppOtros: text})}
        />
      </View>

      {/* Condiciones del Sitio */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Condiciones del Sitio</Text>

        {renderCondicionSelector(
          'Acceso al sitio',
          securityData.condicionesAcceso,
          val => onUpdate({condicionesAcceso: val}),
        )}
        {renderCondicionSelector(
          'Iluminación',
          securityData.condicionesIluminacion,
          val => onUpdate({condicionesIluminacion: val}),
        )}
        {renderCondicionSelector(
          'Ventilación',
          securityData.condicionesVentilacion,
          val => onUpdate({condicionesVentilacion: val}),
        )}
        {renderCondicionSelector(
          'Señalización',
          securityData.condicionesSeñalizacion,
          val => onUpdate({condicionesSeñalizacion: val}),
        )}
      </View>

      {/* Riesgos Identificados */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Riesgos Identificados</Text>
        <Text style={styles.sectionSubtitle}>
          Marque los riesgos presentes en el sitio
        </Text>

        <View style={styles.checkboxGrid}>
          {renderCheckbox('Trabajo en altura', securityData.riesgoAltura, () =>
            onUpdate({riesgoAltura: !securityData.riesgoAltura}),
          )}
          {renderCheckbox('Riesgo eléctrico', securityData.riesgoElectrico, () =>
            onUpdate({riesgoElectrico: !securityData.riesgoElectrico}),
          )}
          {renderCheckbox(
            'Condiciones climáticas adversas',
            securityData.riesgoClimatico,
            () => onUpdate({riesgoClimatico: !securityData.riesgoClimatico}),
          )}
          {renderCheckbox(
            'Riesgo estructural',
            securityData.riesgoEstructural,
            () => onUpdate({riesgoEstructural: !securityData.riesgoEstructural}),
          )}
        </View>

        <Text style={styles.inputLabel}>Otros riesgos:</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Describa otros riesgos identificados..."
          value={securityData.otrosRiesgos}
          onChangeText={text => onUpdate({otrosRiesgos: text})}
          multiline
          numberOfLines={2}
        />
      </View>

      {/* Observaciones */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Observaciones de Seguridad</Text>
        <TextInput
          style={[styles.textInput, styles.textAreaLarge]}
          placeholder="Ingrese observaciones adicionales sobre seguridad..."
          value={securityData.observacionesSeguridad}
          onChangeText={text => onUpdate({observacionesSeguridad: text})}
          multiline
          numberOfLines={4}
        />
      </View>

      {/* Firma de Conformidad */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.firmaRow}
          onPress={() => onUpdate({firmaConformidad: !securityData.firmaConformidad})}>
          <View
            style={[
              styles.checkboxLarge,
              securityData.firmaConformidad && styles.checkboxLargeChecked,
            ]}>
            {securityData.firmaConformidad && (
              <Text style={styles.checkboxMarkLarge}>✓</Text>
            )}
          </View>
          <View style={styles.firmaTextContainer}>
            <Text style={styles.firmaTitle}>Declaración de Conformidad</Text>
            <Text style={styles.firmaDescription}>
              Confirmo que he verificado las condiciones de seguridad del sitio
              y cuento con los elementos de protección personal necesarios para
              realizar el trabajo de manera segura.
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

export const getDefaultSecurityData = (): SecurityData => ({
  eppCasco: false,
  eppArnes: false,
  eppGuantes: false,
  eppCalzado: false,
  eppLentes: false,
  eppOtros: '',
  condicionesAcceso: '',
  condicionesIluminacion: '',
  condicionesVentilacion: '',
  condicionesSeñalizacion: '',
  riesgoAltura: false,
  riesgoElectrico: false,
  riesgoClimatico: false,
  riesgoEstructural: false,
  otrosRiesgos: '',
  observacionesSeguridad: '',
  firmaConformidad: false,
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  section: {
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#666666',
    marginBottom: 12,
  },
  checkboxGrid: {
    gap: 8,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  checkboxMark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 15,
    color: '#333333',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginTop: 12,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  textAreaLarge: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  condicionRow: {
    marginBottom: 12,
  },
  condicionLabel: {
    fontSize: 14,
    color: '#333333',
    marginBottom: 8,
  },
  condicionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  condicionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  condicionButtonActive: {
    borderColor: 'transparent',
  },
  condicionButtonBueno: {
    backgroundColor: '#34C759',
  },
  condicionButtonRegular: {
    backgroundColor: '#FF9500',
  },
  condicionButtonMalo: {
    backgroundColor: '#FF3B30',
  },
  condicionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666666',
  },
  condicionButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  firmaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkboxLarge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxLargeChecked: {
    backgroundColor: '#34C759',
    borderColor: '#34C759',
  },
  checkboxMarkLarge: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  firmaTextContainer: {
    flex: 1,
  },
  firmaTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  firmaDescription: {
    fontSize: 13,
    color: '#666666',
    lineHeight: 18,
  },
  bottomPadding: {
    height: 24,
  },
});
