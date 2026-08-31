import React from 'react';

interface TicketInfo {
  ticketId?: string;
  eventName?: string;
  attendeeName?: string;
  email?: string;
  type?: string;
  amount?: number;
  date?: string;
  venue?: string;
}

interface EchoTicketsConfirmationPageProps {
  initialTab?: string;
  ticketInfo?: TicketInfo;
}

export default function EchoTicketsConfirmationPage({ initialTab, ticketInfo }: EchoTicketsConfirmationPageProps) {
  if (initialTab !== 'success' || !ticketInfo) return null;

  return (
    <div style={{
      position: 'relative',
      zIndex: 10,
      maxWidth: 520,
      margin: '0 auto',
      padding: '40px 24px',
      textAlign: 'center',
    }}>
      <div style={{
        width: 72,
        height: 72,
        borderRadius: '50%',
        background: 'rgba(16,185,129,0.15)',
        border: '2px solid rgba(16,185,129,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 20px',
      }}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2.5">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>

      <h2 style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>
        Booking Confirmed!
      </h2>
      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', margin: '0 0 28px' }}>
        Your ticket has been booked successfully.
      </p>

      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16,
        padding: 20,
        textAlign: 'left',
      }}>
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Ticket ID</span>
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{ticketInfo.ticketId}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Event</span>
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{ticketInfo.eventName}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Attendee</span>
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{ticketInfo.attendeeName}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Email</span>
            <span style={{ color: '#A78BFA', fontSize: 13 }}>{ticketInfo.email}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Type</span>
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{ticketInfo.type}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Amount</span>
            <span style={{ color: '#34D399', fontSize: 13, fontWeight: 700 }}>₹{ticketInfo.amount?.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Date</span>
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{ticketInfo.date}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Venue</span>
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 600, textAlign: 'right', maxWidth: '60%' }}>{ticketInfo.venue}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
