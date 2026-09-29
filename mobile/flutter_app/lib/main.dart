import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:crypto/crypto.dart';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;
import 'package:signature/signature.dart';

void main() {
  runApp(const Inspect360App());
}

class Inspect360App extends StatelessWidget {
  const Inspect360App({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Inspect360 PMU Field Inspector',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF0284C7),
          brightness: Brightness.dark,
          surface: const Color(0xFF0F172A),
        ),
      ),
      home: const InspectorHomeScreen(),
    );
  }
}

class InspectorHomeScreen extends StatefulWidget {
  const InspectorHomeScreen({super.key});

  @override
  State<InspectorHomeScreen> createState() => _InspectorHomeScreenState();
}

class _InspectorHomeScreenState extends State<InspectorHomeScreen> {
  final SignatureController _sigController = SignatureController(
    penStrokeWidth: 3,
    penColor: Colors.white,
    exportBackgroundColor: const Color(0xFF1E293B),
  );

  bool _isCheckingGeofence = false;
  bool _insideGeofence = false;
  double _currentDistanceMeters = 0.0;
  String _geofenceMessage = "Tap below to ping GPS telemetry & verify 150m boundary.";
  final int _headcount = 114;
  final TextEditingController _remarksController = TextEditingController();
  String? _sealedHash;

  // Selected target facility: Dr. Ambedkar Residential SC Boys Hostel (Ranchi)
  final double _facilityLat = 23.3441;
  final double _facilityLng = 85.3096;
  final double _cadastralRadius = 150.0;

  Future<void> _verifyCadastralGeofence() async {
    setState(() {
      _isCheckingGeofence = true;
    });

    try {
      // In real field execution, query hardware GPS sensor
      // For demonstration, simulate inspector being at 23.3442, 85.3095 (18 meters away)
      const double simulatedCurrentLat = 23.3442;
      const double simulatedCurrentLng = 85.3095;

      final double distanceInMeters = Geolocator.distanceBetween(
        simulatedCurrentLat,
        simulatedCurrentLng,
        _facilityLat,
        _facilityLng,
      );

      final bool isInside = distanceInMeters <= _cadastralRadius;

      setState(() {
        _insideGeofence = isInside;
        _currentDistanceMeters = distanceInMeters;
        _geofenceMessage = isInside
            ? "✓ Verified! Device is ${distanceInMeters.toStringAsFixed(1)}m from facility (Boundary: 150m)."
            : "⚠ Alert: Device is ${distanceInMeters.toStringAsFixed(1)}m away, outside 150m boundary!";
        _isCheckingGeofence = false;
      });
    } catch (e) {
      setState(() {
        _isCheckingGeofence = false;
        _geofenceMessage = "Error acquiring GPS coordinates: $e";
      });
    }
  }

  void _submitAndSealInspection() {
    if (!_insideGeofence) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("Geofence Lock: You must be within 150m of facility to submit."),
          backgroundColor: Colors.redAccent,
        ),
      );
      return;
    }

    final payload = {
      "inspection_id": "INSP-2026-091",
      "facility_id": "FAC-JH-001",
      "reported_headcount": _headcount,
      "remarks": _remarksController.text,
      "geofence_distance": _currentDistanceMeters,
      "timestamp": DateTime.now().toUtc().toIso8601String(),
    };

    final bytes = utf8.encode(jsonEncode(payload));
    final digest = sha256.convert(bytes);

    setState(() {
      _sealedHash = digest.toString();
    });

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text("Inspection cryptographically sealed with SHA-256 and queued for sync!"),
        backgroundColor: Colors.green,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Inspect360 Field Unit', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            Text('MoSJE • PMU Offline PWA', style: TextStyle(fontSize: 11, color: Colors.grey)),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.cloud_done, color: Colors.greenAccent),
            onPressed: () {},
            tooltip: "Offline Queue: Synced",
          )
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Target Facility Card
            Card(
              color: const Color(0xFF1E293B),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              child: const Padding(
                padding: EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('TARGET FACILITY (SIH26095)', style: TextStyle(fontSize: 10, color: Color(0xFF38BDF8), fontWeight: FontWeight.bold)),
                    SizedBox(height: 4),
                    Text('Dr. Ambedkar Residential SC Boys Hostel', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white)),
                    SizedBox(height: 2),
                    Text('Ranchi, Jharkhand • PM-AJAY Scheme', style: TextStyle(fontSize: 12, color: Colors.grey)),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // 150m Cadastral Geofence Box
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFF1E293B),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: _insideGeofence ? Colors.green.withOpacity(0.5) : Colors.blue.withOpacity(0.3),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.location_on, color: Color(0xFF38BDF8), size: 20),
                      SizedBox(width: 8),
                      Text('150m Cadastral Geofence Hardware Lock', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(_geofenceMessage, style: TextStyle(fontSize: 12, color: _insideGeofence ? Colors.greenAccent : Colors.grey[300])),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF0284C7)),
                      onPressed: _isCheckingGeofence ? null : _verifyCadastralGeofence,
                      icon: _isCheckingGeofence
                          ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : const Icon(Icons.gps_fixed, size: 16),
                      label: Text(_isCheckingGeofence ? "Validating Telemetry..." : "Validate GPS Telemetry"),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Incharge Digital Touch Signature Pad
            const Text("Center Incharge Digital Touch Signature", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
            const SizedBox(height: 8),
            Container(
              height: 140,
              decoration: BoxDecoration(
                border: Border.all(color: Colors.grey[700]!),
                borderRadius: BorderRadius.circular(12),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Signature(
                  controller: _sigController,
                  backgroundColor: const Color(0xFF0B132B),
                ),
              ),
            ),
            Align(
              alignment: Alignment.centerRight,
              child: TextButton(
                onPressed: () => _sigController.clear(),
                child: const Text('Clear Signature', style: TextStyle(fontSize: 11, color: Colors.grey)),
              ),
            ),
            const SizedBox(height: 16),

            // Submit Button
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF10B981),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: _submitAndSealInspection,
                icon: const Icon(Icons.security, color: Colors.white),
                label: const Text("Seal & Submit SHA-256 Dossier", style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
              ),
            ),

            if (_sealedHash != null) ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.green.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.green.withOpacity(0.4)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('✓ Cryptographic Seal Generated', style: TextStyle(color: Colors.greenAccent, fontWeight: FontWeight.bold, fontSize: 12)),
                    const SizedBox(height: 4),
                    SelectableText(_sealedHash!, style: const TextStyle(fontFamily: 'monospace', fontSize: 10, color: Colors.white70)),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
