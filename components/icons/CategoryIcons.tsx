import React from 'react';
import Svg, { Path, Circle, Rect, Line, Polyline } from 'react-native-svg';

type IconProps = { size?: number; color?: string };

const D = { size: 20, color: '#888' };
const S = { strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };

// ── Category Icons ──────────────────────────────────────────────────────────

export function CoffeeIcon({ size = D.size, color = D.color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M17 8h1a4 4 0 0 1 0 8h-1" stroke={color} {...S} />
      <Path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z" stroke={color} {...S} />
      <Line x1="6" y1="1" x2="6" y2="4" stroke={color} {...S} />
      <Line x1="10" y1="1" x2="10" y2="4" stroke={color} {...S} />
      <Line x1="14" y1="1" x2="14" y2="4" stroke={color} {...S} />
    </Svg>
  );
}

export function CartIcon({ size = D.size, color = D.color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="9" cy="21" r="1" stroke={color} {...S} />
      <Circle cx="20" cy="21" r="1" stroke={color} {...S} />
      <Path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" stroke={color} {...S} />
    </Svg>
  );
}

export function ShirtIcon({ size = D.size, color = D.color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 1 .84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.14a1 1 0 0 0 1-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" stroke={color} {...S} />
    </Svg>
  );
}

export function SparkleIcon({ size = D.size, color = D.color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" stroke={color} {...S} />
    </Svg>
  );
}

export function DumbbellIcon({ size = D.size, color = D.color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M6.5 6.5a2 2 0 0 0-3 0L2 8a2 2 0 0 0 0 3l1 1" stroke={color} {...S} />
      <Path d="M17.5 17.5a2 2 0 0 0 3 0L22 16a2 2 0 0 0 0-3l-1-1" stroke={color} {...S} />
      <Line x1="8" y1="16" x2="16" y2="8" stroke={color} {...S} />
      <Path d="M4 21l2.5-2.5" stroke={color} {...S} />
      <Path d="M20 3l-2.5 2.5" stroke={color} {...S} />
      <Path d="M15 4l-3.5 3.5" stroke={color} {...S} />
      <Path d="M20.5 8.5L17 12" stroke={color} {...S} />
      <Path d="M9 20l3.5-3.5" stroke={color} {...S} />
      <Path d="M3.5 15.5L7 12" stroke={color} {...S} />
    </Svg>
  );
}

export function TicketIcon({ size = D.size, color = D.color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z" stroke={color} {...S} />
      <Line x1="13" y1="5" x2="13" y2="9" stroke={color} {...S} />
      <Line x1="13" y1="15" x2="13" y2="19" stroke={color} {...S} />
    </Svg>
  );
}

export function PillIcon({ size = D.size, color = D.color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M10.5 1.5a4.95 4.95 0 0 0-7 7l9 9a4.95 4.95 0 0 0 7-7l-9-9z" stroke={color} {...S} />
      <Line x1="8.5" y1="8.5" x2="15.5" y2="15.5" stroke={color} {...S} />
    </Svg>
  );
}

export function HomeIcon({ size = D.size, color = D.color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z" stroke={color} {...S} />
      <Polyline points="9 22 9 12 15 12 15 22" stroke={color} {...S} />
    </Svg>
  );
}

export function PizzaIcon({ size = D.size, color = D.color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 2C6.5 2 2 6.5 2 12l10 10 10-10c0-5.5-4.5-10-10-10z" stroke={color} {...S} />
      <Circle cx="10" cy="10" r="1" fill={color} />
      <Circle cx="14" cy="13" r="1" fill={color} />
      <Circle cx="9" cy="15" r="1" fill={color} />
    </Svg>
  );
}

export function SneakerIcon({ size = D.size, color = D.color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M3 18h18v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1z" stroke={color} {...S} />
      <Path d="M3 18l1-8a2 2 0 0 1 2-2h1l2 3h4l1-3h1.5a3 3 0 0 1 3 2.5L21 18" stroke={color} {...S} />
      <Line x1="6" y1="14" x2="9" y2="14" stroke={color} {...S} />
    </Svg>
  );
}

export function BowlIcon({ size = D.size, color = D.color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M2 12h20" stroke={color} {...S} />
      <Path d="M4 12a8 8 0 0 0 16 0" stroke={color} {...S} />
      <Path d="M7 5s1-2 2 0 2 0 2 0" stroke={color} {...S} />
      <Path d="M13 5s1-2 2 0 2 0 2 0" stroke={color} {...S} />
    </Svg>
  );
}

// ── Utility Icons ───────────────────────────────────────────────────────────

export function FlameIcon({ size = D.size, color = D.color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14 0-5.5 2-6.5 0 0 1.5 3.5 3 5 .76.97 2 2.5 2 5a6 6 0 0 1-12 0c0-1 .5-2.5 1.5-4 0 0 1 2 2 3z" stroke={color} {...S} />
    </Svg>
  );
}

export function BellIcon({ size = D.size, color = D.color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke={color} {...S} />
      <Path d="M13.73 21a2 2 0 0 1-3.46 0" stroke={color} {...S} />
    </Svg>
  );
}

export function MapPinIcon({ size = D.size, color = D.color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke={color} {...S} />
      <Circle cx="12" cy="10" r="3" stroke={color} {...S} />
    </Svg>
  );
}

export function HeartIcon({ size = D.size, color = D.color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke={color} {...S} />
    </Svg>
  );
}

export function CompassIcon({ size = D.size, color = D.color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="10" stroke={color} {...S} />
      <Path d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z" stroke={color} {...S} />
    </Svg>
  );
}

