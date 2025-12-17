<template>
  <div v-if="open" class="backdrop" @click.self="emit('close')">
    <div class="panel">
      <header>
        <div class="header-left">
          <div class="title">AI 配置</div>
          <p class="desc">选择厂商，填写 Base URL / Key / 模型，支持 OpenAI 兼容与 Gemini 官方。</p>
        </div>
        <div class="header-actions">
          <button class="ghost" @click="emit('close')">关闭</button>
        </div>
      </header>

      <section class="block">
        <div class="block-head">
          <div>
            <div class="block-title">全局默认</div>
            <p class="hint">厂商快捷选择可自动填入标准 Base URL，模型需按实际可用填写。</p>
          </div>
          <div class="block-actions">
            <button class="secondary" :disabled="testState.global.loading" @click="testConfig('global', global)">
              {{ testState.global.loading ? '测试中...' : '测试全局模型' }}
            </button>
            <span class="test-message" v-if="testState.global.message">{{ testState.global.message }}</span>
          </div>
        </div>
        <div class="form-grid cols-4">
          <label>
            <span>厂商</span>
            <select v-model="global.vendor" @change="applyPreset(global)">
              <option value="openai">OpenAI 官方</option>
              <option value="openai-custom">OpenAI 兼容</option>
              <option value="gemini">Gemini 官方</option>
              <option value="gemini-custom">Gemini 自定义</option>
            </select>
          </label>
          <label>
            <span>API Base URL</span>
            <input v-model="global.baseUrl" placeholder="https://api.openai.com 或 https://generativelanguage.googleapis.com" />
          </label>
          <label>
            <span>API Key</span>
            <input v-model="global.apiKey" placeholder="sk-... 或 Google API Key" />
          </label>
          <label>
            <span>模型</span>
            <input v-model="global.model" placeholder="gpt-4o-mini / deepseek-chat / gemini-1.5-flash" />
          </label>
        </div>
      </section>

      <section class="block">
        <div class="block-head">
          <div>
            <div class="block-title">玩家（我）模型</div>
            <p class="hint">为自己代打时使用，厂商与配置与 AI 相同。</p>
          </div>
          <div class="block-actions">
            <button class="secondary" :disabled="testState.self.loading" @click="testConfig('self', self)">
              {{ testState.self.loading ? '测试中...' : '测试玩家模型' }}
            </button>
            <span class="test-message" v-if="testState.self.message">{{ testState.self.message }}</span>
          </div>
        </div>
        <div class="form-grid cols-4">
          <label>
            <span>厂商</span>
            <select v-model="self.vendor" @change="applyPreset(self)">
              <option value="openai">OpenAI 官方</option>
              <option value="openai-custom">OpenAI 兼容</option>
              <option value="gemini">Gemini 官方</option>
              <option value="gemini-custom">Gemini 自定义</option>
            </select>
          </label>
          <label>
            <span>API Base URL</span>
            <input v-model="self.baseUrl" placeholder="https://api.openai.com 或 https://generativelanguage.googleapis.com" />
          </label>
          <label>
            <span>API Key</span>
            <input v-model="self.apiKey" placeholder="sk-... 或 Google API Key" />
          </label>
          <label>
            <span>模型</span>
            <input v-model="self.model" placeholder="gpt-4o-mini / gemini-1.5-flash" />
          </label>
        </div>
      </section>

      <section class="block">
        <div class="toggle-row">
          <label class="checkbox pill">
            <input type="checkbox" v-model="useRoleModel.value" />
            <span>为地主 / 农民单独配置模型</span>
          </label>
          <label class="checkbox pill">
            <input type="checkbox" v-model="useBreakerPrompt.value" />
            <span>启用“破限”提示词</span>
          </label>
          <label class="checkbox pill">
            <input type="checkbox" v-model="useSelfAi.value" />
            <span>玩家由 AI 代打</span>
          </label>
        </div>
        <div v-if="useRoleModel.value" class="role-grid">
          <div class="role-card">
            <div class="block-title">地主模型</div>
            <div class="form-grid cols-4">
              <label>
                <span>厂商</span>
                <select v-model="role.landlord.vendor" @change="applyPreset(role.landlord)">
                  <option value="openai">OpenAI 官方</option>
                  <option value="openai-custom">OpenAI 兼容</option>
                  <option value="gemini">Gemini 官方</option>
                  <option value="gemini-custom">Gemini 自定义</option>
                </select>
              </label>
              <label>
                <span>模型</span>
                <input v-model="role.landlord.model" placeholder="gpt-4o / gemini-1.5-pro" />
              </label>
              <label>
                <span>Base URL</span>
                <input v-model="role.landlord.baseUrl" placeholder="https://api.openai.com 或 https://generativelanguage.googleapis.com" />
              </label>
              <label>
                <span>API Key</span>
                <input v-model="role.landlord.apiKey" placeholder="sk-... 或 Google Key" />
              </label>
            </div>
            <div class="role-test">
              <button class="secondary" :disabled="testState.landlord.loading" @click="testConfig('landlord', role.landlord)">
                {{ testState.landlord.loading ? '测试中...' : '测试地主模型' }}
              </button>
              <span class="test-message" v-if="testState.landlord.message">{{ testState.landlord.message }}</span>
            </div>
          </div>
          <div class="role-card">
            <div class="block-title">农民模型</div>
            <div class="form-grid cols-4">
              <label>
                <span>厂商</span>
                <select v-model="role.farmer.vendor" @change="applyPreset(role.farmer)">
                  <option value="openai">OpenAI 官方</option>
                  <option value="openai-custom">OpenAI 兼容</option>
                  <option value="gemini">Gemini 官方</option>
                  <option value="gemini-custom">Gemini 自定义</option>
                </select>
              </label>
              <label>
                <span>模型</span>
                <input v-model="role.farmer.model" placeholder="deepseek-chat / gemini-1.5-flash" />
              </label>
              <label>
                <span>Base URL</span>
                <input v-model="role.farmer.baseUrl" placeholder="https://api.openai.com 或 https://generativelanguage.googleapis.com" />
              </label>
              <label>
                <span>API Key</span>
                <input v-model="role.farmer.apiKey" placeholder="sk-... 或 Google Key" />
              </label>
            </div>
            <div class="role-test">
              <button class="secondary" :disabled="testState.farmer.loading" @click="testConfig('farmer', role.farmer)">
                {{ testState.farmer.loading ? '测试中...' : '测试农民模型' }}
              </button>
              <span class="test-message" v-if="testState.farmer.message">{{ testState.farmer.message }}</span>
            </div>
          </div>
        </div>
      </section>

      <footer class="actions">
        <button class="secondary" @click="emit('close')">取消</button>
        <button @click="handleSave">保存</button>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import type { ModelConfig, RoleModelConfig, ModelVendor } from '../game/types'

