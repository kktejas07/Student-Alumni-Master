/**
 * /lead-aggregator — Brand Self-Service Portal for the Lead Aggregator (LA6).
 */
import { SafeAreaView } from 'react-native-safe-area-context';
import { LeadAggregatorDashboard } from '@/src/views/web/LeadAggregatorDashboard';

export default function LeadAggregatorRoute() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0A0E1A' }}>
      <LeadAggregatorDashboard />
    </SafeAreaView>
  );
}
