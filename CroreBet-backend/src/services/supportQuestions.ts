export type SupportQuestion = { question: string; answer: string };

export function validateSupportQuestions(input: unknown): SupportQuestion[] | null {
  if (!Array.isArray(input) || input.length > 6) return null;
  const result: SupportQuestion[] = [];
  for (const item of input) {
    if (!item || typeof item.question !== 'string' || typeof item.answer !== 'string') return null;
    const question = item.question.trim();
    const answer = item.answer.trim();
    if (!question || question.length > 200 || !answer || answer.length > 1000) return null;
    result.push({ question, answer });
  }
  return result;
}
