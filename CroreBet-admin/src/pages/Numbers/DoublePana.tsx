import { GameTypePage, GAME_TYPES } from './_shared';
export default function DoublePana() {
  return <GameTypePage config={GAME_TYPES.find(t => t.slug === 'double-pana')!} />;
}