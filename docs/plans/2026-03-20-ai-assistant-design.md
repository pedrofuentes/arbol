# Arbol AI Assistant — Design Document

> Conversational AI panel for org chart analysis, mutation, and scenario modeling.

## Problem Statement

Users designing org structures in Arbol currently rely on their own judgment for structural decisions — span of control, hierarchy depth, team sizing, restructuring, etc. There's no built-in guidance or automation for common org design patterns.

**Goal:** Add a conversational AI assistant that can analyze org structures, suggest improvements, and execute changes with user approval — all running 100% in the browser with no backend.

## Design Decisions (Agreed)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| UI placement | Floating panel (bottom-right) | Doesn't compete with sidebar or analytics drawer; familiar pattern |
| AI backend | Pluggable BYOK (Bring Your Own Key) | Keeps app client-side; user controls their API key |
| V1 providers | OpenAI + Azure OpenAI | Most popular APIs; Azure = same models as Copilot |
| Architecture | Tool-calling | Structured, reliable; AI decides *what*, our code decides *how* |
| Mutation approval | Preview-before-apply | Visual diff on chart; Accept/Discard; undo as safety net |
| Rollout | Phased: analysis → mutations → scenarios | Incremental complexity; analysis is safest to ship first |

## Architecture

### High-Level Flow

```
User types message
    ↓
AIChat (UI component)
    ↓
AIService (orchestration layer)
    ↓
AIProvider (OpenAI / Azure OpenAI / future providers)
    ↓
LLM responds with tool calls
    ↓
ToolExecutor maps tool calls → OrgStore / analytics methods
    ↓
Results sent back to LLM for natural language summary
    ↓
Response displayed in chat panel
    ↓ (if mutation proposed)
PreviewManager shows visual diff on chart
    ↓
User clicks Accept → OrgStore mutation applied
    or Discard → preview cleared
```

### Component Breakdown

```
src/ai/
├── ai-provider.ts          # AIProvider interface + types
├── openai-provider.ts       # OpenAI API implementation
├── azure-provider.ts        # Azure OpenAI implementation
├── ai-service.ts            # Orchestration: manages conversation, tool execution loop
├── tool-definitions.ts      # Tool schemas (OpenAI function-calling format)
├── tool-executor.ts         # Maps tool calls → OrgStore/analytics methods
├── preview-manager.ts       # Manages proposed-tree preview state + diff visualization
├── system-prompt.ts         # System prompt with org design expertise
└── ai-settings.ts           # Provider config UI (key, model, endpoint)

src/ui/
├── ai-chat-panel.ts         # Floating chat panel UI component
└── ai-chat-message.ts       # Individual message rendering (user/assistant/tool/preview)
```

### AIProvider Interface

```typescript
interface AIProvider {
  readonly name: string;
  readonly id: string;

  chat(request: AIChatRequest): Promise<AIChatResponse>;
  chatStream(request: AIChatRequest): AsyncIterable<AIChatStreamChunk>;
  isConfigured(): boolean;
}

interface AIChatRequest {
  messages: ChatMessage[];
  tools?: ToolDefinition[];
  temperature?: number;
  maxTokens?: number;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: ToolCall[];        // assistant requesting tool execution
  toolCallId?: string;           // tool response referencing a call
}

interface ToolDefinition {
  name: string;
  description: string;
  parameters: JSONSchema;        // OpenAI function-calling schema
}

interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}
```

### Tool Definitions (Phase 1 — Analysis)

Read-only tools the AI can call to understand the org:

| Tool | Description | Returns |
|------|-------------|---------|
| `get_org_tree` | Full org tree (or focused subtree) | Serialized OrgNode tree |
| `get_node_info` | Details about a specific person | Node + parent + children count |
| `get_span_of_control` | Span metrics for a manager | direct reports, depth, health rating |
| `get_org_metrics` | Overall org health metrics | headcount, depth, avg span, ratio |
| `get_category_distribution` | Breakdown by color category | category → count mapping |
| `get_level_distribution` | Breakdown by level | level → count mapping |
| `search_people` | Find people by name/title | matching nodes list |
| `get_manager_chain` | Ancestry chain for a person | root → ... → person path |
| `get_team_members` | Direct reports of a manager | children list |
| `get_subtree` | Full subtree rooted at a node (for drill-down) | OrgNode subtree |
| `get_org_summary` | Summarized tree (depth N) for context window management | condensed tree with counts |

### Tool Definitions (Phase 2 — Mutations)

Write tools that propose changes (not applied directly):

| Tool | Description | Effect |
|------|-------------|--------|
| `propose_add_node` | Add person under a parent | Stages addition in preview tree |
| `propose_move_node` | Move person to new manager | Stages move in preview tree |
| `propose_remove_node` | Remove a leaf node | Stages removal in preview tree |
| `propose_rename_node` | Change name/title | Stages edit in preview tree |
| `propose_create_team` | Create manager + add reports | Stages multi-node addition |
| `propose_restructure` | Batch move/add/remove | Stages complex restructure |

All `propose_*` tools build a "proposed tree" that is shown as a visual diff. Nothing touches OrgStore until the user clicks Accept.

