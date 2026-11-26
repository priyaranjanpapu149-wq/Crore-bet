import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { validateSupportQuestions } from '../src/services/supportQuestions';

test('support questions are trimmed and validated', () => {
  assert.deepEqual(validateSupportQuestions([{ question: ' Deposit? ', answer: ' Please wait. ' }]), [{ question: 'Deposit?', answer: 'Please wait.' }]);
  assert.equal(validateSupportQuestions([{ question: ' ', answer: 'Answer' }]), null);
  assert.equal(validateSupportQuestions([{ question: 'Question', answer: '' }]), null);
  assert.equal(validateSupportQuestions(Array(7).fill({ question: 'Q', answer: 'A' })), null);
  assert.equal(validateSupportQuestions([{ question: 'Q'.repeat(201), answer: 'A' }]), null);
  assert.equal(validateSupportQuestions([{ question: 'Q', answer: 'A'.repeat(1001) }]), null);
});
