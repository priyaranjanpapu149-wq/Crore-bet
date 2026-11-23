import { GameTypePage, GAME_TYPES } from './_shared';
export default function TriplePana() {
  return <GameTypePage config={GAME_TYPES.find(t => t.slug === 'triple-pana')!} />;
}