const props = defineProps<{
  open: boolean
  globalConfig: ModelConfig
  roleConfig: RoleModelConfig
  selfConfig: ModelConfig
  useRoleModel: boolean
  useBreakerPrompt: boolean
  useSelfAi: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', payload: { global: ModelConfig; role: RoleModelConfig; self: ModelConfig; useRoleModel: boolean; useBreakerPrompt: boolean; useSelfAi: boolean }): void
}>()

const global = reactive<ModelConfig>({ baseUrl: '', apiKey: '', model: '', vendor: 'openai' })
const role = reactive<{ landlord: ModelConfig; farmer: ModelConfig }>({
  landlord: { baseUrl: '', apiKey: '', model: '', vendor: 'openai' },
  farmer: { baseUrl: '', apiKey: '', model: '', vendor: 'openai' },
})
const self = reactive<ModelConfig>({ baseUrl: '', apiKey: '', model: '', vendor: 'openai' })
const useRoleModel = reactive({ value: props.useRoleModel })
const useBreakerPrompt = reactive({ value: false })
const useSelfAi = reactive({ value: props.useSelfAi })
const testState = reactive<{
  global: { loading: boolean; message: string }
  landlord: { loading: boolean; message: string }
  farmer: { loading: boolean; message: string }
  self: { loading: boolean; message: string }
}>({
  global: { loading: false, message: '' },
  landlord: { loading: false, message: '' },
  farmer: { loading: false, message: '' },
  self: { loading: false, message: '' },
})

const presets: Record<ModelVendor, { baseUrl: string; model: string }> = {
  openai: { baseUrl: 'https://api.openai.com', model: 'gpt-4o-mini' },
  'openai-custom': { baseUrl: '', model: '' },
  gemini: { baseUrl: 'https://generativelanguage.googleapis.com', model: 'gemini-1.5-flash' },
  'gemini-custom': { baseUrl: '', model: '' },
}

const applyPreset = (cfg: ModelConfig) => {
  const vendor = (cfg.vendor as ModelVendor) || 'openai'
  const preset = presets[vendor]
  if (!cfg.baseUrl) cfg.baseUrl = preset.baseUrl
  if (!cfg.model) cfg.model = preset.model
}

const isGemini = (config: ModelConfig) =>
  config.vendor?.startsWith('gemini') ||
  /generativelanguage\.googleapis\.com/i.test(config.baseUrl ?? '') ||
  (config.model ?? '').toLowerCase().startsWith('gemini')

const buildEndpoint = (baseUrl: string, model: string, gemini: boolean) => {
  const trimmed = baseUrl.replace(/\/+$/, '')
  if (gemini) {
    const base = /\/v1(beta)?$/i.test(trimmed) ? trimmed : `${trimmed}/v1beta`
    return `${base}/models/${model}:generateContent`
  }
  const clean = /\/v1$/.test(trimmed) ? trimmed : `${trimmed}/v1`
  return `${clean}/chat/completions`
}

const syncFromProps = () => {
  Object.assign(global, props.globalConfig)
  role.landlord = { ...(props.roleConfig.landlord ?? { baseUrl: '', apiKey: '', model: '', vendor: 'openai' }) }
  role.farmer = { ...(props.roleConfig.farmer ?? { baseUrl: '', apiKey: '', model: '', vendor: 'openai' }) }
  Object.assign(self, props.selfConfig ?? { baseUrl: '', apiKey: '', model: '', vendor: 'openai' })
  if (!global.vendor) global.vendor = 'openai'
  if (!role.landlord.vendor) role.landlord.vendor = 'openai'
  if (!role.farmer.vendor) role.farmer.vendor = 'openai'
  if (!self.vendor) self.vendor = 'openai'
  useRoleModel.value = props.useRoleModel
  useBreakerPrompt.value = props.useBreakerPrompt
  useSelfAi.value = props.useSelfAi
}

