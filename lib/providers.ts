export const providerDefinitions = {
  openai: { name: "OpenAI", baseUrl: "https://api.openai.com/v1", defaultModel: "gpt-5.6-luna", protocol: "openai-responses", docs: "https://developers.openai.com/api/docs/models" },
  anthropic: { name: "Anthropic", baseUrl: "https://api.anthropic.com/v1", defaultModel: "claude-sonnet-4-6", protocol: "anthropic", docs: "https://platform.claude.com/docs/en/api/messages/create" },
  deepseek: { name: "DeepSeek", baseUrl: "https://api.deepseek.com", defaultModel: "deepseek-v4-flash", protocol: "openai-chat", docs: "https://api-docs.deepseek.com/zh-cn/guides/function_calling/" },
  glm: { name: "GLM (Z.AI)", baseUrl: "https://api.z.ai/api/paas/v4", defaultModel: "glm-5.1", protocol: "openai-chat", docs: "https://docs.z.ai/guides/develop/http/introduction" },
  kimi: { name: "Kimi", baseUrl: "https://api.moonshot.ai/v1", defaultModel: "kimi-k2.6", protocol: "openai-chat", docs: "https://platform.kimi.ai/docs/api/quickstart" },
  mistral: { name: "Mistral", baseUrl: "https://api.mistral.ai/v1", defaultModel: "mistral-small-latest", protocol: "openai-chat", docs: "https://docs.mistral.ai/getting-started/quickstarts/studio/activate-and-generate-api-key" },
} as const;

export type ProviderId = keyof typeof providerDefinitions;

export function isProviderId(value: string): value is ProviderId {
  return Object.prototype.hasOwnProperty.call(providerDefinitions, value);
}
