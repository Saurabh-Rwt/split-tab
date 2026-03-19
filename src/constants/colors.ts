export const Colors = {
  primary:         '#6C63FF',
  primaryLight:    '#8B85FF',
  primaryDark:     '#4B44CC',
  success:         '#22C55E',
  danger:          '#EF4444',
  warning:         '#F59E0B',
  info:            '#3B82F6',
  background:      '#0F0F14',
  surface:         '#1A1A24',
  surfaceElevated: '#22222F',
  card:            '#1E1E2C',
  textPrimary:     '#F1F1F5',
  textSecondary:   '#9898B0',
  textMuted:       '#5C5C75',
  border:          '#2A2A3D',
  borderLight:     '#333350',
  avatarColors: [
    '#FF6B6B',
    '#FFB347',
    '#FFD93D',
    '#6BCB77',
    '#4D96FF',
    '#845EC2',
    '#F9A8D4',
    '#94A3B8',
  ] as const,
};

export const Typography = {
  xs:        11,
  sm:        13,
  base:      15,
  md:        17,
  lg:        20,
  xl:        24,
  '2xl':     30,
  '3xl':     36,
  regular:   '400' as const,
  medium:    '500' as const,
  semibold:  '600' as const,
  bold:      '700' as const,
  extrabold: '800' as const,
};

export const Spacing = {
  xs:    4,
  sm:    8,
  md:    12,
  base:  16,
  lg:    20,
  xl:    24,
  '2xl': 32,
  '3xl': 48,
};

export const Radius = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  full: 999,
};