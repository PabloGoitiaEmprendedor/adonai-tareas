import { describe, expect, it } from 'vitest';
import { buildTranscriptFromRecognitionResults } from '@/hooks/useVoiceCapture';

describe('buildTranscriptFromRecognitionResults', () => {
  it('usa solo el último interim para evitar duplicaciones acumuladas', () => {
    const result = buildTranscriptFromRecognitionResults([
      { isFinal: false, 0: { transcript: 'quiero' } },
      { isFinal: false, 0: { transcript: 'quiero tomar' } },
      { isFinal: false, 0: { transcript: 'quiero tomar un vaso de agua hoy' } },
    ]);

    expect(result.transcript).toBe('quiero tomar un vaso de agua hoy');
  });

  it('combina segmentos finales previos con el interim actual sin repetir bloques', () => {
    const result = buildTranscriptFromRecognitionResults([
      { isFinal: true, 0: { transcript: 'comprar pan', confidence: 0.84 } },
      { isFinal: false, 0: { transcript: 'mañana temprano' } },
    ]);

    expect(result.transcript).toBe('comprar pan mañana temprano');
    expect(result.confidence).toBe(0.84);
  });
});