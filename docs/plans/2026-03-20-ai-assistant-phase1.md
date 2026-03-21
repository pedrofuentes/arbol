# AI Assistant Phase 1 — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a conversational AI assistant to Arbol (behind `?ai=true` feature flag) that can analyze org structures and provide advice via a floating chat panel, powered by pluggable AI providers (OpenAI + Azure OpenAI).

**Architecture:** Floating chat panel UI → AIService orchestration → pluggable AIProvider (OpenAI/Azure) with tool-calling. Read-only analysis tools expose OrgStore data to the LLM. Feature gated by URL parameter `?ai=true`. Zero new npm dependencies — uses native `fetch()` for API calls.

**Tech Stack:** TypeScript, Vanilla DOM, native fetch (SSE streaming), Vitest, existing EventEmitter pattern.

---

## Task 1: Feature Flag Utility

**Files:**
- Create: `src/utils/feature-flags.ts`
- Test: `tests/utils/feature-flags.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/utils/feature-flags.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { isFeatureEnabled } from '../../src/utils/feature-flags';

describe('isFeatureEnabled', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      value: { search: '' },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
  });

  it('returns false when flag is absent', () => {
    window.location.search = '';
    expect(isFeatureEnabled('ai')).toBe(false);
  });

  it('returns true when flag is "true"', () => {
    window.location.search = '?ai=true';
    expect(isFeatureEnabled('ai')).toBe(true);
  });

  it('returns false when flag is "false"', () => {
    window.location.search = '?ai=false';
    expect(isFeatureEnabled('ai')).toBe(false);
  });

  it('returns false when flag has no value', () => {
    window.location.search = '?ai';
    expect(isFeatureEnabled('ai')).toBe(false);
  });

  it('works with multiple params', () => {
    window.location.search = '?debug=1&ai=true&other=no';
    expect(isFeatureEnabled('ai')).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/utils/feature-flags.test.ts`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

```typescript
// src/utils/feature-flags.ts
export function isFeatureEnabled(flag: string): boolean {
  const params = new URLSearchParams(window.location.search);
  return params.get(flag) === 'true';
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/utils/feature-flags.test.ts`
Expected: PASS — all 5 tests pass

**Step 5: Commit**

```bash
git add src/utils/feature-flags.ts tests/utils/feature-flags.test.ts
git commit -m "feat(ai): add feature flag utility for URL-param gating"
```

---

## Task 2: AI Types & Interfaces

**Files:**
- Create: `src/ai/types.ts`
- Test: `tests/ai/types.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/ai/types.test.ts
import { describe, it, expect } from 'vitest';
import type {
  AIProvider,
  AIChatRequest,
  AIChatResponse,
  ChatMessage,
  ToolDefinition,
  ToolCall,
  AIProviderConfig,
  ChatConversation,
} from '../../src/ai/types';

describe('AI types', () => {
  it('ChatMessage satisfies the interface', () => {
    const msg: ChatMessage = {
      role: 'user',
      content: 'Hello',
    };
    expect(msg.role).toBe('user');
    expect(msg.content).toBe('Hello');
  });

  it('ChatMessage supports tool calls', () => {
    const msg: ChatMessage = {
      role: 'assistant',
      content: '',
      toolCalls: [{ id: 'tc1', name: 'get_org_tree', arguments: {} }],
    };
    expect(msg.toolCalls).toHaveLength(1);
  });

  it('ChatMessage supports tool results', () => {
    const msg: ChatMessage = {
      role: 'tool',
      content: '{"headcount": 42}',
      toolCallId: 'tc1',
    };
    expect(msg.toolCallId).toBe('tc1');
  });

  it('ToolDefinition satisfies the interface', () => {
    const tool: ToolDefinition = {
      name: 'get_org_tree',
      description: 'Get the full org tree',
      parameters: { type: 'object', properties: {} },
    };
    expect(tool.name).toBe('get_org_tree');
  });

  it('AIProviderConfig supports OpenAI', () => {
    const config: AIProviderConfig = {
      providerId: 'openai',
      apiKey: 'sk-test',
      model: 'gpt-4o',
    };
    expect(config.providerId).toBe('openai');
  });

  it('AIProviderConfig supports Azure OpenAI', () => {
    const config: AIProviderConfig = {
      providerId: 'azure-openai',
      apiKey: 'abc',
      model: 'gpt-4o',
      endpoint: 'https://my-resource.openai.azure.com',
    };
    expect(config.endpoint).toBeDefined();
  });

  it('AIChatResponse satisfies the interface', () => {
    const resp: AIChatResponse = {
      message: { role: 'assistant', content: 'Hello' },
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
    };
    expect(resp.usage.totalTokens).toBe(15);
  });

  it('ChatConversation satisfies the interface', () => {
    const conv: ChatConversation = {
      id: 'conv-1',
      chartId: 'chart-1',
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(conv.messages).toHaveLength(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/ai/types.test.ts`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

```typescript
// src/ai/types.ts

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface AIChatRequest {
  messages: ChatMessage[];
  tools?: ToolDefinition[];
  temperature?: number;
  maxTokens?: number;
}

export interface AIChatResponse {
  message: ChatMessage;
  usage: TokenUsage;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface AIChatStreamChunk {
  delta: string;
  toolCalls?: ToolCall[];
  finishReason?: 'stop' | 'tool_calls' | 'length';
  usage?: TokenUsage;
}

export interface AIProvider {
  readonly name: string;
  readonly id: string;
  chat(request: AIChatRequest): Promise<AIChatResponse>;
  chatStream(request: AIChatRequest): AsyncIterable<AIChatStreamChunk>;
  isConfigured(): boolean;
}

export interface AIProviderConfig {
  providerId: 'openai' | 'azure-openai';
  apiKey: string;
  model: string;
  endpoint?: string;
  temperature?: number;
}

export interface ChatConversation {
  id: string;
  chartId: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/ai/types.test.ts`
