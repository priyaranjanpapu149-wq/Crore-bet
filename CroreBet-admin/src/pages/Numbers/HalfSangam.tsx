import { GameTypePage, GAME_TYPES } from './_shared';
export default function HalfSangam() {
  return <GameTypePage config={GAME_TYPES.find(t => t.slug === 'half-sangam')!} />;
}