import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import RegistryDemo from './RegistryDemo';

interface RegistryDemoPageProps {
  onBackToHome: () => void;
}

export default function RegistryDemoPage({ onBackToHome }: RegistryDemoPageProps) {
  const [showDemo, setShowDemo] = useState(false);

  if (showDemo) {
    return <RegistryDemo />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBackToHome}>
            <Text style={styles.backButtonText}>← Back to Home</Text>
          </TouchableOpacity>
          <Text style={styles.title}>🎯 Registry Service Demo</Text>
          <Text style={styles.subtitle}>Test the new Registry Service integration</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>What's New?</Text>
            <Text style={styles.infoText}>
              We've integrated a new Registry Service that allows users to:
            </Text>
            <View style={styles.featureList}>
              <Text style={styles.featureItem}>🔍 Search products across multiple stores</Text>
              <Text style={styles.featureItem}>🔥 View trending products</Text>
              <Text style={styles.featureItem}>🏪 Connect with retail stores</Text>
              <Text style={styles.featureItem}>📱 Manage product registries</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.demoButton}
            onPress={() => setShowDemo(true)}
          >
            <Text style={styles.demoButtonText}>🚀 Launch Registry Demo</Text>
          </TouchableOpacity>

          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>Service Status</Text>
            <Text style={styles.statusText}>
              ✅ Main Backend: Running on port 3001
            </Text>
            <Text style={styles.statusText}>
              ✅ Registry Service: Running on port 3002
            </Text>
            <Text style={styles.statusText}>
              ✅ Frontend: Running on port 8081
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: 10,
    backgroundColor: '#3C6FA3',
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
  content: {
    gap: 20,
  },
  infoCard: {
    backgroundColor: 'white',
    padding: 25,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  infoText: {
    fontSize: 16,
    color: '#555',
    marginBottom: 15,
    lineHeight: 24,
  },
  featureList: {
    gap: 8,
  },
  featureItem: {
    fontSize: 16,
    color: '#666',
    marginLeft: 10,
  },
  demoButton: {
    backgroundColor: '#3C6FA3',
    paddingVertical: 18,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  demoButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusCard: {
    backgroundColor: 'white',
    padding: 25,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  statusText: {
    fontSize: 16,
    color: '#555',
    marginBottom: 8,
  },
});
