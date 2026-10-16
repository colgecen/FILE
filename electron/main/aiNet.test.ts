// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { createAiNet, splitSSE, type FetchFn } from './aiNet';

function sse(content: string): string {
  return `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`;
}

function streamResponse(chunks: readonly string[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { 'content-type': 'text/event-stream' },
  });
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('splitSSE', () => {
  it('data satırlarını böler, kuyruğu iade eder', () => {
    const result = splitSSE('data: {"a":1}\n\ndata: {"b":');
    expect(result.pieces).toEqual(['{"a":1}']);
    expect(result.rest).toBe('data: {"b":');
    expect(result.done).toBe(false);
  });

  it('[DONE] işaretini yakalar', () => {
    const result = splitSSE('data: [DONE]\n');
    expect(result.done).toBe(true);
    expect(result.pieces).toEqual([]);
  });

  it('data dışı satırları yok sayar', () => {
    const result = splitSSE(': yorum\n\ndata: {"a":1}\n');
    expect(result.pieces).toEqual(['{"a":1}']);
  });
});

describe('aiNet ping', () => {
  it('ulaşılabilir adresi ok ile döner', async () => {
    const fetchFn: FetchFn = vi.fn(async () => new Response('ok', { status: 200 }));
    const aiNet = createAiNet(fetchFn);
    await expect(aiNet.ping('http://localhost:11434')).resolves.toEqual({ ok: true, status: 200 });
  });

  it('ağ hatasını ok=false ile döner', async () => {
    const fetchFn: FetchFn = vi.fn(async () => {
      throw new Error('bağlantı reddedildi');
    });
    const aiNet = createAiNet(fetchFn);
    const result = await aiNet.ping('http://localhost:9999');
    expect(result.ok).toBe(false);
    expect(result.error).toContain('bağlantı reddedildi');
  });
});

describe('aiNet listeleme', () => {
  it('OpenAI-uyumlu /models listesini çözer', async () => {
    const fetchFn: FetchFn = vi.fn(async () =>
      jsonResponse({ data: [{ id: 'gpt-4o-mini' }, { id: 'gpt-4o' }] }),
    );
    const aiNet = createAiNet(fetchFn);
    await expect(aiNet.listOpenAIModels('https://x/v1', 'k')).resolves.toEqual({
      ok: true,
      models: ['gpt-4o-mini', 'gpt-4o'],
    });
  });

  it('HTTP hatasını modeller boş döner', async () => {
    const fetchFn: FetchFn = vi.fn(async () => new Response('yetkisiz', { status: 401 }));
    const aiNet = createAiNet(fetchFn);
    const result = await aiNet.listOpenAIModels('https://x/v1', 'bozuk');
    expect(result.ok).toBe(false);
    expect(result.models).toEqual([]);
    expect(result.error).toContain('401');
  });

  it('Ollama /api/tags listesini çözer', async () => {
    const fetchFn: FetchFn = vi.fn(async () =>
      jsonResponse({ models: [{ name: 'llama3:latest' }, { name: 'mistral' }] }),
    );
    const aiNet = createAiNet(fetchFn);
    await expect(aiNet.listOllamaTags('http://localhost:11434')).resolves.toEqual({
      ok: true,
      models: ['llama3:latest', 'mistral'],
    });
  });
});