Expected: PASS — all 8 tests pass

**Step 5: Commit**

```bash
git add src/ai/types.ts tests/ai/types.test.ts
git commit -m "feat(ai): add AI type definitions and interfaces"
```

---

## Task 3: System Prompt

**Files:**
- Create: `src/ai/system-prompt.ts`
- Test: `tests/ai/system-prompt.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/ai/system-prompt.test.ts
import { describe, it, expect } from 'vitest';
import { buildSystemPrompt } from '../../src/ai/system-prompt';

describe('buildSystemPrompt', () => {
  it('returns a non-empty string', () => {
    const prompt = buildSystemPrompt({ headcount: 42, depth: 4, chartName: 'Engineering' });
    expect(prompt.length).toBeGreaterThan(100);
  });

  it('includes the chart name', () => {
    const prompt = buildSystemPrompt({ headcount: 10, depth: 2, chartName: 'Sales Team' });
    expect(prompt).toContain('Sales Team');
  });

  it('includes headcount and depth', () => {
    const prompt = buildSystemPrompt({ headcount: 150, depth: 6, chartName: 'Org' });
    expect(prompt).toContain('150');
    expect(prompt).toContain('6');
  });

  it('mentions span of control guidelines', () => {
    const prompt = buildSystemPrompt({ headcount: 10, depth: 2, chartName: 'Test' });
    expect(prompt.toLowerCase()).toContain('span of control');
  });

  it('instructs the AI to use tools', () => {
    const prompt = buildSystemPrompt({ headcount: 10, depth: 2, chartName: 'Test' });
    expect(prompt.toLowerCase()).toContain('tool');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/ai/system-prompt.test.ts`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

```typescript
// src/ai/system-prompt.ts

export interface SystemPromptContext {
  headcount: number;
  depth: number;
  chartName: string;
}

export function buildSystemPrompt(context: SystemPromptContext): string {
  return `You are an expert org design assistant embedded in Arbol, an interactive org chart editor.

You are currently working with the chart "${context.chartName}" which has ${context.headcount} people across ${context.depth} levels of hierarchy.

## Your Expertise
- Organizational structure and design best practices
- Span of control optimization (ideal range: 4–8 direct reports)
- Hierarchy depth analysis (recommended max depth: 6–8 for orgs under 500 people)
- Team composition, balance, and sizing
- Restructuring and reorganization planning
- Manager-to-IC ratio analysis (healthy range: 1:4 to 1:10)

## How You Work
- You have access to tools that read the current org chart. Always use them to get accurate data — never guess about the org structure.
- When asked about the org, use the appropriate tool to fetch current data before responding.
- Cite specific metrics (span of control, depth, headcount) when making recommendations.
- Explain your reasoning in plain, non-technical language that an HR leader or VP would understand.
- When multiple valid approaches exist, present options with trade-offs.

## Rules
- Never fabricate org data. If a tool call fails, say so.
- Keep responses concise but actionable.
- When suggesting changes, describe what you would change and why — the user will decide whether to proceed.
- Use the person's name when referring to specific people in the org.
- If the user asks about something outside org design, politely redirect to your area of expertise.`;
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/ai/system-prompt.test.ts`
Expected: PASS — all 5 tests pass

**Step 5: Commit**

```bash
git add src/ai/system-prompt.ts tests/ai/system-prompt.test.ts
git commit -m "feat(ai): add system prompt builder for org design assistant"
```

---

## Task 4: Tool Definitions

**Files:**
- Create: `src/ai/tool-definitions.ts`
- Test: `tests/ai/tool-definitions.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/ai/tool-definitions.test.ts
import { describe, it, expect } from 'vitest';
import { getAnalysisTools } from '../../src/ai/tool-definitions';
import type { ToolDefinition } from '../../src/ai/types';

describe('getAnalysisTools', () => {
  let tools: ToolDefinition[];

  beforeAll(() => {
    tools = getAnalysisTools();
  });

  it('returns an array of tool definitions', () => {
    expect(Array.isArray(tools)).toBe(true);
    expect(tools.length).toBeGreaterThan(0);
  });

  it('every tool has name, description, and parameters', () => {
    for (const tool of tools) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.parameters).toBeDefined();
      expect(tool.parameters.type).toBe('object');
    }
  });

  it('includes get_org_summary tool', () => {
    const tool = tools.find((t) => t.name === 'get_org_summary');
    expect(tool).toBeDefined();
    expect(tool!.description.toLowerCase()).toContain('summary');
  });

  it('includes get_node_info tool with nodeId parameter', () => {
    const tool = tools.find((t) => t.name === 'get_node_info');
    expect(tool).toBeDefined();
    const props = tool!.parameters.properties as Record<string, unknown>;
    expect(props).toHaveProperty('nameOrTitle');
  });

  it('includes get_org_metrics tool', () => {
    const tool = tools.find((t) => t.name === 'get_org_metrics');
    expect(tool).toBeDefined();
  });

  it('includes get_span_of_control tool', () => {
    const tool = tools.find((t) => t.name === 'get_span_of_control');
    expect(tool).toBeDefined();
  });

  it('includes search_people tool', () => {
    const tool = tools.find((t) => t.name === 'search_people');
    expect(tool).toBeDefined();
  });

  it('includes get_team_members tool', () => {
    const tool = tools.find((t) => t.name === 'get_team_members');
    expect(tool).toBeDefined();
  });

  it('includes get_manager_chain tool', () => {
    const tool = tools.find((t) => t.name === 'get_manager_chain');
    expect(tool).toBeDefined();
  });

  it('includes get_subtree tool', () => {
    const tool = tools.find((t) => t.name === 'get_subtree');
    expect(tool).toBeDefined();
  });

  it('has unique tool names', () => {
    const names = tools.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/ai/tool-definitions.test.ts`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

