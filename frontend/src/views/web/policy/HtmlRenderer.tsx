import React from 'react';
import { Text, Platform } from 'react-native';
import { FONTS } from '@/src/views/web/portals/superadmin/tokens';

const webStyles = `
  .html-renderer h1 { color: #fff; font-size: 24px; font-weight: 700; margin: 24px 0 8px; font-family: 'DMSans_700Bold', sans-serif; }
  .html-renderer h2 { color: #fff; font-size: 20px; font-weight: 700; margin: 20px 0 8px; font-family: 'DMSans_700Bold', sans-serif; }
  .html-renderer h3 { color: #cbd5e1; font-size: 17px; font-weight: 600; margin: 16px 0 6px; font-family: 'DMSans_600SemiBold', sans-serif; }
  .html-renderer p { color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 8px; font-family: 'DMSans_400Regular', sans-serif; }
  .html-renderer ul, .html-renderer ol { margin: 4px 0; padding-left: 24px; color: #94a3b8; font-size: 14px; line-height: 1.6; font-family: 'DMSans_400Regular', sans-serif; }
  .html-renderer li { margin: 2px 0; }
  .html-renderer strong, .html-renderer b { font-weight: 700; color: #cbd5e1; }
  .html-renderer em { font-style: italic; }
  .html-renderer u { text-decoration: underline; }
  .html-renderer blockquote { border-left: 3px solid #F59E0B; padding-left: 12px; margin: 8px 0; color: #94a3b8; font-style: italic; font-family: 'DMSans_400Regular', sans-serif; }
`;

export default function HtmlRenderer({ html }: { html: string }) {
  if (Platform.OS !== 'web') {
    const stripped = html.replace(/<[^>]*>/g, '');
    return (
      <Text style={{ color: '#94a3b8', fontFamily: FONTS.med, fontSize: 14, lineHeight: 22 }}>
        {stripped}
      </Text>
    );
  }

  return (
    <>
      <style>{webStyles}</style>
      <div className="html-renderer" dangerouslySetInnerHTML={{ __html: html }} />
    </>
  );
}
