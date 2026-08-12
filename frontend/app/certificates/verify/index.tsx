import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
  ScrollView,
  Image,
  ActivityIndicator,
  Linking,
  Modal,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  AlertCircle,
  Download,
  Award,
  BookOpen,
  User,
  Hash,
  Calendar,
  Building2,
  Sparkles,
  ChevronRight,
  UserCheck,
  UserPlus,
  X,
  FileCheck,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://studentalumni.ai';

const SAMPLE_CERT_IDS = [
  { label: 'SA-EXC-2026-0002 (Excellence)', id: 'SA-EXC-2026-0002' },
  { label: 'SA-FAC-2026-0001 (Faculty)', id: 'SA-FAC-2026-0001' },
  { label: 'SA-AMB-2026-0012 (Ambassador)', id: 'SA-AMB-2026-0012' },
  { label: 'ECHO26-P-0001 (Specialization)', id: 'ECHO26-P-0001' },
];

export default function CertificateVerifyPortal() {
  const { id: queryId } = useLocalSearchParams<{ id?: string }>();
  const [searchId, setSearchId] = useState(queryId || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [showSignupModal, setShowSignupModal] = useState(false);

  const handleVerify = async (idToVerify?: string) => {
    const targetId = (idToVerify || searchId).trim();
    if (!targetId) {
      setError('Please enter a valid Certificate Unique ID or SA Member ID');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const resp = await fetch(`${API_BASE}/api/certificates/verify/${encodeURIComponent(targetId)}`);
      const data = await resp.json();

      if (!resp.ok) {
        setError(data.detail || 'Credential not found. Please verify the ID.');
      } else {
        setResult(data);
        if (data.type === 'certificate' && !data.is_registered_member) {
          setTimeout(() => setShowSignupModal(true), 1200);
        }
      }
    } catch (err) {
      setError('Network connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (queryId) {
      setSearchId(queryId);
      handleVerify(queryId);
    }
  }, [queryId]);

  const downloadCertificate = (url: string, name: string) => {
    const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;
    if (Platform.OS === 'web') {
      const link = document.createElement('a');
      link.href = fullUrl;
      link.target = '_blank';
      link.download = `${name.replace(/\s+/g, '_')}_Certificate.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      Linking.openURL(fullUrl);
    }
  };

  const downloadBGVReport = (memberData: any) => {
    const reportContent = `STUDENT ALUMNI NETWORK — BACKGROUND VERIFICATION (BGV) REPORT
});