describe('aiNet startChat', () => {
  const job = {
    baseUrl: 'http://localhost:1234/v1',
    apiKey: null as string | null,
    model: 'yerel',
    messages: [{ role: 'user', content: 'selam' }],
  };

  it('SSE parçalarını biriktirip kümülatif iletir', async () => {
    const first = sse('Selam');
    const second = sse(' dünya');
    const chunks = [
      first.slice(0, 20),
      `${first.slice(20)}${second.slice(0, 10)}`,
      second.slice(10),
      'data: [DONE]\n\n',
    ];
    const fetchFn: FetchFn = vi.fn(async () => streamResponse(chunks));
    const aiNet = createAiNet(fetchFn);
    const tokens: string[] = [];
    const done = new Promise<string>((resolve, reject) => {
      aiNet.startChat(job, {
        onToken: (text) => tokens.push(text),
        onDone: (text) => resolve(text),
        onError: (message) => reject(new Error(message)),
      });
    });
    await expect(done).resolves.toBe('Selam dünya');
    expect(tokens[tokens.length - 1]).toBe('Selam dünya');
  });

  it('anahtarı Authorization başlığına koyar', async () => {
    let seen = '';
    const fetchFn: FetchFn = vi.fn(async (_url: string, init) => {
      seen = init?.headers?.['Authorization'] ?? '';
      return streamResponse(['data: [DONE]\n\n']);
    });
    const aiNet = createAiNet(fetchFn);
    const done = new Promise<string>((resolve, reject) => {
      aiNet.startChat({ ...job, apiKey: 'gizli' }, {
        onToken: () => undefined,
        onDone: (text) => resolve(text),
        onError: (message) => reject(new Error(message)),
      });
    });
    await expect(done).resolves.toBe('');
    expect(seen).toBe('Bearer gizli');
  });

  it('akıssız JSON cevabı tek seferde bitirir', async () => {
    const fetchFn: FetchFn = vi.fn(async () =>
      jsonResponse({ choices: [{ message: { content: 'tam metin' } }] }),
    );
    const aiNet = createAiNet(fetchFn);
    const done = new Promise<string>((resolve, reject) => {
      aiNet.startChat(job, {
        onToken: () => undefined,
        onDone: (text) => resolve(text),
        onError: (message) => reject(new Error(message)),
      });
    });
    await expect(done).resolves.toBe('tam metin');
  });

  it('yalnız reasoning akan modelde metni reasoning ile tamamlar', async () => {
    const reasoning = (text: string): string =>
      `data: ${JSON.stringify({ choices: [{ delta: { content: '', reasoning: text } }] })}\n\n`;
    const fetchFn: FetchFn = vi.fn(async () =>
      streamResponse([reasoning('Düşünüyorum'), reasoning('...'), 'data: [DONE]\n\n']),
    );
    const aiNet = createAiNet(fetchFn);
    const tokens: string[] = [];
    const done = new Promise<string>((resolve, reject) => {
      aiNet.startChat(job, {
        onToken: (text) => tokens.push(text),
        onDone: (text) => resolve(text),
        onError: (message) => reject(new Error(message)),
      });
    });
    await expect(done).resolves.toBe('Düşünüyorum...');
    expect(tokens[tokens.length - 1]).toBe('Düşünüyorum...');
  });

  it('reasoning sonrası içerik gelince yalnız cevap metnini döner', async () => {
    const payload = (delta: Record<string, string>): string =>
      `data: ${JSON.stringify({ choices: [{ delta }] })}\n\n`;
    const fetchFn: FetchFn = vi.fn(async () =>
      streamResponse([
        payload({ content: '', reasoning: 'sessiz düşünce' }),
        payload({ content: 'Merhaba' }),
        payload({ content: ' efendim' }),
        'data: [DONE]\n\n',
      ]),
    );
    const aiNet = createAiNet(fetchFn);
    const tokens: string[] = [];
    const done = new Promise<string>((resolve, reject) => {
      aiNet.startChat(job, {
        onToken: (text) => tokens.push(text),
        onDone: (text) => resolve(text),
        onError: (message) => reject(new Error(message)),
      });
    });
    await expect(done).resolves.toBe('Merhaba efendim');
    expect(tokens[tokens.length - 1]).toBe('Merhaba efendim');
  });

  it('akıssız reasoning_content cevabını döner', async () => {
    const fetchFn: FetchFn = vi.fn(async () =>
      jsonResponse({ choices: [{ message: { content: '', reasoning_content: 'düşünce metni' } }] }),
    );
    const aiNet = createAiNet(fetchFn);
    const done = new Promise<string>((resolve, reject) => {
      aiNet.startChat(job, {
        onToken: () => undefined,
        onDone: (text) => resolve(text),
        onError: (message) => reject(new Error(message)),
      });
    });
    await expect(done).resolves.toBe('düşünce metni');
  });

  it('HTTP hatasını onError ile bildirir', async () => {
    const fetchFn: FetchFn = vi.fn(async () => new Response('kota bitti', { status: 429 }));
    const aiNet = createAiNet(fetchFn);
    const done = new Promise<void>((resolve) => {
      aiNet.startChat(job, {
        onToken: () => undefined,
        onDone: () => resolve(),
        onError: (message) => {
          expect(message).toContain('429');
          resolve();
        },
      });
    });
    await done;
  });

  it('iptal edilince hata ile kapanır', async () => {
    const fetchFn: FetchFn = vi.fn(async () => streamResponse([sse('yarım')]));
    const aiNet = createAiNet(fetchFn);
    const done = new Promise<string>((resolve) => {
      const abort = aiNet.startChat(job, {
        onToken: () => undefined,
        onDone: () => resolve('bitti'),
        onError: (message) => resolve(message),
      });
      abort();
    });
    await expect(done).resolves.toBe('İptal edildi');
  });

  it('yalnız reasoning_details gelen akışı çözer', async () => {
    const payload = `data: ${JSON.stringify({
      choices: [{ delta: { content: '', reasoning_details: [{ type: 'reasoning.text', text: 'derin düşünce' }] } }],
    })}\n\n`;
    const fetchFn: FetchFn = vi.fn(async () => streamResponse([payload, 'data: [DONE]\n\n']));
    const aiNet = createAiNet(fetchFn);
    const done = new Promise<string>((resolve, reject) => {
      aiNet.startChat(job, {
        onToken: () => undefined,
        onDone: (text) => resolve(text),
        onError: (message) => reject(new Error(message)),
      });
    });
    await expect(done).resolves.toBe('derin düşünce');
  });

  it('parça dizisi biçimindeki content değerini birleştirir', async () => {
    const payload = `data: ${JSON.stringify({
      choices: [{ delta: { content: [{ type: 'text', text: 'Parçalı' }, { type: 'text', text: ' cevap' }] } }],
    })}\n\n`;
    const fetchFn: FetchFn = vi.fn(async () => streamResponse([payload, 'data: [DONE]\n\n']));
    const aiNet = createAiNet(fetchFn);
    const done = new Promise<string>((resolve, reject) => {
      aiNet.startChat(job, {
        onToken: () => undefined,
        onDone: (text) => resolve(text),
        onError: (message) => reject(new Error(message)),
      });
    });
    await expect(done).resolves.toBe('Parçalı cevap');
  });

  it('akış içindeki error yükünü onError ile bildirir', async () => {
    const payload = `data: ${JSON.stringify({ error: { message: 'kota tükendi', code: 402 } })}\n\n`;
    const fetchFn: FetchFn = vi.fn(async () => streamResponse([sse('başladı'), payload]));
    const aiNet = createAiNet(fetchFn);
    const done = new Promise<string>((resolve) => {
      aiNet.startChat(job, {
        onToken: () => undefined,
        onDone: () => resolve('bitti'),
        onError: (message) => resolve(message),
      });
    });
    await expect(done).resolves.toBe('kota tükendi');
  });

  it('akışsız error gövdesini onError ile bildirir', async () => {
    const fetchFn: FetchFn = vi.fn(async () =>
      jsonResponse({ error: { message: 'model bulunamadı' } }),
    );
    const aiNet = createAiNet(fetchFn);
    const done = new Promise<string>((resolve) => {
      aiNet.startChat(job, {
        onToken: () => undefined,
        onDone: () => resolve('bitti'),
        onError: (message) => resolve(message),
      });
    });
    await expect(done).resolves.toBe('model bulunamadı');
  });

  it('temperature reddedilirse parametresiz yeniden dener', async () => {
    const bodies: string[] = [];
    const fetchFn: FetchFn = vi.fn(async (_url: string, init) => {
      bodies.push(init?.body ?? '');
      if (bodies.length === 1) {
        return new Response('Unsupported parameter: temperature', { status: 400 });
      }
      return streamResponse([sse('tamam'), 'data: [DONE]\n\n']);
    });
    const aiNet = createAiNet(fetchFn);
    const done = new Promise<string>((resolve, reject) => {
      aiNet.startChat({ ...job, temperature: 0.7 }, {
        onToken: () => undefined,
        onDone: (text) => resolve(text),
        onError: (message) => reject(new Error(message)),
      });
    });
    await expect(done).resolves.toBe('tamam');
    expect(bodies).toHaveLength(2);
    expect(JSON.parse(bodies[0] ?? '{}')).toHaveProperty('temperature');
    expect(JSON.parse(bodies[1] ?? '{}')).not.toHaveProperty('temperature');
  });

  it('max_tokens reddedilirse max_completion_tokens ile yeniden dener', async () => {
    const bodies: string[] = [];
    const fetchFn: FetchFn = vi.fn(async (_url: string, init) => {
      bodies.push(init?.body ?? '');
      if (bodies.length === 1) {
        return new Response(
          'Unsupported parameter: max_tokens. Use max_completion_tokens instead.',
          { status: 400 },
        );
      }
      return streamResponse([sse('tamam'), 'data: [DONE]\n\n']);
    });
    const aiNet = createAiNet(fetchFn);
    const done = new Promise<string>((resolve, reject) => {
      aiNet.startChat({ ...job, maxTokens: 2048 }, {
        onToken: () => undefined,
        onDone: (text) => resolve(text),
        onError: (message) => reject(new Error(message)),
      });
    });
    await expect(done).resolves.toBe('tamam');
    expect(bodies).toHaveLength(2);
    const retry = JSON.parse(bodies[1] ?? '{}') as Record<string, unknown>;
    expect(retry['max_completion_tokens']).toBe(2048);
    expect(retry).not.toHaveProperty('max_tokens');
  });
});
