import { GameTypePage, GAME_TYPES } from './_shared';
export default function FullSangam() {
  return <GameTypePage config={GAME_TYPES.find(t => t.slug === 'full-sangam')!} />;
}