### Tool Definitions (Phase 3 — Scenarios)

| Tool | Description |
|------|-------------|
| `simulate_merge_teams` | Show merged team structure |
| `simulate_reduction` | Model headcount reduction (% or absolute) |
| `simulate_flatten` | Remove a management layer |
| `compare_scenarios` | Side-by-side comparison of two proposed structures |

### System Prompt Design

The system prompt establishes the AI as an org design expert:

```
You are an org design assistant embedded in Arbol, an interactive org chart editor.

Your expertise includes:
- Organizational structure best practices
- Span of control optimization (ideal: 4-8 direct reports)
- Hierarchy depth analysis
- Team composition and balance
- Restructuring and reorg planning

You have access to tools that let you read the org chart and propose changes.

Rules:
- Always use tools to get current org data — never guess structure
- When proposing changes, use propose_* tools so the user sees a preview
- Explain your reasoning in plain language
- Cite specific metrics (span, depth, headcount) when making recommendations
- Never make changes without the user's approval
- If the org has categories (departments/teams), respect them in suggestions
```

## UI Design — AI Chat Panel

### Layout

```
┌─────────────────────────────────────┐
│ 🤖 AI Assistant            ─  ✕    │  ← Header (title, minimize, close)
├─────────────────────────────────────┤
│                                     │
│  💬 How can I help with your        │  ← Welcome message
│     org design?                     │
│                                     │
│  ┌─ Suggested prompts ───────────┐  │  ← Quick-start chips
│  │ "Analyze my org structure"    │  │
│  │ "Check span of control"      │  │
│  │ "Suggest improvements"       │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌─ User ────────────────────────┐  │
│  │ Is my CTO's span too wide?   │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌─ Assistant ───────────────────┐  │
│  │ Let me check... [tool call]  │  │
│  │                              │  │
│  │ Your CTO has 12 direct       │  │
│  │ reports. Best practice is    │  │
│  │ 4-8. I recommend splitting   │  │
│  │ into two VPs.                │  │
│  │                              │  │
│  │ [Show proposal] [New chat]   │  │
│  └───────────────────────────────┘  │
│                                     │
├─────────────────────────────────────┤
│ ┌─────────────────────────┐ [Send] │  ← Input area
│ │ Ask about your org...   │        │
│ └─────────────────────────┘        │
└─────────────────────────────────────┘

Collapsed state: [🤖] button in bottom-right corner
```

### Panel Behavior

- **Default:** Collapsed to a floating button (🤖) in the bottom-right
- **Click button:** Expands to ~400px wide × 500px tall panel
- **Minimize (─):** Collapses back to button
- **Close (✕):** Closes and clears conversation
- **Resize:** Draggable top-left corner to resize (size persisted in localStorage)
- **Mobile:** Full-screen overlay below 768px viewport
- **Theme:** Follows Arbol's dark/light theme
- **z-index:** Above chart, below modals/dialogs

### Message Types

