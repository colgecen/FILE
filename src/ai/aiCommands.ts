import { aiEngine } from './engine';
import { aiChatModel } from '../core/chatModel';
import { focusManager } from '../core/focus';
import { getActiveEditor } from '../editor/activeEditor';
import { paletteModel } from '../core/palette';
import { buildPrompt } from './prompt';
import { statusLabel } from './format';
import { MODEL_LIST, modelName } from './models';
import { isModelId, loadActiveModel, loadActiveRef, refFromModel, saveActiveModel, saveActiveRef } from './modelStore';
import { displayName } from './providers';
import type { ModelRef } from './providers';
import { modelCatalog } from './catalog';
import { scanLocalModels } from './localScan';
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
  const ref = loadActiveRef();
  aiEngine.appendUserMessage(instruction);
  aiChatModel.open();
  if (ref.provider !== 'builtin' || !isModelId(ref.id)) {
    aiEngine.appendSystemMessage(
      'Uzak model sohbete F8 fazında bağlanacak; şimdilik yerleşik model seçin.',
    );
    return;
  }
  const modelId: ModelId = ref.id;
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
  saveActiveRef({ id: modelId, provider: 'builtin' });
  aiEngine.appendSystemMessage(`Model: ${modelName(modelId)} (${statusLabel('idle')})`);
  return true;
}

export function selectModel(ref: ModelRef): void {
  if (ref.provider === 'builtin' && isModelId(ref.id)) {
    void setActiveModel(ref.id);
    return;
  }
  saveActiveRef(refFromModel(ref));
  aiEngine.appendSystemMessage(
    `Model: ${displayName(ref)} — uzak sohbet F8 fazında bağlanacak.`,
  );
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
      paletteModel.showModels(modelCatalog.all());
      focusManager.set('palette');
      return { ok: true };
    },
  });

  register({
    id: 'ai.models.refresh',
    category: 'ai',
    title: 'Modelleri Yenile',
    run: async () => {
      const result = await scanLocalModels(window.api);
      modelCatalog.setScanned(result.models);
      const failed = result.probed.filter((probe) => !probe.ok);
      aiEngine.appendSystemMessage(
        failed.length === 0
          ? `${result.models.length} yerel model bulundu.`
          : `${result.models.length} model bulundu; ${failed.length} kaynak yanıt vermiyor.`,
      );
      aiChatModel.open();
      return { ok: true };
    },
  });

  register({
    id: 'ai.model.status',
    category: 'ai',
    title: 'Model Durumu',
    run: () => {
      const ref = loadActiveRef();
      const state = aiEngine.getState();
      const found = modelCatalog.find(ref.provider, ref.id);
      aiEngine.appendSystemMessage(
        found === undefined
          ? `Model: ${ref.id} — katalogda yok, listeyi yenileyin.`
          : `Model: ${displayName(found)} — ${statusLabel(state.status)}`,
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