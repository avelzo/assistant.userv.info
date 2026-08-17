import { ImageResponse } from 'next/og';
import { OgBrandMark } from '@/lib/brand/og-mark';

export const runtime = 'edge';
export const size = {
  width: 512,
  height: 512,
};
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(<OgBrandMark size={512} />, { ...size });
}
