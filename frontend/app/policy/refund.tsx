import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LegalShell from '@/src/views/web/policy/LegalShell';
import { FONTS } from '@/src/views/web/portals/superadmin/tokens';

export default function RefundPage() {
  return (
    <LegalShell title="Refund Policy">
      <Text style={s.effective}>Effective: May 16, 2026</Text>

      <Text style={s.h2}>1. Overview</Text>
      <Text style={s.p}>
        This Refund Policy governs all paid services, subscriptions, and transactions on the Student Alumni platform.
      </Text>

      <Text style={s.h2}>2. Subscription Services</Text>
      <Text style={s.p}>
        Monthly and annual subscriptions can be cancelled at any time. You will continue to have access to paid features until the end of the current billing period. No partial refunds are provided for unused portions of a billing period.
      </Text>

      <Text style={s.h2}>3. One-Time Payments</Text>
      <Text style={s.p}>
        One-time payments for events, workshops, or services are non-refundable unless the event is cancelled by the organiser. If an event is cancelled, you will receive a full refund within 14 business days.
      </Text>

      <Text style={s.h2}>4. Mentor Session Credits</Text>
      <Text style={s.p}>
        SA Credits used for mentor sessions are refundable if the session is cancelled at least 24 hours in advance. Late cancellations or no-shows are non-refundable.
      </Text>

      <Text style={s.h2}>5. Refund Processing</Text>
      <Text style={s.p}>
        Approved refunds are processed within 5-14 business days and will be credited to the original payment method. You will receive a confirmation email once the refund is initiated.
      </Text>

      <Text style={s.h2}>6. Exceptions</Text>
      <Text style={s.p}>
        Refund exceptions may be granted on a case-by-case basis for technical issues, duplicate charges, or extenuating circumstances. Contact support@studentalumni.ai for assistance.
      </Text>

      <Text style={s.h2}>7. Dispute Resolution</Text>
      <Text style={s.p}>
        If you disagree with a refund decision, you may appeal by contacting refunds@studentalumni.ai within 30 days of the transaction. We will review your case within 10 business days.
      </Text>
    </LegalShell>
  );
}

const s = StyleSheet.create({
  effective: { color: '#64748b', fontFamily: FONTS.med, fontSize: 13, marginBottom: 24, fontStyle: 'italic' },
  h2: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 18, marginTop: 24, marginBottom: 8 },
  p: { color: '#94a3b8', fontFamily: FONTS.med, fontSize: 14, lineHeight: 22, marginBottom: 8 },
});