```typescript
// src/ai/tool-definitions.ts
import type { ToolDefinition } from './types';

export function getAnalysisTools(): ToolDefinition[] {
  return [
    {
      name: 'get_org_summary',
      description: 'Get a high-level summary of the org tree including headcount, depth, top-level structure, and key metrics. Use this first to understand the overall org before drilling deeper.',
      parameters: {
        type: 'object',
        properties: {
          maxDepth: {
            type: 'number',
            description: 'Maximum depth to include in the summary (default: 3). Use lower values for large orgs.',
          },
        },
      },
    },
    {
      name: 'get_node_info',
      description: 'Get detailed information about a specific person including their manager, direct reports, level, and category.',
      parameters: {
        type: 'object',
        properties: {
          nameOrTitle: {
            type: 'string',
            description: 'The name (or partial name) of the person to look up.',
          },
        },
        required: ['nameOrTitle'],
      },
    },
    {
      name: 'get_org_metrics',
      description: 'Get overall org health metrics: total headcount, manager count, IC count, max depth, average depth, average span of control, manager-to-IC ratio.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'get_span_of_control',
      description: 'Get span of control analysis for a specific manager or all managers. Returns direct report count, whether the span is healthy (4-8), and recommendations.',
      parameters: {
        type: 'object',
        properties: {
          managerName: {
            type: 'string',
            description: 'Name of the manager to analyze. If omitted, returns analysis for all managers.',
          },
        },
      },
    },
    {
      name: 'search_people',
      description: 'Search for people by name or title. Returns matching nodes with their position in the hierarchy.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search term to match against names and titles (case-insensitive).',
          },
        },
        required: ['query'],
      },
    },
    {
      name: 'get_team_members',
      description: 'Get the direct reports of a specific manager.',
      parameters: {
        type: 'object',
        properties: {
          managerName: {
            type: 'string',
            description: 'Name of the manager whose team to retrieve.',
          },
        },
        required: ['managerName'],
      },
    },
    {
      name: 'get_manager_chain',
      description: 'Get the management chain (ancestry path) from root to a specific person.',
      parameters: {
        type: 'object',
        properties: {
          personName: {
            type: 'string',
            description: 'Name of the person to get the chain for.',
          },
        },
        required: ['personName'],
      },
    },
    {
      name: 'get_subtree',
      description: 'Get the full subtree rooted at a specific person, including all descendants. Use to drill into a specific part of the org.',
      parameters: {
        type: 'object',
        properties: {
          rootName: {
            type: 'string',
            description: 'Name of the person whose subtree to retrieve.',
          },
          maxDepth: {
            type: 'number',
            description: 'Maximum depth to include (default: unlimited).',
          },
        },
        required: ['rootName'],
      },
    },
    {
      name: 'get_category_distribution',
      description: 'Get the distribution of people across color categories (departments, teams, etc.).',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'get_level_distribution',
      description: 'Get the distribution of people across levels/grades.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  ];
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/ai/tool-definitions.test.ts`
Expected: PASS — all 11 tests pass

**Step 5: Commit**

```bash
git add src/ai/tool-definitions.ts tests/ai/tool-definitions.test.ts
git commit -m "feat(ai): add read-only analysis tool definitions"
```

---

## Task 5: Tool Executor

