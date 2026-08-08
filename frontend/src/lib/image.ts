/**
 * Image helpers for banner / coupon uploads.
 *
 * `uploadImage` uploads a File to the backend and returns a persistent URL.
 * `fileToDataUrl` reads an image File into a base64 data URL (legacy fallback).
 */

import { BASE_URL } from '@/src/models/services/api';

function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem('auth_tokens');
    if (!raw) return {};
    const tokens = JSON.parse(raw);
    const token = tokens?.access_token || tokens?.accessToken || '';
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

/**
 * Upload an image file to the server and return its static URL.
 * @param file - The File object to upload
 * @param folder - Subdirectory under uploads/ (e.g. "ads", "coupons", "general")
 * @returns The uploaded file URL (e.g. "/uploads/ads/12345_photo.jpg")
 */
export async function uploadImage(file: File, folder = 'general'): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const url = `${BASE_URL}/api/admin/upload?folder=${encodeURIComponent(folder)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(err.detail || `Upload failed (${res.status})`);
  }
  const data = await res.json();
  return data.url as string;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function fileToDataUrl(
  file: File,
  maxDimension = 1280,
  quality = 0.82,
): Promise<string> {
  const raw = await readAsDataUrl(file);
  if (typeof document === 'undefined' || typeof window === 'undefined') return raw;
  if (!file.type || !file.type.startsWith('image/')) return raw;
  try {
    const img = new Image();
    img.src = raw;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('decode failed'));
    });
    if (!img.width || !img.height) return raw;
    const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
    if (scale >= 1) return raw;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return raw;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', quality);
  } catch {
    return raw;
  }
}

export function fileNameToLabel(name?: string): string {
  const stem = (name || '')
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .trim();
  return stem || 'Banner';
}