watch(
  () => props.open,
  (open) => {
    if (open) syncFromProps()
  },
  { immediate: true },
)

const handleSave = () => {
  emit('save', {
    global: { ...global },
    role: {
      landlord: role.landlord,
      farmer: role.farmer,
    },
    self: { ...self },
    useRoleModel: useRoleModel.value,
    useBreakerPrompt: useBreakerPrompt.value,
    useSelfAi: useSelfAi.value,
  })
}

const testConfig = async (key: 'global' | 'landlord' | 'farmer' | 'self', config: ModelConfig) => {
  const state = testState[key]
  state.message = ''
  if (!config.baseUrl || !config.apiKey || !config.model) {
    state.message = '请先填写 Base URL、API Key、模型'
    return
  }
  state.loading = true
  try {
    const gemini = isGemini(config)
    const url = buildEndpoint(config.baseUrl, config.model, gemini)
    const body = gemini
      ? {
          contents: [{ role: 'user', parts: [{ text: 'ping' }] }],
          generationConfig: { maxOutputTokens: 8 },
        }
      : {
          model: config.model,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 8,
        }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
    })

    const text = await res.text()
    if (!res.ok) {
      let detail = text
      try {
        const json = JSON.parse(text)
        detail = json?.error?.message || json?.message || text
      } catch {
        // keep text
      }
      throw new Error(`${res.status} ${res.statusText}: ${detail}`)
    }

    if (gemini) {
      let data: any = null
      try {
        data = JSON.parse(text)
      } catch {
        // no-op
      }
      if (data?.candidates?.length) {
        state.message = '✅ 连通成功 (Gemini)'
      } else {
        state.message = '⚠️ 请求成功但未返回候选 (Gemini)'
      }
    } else {
      let data: any = null
      try {
        data = JSON.parse(text)
      } catch {
        // no-op
      }
      if (data?.choices?.length) {
        state.message = '✅ 连通成功'
      } else {
        state.message = '⚠️ 请求成功但未返回标准内容'
      }
    }
  } catch (err) {
    state.message = `❌ 测试失败: ${(err as Error).message}`
  } finally {
    state.loading = false
  }
}
</script>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.32);
  display: grid;
  place-items: center;
  z-index: 10;
  padding: 16px;
}

.panel {
  background: #ffffff;
  border-radius: 18px;
  padding: 20px;
  width: min(980px, 92vw);
  box-shadow: 0 20px 55px rgba(0, 0, 0, 0.22);
  display: flex;
  flex-direction: column;
  gap: 14px;
  border: 1px solid rgba(0, 0, 0, 0.04);
}

header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.title {
  font-weight: 900;
  font-size: 20px;
  letter-spacing: 0.2px;
}

.desc {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
}

.block {
  background: linear-gradient(145deg, #f9fbfa 0%, #f1f6f2 100%);
  border-radius: 12px;
  padding: 14px;
  border: 1px solid rgba(0, 0, 0, 0.04);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.4);
}

.block-head {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: flex-start;
}

.block-title {
  font-weight: 800;
  margin-bottom: 4px;
}

.block-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  flex-wrap: wrap;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
}
.cols-4 {
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
}

label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  color: var(--muted);
}

input,
select {
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid #d8e6de;
  background: #fff;
  color: var(--table-ink);
  transition: border 0.15s ease, box-shadow 0.15s ease;
}

input:focus,
select:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(31, 157, 114, 0.18);
}

select {
  appearance: none;
  background-image: linear-gradient(45deg, transparent 50%, #8ca59a 50%),
    linear-gradient(135deg, #8ca59a 50%, transparent 50%),
    linear-gradient(to right, transparent, transparent);
  background-position: calc(100% - 20px) calc(50% - 3px), calc(100% - 14px) calc(50% - 3px), 0 0;
  background-size: 6px 6px, 6px 6px, 100%;
  background-repeat: no-repeat;
  padding-right: 34px;
}

.checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  cursor: pointer;
}

.pill {
  border: 1px solid #d8e6de;
  border-radius: 999px;
  padding: 8px 12px;
  background: #fff;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.6);
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.test-message {
  font-size: 13px;
  color: var(--muted);
}

.role-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  gap: 10px;
  margin-top: 10px;
}

.role-card {
  background: #fff;
  border-radius: 12px;
  padding: 10px;
  border: 1px solid rgba(0, 0, 0, 0.04);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.6);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.role-test {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.toggle-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}

.toggle-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}

.ghost {
  background: #f2f5f3;
  color: var(--table-ink);
  border: 1px solid #dfe7e2;
}

.panel :global(button) {
  font-weight: 700;
}

.hint {
  margin: 0;
  color: var(--muted);
  font-size: 12px;
}
</style>