| Type | Rendering |
|------|-----------|
| User message | Right-aligned, themed bubble |
| Assistant text | Left-aligned, themed bubble, supports markdown |
| Tool call (in progress) | Subtle "Analyzing org structure..." indicator |
| Tool result | Collapsible detail block (expandable) |
| Proposed change | Highlighted block with Accept/Discard buttons |
| Error | Red-tinted message with retry option |
| Streaming | Token-by-token text with cursor indicator |

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Ctrl+Shift+A` | Toggle AI panel open/closed |
| `Enter` | Send message |
| `Shift+Enter` | New line in input |
| `Escape` | Minimize panel (when focused) |

## Settings Integration

### AI Settings Tab (in Settings Modal)

```
AI Assistant
├── Provider: [OpenAI ▾] / [Azure OpenAI ▾]
├── API Key: [••••••••••] [Show/Hide]
├── Model: [gpt-4o ▾] (auto-populated per provider)
├── Endpoint: [https://...] (Azure only)
├── Temperature: [0.3] (slider, 0-1)
└── [Test Connection]
```

- API key stored in localStorage (`arbol-ai-key`, `arbol-ai-provider`)
- Never logged, never sent anywhere except the configured API endpoint
- "Test Connection" sends a simple ping to verify key works
- Provider-specific fields show/hide based on selection

## Preview-Before-Apply Flow

```
1. AI proposes changes via propose_* tools
    ↓
2. PreviewManager builds a "proposed tree" (deep clone + mutations)
    ↓
3. Tree-diff computes: added, removed, moved, modified nodes
    ↓
4. ChartRenderer enters "preview mode":
   - Added nodes: green glow/border
   - Removed nodes: red strikethrough + fade
   - Moved nodes: blue highlight + dashed arrow from old position
   - Modified nodes: yellow highlight
    ↓
5. Banner appears: "AI proposed N changes" [Accept All] [Discard]
    ↓
6a. Accept → apply mutations to OrgStore (single undo snapshot)
6b. Discard → clear proposed tree, restore normal rendering
```

This leverages the existing `tree-diff` utility in `src/utils/tree-diff.ts` and the comparison rendering infrastructure.

## i18n Keys (New)

All user-facing strings go through `t()`. New key namespace: `ai.*`

```
ai.panel.title         = "AI Assistant"
ai.panel.placeholder   = "Ask about your org..."
ai.panel.welcome       = "How can I help with your org design?"
ai.panel.send          = "Send"
ai.panel.minimize      = "Minimize"
ai.panel.close         = "Close"
ai.panel.newChat       = "New conversation"
ai.chip.analyze        = "Analyze my org structure"
ai.chip.span           = "Check span of control"
ai.chip.suggest        = "Suggest improvements"
ai.message.thinking    = "Analyzing..."
ai.message.error       = "Something went wrong. Please try again."
ai.message.noProvider  = "Configure an AI provider in Settings to get started."
ai.preview.banner      = "AI proposed {count} changes"
ai.preview.accept      = "Accept changes"
ai.preview.discard     = "Discard"
ai.settings.title      = "AI Assistant"
ai.settings.provider   = "Provider"
ai.settings.apiKey     = "API Key"
ai.settings.model      = "Model"
ai.settings.endpoint   = "Endpoint"
ai.settings.temp       = "Temperature"
ai.settings.test       = "Test Connection"
ai.settings.test.ok    = "Connection successful"
ai.settings.test.fail  = "Connection failed: {error}"
ai.tokens.count        = "{count} tokens"
ai.tokens.cost         = "~${cost}"
ai.consent.title       = "AI Data Notice"
ai.consent.message     = "Your org data will be sent to {provider} to process your request. Your API key and data stay between your browser and {provider}."
ai.consent.accept      = "I understand"
ai.history.clear       = "Clear conversation"
ai.history.cleared     = "Conversation cleared"
```

## Security Considerations

- **API keys in localStorage:** Acceptable tradeoff for a local-first app. Same pattern as other BYOK tools. Never sent to any server except the user's configured AI endpoint.
- **No telemetry:** No usage data, conversation logs, or org data leaves the browser (except to the AI provider the user explicitly configured).
- **Org data in prompts:** The AI sees the org tree to answer questions. Users should be aware their org data goes to their configured LLM provider. Add a one-time consent notice.
- **Input sanitization:** AI responses rendered via `textContent` / `createElement` only (no `innerHTML`). Markdown rendering uses a safe subset (bold, italic, lists, code blocks — no HTML passthrough).
- **Rate limiting:** Client-side debounce to prevent accidental rapid-fire API calls (and unexpected costs).

## Testing Strategy

- **AIProvider implementations:** Mock HTTP responses, verify request formatting, error handling, streaming
- **ToolExecutor:** Test each tool against known org trees — verify correct data extraction and mutation staging
- **PreviewManager:** Test proposed tree construction, diff computation, accept/discard flows
- **AIChatPanel:** DOM testing — message rendering, input handling, keyboard shortcuts, collapse/expand
- **AIService:** Integration tests — full conversation loops with mock provider, tool execution cycles
- **Settings:** Provider switching, key persistence, connection testing
- **i18n:** All new keys present in en.ts, used via `t()`

## Phased Rollout Plan

### Phase 1: Analysis & Advice (Foundation)
- AIProvider interface + OpenAI implementation + Azure implementation
- AIService with tool-calling loop
- Read-only tools (get_org_tree, get_metrics, get_span, etc.)
- AI Chat Panel UI (floating, collapsible, themed)
- Settings tab for AI configuration
- System prompt with org design expertise
- Streaming responses
- Full i18n
- Suggested prompt chips

### Phase 2: Natural Language Mutations
- `propose_*` mutation tools
- PreviewManager (proposed tree state)
- Visual diff rendering in ChartRenderer (green/red/blue/yellow highlights)
- Accept/Discard banner and flow
- Single-undo-snapshot for accepted changes

### Phase 3: Scenario Modeling
- Scenario simulation tools
- Multiple proposed trees (compare side-by-side)
- Integration with existing side-by-side renderer
- "Save as version" for accepted scenarios

## Dependencies (New)

**Zero new npm dependencies.** OpenAI and Azure OpenAI APIs use standard `fetch()` with JSON payloads. No SDK needed.

- OpenAI API: `POST https://api.openai.com/v1/chat/completions` with `Authorization: Bearer <key>`
- Azure OpenAI: `POST https://<endpoint>/openai/deployments/<model>/chat/completions?api-version=2024-02-01` with `api-key: <key>`
- Streaming: Standard SSE (`text/event-stream`) parsed manually

## Resolved Design Questions

| Question | Decision |
|----------|----------|
| **Chat persistence** | Persisted per chart in IndexedDB, but user can clear history manually. "New conversation" button clears current thread. |
| **Token/cost awareness** | Show token count and estimated cost per message (small text below each assistant message). |
| **Large tree handling** | Smart summarization: AI gets depth-3 overview via system context, uses `get_subtree(nodeId)` tool to drill into specific branches on demand. |
| **Consent notice** | One-time notice on first AI panel open: "Your org data will be sent to [provider] to process your request. API key and data stay between your browser and [provider]." Stored as `arbol-ai-consent` in localStorage. |
