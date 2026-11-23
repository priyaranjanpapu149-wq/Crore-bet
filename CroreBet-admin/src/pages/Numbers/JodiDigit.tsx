import { GameTypePage, GAME_TYPES } from './_shared';
export default function JodiDigit() {
  return <GameTypePage config={GAME_TYPES.find(t => t.slug === 'jodi')!} />;
}