import { GameTypePage, GAME_TYPES } from './_shared';
export default function SinglePana() {
  return <GameTypePage config={GAME_TYPES.find(t => t.slug === 'single-pana')!} />;
}