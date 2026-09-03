import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { ShoppingCart, Plus, Minus, Tag } from 'lucide-react-native';
import { request } from '@/src/models/services/api';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';

export function EchoMarketplace({ slug, isDark }: { slug: string; isDark: boolean }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [couponCode, setCouponCode] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<any>(null);
  const [qrImage, setQrImage] = useState('');
  const user = useAuthStore(s => s.user);

  useEffect(() => {
    if (slug) {
      request<any>(`/echo/showcases/${slug}/catalog`)
        .then(res => {
          if (res.success) setItems(res.data || []);
        })
        .finally(() => setLoading(false));
    }
  }, [slug]);

  const updateCart = (id: string, diff: number) => {
    setCart(prev => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + diff);
      const newCart = { ...prev };
      if (next === 0) delete newCart[id];
      else newCart[id] = next;
      return newCart;
    });
  };

  const markPlaced = async (orderId: string) => {
    setPlacedOrder({ id: orderId });
    setCart({});
    setCouponCode('');
    try {
      const res = await request<any>(`/echo/orders/${orderId}/qr`);
      if (res.success) setQrImage(res.qr_image || '');
    } catch (e) {
      console.error('Failed to load pickup QR', e);
    }
  };

  const handleCheckout = async () => {    if (!user) {
      alert("Please login to place an order.");
      return;
    }
    const orderItems = Object.entries(cart).map(([item_id, quantity]) => ({ item_id, quantity }));
    if (orderItems.length === 0) return;

    setCheckoutLoading(true);
    try {
      const payload: any = { event_id: slug, user_id: user.id, items: orderItems };
      if (couponCode.trim()) payload.coupon_code = couponCode.trim();

      const res = await request<any>(`/echo/orders/checkout`, { method: 'POST', body: payload });
      if (!res.success) {
        alert(res.error || "Checkout failed");
        setCheckoutLoading(false);
        return;
      }
      
      if (res.amount === 0) {
        alert("Order placed successfully! It was free.");
        await markPlaced(res.order_id);
        setCheckoutLoading(false);
        return;
      }

      // Initiate Razorpay
      const options = {
        key: process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_YourKeyHere',
        amount: res.razorpay_order.amount,
        currency: "INR",
        name: "ECHO Marketplace",
        description: "Food & Handcrafts",
        order_id: res.razorpay_order.id,
        handler: async function (response: any) {
           try {
             const verify = await request<any>(`/echo/orders/verify-payment`, {
               method: 'POST',
               body: {
                 order_id: res.order_id,
                 razorpay_order_id: res.razorpay_order.id,
                 razorpay_payment_id: response.razorpay_payment_id,
                 razorpay_signature: response.razorpay_signature,
               },
             });
             if (verify.success) {
               alert("Payment successful! Your order has been placed.");
               await markPlaced(res.order_id);
             } else {
               alert("Payment completed but verification failed. Contact support with your order ID: " + res.order_id);
             }
           } catch (e: any) {
             alert("Payment completed but verification failed. Contact support with your order ID: " + res.order_id);
           }
           setCart({});
           setCouponCode('');
        },
        prefill: {
          name: user.name,
          email: user.email,
        },
        theme: {
          color: "#5B4FE9"
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (resp: any) {
        alert("Payment failed.");
      });
      rzp.open();
    } catch (e: any) {
      alert("Checkout error: " + e.message);
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (loading) return null;
  if (items.length === 0) return null;

  const totalItems = Object.values(cart).reduce((a, b) => a + b, 0);
  const cartTotal = Object.entries(cart).reduce((total, [id, qty]) => {
    const item = items.find(i => i.id === id || i._id === id);
    return total + (item ? item.price * qty : 0);
  }, 0);

  const fg = isDark ? '#FFF' : '#000';
  const bg = isDark ? 'rgba(255,255,255,0.05)' : '#FFF';
  const border = isDark ? '#333' : '#E5E5EA';

  return (
    <div style={{ marginTop: 40, borderTop: `1px solid ${border}`, paddingTop: 40 }}>
      <h2 style={{ fontSize: 24, fontWeight: 700, color: fg, marginBottom: 20 }}>Event Marketplace</h2>
      <p style={{ color: isDark ? '#aaa' : '#666', marginBottom: 24 }}>Pre-order food, beverages, and exclusive handcrafts to collect at the event!</p>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
        {items.map(item => {
          const id = item.id || item._id;
          const qty = cart[id] || 0;
          return (
            <div key={id} style={{ padding: 20, background: bg, borderRadius: 16, border: `1px solid ${border}` }}>
              <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', color: '#5B4FE9', marginBottom: 8 }}>{item.category}</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: fg, marginBottom: 4 }}>{item.name}</h3>
              <div style={{ fontSize: 14, color: isDark ? '#aaa' : '#666', marginBottom: 16 }}>₹{item.price}</div>
              {item.description && <p style={{ fontSize: 13, color: isDark ? '#888' : '#666', marginBottom: 20 }}>{item.description}</p>}
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {qty === 0 ? (
                  <button onClick={() => updateCart(id, 1)} style={{ background: '#5B4FE9', color: '#FFF', padding: '8px 16px', borderRadius: 8, border: 'none', fontWeight: 600, cursor: 'pointer' }}>Add to Cart</button>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: isDark ? '#222' : '#F5F5F7', padding: '4px 8px', borderRadius: 8 }}>
                    <button onClick={() => updateCart(id, -1)} style={{ background: 'transparent', border: 'none', color: fg, cursor: 'pointer', padding: 4 }}><Minus size={16} color={fg}/></button>
                    <span style={{ fontSize: 16, fontWeight: 600, color: fg, width: 20, textAlign: 'center' }}>{qty}</span>
                    <button onClick={() => updateCart(id, 1)} style={{ background: 'transparent', border: 'none', color: fg, cursor: 'pointer', padding: 4 }}><Plus size={16} color={fg}/></button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {totalItems > 0 && (
        <div style={{ marginTop: 40, padding: 24, background: isDark ? '#1a1a24' : '#F8F9FA', borderRadius: 16, border: `1px solid ${border}` }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: fg, marginBottom: 16 }}>Your Cart</h3>
          <div style={{ marginBottom: 20 }}>
            {Object.entries(cart).map(([id, qty]) => {
              const item = items.find(i => i.id === id || i._id === id);
              if (!item) return null;
              return (
                <div key={id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14, color: fg }}>
                  <span>{qty}x {item.name}</span>
                  <span>₹{item.price * qty}</span>
                </div>
              );
            })}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, paddingTop: 16, borderTop: `1px solid ${border}`, fontSize: 18, fontWeight: 700, color: fg }}>
              <span>Total</span>
              <span>₹{cartTotal}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
            <input 
              type="text" 
              placeholder="Coupon Code" 
              value={couponCode} 
              onChange={e => setCouponCode(e.target.value)}
              style={{ flex: 1, padding: '10px 16px', borderRadius: 8, border: `1px solid ${border}`, background: isDark ? '#000' : '#FFF', color: fg }}
            />
          </div>

          <button 
            onClick={handleCheckout} 
            disabled={checkoutLoading}
            style={{ width: '100%', background: '#10B981', color: '#FFF', padding: '14px 20px', borderRadius: 12, border: 'none', fontSize: 16, fontWeight: 700, cursor: checkoutLoading ? 'not-allowed' : 'pointer', opacity: checkoutLoading ? 0.7 : 1 }}
          >
            {checkoutLoading ? 'Processing...' : 'Checkout & Pay'}
          </button>
        </div>
      )}

      {placedOrder && (
        <div style={{ marginTop: 40, padding: 24, background: isDark ? '#1a1a24' : '#F8F9FA', borderRadius: 16, border: `1px solid ${border}` }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: fg, marginBottom: 8 }}>Your Pickup QR</h3>
          <p style={{ color: isDark ? '#aaa' : '#666', marginBottom: 20, fontSize: 14 }}>
            Show this QR at the stall when collecting your food & beverages. The vendor will scan it to confirm.
          </p>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
            {qrImage ? (
              <img
                src={`data:image/png;base64,${qrImage}`}
                alt="Pickup QR"
                style={{ width: 180, height: 180, borderRadius: 12, border: `1px solid ${border}`, background: '#fff' }}
              />
            ) : (
              <div style={{ width: 180, height: 180, borderRadius: 12, backgroundColor: isDark ? '#000' : '#EEE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isDark ? '#666' : '#999' }}>
                Loading QR…
              </div>
            )}
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', color: '#5B4FE9', letterSpacing: 0.5 }}>Order ID</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: fg, marginTop: 4, fontFamily: 'monospace' }}>{placedOrder.id}</div>
              <div style={{ fontSize: 13, color: isDark ? '#888' : '#666', marginTop: 12 }}>
                Keep this handy until you collect your items.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