**Files:**
- Create: `src/ai/tool-executor.ts`
- Test: `tests/ai/tool-executor.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/ai/tool-executor.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { ToolExecutor } from '../../src/ai/tool-executor';
import { OrgStore } from '../../src/store/org-store';
import { CategoryStore } from '../../src/store/category-store';
import type { OrgNode } from '../../src/types';

function buildTestTree(): OrgNode {
  return {
    id: 'root',
    name: 'Alice CEO',
    title: 'CEO',
    children: [
      {
        id: 'vp1',
        name: 'Bob VP',
        title: 'VP Engineering',
        level: 'L10',
        children: [
          { id: 'eng1', name: 'Charlie Dev', title: 'Engineer', level: 'L5' },
          { id: 'eng2', name: 'Diana Dev', title: 'Engineer', level: 'L5' },
          { id: 'eng3', name: 'Eve Dev', title: 'Senior Engineer', level: 'L6' },
        ],
      },
      {
        id: 'vp2',
        name: 'Frank VP',
        title: 'VP Sales',
        categoryId: 'sales-cat',
        children: [
          { id: 'sales1', name: 'Grace Sales', title: 'Account Exec', categoryId: 'sales-cat' },
        ],
      },
    ],
  };
}

describe('ToolExecutor', () => {
  let executor: ToolExecutor;
  let store: OrgStore;
  let categoryStore: CategoryStore;

  beforeEach(() => {
    store = new OrgStore(buildTestTree());
    categoryStore = new CategoryStore();
    categoryStore.replaceAll([
      { id: 'sales-cat', label: 'Sales', color: '#ff0000' },
    ]);
    executor = new ToolExecutor(store, categoryStore);
  });

  describe('get_org_metrics', () => {
    it('returns correct headcount and structure', async () => {
      const result = await executor.execute('get_org_metrics', {});
      const data = JSON.parse(result);
      expect(data.totalHeadcount).toBe(7);
      expect(data.managerCount).toBe(3);
      expect(data.icCount).toBe(4);
    });
  });

  describe('get_org_summary', () => {
    it('returns summary with tree structure', async () => {
      const result = await executor.execute('get_org_summary', {});
      const data = JSON.parse(result);
      expect(data.rootName).toBe('Alice CEO');
      expect(data.headcount).toBe(7);
    });

    it('respects maxDepth', async () => {
      const result = await executor.execute('get_org_summary', { maxDepth: 1 });
      const data = JSON.parse(result);
      expect(data.tree).toBeDefined();
    });
  });

  describe('get_node_info', () => {
    it('finds a person by name', async () => {
      const result = await executor.execute('get_node_info', { nameOrTitle: 'Bob' });
      const data = JSON.parse(result);
      expect(data.name).toBe('Bob VP');
      expect(data.directReports).toBe(3);
    });

    it('returns error for unknown person', async () => {
      const result = await executor.execute('get_node_info', { nameOrTitle: 'Nobody' });
      const data = JSON.parse(result);
      expect(data.error).toBeDefined();
    });
  });

  describe('search_people', () => {
    it('finds people by partial name match', async () => {
      const result = await executor.execute('search_people', { query: 'Dev' });
      const data = JSON.parse(result);
      expect(data.results.length).toBe(3);
    });

    it('finds people by title match', async () => {
      const result = await executor.execute('search_people', { query: 'VP' });
      const data = JSON.parse(result);
      expect(data.results.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('get_span_of_control', () => {
    it('returns span for a specific manager', async () => {
      const result = await executor.execute('get_span_of_control', { managerName: 'Bob' });
      const data = JSON.parse(result);
      expect(data.directReports).toBe(3);
    });

    it('returns all managers when no name given', async () => {
      const result = await executor.execute('get_span_of_control', {});
      const data = JSON.parse(result);
      expect(data.managers.length).toBe(3);
    });
  });

  describe('get_team_members', () => {
    it('returns direct reports of a manager', async () => {
      const result = await executor.execute('get_team_members', { managerName: 'Bob' });
      const data = JSON.parse(result);
      expect(data.members.length).toBe(3);
    });
  });

  describe('get_manager_chain', () => {
    it('returns chain from root to person', async () => {
      const result = await executor.execute('get_manager_chain', { personName: 'Charlie' });
      const data = JSON.parse(result);
      expect(data.chain.length).toBe(3);
      expect(data.chain[0].name).toBe('Alice CEO');
      expect(data.chain[2].name).toBe('Charlie Dev');
    });
  });

  describe('get_subtree', () => {
    it('returns the subtree rooted at a person', async () => {
      const result = await executor.execute('get_subtree', { rootName: 'Bob' });
      const data = JSON.parse(result);
      expect(data.root.name).toBe('Bob VP');
      expect(data.root.children.length).toBe(3);
    });
  });

  describe('get_category_distribution', () => {
    it('returns category counts', async () => {
      const result = await executor.execute('get_category_distribution', {});
      const data = JSON.parse(result);
      expect(data.categories).toBeDefined();
    });
  });

  describe('get_level_distribution', () => {
    it('returns level counts', async () => {
      const result = await executor.execute('get_level_distribution', {});
      const data = JSON.parse(result);
      expect(data.levels).toBeDefined();
    });
  });

  describe('unknown tool', () => {
    it('returns error for unknown tool', async () => {
      const result = await executor.execute('nonexistent_tool', {});
      const data = JSON.parse(result);
      expect(data.error).toBeDefined();
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/ai/tool-executor.test.ts`
Expected: FAIL — module not found

**Step 3: Write implementation**

Create `src/ai/tool-executor.ts` that:
- Takes an `OrgStore` and `CategoryStore` in the constructor
- Has an `execute(toolName: string, args: Record<string, unknown>): Promise<string>` method
- Each tool handler reads from OrgStore/CategoryStore using existing tree utilities (`flattenTree`, `findNodeById`, `findParent`, `isLeaf`, `isM1`, `avgSpanOfControl`)
- Returns JSON-stringified results
- Returns `{ error: "..." }` for unknown tools or failed lookups
- `get_node_info`: fuzzy-matches by name (case-insensitive `includes`), returns node details + parent + direct report count
- `get_org_metrics`: flattens tree, counts managers/ICs, computes depth, avg span
- `get_org_summary`: builds condensed tree to maxDepth with `{ name, title, directReports, totalOrg }` per node
- `search_people`: case-insensitive match on name + title
- `get_span_of_control`: single manager or all managers, includes health rating
- `get_team_members`: direct children of named manager
- `get_manager_chain`: walk from root collecting ancestors
- `get_subtree`: find node, return subtree (optionally truncated to maxDepth)
- `get_category_distribution`: count nodes per categoryId, join with CategoryStore labels
- `get_level_distribution`: count nodes per level value

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/ai/tool-executor.test.ts`
Expected: PASS — all tests pass

**Step 5: Commit**

```bash
git add src/ai/tool-executor.ts tests/ai/tool-executor.test.ts
git commit -m "feat(ai): add tool executor for read-only org analysis"
```

---

## Task 6: OpenAI Provider

**Files:**
- Create: `src/ai/openai-provider.ts`
- Test: `tests/ai/openai-provider.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/ai/openai-provider.test.ts
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { OpenAIProvider } from '../../src/ai/openai-provider';
import type { AIChatRequest } from '../../src/ai/types';

