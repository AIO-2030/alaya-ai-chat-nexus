/**
 * 将最近聊天记录格式化为 AI 社交建议请求的 prompt 文本。
 * 用于「With AI assistant」功能：取最近若干条消息，区分己方与对方，组装成固定格式发给 execWebChat。
 */
import type { ChatMessageInfo } from '../services/api/chatApi';

export interface FormatChatForAiOptions {
  /** 最近的消息列表（已按时间排序，取最后 N 条） */
  messages: ChatMessageInfo[];
  /** 当前用户 principalId，用于区分「我」 */
  userPrincipalId: string;
  /** 对方显示名（如 contactName），用于 conversation 里的对方称呼 */
  partnerDisplayName: string;
  /** 最多取多少条消息，默认 10 */
  maxMessages?: number;
  /** 可选的关系上下文，不传则用默认占位 */
  relationshipContext?: {
    relationship_type?: string;
    relationship_duration?: string;
    recent_issue?: string;
  };
}

const DEFAULT_RELATIONSHIP = {
  relationship_type: 'friend',
  relationship_duration: 'unknown',
  recent_issue: 'none',
};

/**
 * 从单条消息中提取可读文本（仅 Text 模式用 content，其他模式可简短描述或跳过）
 */
function getMessageText(msg: ChatMessageInfo): string {
  if (msg.mode === 'Text') return msg.content?.trim() || '';
  if (msg.mode === 'Gif' && msg.gifInfo?.title) return `[GIF: ${msg.gifInfo.title}]`;
  if (msg.mode === 'Voice') return '[Voice message]';
  if (msg.mode === 'Image') return '[Image]';
  return '[Media]';
}

/**
 * 组装成 AI 可理解的单段 prompt 文本（用于 execWebChat 的 user message）
 */
export function formatChatForAiSuggestion(options: FormatChatForAiOptions): string {
  const {
    messages,
    userPrincipalId,
    partnerDisplayName,
    maxMessages = 10,
    relationshipContext,
  } = options;

  const recent = messages.slice(-maxMessages);
  const rel = { ...DEFAULT_RELATIONSHIP, ...relationshipContext };

  const lines: string[] = [
    'Please help me understand this conversation and suggest the best reply.',
    '',
    'relationship_context:',
    `  relationship_type: ${rel.relationship_type}`,
    `  relationship_duration: ${rel.relationship_duration}`,
    `  recent_issue: ${rel.recent_issue}`,
    '',
    'participants:',
    '  user: me',
    `  partner: ${partnerDisplayName}`,
    '',
    'conversation:',
  ];

  const partnerSlug = partnerDisplayName.toLowerCase().replace(/\s+/g, '_').slice(0, 20) || 'partner';
  for (const msg of recent) {
    const text = getMessageText(msg);
    if (text === '') continue;
    const speaker = msg.sendBy === userPrincipalId ? 'me' : partnerSlug;
    lines.push(`${speaker}: ${text}`);
  }

  return lines.join('\n');
}

/**
 * 构建传给 execWebChat 的 messages：一条 system 说明 + 一条 user（格式化后的对话）
 */
export function buildWebChatMessagesForSuggestion(formattedPrompt: string): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
  return [
    {
      role: 'system',
      content: 'You are a helpful assistant that analyzes conversations and suggests kind, clear, and effective replies. Reply in the same language as the conversation. Keep suggestions concise and practical.',
    },
    {
      role: 'user',
      content: formattedPrompt,
    },
  ];
}
