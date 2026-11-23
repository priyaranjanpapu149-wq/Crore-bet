import { GameTypePage, GAME_TYPES } from './_shared';
export default function Personal() {
  return <GameTypePage config={GAME_TYPES.find(t => t.slug === 'personal')!} />;
}