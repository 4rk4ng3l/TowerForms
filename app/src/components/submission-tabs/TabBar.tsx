import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {FormSections, SectionType} from '@core/entities/Form';

export type TabType = 'principal' | SectionType;

interface Tab {
  key: TabType;
  label: string;
  required: boolean;
  completed: boolean;
}

interface TabBarProps {
  sections: FormSections | null;
  activeTab: TabType;
  onTabPress: (tab: TabType) => void;
  tabProgress: {[key in TabType]?: {completed: boolean; progress: number}};
}

export function TabBar({sections, activeTab, onTabPress, tabProgress}: TabBarProps) {
  // Build tabs array based on sections configuration
  const tabs: Tab[] = [
    {
      key: 'principal',
      label: 'Principal',
      required: true,
      completed: tabProgress.principal?.completed || false,
    },
  ];

  // Add inventory tab if configured
  if (sections?.inventory?.required) {
    tabs.push({
      key: 'inventory',
      label: sections.inventory.label || 'Inventario',
      required: sections.inventory.required,
      completed: tabProgress.inventory?.completed || false,
    });
  }

  // Add torque tab if configured
  if (sections?.torque?.required) {
    tabs.push({
      key: 'torque',
      label: sections.torque.label || 'Torque',
      required: sections.torque.required,
      completed: tabProgress.torque?.completed || false,
    });
  }

  // Add security tab if configured
  if (sections?.security?.required) {
    tabs.push({
      key: 'security',
      label: sections.security.label || 'Seguridad',
      required: sections.security.required,
      completed: tabProgress.security?.completed || false,
    });
  }

  return (
    <View style={styles.container}>
      {tabs.map(tab => (
        <TouchableOpacity
          key={tab.key}
          style={[
            styles.tab,
            activeTab === tab.key && styles.tabActive,
          ]}
          onPress={() => onTabPress(tab.key)}>
          <View style={styles.tabContent}>
            <Text
              style={[
                styles.tabText,
                activeTab === tab.key && styles.tabTextActive,
              ]}
              numberOfLines={1}>
              {tab.label}
            </Text>
            {tab.completed && (
              <View style={styles.completedIndicator}>
                <Text style={styles.completedText}>✓</Text>
              </View>
            )}
          </View>
          {activeTab === tab.key && <View style={styles.activeIndicator} />}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingHorizontal: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    position: 'relative',
  },
  tabActive: {
    backgroundColor: '#F0F7FF',
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666666',
  },
  tabTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  completedIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#34C759',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 8,
    right: 8,
    height: 3,
    backgroundColor: '#007AFF',
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
});
