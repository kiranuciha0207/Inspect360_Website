import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  TextInput, 
  ScrollView, 
  Alert,
  SafeAreaView,
  StatusBar
} from 'react-native';
import CryptoJS from 'crypto-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function App() {
  const [insideGeofence, setInsideGeofence] = useState(false);
  const [geofenceDistance, setGeofenceDistance] = useState(null);
  const [headcount, setHeadcount] = useState('114');
  const [remarks, setRemarks] = useState('');
  const [sealedHash, setSealedHash] = useState(null);
  const [queueCount, setQueueCount] = useState(0);

  // Target Facility: Dr. Ambedkar Residential SC Boys Hostel, Ranchi
  const FACILITY = {
    id: "FAC-JH-001",
    name: "Dr. Ambedkar Residential SC Boys Hostel",
    lat: 23.3441,
    lng: 85.3096,
    radius: 150
  };

  useEffect(() => {
    checkQueue();
  }, []);

  const checkQueue = async () => {
    try {
      const q = await AsyncStorage.getItem('inspect360_offline_queue');
      if (q) setQueueCount(JSON.parse(q).length);
    } catch (e) {
      console.error(e);
    }
  };

  // Haversine formula calculation
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000; // meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  };

  const verifyGeofence = () => {
    // Simulated inspector GPS telemetry coordinates: 23.3442 N, 85.3095 E (18.5m away)
    const currentLat = 23.3442;
    const currentLng = 85.3095;

    const dist = calculateDistance(currentLat, currentLng, FACILITY.lat, FACILITY.lng);
    const inside = dist <= FACILITY.radius;

    setGeofenceDistance(dist);
    setInsideGeofence(inside);

    if (inside) {
      Alert.alert("Geofence Verified", `Inspector verified within ${dist}m of facility.`);
    } else {
      Alert.alert("Perimeter Breach", `Device is ${dist}m away from the 150m boundary.`);
    }
  };

  const submitInspection = async () => {
    if (!insideGeofence) {
      Alert.alert("Hardware Geofence Lock", "Submission blocked: You must be physically within the 150m cadastral boundary.");
      return;
    }

    const payload = {
      inspection_id: "INSP-2026-RN01",
      facility_id: FACILITY.id,
      headcount: parseInt(headcount, 10),
      remarks,
      geofence_distance_m: geofenceDistance,
      timestamp: new Date().toISOString()
    };

    // Generate SHA-256 Cryptographic Tamper Seal
    const hash = CryptoJS.SHA256(JSON.stringify(payload)).toString();
    payload.sha256_hash = hash;
    setSealedHash(hash);

    // Store in offline AsyncStorage queue
    try {
      const existing = await AsyncStorage.getItem('inspect360_offline_queue');
      const queue = existing ? JSON.parse(existing) : [];
      queue.push(payload);
      await AsyncStorage.setItem('inspect360_offline_queue', JSON.stringify(queue));
      setQueueCount(queue.length);
      Alert.alert("Inspection Sealed", `Audit sealed with SHA-256: ${hash.substring(0, 16)}...`);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <ScrollView contentContainerStyle={styles.scroll}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Inspect360 Field PWA</Text>
          <Text style={styles.subtitle}>Ministry of Social Justice & Empowerment • SIH26095</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>React Native Offline Unit (Queue: {queueCount})</Text>
          </View>
        </View>

        {/* Facility Card */}
        <View style={styles.card}>
          <Text style={styles.cardTag}>ACTIVE ASSIGNMENT</Text>
          <Text style={styles.cardTitle}>{FACILITY.name}</Text>
          <Text style={styles.cardSub}>Ranchi, Jharkhand • Cadastral Geofence: 150m</Text>
        </View>

        {/* 150m Cadastral Geofence Lock */}
        <View style={styles.geofenceBox}>
          <Text style={styles.sectionTitle}>Cadastral Geofence Hardware Lock</Text>
          <Text style={styles.geoText}>
            {geofenceDistance !== null 
              ? (insideGeofence ? `✓ Verified: ${geofenceDistance}m from facility` : `⚠ Outside boundary: ${geofenceDistance}m`) 
              : "Tap below to validate hardware GPS presence within 150m."}
          </Text>
          <TouchableOpacity style={styles.btnPrimary} onPress={verifyGeofence}>
            <Text style={styles.btnText}>Validate GPS Telemetry</Text>
          </TouchableOpacity>
        </View>

        {/* Form Fields */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Verified Headcount</Text>
          <TextInput 
            style={styles.input} 
            value={headcount} 
            onChangeText={setHeadcount} 
            keyboardType="numeric" 
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Auditor Observations & Notes</Text>
          <TextInput 
            style={[styles.input, styles.textArea]} 
            value={remarks} 
            onChangeText={setRemarks} 
            placeholder="Verified food stock, dining sanitation, and dormitory registers."
            placeholderTextColor="#64748b"
            multiline 
          />
        </View>

        {/* Submit */}
        <TouchableOpacity style={styles.btnSuccess} onPress={submitInspection}>
          <Text style={styles.btnText}>Seal & Submit (SHA-256)</Text>
        </TouchableOpacity>

        {sealedHash && (
          <View style={styles.hashBox}>
            <Text style={styles.hashTitle}>✓ Cryptographic Seal Generated:</Text>
            <Text style={styles.hashText}>{sealedHash}</Text>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  scroll: { padding: 16 },
  header: { marginBottom: 16 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  badge: { marginTop: 6, backgroundColor: '#1e293b', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { color: '#38bdf8', fontSize: 11, fontWeight: 'bold' },
  card: { backgroundColor: '#1e293b', padding: 16, borderRadius: 12, marginBottom: 16 },
  cardTag: { color: '#38bdf8', fontSize: 10, fontWeight: 'bold' },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginTop: 4 },
  cardSub: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  geofenceBox: { backgroundColor: '#1e293b', padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#334155' },
  sectionTitle: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginBottom: 6 },
  geoText: { color: '#cbd5e1', fontSize: 12, marginBottom: 12 },
  btnPrimary: { backgroundColor: '#0284c7', padding: 12, borderRadius: 8, alignItems: 'center' },
  btnSuccess: { backgroundColor: '#10b981', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  formGroup: { marginBottom: 14 },
  label: { color: '#e2e8f0', fontSize: 12, fontWeight: '600', marginBottom: 6 },
  input: { backgroundColor: '#1e293b', color: '#fff', borderRadius: 8, padding: 10, fontSize: 13, borderWidth: 1, borderColor: '#334155' },
  textArea: { height: 80, textAlignVertical: 'top' },
  hashBox: { marginTop: 16, padding: 12, backgroundColor: '#064e3b', borderRadius: 8 },
  hashTitle: { color: '#34d399', fontWeight: 'bold', fontSize: 12 },
  hashText: { color: '#e2e8f0', fontSize: 10, fontFamily: 'monospace', marginTop: 4 }
});