describe('OpenAIProvider', () => {
  let provider: OpenAIProvider;

  beforeEach(() => {
    provider = new OpenAIProvider({ apiKey: 'sk-test', model: 'gpt-4o' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('has correct id and name', () => {
    expect(provider.id).toBe('openai');
    expect(provider.name).toBe('OpenAI');
  });

  it('isConfigured returns true when key is set', () => {
    expect(provider.isConfigured()).toBe(true);
  });

  it('isConfigured returns false when key is empty', () => {
    const p = new OpenAIProvider({ apiKey: '', model: 'gpt-4o' });
    expect(p.isConfigured()).toBe(false);
  });

  it('chat sends correct request format', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        choices: [{ message: { role: 'assistant', content: 'Hello!' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      }),
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as Response);

    const request: AIChatRequest = {
      messages: [{ role: 'user', content: 'Hi' }],
    };
    const result = await provider.chat(request);

    expect(result.message.content).toBe('Hello!');
    expect(result.usage.totalTokens).toBe(15);

    const [url, options] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/chat/completions');
    expect((options as RequestInit).method).toBe('POST');
    const headers = (options as RequestInit).headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer sk-test');
  });

  it('chat sends tools when provided', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            role: 'assistant',
            content: null,
            tool_calls: [{
              id: 'tc1',
              type: 'function',
              function: { name: 'get_org_tree', arguments: '{}' },
            }],
          },
        }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      }),
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as Response);

    const request: AIChatRequest = {
      messages: [{ role: 'user', content: 'Analyze the org' }],
      tools: [{ name: 'get_org_tree', description: 'Get tree', parameters: { type: 'object', properties: {} } }],
    };
    const result = await provider.chat(request);

    expect(result.message.toolCalls).toHaveLength(1);
    expect(result.message.toolCalls![0].name).toBe('get_org_tree');
  });

  it('chat throws on API error', async () => {
    const mockResponse = {
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({ error: { message: 'Invalid API key' } }),
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as Response);

    await expect(
      provider.chat({ messages: [{ role: 'user', content: 'Hi' }] }),
    ).rejects.toThrow();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/ai/openai-provider.test.ts`
Expected: FAIL — module not found

**Step 3: Write implementation**

Create `src/ai/openai-provider.ts` that:
- Implements `AIProvider` interface
- Constructor takes `{ apiKey: string; model: string }`
- `chat()`: POSTs to `https://api.openai.com/v1/chat/completions` with:
  - `Authorization: Bearer <key>` header
  - Body: `{ model, messages, tools (converted to OpenAI function format), temperature }`
  - Converts tool_calls from OpenAI format (`function.name`, `function.arguments` as JSON string) to our `ToolCall` format
  - Parses usage from OpenAI's `prompt_tokens`/`completion_tokens` → our `TokenUsage`
- `chatStream()`: Same endpoint with `stream: true`, parses SSE `data: [DONE]` protocol
- `isConfigured()`: returns `apiKey.length > 0`
- Throws descriptive errors on non-2xx responses

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/ai/openai-provider.test.ts`
Expected: PASS — all tests pass

**Step 5: Commit**

```bash
git add src/ai/openai-provider.ts tests/ai/openai-provider.test.ts
git commit -m "feat(ai): add OpenAI provider implementation"
```

---

## Task 7: Azure OpenAI Provider

**Files:**
- Create: `src/ai/azure-provider.ts`
- Test: `tests/ai/azure-provider.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/ai/azure-provider.test.ts
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AzureOpenAIProvider } from '../../src/ai/azure-provider';

describe('AzureOpenAIProvider', () => {
  let provider: AzureOpenAIProvider;

  beforeEach(() => {
    provider = new AzureOpenAIProvider({
      apiKey: 'azure-key',
      model: 'gpt-4o',
      endpoint: 'https://my-resource.openai.azure.com',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('has correct id and name', () => {
    expect(provider.id).toBe('azure-openai');
    expect(provider.name).toBe('Azure OpenAI');
  });

  it('isConfigured returns true when key and endpoint are set', () => {
    expect(provider.isConfigured()).toBe(true);
  });

  it('isConfigured returns false when endpoint is missing', () => {
    const p = new AzureOpenAIProvider({ apiKey: 'key', model: 'gpt-4o', endpoint: '' });
    expect(p.isConfigured()).toBe(false);
  });

  it('uses correct Azure endpoint format', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        choices: [{ message: { role: 'assistant', content: 'Hello' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      }),
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as Response);

    await provider.chat({ messages: [{ role: 'user', content: 'Hi' }] });

    const [url, options] = vi.mocked(fetch).mock.calls[0];
    expect(url).toContain('my-resource.openai.azure.com');
    expect(url).toContain('/openai/deployments/gpt-4o/chat/completions');
    expect(url).toContain('api-version=');
    const headers = (options as RequestInit).headers as Record<string, string>;
    expect(headers['api-key']).toBe('azure-key');
  });
});
```

**Step 2: Run, verify fail, implement, verify pass**

Same TDD flow. Implementation is similar to OpenAI but with:
- URL: `${endpoint}/openai/deployments/${model}/chat/completions?api-version=2024-10-21`
- Auth header: `api-key: <key>` (instead of Bearer)
- Same response parsing (Azure uses identical response format)

**Step 3: Commit**

```bash
git add src/ai/azure-provider.ts tests/ai/azure-provider.test.ts
git commit -m "feat(ai): add Azure OpenAI provider implementation"
```

---

## Task 8: AI Service (Orchestration Layer)

**Files:**
- Create: `src/ai/ai-service.ts`
- Test: `tests/ai/ai-service.test.ts`

**Step 1: Write the failing test**

Tests should cover:
- Constructor takes provider + tool executor
- `sendMessage(userMessage)` adds user message to conversation, calls provider, returns response
- Tool-calling loop: if provider returns tool_calls, executor runs them, results sent back to provider
- Max tool iterations (prevent infinite loops, cap at 10)
- Conversation history management (messages accumulate)
- `clearConversation()` resets messages
- `getMessages()` returns full history
- Error handling: provider failure → error message returned, not thrown
- `setProvider()` to switch providers mid-session

**Step 2: Write implementation**

Create `src/ai/ai-service.ts`:
- `AIService` class
- Constructor: `(provider: AIProvider, executor: ToolExecutor, systemPromptContext: SystemPromptContext)`
- Builds system prompt and prepends to every request
- `sendMessage(content: string): Promise<{ response: ChatMessage; usage: TokenUsage }>`
  1. Appends user message to history
  2. Calls `provider.chat({ messages: [...history], tools: getAnalysisTools() })`
  3. If response has `toolCalls`, executes each via `executor.execute()`, adds tool results, calls provider again
  4. Repeats until provider responds with text (or max 10 iterations)
  5. Appends final assistant message to history
  6. Returns response + cumulative usage
- `getMessages(): ChatMessage[]`
- `clearConversation(): void`
- `setProvider(provider: AIProvider): void`
- `getConversation(): ChatConversation`
- `loadConversation(conv: ChatConversation): void`

**Step 3: Commit**

```bash
git add src/ai/ai-service.ts tests/ai/ai-service.test.ts
git commit -m "feat(ai): add AI service orchestration with tool-calling loop"
```

---

## Task 9: i18n Keys for AI Feature

**Files:**
- Modify: `src/i18n/en.ts` (add AI section before closing)

**Step 1: Write the failing test**

```typescript
// tests/ai/i18n-keys.test.ts
import { describe, it, expect } from 'vitest';
import en from '../../src/i18n/en';

const AI_KEYS = [
  'ai.panel_title',
  'ai.panel_tooltip',
  'ai.input_placeholder',
  'ai.send',
  'ai.welcome',
  'ai.thinking',
  'ai.error_generic',
  'ai.error_no_provider',
  'ai.error_not_configured',
  'ai.clear_conversation',
  'ai.conversation_cleared',
  'ai.new_conversation',
  'ai.chip_analyze',
  'ai.chip_span',
  'ai.chip_suggest',
  'ai.tokens',
  'ai.estimated_cost',
  'ai.consent_title',
  'ai.consent_message',
  'ai.consent_accept',
  'ai.minimize',
  'ai.close',
  'settings_modal.tab.ai',
  'settings.ai.provider',
  'settings.ai.api_key',
  'settings.ai.model',
  'settings.ai.endpoint',
  'settings.ai.temperature',
  'settings.ai.test_connection',
  'settings.ai.test_success',
  'settings.ai.test_fail',
  'settings.ai.section_title',
  'shortcut.ai_chat',
  'command_palette.item_ai_chat',
];

describe('AI i18n keys', () => {
  for (const key of AI_KEYS) {
    it(`has key "${key}"`, () => {
      expect(en[key]).toBeDefined();
      expect(en[key].length).toBeGreaterThan(0);
    });
  }
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/ai/i18n-keys.test.ts`
Expected: FAIL — keys not found

**Step 3: Add keys to `src/i18n/en.ts`**

Add a new section before the closing `};`:

```typescript
  // ─── AI Assistant ──────────────────────────────────────────────────
  'ai.panel_title': 'AI Assistant',
  'ai.panel_tooltip': 'Toggle AI assistant',
  'ai.input_placeholder': 'Ask about your org…',
  'ai.send': 'Send',
  'ai.welcome': 'How can I help with your org design?',
  'ai.thinking': 'Analyzing…',
  'ai.error_generic': 'Something went wrong. Please try again.',
  'ai.error_no_provider': 'Configure an AI provider in Settings to get started.',
  'ai.error_not_configured': 'AI provider not configured. Open Settings → AI to add your API key.',
  'ai.clear_conversation': 'Clear conversation',
  'ai.conversation_cleared': 'Conversation cleared',
  'ai.new_conversation': 'New conversation',
  'ai.chip_analyze': 'Analyze my org structure',
  'ai.chip_span': 'Check span of control',
  'ai.chip_suggest': 'Suggest improvements',
  'ai.tokens': '{count} tokens',
  'ai.estimated_cost': '~${cost}',
  'ai.consent_title': 'AI Data Notice',
  'ai.consent_message': 'Your org data will be sent to {provider} to process your request. Your API key and data stay between your browser and {provider}.',
  'ai.consent_accept': 'I understand',
  'ai.minimize': 'Minimize',
  'ai.close': 'Close',
  'settings_modal.tab.ai': 'AI',
  'settings.ai.provider': 'Provider',
  'settings.ai.api_key': 'API Key',
  'settings.ai.model': 'Model',
  'settings.ai.endpoint': 'Endpoint (Azure only)',
  'settings.ai.temperature': 'Temperature',
  'settings.ai.test_connection': 'Test Connection',
  'settings.ai.test_success': 'Connection successful',
  'settings.ai.test_fail': 'Connection failed: {error}',
  'settings.ai.section_title': 'AI Assistant',
  'shortcut.ai_chat': 'Toggle AI Chat',
  'command_palette.item_ai_chat': 'Toggle AI Chat',
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/ai/i18n-keys.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/i18n/en.ts tests/ai/i18n-keys.test.ts
git commit -m "feat(ai): add i18n keys for AI assistant UI"
```

---

## Task 10: AI Chat Panel UI Component

**Files:**
- Create: `src/ui/ai-chat-panel.ts`
- Test: `tests/ui/ai-chat-panel.test.ts`
- Modify: `src/style.css` (add AI chat styles)

**Step 1: Write the failing test**

Tests should cover:
- Constructor creates DOM structure (root element, header, body, input area)
- `toggle()` opens/closes panel
- `open()` / `close()` set state correctly
- `isOpen()` returns correct state
- CSS classes toggle (`collapsed` class)
- `getContentContainer()` returns the body element
- Header shows title, minimize and close buttons
- Input area has textarea and send button
- `onSend` callback fires when send button clicked with non-empty input
- `onSend` fires on Enter key (not Shift+Enter)
- Input clears after send
- `addMessage()` renders user/assistant messages in the body
- `clearMessages()` empties the body
- `setLoading()` shows/hides loading indicator
- `destroy()` removes DOM elements
- `focusInput()` focuses the textarea
- ARIA attributes present (role, aria-label, etc.)

**Step 2: Write implementation**

Create `src/ui/ai-chat-panel.ts`:
- Extends `EventEmitter`
- Floating panel positioned bottom-right (CSS class `ai-chat-panel`)
- Contains: header (title + minimize + close buttons), messages area (scrollable), input area (textarea + send button)
- Collapsed by default (CSS class `ai-chat-collapsed`)
- Toggle button is a separate concern (wired in main.ts)
- Methods: `open()`, `close()`, `toggle()`, `isOpen()`, `getContentContainer()`, `addMessage(role, content, metadata?)`, `clearMessages()`, `setLoading(bool)`, `focusInput()`, `destroy()`
- `onSend` callback pattern (passed in constructor options)
- Keyboard: Enter sends, Shift+Enter adds newline
- Suggested prompt chips in empty state
- All text via `t()` calls

**Step 3: Add CSS to `src/style.css`**

Add `.ai-chat-panel`, `.ai-chat-collapsed`, `.ai-chat-header`, `.ai-chat-body`, `.ai-chat-input-area`, `.ai-chat-message`, `.ai-chat-message-user`, `.ai-chat-message-assistant`, `.ai-chat-toggle-btn`, `.ai-chat-chip`, `.ai-chat-loading` styles using existing CSS custom properties.

**Step 4: Commit**

```bash
git add src/ui/ai-chat-panel.ts tests/ui/ai-chat-panel.test.ts src/style.css
git commit -m "feat(ai): add floating AI chat panel UI component"
```

---

## Task 11: AI Settings Panel

**Files:**
- Create: `src/ai/ai-settings.ts`
- Test: `tests/ai/ai-settings.test.ts`

**Step 1: Write the failing test**

Tests should cover:
- Constructor creates form with provider select, API key input, model select, endpoint input, temperature slider
- Provider change shows/hides endpoint field (Azure-only)
- `getConfig()` returns current `AIProviderConfig`
- `setConfig()` populates form fields
- API key is stored/loaded from localStorage (`arbol-ai-config`)
- "Test Connection" button calls provided callback
- API key field has password type (masked)
- All labels use `t()` keys

**Step 2: Write implementation**

Create `src/ai/ai-settings.ts`:
- `AISettingsPanel` class
- Constructor: `(container: HTMLElement, options: { onTestConnection: (config: AIProviderConfig) => Promise<boolean> })`
- Builds form: provider dropdown (OpenAI / Azure OpenAI), API key (password input), model dropdown, endpoint (text input, shown only for Azure), temperature (range slider 0-1, step 0.1)
- `getConfig(): AIProviderConfig` — reads form values
- `setConfig(config: AIProviderConfig): void` — populates form
- Persists to localStorage on change (`arbol-ai-config`)
- Loads from localStorage on construction

**Step 3: Commit**

```bash
git add src/ai/ai-settings.ts tests/ai/ai-settings.test.ts
git commit -m "feat(ai): add AI settings panel for provider configuration"
```

---

## Task 12: Main.ts Wiring (Feature-Flagged)

**Files:**
- Modify: `src/main.ts`
- Test: `tests/integration/ai-feature-flag.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/integration/ai-feature-flag.test.ts
import { describe, it, expect } from 'vitest';
import { isFeatureEnabled } from '../../src/utils/feature-flags';

describe('AI feature flag integration', () => {
  it('AI feature is gated by ?ai=true URL parameter', () => {
    // When flag is off, no AI UI should be created
    window.location.search = '';
    expect(isFeatureEnabled('ai')).toBe(false);

    // When flag is on, AI UI should be created
    window.location.search = '?ai=true';
    expect(isFeatureEnabled('ai')).toBe(true);
  });
});
```

**Step 2: Modify `src/main.ts`**

Add to imports:
```typescript
import { isFeatureEnabled } from './utils/feature-flags';
```

Add after the analytics drawer wiring (after line ~687), wrapped in feature flag:
```typescript
  // ── AI Chat Panel (feature-flagged) ─────────────────────────────────
  if (isFeatureEnabled('ai')) {
    const { AIChatPanel } = await import('./ui/ai-chat-panel');
    const { AIService } = await import('./ai/ai-service');
    const { ToolExecutor } = await import('./ai/tool-executor');
    const { OpenAIProvider } = await import('./ai/openai-provider');
    const { AzureOpenAIProvider } = await import('./ai/azure-provider');
    const { AISettingsPanel } = await import('./ai/ai-settings');
    const { buildSystemPrompt } = await import('./ai/system-prompt');
    const { getAnalysisTools } = await import('./ai/tool-definitions');

    // Load saved AI config from localStorage
    const savedAIConfig = JSON.parse(localStorage.getItem('arbol-ai-config') ?? 'null');

    // Create provider based on config
    let aiProvider = null;
    if (savedAIConfig?.apiKey) {
      aiProvider = savedAIConfig.providerId === 'azure-openai'
        ? new AzureOpenAIProvider(savedAIConfig)
        : new OpenAIProvider(savedAIConfig);
    }

    // Create tool executor and service
    const toolExecutor = new ToolExecutor(store, categoryStore);

    let aiService: InstanceType<typeof AIService> | null = null;
    if (aiProvider) {
      const tree = store.getTree();
      const depth = /* compute max depth */ 0;
      aiService = new AIService(
        aiProvider,
        toolExecutor,
        { headcount: flattenTree(tree).length, depth, chartName: chartStore.getActiveChart()?.name ?? 'Untitled' },
      );
    }

    // Create chat panel
    const aiChatPanel = new AIChatPanel(chartArea, {
      onSend: async (message: string) => {
        if (!aiService) {
          showToast(t('ai.error_not_configured'), 'error');
          return;
        }
        // ... send message, display response
      },
      onChipClick: async (chip: string) => { /* same as onSend */ },
    });

    // Toggle button in toolbar
    const aiToggleBtn = createIconButton({
      icon: '🤖',
      tooltip: t('ai.panel_tooltip'),
      ariaLabel: t('ai.panel_tooltip'),
      onClick: () => { aiChatPanel.toggle(); },
    });
    headerRight.insertBefore(aiToggleBtn, toolbar.themeBtn);

    aiChatPanel.onChange(() => {
      aiToggleBtn.classList.toggle('active', aiChatPanel.isOpen());
    });
  }
```

**Step 3: Commit**

```bash
git add src/main.ts tests/integration/ai-feature-flag.test.ts
git commit -m "feat(ai): wire AI chat panel into main.ts behind feature flag"
```

---

## Task 13: Full Test Suite Pass + Lint

**Step 1: Run full test suite**

```bash
npm run test
```

Expected: ALL tests pass (existing + new AI tests)

**Step 2: Run linter**

```bash
npm run lint
```

Expected: No new lint errors

**Step 3: Run type checker**

```bash
npm run type-check
```

Expected: No type errors

**Step 4: Fix any issues found**

Address any failures or warnings.

---

## Task 14: Documentation + Version Bump

**Files:**
- Modify: `CHANGELOG.md` (add entry)
- Modify: `AGENTS.md` (update test count)
- Modify: `docs/contributing.md` (update test count)
- Modify: `package.json` (bump version)

**Step 1: Update CHANGELOG.md**

Add new entry at top:
```markdown
## [3.12.0] — YYYY-MM-DD

### Added
- AI Assistant (Phase 1 — Analysis & Advice) behind `?ai=true` feature flag
  - Floating chat panel with conversational interface
  - Pluggable AI provider system (OpenAI + Azure OpenAI via BYOK)
  - 10 read-only analysis tools (org metrics, span of control, search, manager chain, etc.)
  - Tool-calling architecture for structured AI interactions
  - AI settings panel in Settings modal
  - Chat history persistence per chart
  - Token usage tracking with estimated cost display
  - Suggested prompt chips for quick start
  - i18n support for all AI strings
  - Feature flag utility (`?ai=true` URL parameter)
```

**Step 2: Bump version in `package.json`**

```bash
npm version minor --no-git-tag-version
```

**Step 3: Update test counts in AGENTS.md and docs/contributing.md**

Update the test count to the actual number after running `npm run test`.

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: bump to v3.12.0, update docs and changelog for AI assistant"
```

---

## Summary

| Task | Description | New Files | Tests |
|------|-------------|-----------|-------|
| 1 | Feature flag utility | 1 | ~5 |
| 2 | AI types & interfaces | 1 | ~8 |
| 3 | System prompt builder | 1 | ~5 |
| 4 | Tool definitions | 1 | ~11 |
| 5 | Tool executor | 1 | ~15 |
| 6 | OpenAI provider | 1 | ~5 |
| 7 | Azure OpenAI provider | 1 | ~4 |
| 8 | AI service orchestration | 1 | ~8 |
| 9 | i18n keys | 0 (modify) | ~33 |
| 10 | AI chat panel UI | 1 + CSS | ~15 |
| 11 | AI settings panel | 1 | ~8 |
| 12 | Main.ts wiring | 0 (modify) | ~2 |
| 13 | Full test suite pass | 0 | 0 |
| 14 | Docs + version bump | 0 (modify) | 0 |
| **Total** | | **10 new files** | **~119 new tests** |
