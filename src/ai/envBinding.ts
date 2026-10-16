import { environmentsModel } from '../core/environments';
import { aiEngine } from './engine';
import { sessionStore } from './sessions';

function engineBusy(): boolean {
  const status = aiEngine.getState().status;
  return status === 'loading' || status === 'computing';
}

/**
 * Aktif proje ortamıyla eşleşen AI sohbetine geçişi sağlar:
 * ortama bağlı bir sohbet varsa panel ona bağlanır; yoksa boş bir sohbet
 * bu ortama bağlanır ya da yeni bağlanmış bir sohbet açılır.
 */
export function syncChatWithActiveEnv(): string | null {
  const env = environmentsModel.active();
  if (env === null) return null;
  const current = sessionStore.active();
  if (current !== null && current.envId === env.id) return current.id;
  if (current !== null && engineBusy()) return null;
  if (current !== null) {
    sessionStore.saveMessages(current.id, aiEngine.getState().chat.messages);
  }
  const id = sessionStore.activateForEnv(env.id, engineBusy());
  if (id === null) return null;
  const session = sessionStore.findForEnv(env.id);
  if (session === null) return null;
  if (current !== null && current.id === id) return id;
  aiEngine.loadMessages(session.messages);
  return id;
}
