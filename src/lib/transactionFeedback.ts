// Journal and receipt details belong in the manual recovery view. A real
// validation failure still needs to tell the user what they must change.
const actionableFailure = /\binsufficient\b|\bnot enough\b|\bminimum\b|\bexecution reverted\b|\b(?:simulation|simulation check)\b.{0,60}\b(?:failed|rejected|reverted|did not pass)\b|\bfailed\b.{0,30}\bsimulation\b/i;

function normalized(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

export function isRecoveryFeedback(text: string): boolean {
  const value = normalized(text);
  if (!value || actionableFailure.test(value)) return false;
  return /\bunresolved\b|\b(?:saved|previous|earlier)\b.{0,35}\brequests?\b|\bjournal\b.{0,60}\b(?:invalid|unreadable|cannot|could not|corrupt|unavailable|failed)\b|\b(?:invalid|unreadable|corrupt)\b.{0,30}\bjournal\b|\b(?:request|status)\b.{0,25}\b(?:cannot|could not) be (?:read|saved)\b|\b(?:response|result|outcome|receipt)\b.{0,35}\buncertain\b|\buncertain\b.{0,35}\b(?:response|result|outcome|receipt)\b|\b(?:check|inspect) (?:your )?wallet activity\b|\b(?:receipt|transaction)\b.{0,60}\b(?:could not be|cannot be|not) (?:fully )?verified\b/i.test(value);
}

export function isCancelledFeedback(text: string): boolean {
  const value = normalized(text);
  if (!value || actionableFailure.test(value)) return false;
  return /\b(?:user|you|wallet)\b.{0,35}\b(?:rejected|denied|cancelled|canceled)\b|\b(?:rejected|denied|cancelled|canceled)\b.{0,35}\b(?:user|wallet)\b/i.test(value);
}

export function isRoutineRecoveryResult(text: string): boolean {
  const value = normalized(text);
  return /^(?:Recovered after you (?:confirmed that the wallet request was cancelled|reviewed the mined transaction)\.|Recovered after you confirmed that the wallet request was cancelled and no transaction was sent\.|The replacement transaction 0x[\da-f]{64} mined, so the original transaction can no longer execute\.|Transaction hash recovered\.)/i.test(value);
}
