import { beforeEach, describe, expect, it } from 'vitest';
import { environmentsModel } from '../core/environments';
import { aiEngine } from './engine';
import { syncChatWithActiveEnv } from './envBinding';
import { sessionStore } from './sessions';

describe('syncChatWithActiveEnv', () => {
  beforeEach(() => {
    sessionStore.reset();
    environmentsModel.reset();
    aiEngine.resetChat();
  });

  it('ortam yokken hiçbir şey yapmaz', () => {
    expect(syncChatWithActiveEnv()).toBeNull();
  });

  it('boş aktif sohbeti aktif ortama bağlar', () => {
    const id = environmentsModel.add('/repo/alpha', 'alpha');
    const created = sessionStore.create();
    expect(syncChatWithActiveEnv()).toBe(created);
    expect(sessionStore.active()?.envId).toBe(id);
  });

  it('ortama bağlı sohbet varsa ona geçer', () => {
    const alpha = environmentsModel.add('/repo/alpha', 'alpha');
    const alphaChat = sessionStore.create(alpha);
    environmentsModel.add('/repo/beta', 'beta');
    expect(syncChatWithActiveEnv()).not.toBe(alphaChat);
    environmentsModel.setActive(alpha);
    expect(syncChatWithActiveEnv()).toBe(alphaChat);
    expect(sessionStore.active()?.id).toBe(alphaChat);
  });

  it('dolu aktif sohbet varsa yeni bağlı sohbet açar', () => {
    const alpha = environmentsModel.add('/repo/alpha', 'alpha');
    const busy = sessionStore.create();
    const messages = [{ role: 'user', content: 'dolu' }] as const;
    sessionStore.saveMessages(busy, messages);
    aiEngine.loadMessages(messages);
    const result = syncChatWithActiveEnv();
    expect(result).not.toBeNull();
    expect(result).not.toBe(busy);
    expect(sessionStore.active()?.envId).toBe(alpha);
  });

  it('her ortam kendi sohbetini korur', () => {
    environmentsModel.add('/repo/alpha', 'alpha');
    const chatA = syncChatWithActiveEnv();
    const beta = environmentsModel.add('/repo/beta', 'beta');
    const chatB = syncChatWithActiveEnv();
    expect(chatA).not.toBe(chatB);
    environmentsModel.setActive(environmentsModel.getState().environments[0]!.id);
    expect(syncChatWithActiveEnv()).toBe(chatA);
    environmentsModel.setActive(beta);
    expect(syncChatWithActiveEnv()).toBe(chatB);
  });
});
