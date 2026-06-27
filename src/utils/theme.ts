import { StyleSheet } from 'react-native';

export const colors = {
  bgPrimary: '#1a1a2e',
  bgSecondary: '#16213e',
  bgSidebar: '#0f0f1a',
  bgCard: 'rgba(255, 255, 255, 0.06)',
  bgHover: 'rgba(255, 255, 255, 0.1)',
  bgActive: 'rgba(0, 164, 220, 0.15)',
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255, 255, 255, 0.6)',
  textMuted: 'rgba(255, 255, 255, 0.4)',
  accent: '#00A4DC',
  accentHover: '#00b8f0',
  border: 'rgba(255, 255, 255, 0.08)',
  danger: '#dc2626',
} as const;

export const sharedStyles = StyleSheet.create({
  pageLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyState: {
    textAlign: 'center',
    padding: 60,
    color: colors.textMuted,
    fontSize: 15,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  endMarker: {
    textAlign: 'center',
    padding: 32,
    color: colors.textMuted,
    fontSize: 14,
  },
});
