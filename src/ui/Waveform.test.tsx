import { render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup } from '@testing-library/react';
import { Waveform } from './Waveform';

afterEach(cleanup);

describe('Waveform', () => {
  it('canvas çizer', () => {
    const { container } = render(<Waveform active={false} />);
    expect(container.querySelector('canvas.ai-chat__wave')).not.toBeNull();
  });

  it('aktif kipte de çizer', () => {
    const { container } = render(<Waveform active={true} />);
    expect(container.querySelector('canvas.ai-chat__wave')).not.toBeNull();
  });
});
