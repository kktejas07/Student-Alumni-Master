import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { ShoppingCart, Plus, Minus, Tag, Store, PackageX, CheckCircle2 } from 'lucide-react-native';
import { request } from '@/src/models/services/api';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';

let razorpaySDKPromise: Promise<boolean> | null = null;
const loadRazorpaySDK = (): Promise<boolean> => {
  if ((window as any).Razorpay) return Promise.resolve(true);
  if (razorpaySDKPromise) return razorpaySDKPromise;
  razorpaySDKPromise = new Promise<boolean>((resolve) => {
    if (typeof window === 'undefined') { resolve(false); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(!!(window as any).Razorpay);
    script.onerror = () => { resolve(false); };
    document.body.appendChild(script);
  });
  return razorpaySDKPromise;
};

export function EchoMarketplace({ slug, isDark }: { slug: string; isDark: boolean }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [couponCode, setCouponCode] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<any>(null);
  const [qrImage, setQrImage] = useState('');
  const [couponPreview, setCouponPreview] = useState<{ discount: number; code?: string | null; gst?: number; gstSplit?: any; error?: string } | null>(null);
  const [availableCoupons, setAvailableCoupons] = useState<any[]>([]);
  const user = useAuthStore(s => s.user);

  useEffect(() => {
    if (slug) {
      request<any>(`/echo/showcases/${slug}/catalog`)
        .then(res => {
          if (res.success) setItems(res.data || []);
        })
        .finally(() => setLoading(false));
      // Fetch available discount coupons for this event (public endpoint)
      request<any>(`/echo/available-coupons?event_id=${slug}`)
        .then(res => {
          if (res.success && res.data) setAvailableCoupons(res.data.filter((c: any) => c.active !== false));
        })
        .catch(() => {});
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

  const handleCheckout = async () => {
    if (!user) {
      alert("Please login to place an order.");
      return;
    }
    const orderItems = Object.entries(cart).map(([item_id, quantity]) => ({ item_id, quantity }));
    if (orderItems.length === 0) return;

    setCheckoutLoading(true);
    try {
      const payload: any = {
        event_id: slug,
        user_id: user.id,
        items: orderItems,
        user_name: user.full_name || user.name || user.email,
        user_email: user.email,
        user_phone: user.phone,
      };
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
      const isLoaded = await loadRazorpaySDK();
      if (!isLoaded || !(window as any).Razorpay) {
        throw new Error("Razorpay failed to load. Check internet connection and try again.");
      }
      const options = {
        key: res.key_id || process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_YourKeyHere',
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

  const totalItems = Object.values(cart).reduce((a, b) => a + b, 0);
  const cartTotal = Object.entries(cart).reduce((total, [id, qty]) => {
    const item = items.find(i => i.id === id || i._id === id);
    return total + (item ? item.price * qty : 0);
  }, 0);

  useEffect(() => {
    if (!couponCode.trim() || cartTotal <= 0) {
      setCouponPreview(null);
      return;
    }
    let active = true;
    const t = setTimeout(async () => {
      try {
        const res = await request<any>('/echo/orders/coupon-preview', {
          method: 'POST',
          body: {
            code: couponCode.trim(),
            subtotal: cartTotal,
            event_id: slug,
            items: Object.entries(cart).map(([item_id, quantity]) => ({ item_id, quantity })),
          },
        });
        if (!active) return;
        if (res.success) {
          if (res.discount > 0) setCouponPreview({ discount: Number(res.discount) || 0, code: res.code, gst: Number(res.gst) || 0, gstSplit: res.gst_split });
          else setCouponPreview({ discount: 0, code: res.code, gst: Number(res.gst) || 0, gstSplit: res.gst_split, error: 'Coupon not applicable' });
        } else {
          setCouponPreview({ discount: 0, gst: Number(res.gst) || 0, gstSplit: res.gst_split, error: res.error || 'Invalid coupon' });
        }
      } catch (e) {
        if (active) setCouponPreview(null);
      }
    }, 500);
    return () => { active = false; clearTimeout(t); };
  }, [couponCode, cartTotal, slug, cart, items]);

  if (loading) return null;
  if (items.length === 0) return null;

  const gstRateFor = (category?: string): number => {
    const rates: Record<string, number> = { food: 0.05, beverage: 0.05, beverages: 0.05, cafe: 0.05, snacks: 0.05, drink: 0.05, handcraft: 0.12, handicraft: 0.12, merch: 0.18, merchandise: 0.18, stationery: 0.18, apparel: 0.18, accessories: 0.18, electronics: 0.18, health: 0.12 };
    return rates[(category || '').toLowerCase()] ?? 0.18;
  };

  const computeGst = () => {
    let g = 0;
    Object.entries(cart).forEach(([id, qty]) => {
      const item = items.find(i => i.id === id || i._id === id);
      if (item) g += (item.price || 0) * qty * gstRateFor(item.category);
    });
    return Math.round(g * 100) / 100;
  };

  const discount = couponPreview?.discount ?? 0;
  const gstTotal = couponPreview?.gst != null ? couponPreview.gst : computeGst();
  const taxable = Math.max(0, cartTotal - discount);
  const grandTotal = Math.max(0, taxable + gstTotal);

  const isAvailable = (item: any): boolean => {
    if (item.is_active === false) return false;
    const stock = Number(item.stock_limit || 0);
    const remaining = Number(item.stock_remaining ?? stock ?? 0);
    if (stock > 0 && remaining <= 0) return false;
    return true;
  };

  const getImage = (item: any): string => {
    if (item.image_base64) return item.image_base64;
    if (Array.isArray(item.images) && item.images.length) return item.images[0];
    return '';
  };

  const fg = 'var(--text)';
  const border = 'var(--line)';
  const panel = 'var(--panel2)';

  return (
    <div style={{ marginTop: 48, borderTop: `1px solid ${border}`, paddingTop: 44 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
        <span style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(124,92,252,0.14)', border: '1px solid #2E2A55', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
          <ShoppingCart size={20} color="var(--violet-lt)" />
        </span>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: fg, margin: 0, letterSpacing: '-.4px' }}>Event Marketplace</h2>
      </div>
      <p style={{ color: 'var(--muted)', marginBottom: 28, fontSize: 14.5 }}>Pre-order food, beverages, and exclusive handcrafts to collect at the event!</p>

      {/* Available Coupons Banner */}
      {availableCoupons.length > 0 && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
          {availableCoupons.map((c: any) => (
            <div
              key={c._id || c.code}
              onClick={() => { setCouponCode(c.code); setCouponPreview(null); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'linear-gradient(135deg, rgba(124,92,252,0.15), rgba(99,102,241,0.08))',
                border: '1px solid rgba(124,92,252,0.3)', borderRadius: 12,
                padding: '10px 16px', cursor: 'pointer', transition: 'all .15s ease',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(124,92,252,0.6)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(124,92,252,0.3)'; }}
            >
              <Tag size={14} color="var(--violet-lt)" />
              <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13, color: 'var(--violet-lt)', letterSpacing: 1 }}>{c.code}</span>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>—</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
                {c.discount_type === 'percentage' ? `${c.discount_value}% OFF` : `₹${c.discount_value} OFF`}
              </span>
              {c.min_order_value > 0 && (
                <span style={{ fontSize: 10, color: 'var(--muted)' }}>Min ₹{c.min_order_value}</span>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
        {items.map(item => {
          const id = item.id || item._id;
          const qty = cart[id] || 0;
          const img = getImage(item);
          const available = isAvailable(item);
          const stockLeft = Number(item.stock_remaining ?? item.stock_limit ?? 0);
          const lowStock = available && Number(item.stock_limit || 0) > 0 && stockLeft <= 5;
          return (
            <div
              key={id}
              style={{
                position: 'relative',
                overflow: 'hidden',
                border: `1px solid ${available ? 'var(--line)' : 'var(--line)'}`,
                borderRadius: 18,
                background: panel,
                display: 'flex',
                flexDirection: 'column',
                opacity: available ? 1 : 0.55,
                boxShadow: isDark ? '0 10px 30px rgba(0,0,0,0.35)' : '0 6px 20px rgba(0,0,0,0.06)',
              }}
            >
              {/* Image */}
              <div style={{ height: 170, background: 'var(--panel)', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {img ? (
                  <img src={img} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
                ) : (
                  <PackageX size={40} color="var(--line2)" />
                )}
              </div>

              <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--violet-lt)', background: 'rgba(124,92,252,0.12)', border: '1px solid rgba(124,92,252,0.25)', borderRadius: 100, padding: '4px 10px' }}>
                    {item.category}
                  </span>
                  {item.vendor_name && (
                    <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--ok, #34D399)', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)', borderRadius: 100, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Store size={10} color="var(--ok, #34D399)" />
                      {item.vendor_name}
                    </span>
                  )}
                  {!available && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text)', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: 100, padding: '3px 9px' }}>OUT OF STOCK</span>
                  )}
                </div>

                <div style={{ fontSize: 17, fontWeight: 700, color: fg, lineHeight: 1.3 }}>{item.name}</div>

                {item.description ? (
                  <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5, minHeight: 38 }}>{item.description}</div>
                ) : (
                  <div style={{ minHeight: 38 }} />
                )}

                {(item.stall_no || item.stall_location) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted)' }}>
                    <Store size={13} color="var(--violet-lt)" />
                    <span>{item.stall_no ? `Stall ${item.stall_no}` : ''}{item.stall_no && item.stall_location ? ' · ' : ''}{item.stall_location || ''}</span>
                  </div>
                )}

                {item.servings && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--violet-lt)', fontWeight: 600 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                    <span>{item.servings}</span>
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 12 }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: fg }}>
                    ₹{item.price}
                  </div>

                  {qty === 0 ? (
                    <button
                      onClick={() => available && updateCart(id, 1)}
                      disabled={!available}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 7,
                        background: 'var(--violet)', color: '#fff',
                        padding: '9px 16px', borderRadius: 11, border: 'none',
                        fontWeight: 700, fontSize: 13.5, cursor: available ? 'pointer' : 'not-allowed',
                        opacity: available ? 1 : 0.5,
                      }}
                    >
                      <ShoppingCart size={15} /> Add to Cart
                    </button>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--panel)', border: `1px solid ${border}`, padding: '4px 6px', borderRadius: 11 }}>
                      <button onClick={() => updateCart(id, -1)} style={{ background: 'transparent', border: 'none', color: fg, cursor: 'pointer', padding: 4, display: 'flex' }}><Minus size={16} color={fg} /></button>
                      <span style={{ fontSize: 16, fontWeight: 700, color: fg, minWidth: 20, textAlign: 'center' }}>{qty}</span>
                      <button onClick={() => updateCart(id, 1)} style={{ background: 'transparent', border: 'none', color: fg, cursor: 'pointer', padding: 4, display: 'flex' }}><Plus size={16} color={fg} /></button>
                    </div>
                  )}
                </div>

                {lowStock && (
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--warn, #F59E0B)' }}>Only {stockLeft} left</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {totalItems > 0 && (
        <div style={{ marginTop: 36, padding: 24, background: panel, borderRadius: 18, border: `1px solid ${border}` }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: fg, marginBottom: 16 }}>Your Cart <span style={{ color: 'var(--violet-lt)', fontSize: 14, fontWeight: 600 }}>({totalItems} items)</span></h3>
          <div style={{ marginBottom: 20 }}>
            {Object.entries(cart).map(([id, qty]) => {
              const item = items.find(i => i.id === id || i._id === id);
              if (!item) return null;
              const img = getImage(item);
              return (
                <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, padding: 10, border: `1px solid ${border}`, borderRadius: 12, background: 'var(--panel)' }}>
                  {img ? (
                    <img src={img} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: 44, height: 44, borderRadius: 8, background: 'var(--line2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><PackageX size={18} color="var(--muted)" /></div>
                  )}
                  <span style={{ flex: 1, fontSize: 14, color: fg }}>{qty}x {item.name}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: fg }}>₹{item.price * qty}</span>
                </div>
              );
            })}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, fontSize: 14, color: fg }}>
              <span>Subtotal</span>
              <span>₹{cartTotal}</span>
            </div>
            {discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 6, fontSize: 14, color: '#10B981' }}>
                <span>Coupon discount{couponPreview?.code ? ` (${couponPreview.code})` : ''}</span>
                <span>− ₹{discount}</span>
              </div>
            )}
            {gstTotal > 0 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 6, fontSize: 14, color: 'var(--muted)' }}>
                  <span>Taxable</span>
                  <span>₹{taxable}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 6, fontSize: 13.5, color: 'var(--muted)' }}>
                  <span>CGST</span>
                  <span>₹{(gstTotal / 2).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 6, fontSize: 13.5, color: 'var(--muted)' }}>
                  <span>SGST</span>
                  <span>₹{(gstTotal / 2).toFixed(2)}</span>
                </div>
              </>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, paddingTop: 16, borderTop: `1px solid ${border}`, fontSize: 20, fontWeight: 800, color: fg }}>
              <span>Total (incl. GST)</span>
              <span>₹{grandTotal}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, border: `1px solid ${border}`, borderRadius: 11, padding: '0 12px', background: 'var(--panel)' }}>
              <Tag size={15} color="var(--violet-lt)" />
              <input
                type="text"
                placeholder="Coupon Code"
                value={couponCode}
                onChange={e => setCouponCode(e.target.value)}
                style={{ flex: 1, padding: '11px 8px', border: 'none', background: 'transparent', color: fg, outline: 'none' }}
              />
            </div>
          </div>
          {couponPreview?.error && (
            <div style={{ fontSize: 12.5, fontWeight: 600, color: '#EF4444', marginBottom: 10 }}>{couponPreview.error}</div>
          )}
          {discount > 0 && (
            <div style={{ fontSize: 12.5, fontWeight: 600, color: '#10B981', marginBottom: 10 }}>
              Coupon applied — save ₹{discount}
            </div>
          )}

          <button
            onClick={handleCheckout}
            disabled={checkoutLoading}
            style={{ width: '100%', background: '#10B981', color: '#FFF', padding: '15px 20px', borderRadius: 12, border: 'none', fontSize: 16, fontWeight: 700, cursor: checkoutLoading ? 'not-allowed' : 'pointer', opacity: checkoutLoading ? 0.7 : 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <ShoppingCart size={18} />
            {checkoutLoading ? 'Processing...' : 'Checkout & Pay'}
          </button>
        </div>
      )}

      {placedOrder && (
        <div style={{ marginTop: 36, padding: 24, background: panel, borderRadius: 18, border: `1px solid ${border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <CheckCircle2 size={22} color="#10B981" />
            <h3 style={{ fontSize: 18, fontWeight: 700, color: fg, margin: 0 }}>Your Pickup QR</h3>
          </div>
          <p style={{ color: 'var(--muted)', marginBottom: 20, fontSize: 14 }}>
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
              <div style={{ width: 180, height: 180, borderRadius: 12, backgroundColor: 'var(--panel)', border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
                Loading QR…
              </div>
            )}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--violet-lt)', letterSpacing: 0.5 }}>Order ID</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: fg, marginTop: 4, fontFamily: 'monospace' }}>{placedOrder.id}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 12 }}>
                Keep this handy until you collect your items.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
