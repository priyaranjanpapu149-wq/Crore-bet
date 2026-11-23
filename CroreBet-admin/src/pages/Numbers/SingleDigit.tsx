import { GameTypePage, GAME_TYPES } from './_shared';
export default function SingleDigit() {
  return <GameTypePage config={GAME_TYPES.find(t => t.slug === 'single')!} />;
}