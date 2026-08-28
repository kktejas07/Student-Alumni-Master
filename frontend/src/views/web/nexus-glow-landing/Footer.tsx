import React from 'react';
import CommonFooter from '@/src/views/components/CommonFooter';

interface FooterProps {
  onTabChange?: (tab: 'home' | 'echo' | 'verify' | 'contact') => void;
  maxWidth?: number;
}

export function Footer({ onTabChange, maxWidth }: FooterProps) {
  return <CommonFooter onTabChange={onTabChange} maxWidth={maxWidth} />;
}

export default Footer;