export function CoinIcon({ size = D.size, color = D.color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="9" stroke={color} {...S} />
      <Line x1="12" y1="6" x2="12" y2="18" stroke={color} {...S} />
      <Path d="M8.5 9.5c0-1.1 1.6-2 3.5-2s3.5.9 3.5 2-1.6 2-3.5 2-3.5.9-3.5 2 1.6 2 3.5 2 3.5-.9 3.5-2" stroke={color} {...S} />
    </Svg>
  );
}

export function MedalIcon({ size = D.size, color = D.color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="15" r="6" stroke={color} {...S} />
      <Path d="M8.21 13.89L7 3h10l-1.21 10.89" stroke={color} {...S} />
      <Line x1="12" y1="12" x2="12" y2="18" stroke={color} {...S} />
    </Svg>
  );
}

export function StarIcon({ size = D.size, color = D.color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke={color} {...S} />
    </Svg>
  );
}

export function TagIcon({ size = D.size, color = D.color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" stroke={color} {...S} />
      <Line x1="7" y1="7" x2="7.01" y2="7" stroke={color} {...S} />
    </Svg>
  );
}

export function UserIcon({ size = D.size, color = D.color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke={color} {...S} />
      <Circle cx="12" cy="7" r="4" stroke={color} {...S} />
    </Svg>
  );
}

export function BoltIcon({ size = D.size, color = D.color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" stroke={color} {...S} />
    </Svg>
  );
}

export function CroissantIcon({ size = D.size, color = D.color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" stroke={color} {...S} />
      <Path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" stroke={color} {...S} />
      <Path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" stroke={color} {...S} />
      <Path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" stroke={color} {...S} />
    </Svg>
  );
}

// ── Utility icons for settings (not category-based) ─────────────────────────

export function BellOffIcon({ size = D.size, color = D.color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M13.73 21a2 2 0 0 1-3.46 0" stroke={color} {...S} />
      <Path d="M18.63 13A17.89 17.89 0 0 1 18 8" stroke={color} {...S} />
      <Path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14" stroke={color} {...S} />
      <Path d="M18 8a6 6 0 0 0-9.33-5" stroke={color} {...S} />
      <Line x1="1" y1="1" x2="23" y2="23" stroke={color} {...S} />
    </Svg>
  );
}

export function ClockIcon({ size = D.size, color = D.color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="10" stroke={color} {...S} />
      <Polyline points="12 6 12 12 16 14" stroke={color} {...S} />
    </Svg>
  );
}

export function BarChartIcon({ size = D.size, color = D.color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Line x1="12" y1="20" x2="12" y2="10" stroke={color} {...S} />
      <Line x1="18" y1="20" x2="18" y2="4" stroke={color} {...S} />
      <Line x1="6" y1="20" x2="6" y2="16" stroke={color} {...S} />
    </Svg>
  );
}

export function LockIcon({ size = D.size, color = D.color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke={color} {...S} />
      <Path d="M7 11V7a5 5 0 0 1 10 0v4" stroke={color} {...S} />
    </Svg>
  );
}

export function CreditCardIcon({ size = D.size, color = D.color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x="1" y="4" width="22" height="16" rx="2" ry="2" stroke={color} {...S} />
      <Line x1="1" y1="10" x2="23" y2="10" stroke={color} {...S} />
    </Svg>
  );
}

export function MessageIcon({ size = D.size, color = D.color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" stroke={color} {...S} />
    </Svg>
  );
}

export function HelpCircleIcon({ size = D.size, color = D.color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="10" stroke={color} {...S} />
      <Path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" stroke={color} {...S} />
      <Line x1="12" y1="17" x2="12.01" y2="17" stroke={color} {...S} />
    </Svg>
  );
}

export function SearchIcon({ size = D.size, color = D.color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="11" cy="11" r="8" stroke={color} {...S} />
      <Line x1="21" y1="21" x2="16.65" y2="16.65" stroke={color} {...S} />
    </Svg>
  );
}

export function BookIcon({ size = D.size, color = D.color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke={color} {...S} />
      <Path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke={color} {...S} />
    </Svg>
  );
}

export function CheckIcon({ size = D.size, color = D.color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Polyline points="20 6 9 17 4 12" stroke={color} {...S} />
    </Svg>
  );
}

export function ChevronLeftIcon({ size = D.size, color = D.color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M15 18l-6-6 6-6" stroke={color} {...S} />
    </Svg>
  );
}

export function NavigationIcon({ size = D.size, color = D.color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M3 11l19-9-9 19-2-8-8-2z" fill={color} />
    </Svg>
  );
}

// ── Category key mapping ────────────────────────────────────────────────────

const CATEGORY_MAP: Record<string, (props: IconProps) => React.JSX.Element> = {
  food: BowlIcon,
  coffee: CoffeeIcon,
  grocery: CartIcon,
  restaurant: PizzaIcon,
  fitness: DumbbellIcon,
  fashion: ShirtIcon,
  beauty: SparkleIcon,
  entertainment: TicketIcon,
  pharmacy: PillIcon,
  home: HomeIcon,
  sports: SneakerIcon,
  bakery: CroissantIcon,
  books: BookIcon,
};

export function getCategoryIcon(
  categoryKey: string,
  size?: number,
  color?: string,
): React.ReactNode {
  const Icon = CATEGORY_MAP[categoryKey] || TagIcon;
  return <Icon size={size} color={color} />;
}
