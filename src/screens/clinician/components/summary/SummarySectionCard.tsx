import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { lumina, luminaFonts, luminaStyles } from '@/screens/shared/lumina'

type Tone = 'default' | 'accent'
type Density = 'default' | 'compact' | 'hero'

type Props = {
  title: string
  subtitle?: string | null
  meta?: string | null
  tone?: Tone
  density?: Density
  icon?: keyof typeof Ionicons.glyphMap
  headerAccessory?: ReactNode
  children: ReactNode
}

export function SummarySectionCard({
  title,
  subtitle,
  meta,
  tone = 'default',
  density = 'default',
  icon,
  headerAccessory,
  children,
}: Props) {
  const isHero = tone === 'accent' || density === 'hero'
  const iconColor = isHero ? lumina.primary : lumina.onSurfaceVariant
  return (
    <View
      style={[
        isHero ? luminaStyles.accentCard : luminaStyles.card,
        styles.card,
        density === 'compact' && styles.cardCompact,
        density === 'hero' && styles.cardHero,
      ]}
    >
      <View style={styles.header}>
        <View style={styles.titleGroup}>
          {icon ? (
            <View style={styles.iconMedallion}>
              <Ionicons name={icon} size={16} color={iconColor} />
            </View>
          ) : null}
          <Text style={styles.title}>{title}</Text>
        </View>
        {headerAccessory ? <View style={styles.headerAccessory}>{headerAccessory}</View> : null}
        {meta ? <Text style={styles.meta}>{meta}</Text> : null}
      </View>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      <View style={[styles.body, density === 'compact' && styles.bodyCompact]}>{children}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  /** Geometry/elevation come from luminaStyles.card / accentCard (Tier-1/Tier-2). */
  card: {
    gap: 12,
  },
  cardCompact: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  cardHero: {
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  iconMedallion: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: lumina.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAccessory: {
    marginLeft: 'auto',
  },
  title: {
    color: lumina.onSurface,
    fontSize: 20,
    fontFamily: luminaFonts.displaySemi,
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  meta: {
    color: lumina.onSurfaceVariant,
    fontSize: 12,
    fontWeight: '600',
  },
  subtitle: {
    color: lumina.onSurfaceVariant,
    fontSize: 13,
    lineHeight: 18,
    marginTop: -4,
  },
  body: {
    gap: 12,
  },
  bodyCompact: {
    gap: 10,
  },
})
