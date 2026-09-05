import { aiEngine } from './engine';
import { aiChatModel } from '../core/chatModel';
import { focusManager } from '../core/focus';
import { getActiveEditor } from '../editor/activeEditor';
import { paletteModel } from '../core/palette';
import { buildPrompt } from './prompt';
import { statusLabel } from './format';
import { MODEL_LIST, modelName } from './models';
import { loadActiveModel, saveActiveModel } from './modelStore';
import type { CommandDef } from '../core/types';
import type { ModelId } from './types';

const MAX_CONTEXT_MESSAGES = 6;

function editorSourceText(): string | null {
  const editor = getActiveEditor();
  if (editor === null) return null;
  const model = editor.getModel();
  if (model === null) return null;
  const selection = editor.getSelection();
  if (selection !== null && !selection.isEmpty()) {
    return model.getValueInRange(selection);
  }
  return model.getValue();
}

async function runAssistant(instruction: string): Promise<void> {
  const modelId = aiEngine.getState().modelId ?? loadActiveModel();
  aiEngine.appendUserMessage(instruction);
  aiChatModel.open();
  try {
    await aiEngine.ensureModel(modelId);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    aiEngine.setError(message);
    return;
  }
  const recent = aiEngine.getState().chat.messages.slice(-MAX_CONTEXT_MESSAGES);
  try {
    await aiEngine.generate({ prompt: buildPrompt(recent), maxNewTokens: 256, temperature: 0.4 });
  } catch {
    // generate hata durumunu zaten engine'e işler
  }
}

export async function setActiveModel(modelId: ModelId): Promise<boolean> {
  try {
    await aiEngine.ensureModel(modelId);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    aiEngine.setError(message);
    return false;
  }
  saveActiveModel(modelId);
  aiEngine.appendSystemMessage(`Model: ${modelName(modelId)} (${statusLabel('idle')})`);
  return true;
}

export function selectModel(modelId: ModelId): void {
  void setActiveModel(modelId);
}

export function registerAICommands(register: (command: CommandDef) => void): void {
  register({
    id: 'ai.models.download',
    category: 'ai',
    title: 'Model İndir',
    run: () => {
      const modelId = aiEngine.getState().modelId ?? loadActiveModel();
      aiChatModel.open();
      void setActiveModel(modelId);
      return { ok: true };
    },
  });

  register({
    id: 'ai.models.cancel',
    category: 'ai',
    title: 'İndirmeyi İptal Et',
    run: () => {
      const status = aiEngine.getState().status;
      if (status !== 'loading' && status !== 'computing') {
        return { ok: false, error: 'Aktif işlem yok' };
      }
      aiEngine.cancel();
      aiEngine.appendSystemMessage('İndirme iptal edildi.');
      return { ok: true };
    },
  });

  register({
    id: 'ai.model.select',
    category: 'ai',
    title: 'Model Seç',
    run: () => {
      paletteModel.showModels(MODEL_LIST);
      focusManager.set('palette');
      return { ok: true };
    },
  });

  register({
    id: 'ai.model.status',
    category: 'ai',
    title: 'Model Durumu',
    run: () => {
      const state = aiEngine.getState();
      const model = state.modelId === null ? null : modelName(state.modelId);
      aiEngine.appendSystemMessage(
        model === null
          ? 'Model seçilmedi. "Yapay Zekâ → Model Seç" ile başlayın.'
          : `Model: ${model} — ${statusLabel(state.status)}`,
      );
      aiChatModel.open();
      return { ok: true };
    },
  });

  register({
    id: 'ai.chat',
    category: 'ai',
    title: 'Yapay Zekâ ile Sohbet',
    run: () => {
      const wasOpen = aiChatModel.isOpen();
      aiChatModel.toggle();
      if (!wasOpen) {
        focusManager.set('ai');
      } else {
        focusManager.returnToPrevious();
      }
      return { ok: true };
    },
  });

  register({
    id: 'ai.chat.close',
    category: 'ai',
    title: 'Yapay zekâ sohbetini kapat',
    run: () => {
      aiChatModel.close();
      focusManager.returnToPrevious();
      return { ok: true };
    },
  });

  register({
    id: 'ai.chat.send',
    category: 'ai',
    title: 'Mesajı gönder',
    run: () => {
      const draft = aiChatModel.getDraft().trim();
      if (draft.length === 0) return { ok: false, error: 'Mesaj boş' };
      aiChatModel.setDraft('');
      void runAssistant(draft);
      return { ok: true };
    },
  });

  register({
    id: 'ai.inline.complete',
    category: 'ai',
    title: 'Satır İçi Tamamlama',
    run: () => {
      const source = editorSourceText();
      if (source === null) return { ok: false, error: 'Açık kod yok' };
      void runAssistant(
        `İmleçteki koda satır içi tamamlama öner. Yalnızca önerilen kod parçasını yaz:\n\n${source}`,
      );
      return { ok: true };
    },
  });

  register({
    id: 'ai.explain',
    category: 'ai',
    title: 'Kodu Açıkla',
    run: () => {
      const source = editorSourceText();
      if (source === null) return { ok: false, error: 'Açık kod yok' };
      void runAssistant(`Aşağıdaki kodu satır satır Türkçe açıkla:\n\n${source}`);
      return { ok: true };
    },
  });

  register({
    id: 'ai.prefs',
    category: 'ai',
    title: 'Yapay Zekâ Tercihleri',
    run: () => {
      paletteModel.showModels(MODEL_LIST);
      aiChatModel.open();
      focusManager.set('palette');
      return { ok: true };
    },
  });
}