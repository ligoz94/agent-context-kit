# Miglioramenti per agent-context-kit ispirati da "Building a Senior Staff Engineer with Sub-Agent Teams in Claude Code"

> Basato sull'articolo di Fareed Khan (Apr 2026) — [medium.com/@fareedkhandev/771298151392](https://medium.com/@fareedkhandev/771298151392)  
> Repo di riferimento: [github.com/FareedKhan-dev/claude-code-staff-engineer](https://github.com/FareedKhan-dev/claude-code-staff-engineer)

---

## Indice

1. [Filosofia di fondo: la differenza tra toolkit e disciplina](#1-filosofia-di-fondo)
2. [Mancanza #1: Sub-Agent Delegation Pattern](#2-sub-agent-delegation-pattern)
3. [Mancanza #2: Hard Gates (gating pipeline)](#3-hard-gates)
4. [Mancanza #3: Hook-based Session Onboarding](#4-hook-based-session-onboarding)
5. [Mancanza #4: Spec Review con fresh sub-agent](#5-spec-review)
6. [Mancanza #5: Plan Review contro Spec](#6-plan-review)
7. [Mancanza #6: TDD come Iron Law](#7-tdd-iron-law)
8. [Mancanza #7: Forensic Debugging workflow](#8-forensic-debugging)
9. [Mancanza #8: Skill Academy (TDD per documentazione)](#9-skill-academy)
10. [Mancanza #9: Rationalization Tables](#10-rationalization-tables)
11. [Mancanza #10: Code Review Reception (anti-sycophancy)](#11-code-review-reception)
12. [Mancanza #11: Git Worktree Management](#12-git-worktree-management)
13. [Mancanza #12: Release Engineering workflow](#13-release-engineering)
14. [Mancanza #13: Skill Description = Trigger, non Riassunto](#14-skill-description)
15. [Opportunità esistenti da potenziare](#15-opportunita-esistenti)
16. [Roadmap prioritaria](#16-roadmap)

---

## 1. Filosofia di fondo

L'articolo distingue due approcci:

| **agent-context-kit (oggi)** | **Fareed's approach** |
|--|--|
| Toolkit di strumenti MCP/CLI | Sistema disciplinato di processi |
| L'AGENTE decide SE usare un tool | L'AGENTE DEVE usare il processo (1% Rule) |
| Quality gates opzionali (opt-in) | Hard gates bloccanti |
| Mission workflow esiste ma è generico | Pipeline specifica: Design → Plan → Implement → Review → Release |

**La lezione principale**: il kit fornisce tutti i mattoni ma nessuna *disciplina*. Manca un layer di processi rigidi che l'agente **non può bypassare** — esattamente come uno Staff Engineer in un'organizzazione reale.

---

## 2. Sub-Agent Delegation Pattern

### Gap
Il kit ha un mission runner ma nessun pattern strutturato per delegare a sub-agents con contesto isolato. Il `runMissionLoop` usa worker/validator generici ma non impone:
- Context isolation (ogni sub-agent parte pulito)
- Model selection (task meccanici → modello cheap, task complessi → modello potente)
- Gestione fallimenti strutturata (DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED)

### Cosa aggiungere
```typescript
// packages/missions/src/delegation.ts
type DelegationStatus = 'DONE' | 'DONE_WITH_CONCERNS' | 'NEEDS_CONTEXT' | 'BLOCKED';

interface DelegationResult {
  status: DelegationStatus;
  summary: string;
  concerns?: string[];
  filesTouched?: string[];
  suggestedAction?: string;
}

interface DispatchConfig {
  taskDescription: string;
  model?: 'fast' | 'standard' | 'capable';
  context: { spec: string; plan: string; files: string[] };
  maxRetries?: number; // default 0 — mai re-dispatchare senza cambiamenti
}
```

### Principi da implementare
- **MAI** forzare lo stesso sub-agent a ritentare senza cambiamenti
- Se `BLOCKED`: o più contesto, o modello superiore, o task più piccolo → poi umano
- Fareed tratta ogni sub-agent come un contractor: istruzioni precise, contesto minimo, zero storico sessione

---

## 3. Hard Gates

### Gap
Il kit ha `request_human_approval` ma è un tool MCP opzionale. Non ci sono **gate automatici e bloccanti** nel flusso.

### Cosa aggiungere

```typescript
// packages/toolshed-server/src/gates.ts
interface GateCheck {
  gate: 'design-approved' | 'tests-pass' | 'plan-reviewed' | 'spec-reviewed' | 'code-reviewed';
  passed: boolean;
  evidence: string; // path to proof
}

// Gate chain — ogni gate DEVE passare prima del prossimo
const PIPELINE = [
  { gate: 'design-approved', nextAction: 'write-plan' },
  { gate: 'plan-reviewed', nextAction: 'execute' },
  { gate: 'tests-pass', nextAction: 'request-review' },
  { gate: 'code-reviewed', nextAction: 'release' },
];
```

Aggiungere al `manifest.yaml`:

```yaml
gates:
  enabled: true
  require_design_approval: true
  require_plan_review: true
  require_tests_before_merge: true
  require_code_review: true
```

### Principi
- **No code before design approval** (HARD GATE)
- **No merge before tests pass** (HARD GATE)
- **No deploy before code review** (HARD GATE)
- I gate non sono opzionali. Period.

---

## 4. Hook-based Session Onboarding

### Gap
Il kit non ha un sistema per iniettare contesto all'avvio della sessione. Ogni sessione parte da zero — come un developer che ricomincia giorno uno senza memoria.

### Cosa aggiungere

Il sistema di Fareed usa `hooks/hooks.json` + `hooks/session-start` per caricare automaticamente il "manuale del dipendente" (il core skill file) all'avvio.

Per agent-context-kit (dato che non siamo in Claude Code con il sistema hooks nativo):

```typescript
// packages/toolshed-server/src/session-bootstrap.ts
interface SessionBootstrapConfig {
  identityLayer: string[]; // quali file L0 caricare
  rulesLayer: string[];    // quali file L1 caricare
  injectAtStart: boolean;  // iniettare nel prompt iniziale
}

// Nuovo tool MCP:
// get_session_onboarding() → restituisce contesto da iniettare
// Chiamato AUTOMATICAMENTE a inizio sessione dal client
```

Estendere `manifest.yaml`:

```yaml
session:
  bootstrap:
    auto_load_identity: true
    auto_load_context_policy: true
    inject_welcome_context: true
```

### Principio
- Ogni sessione è giorno uno → serve onboarding automatico
- L0 (identity) deve essere caricato sempre, non solo su richiesta
- I tool MCP vanno bene per deep-dive ma l'identità del progetto deve essere sempre presente

---

## 5. Spec Review con Fresh Sub-Agent

### Gap
Il kit ha `analyze_spec_completeness` ma è un tool MCP usato dallo stesso agente che ha scritto la spec. Non c'è separazione delle responsabilità.

### Cosa aggiungere

```typescript
// packages/missions/src/spec-review.ts
interface SpecReviewRequest {
  specPath: string;
  reviewerPrompt?: string; // default: spec-document-reviewer
}

// Nuovo handler: dispatch_spec_review
// Lancia un sub-agent FRESCO con UNICO compito: recensire la spec
```

Template prompt da aggiungere:

```
You are a spec document reviewer. Verify this spec is complete 
and ready for planning.

Check:
- Completeness: TODOs, placeholders, TBD
- Consistency: contraddizioni interne
- Clarity: requisiti ambigui
- Scope: focalizzato per un singolo plan
- YAGNI: feature non richieste

Approve ONLY if serious gaps exist.
```

### Principio
- L'agente che scrive la design è biased — usa un fresh sub-agent per la review
- Calibrato: solo issue che causerebbero problemi reali, non "migliorerei questa frase"

---

## 6. Plan Review contro Spec

### Gap
Il kit ha `createMissionPlan` ma nessuna validazione che il plan copra TUTTI i requisiti della spec.

### Cosa aggiungere

```typescript
// packages/missions/src/plan-review.ts
interface PlanReviewRequest {
  planPath: string;
  specPath: string; // obbligatorio — reviewer confronta plan E spec
}

// Nuovo tool: review_plan_against_spec
// Prende plan + spec, verifica:
// 1. Tutti i requisiti della spec hanno task corrispondenti
// 2. Nessun task non richiesto (scope creep)
// 3. Ogni task ha file path esatti e codice completo
```

### Principio
- Non basta che il plan sia completo — deve coprire la spec
- "Show me which ticket covers requirement #7"
- 2-5 minuti per task: se un task richiede più tempo, è troppo grosso

---

## 7. TDD come Iron Law

### Gap
Il kit non ha alcuna enforcement di TDD. I test sono menzionati nelle templates ma non c'è un gate che li richieda.

### Cosa aggiungere

Nuovo profilo `tdd` in `manifest.yaml`:

```yaml
profiles:
  tdd:
    gates:
      require_tests_before_code: true
    rules:
      standards:
        - tdd
```

Nuovo standard template `docs/agent/testing-tdd.md`:

```markdown
# TDD Iron Law

<HARD-GATE>
Write code before test? Delete it. Start over.

No exceptions:
- Don't keep it as "reference"
- Don't "adapt" it while writing tests
- Don't look at it
- Delete means delete
</HARD-GATE>
```

Aggiungere `verify_tdd_compliance` nei verificatori (controlla git log: il test commit precede il code commit).

### Principi
- RED phase obbligatoria prima di qualsiasi GREEN
- "This is just a config change" non è una scusa — TDD vale SEMPRE
- Violare la lettera delle regole = violare lo spirito

---

## 8. Forensic Debugging Workflow

### Gap
Il kit non ha un workflow strutturato per il debugging. Un agente che trova un bug non ha un processo da seguire.

### Cosa aggiungere

```typescript
// packages/missions/src/forensic-debugging.ts
interface ForensicDebuggingSession {
  bugDescription: string;
  evidencePath?: string;
  
  // Four-phase process
  phase1_observe: { what: string; where: string; conditions: string };
  phase2_hypothesize: { hypotheses: Array<{ what: string; why: string; test: string }> };
  phase3_isolate: { experiment: string; result: string; confirmed: boolean };
  phase4_fix: { rootCause: string; fix: string; verification: string };
}
```

Nuovo tool MCP: `start_forensic_debugging`

Template prompt:

```
## Forensic Debugging Process

1. OBSERVE: What exactly happens? Where? Under what conditions?
   Get fresh terminal output. Don't trust memory.

2. HYPOTHESIZE: Generate 3 hypotheses ranked by probability.
   For each: what would prove/disprove it?

3. ISOLATE: Run targeted experiments.
   One variable change at a time. Document results.

4. FIX: Address root cause. Not symptom.
   Then: defense-in-depth (what other system could fail the same way?).
```

### 5-Why Root Cause Tracing

Aggiungere template per root cause a 5 livelli:

```yaml
gates:
  root_cause_depth: 5  # chiedere "why" 5 volte
```

---

## 9. Skill Academy (TDD per Documentazione)

### Gap
Il kit ha templates per `docs/` ma nessun processo per *testare* che la documentazione funzioni davvero.

### Cosa aggiungere

```typescript
// packages/toolshed-server/src/skill-testing.ts
interface SkillTest {
  name: string;
  pressureScenario: string; // task da dare a sub-agent SENZA skill
  expectedFailure: string;  // cosa fa di sbagliato senza skill
  successCriteria: string;  // cosa fa di giusto CON skill
}

// Nuovo tool: test_skill
// 1. Lancia sub-agent senza skill → verifica failure_mode
// 2. Lancia sub-agent con skill → verifica compliance
// Solo se entrambi passano → skill è "deployata"
```

Template per `docs/agent/skill-testing.md`:

```markdown
# Skill Academy

<HARD-GATE>
NO SKILL WITHOUT A FAILING TEST FIRST

This applies to NEW skills AND EDITS to existing skills.
Write skill before testing? Delete it. Start over.
</HARD-GATE>
```

### Principi chiave
- **RED phase**: se non hai visto un agente fallire SENZA la skill, non sai se la skill insegna la cosa giusta
- Discipline skills → test sotto pressione (tempo + sunk cost + exhaustion)
- Technique skills → test di applicazione
- Reference skills → test di retrieval

---

## 10. Rationalization Tables

### Gap
L'articolo mostra che gli agenti (come gli umani) razionalizzano per saltare i processi. Il kit non ha difese contro questo.

### Cosa aggiungere

Template standard da includere in ogni skill:

```markdown
## Rationalization Guard

| If you think... | Reality |
|--|--|
| "This is just a simple task" | Simple tasks hide unexamined assumptions. Use the process. |
| "I know what this skill says" | Skills evolve. Read the current version. |
| "The skill is overkill here" | Simple things become complex. Use it. |
| "Let me explore first" | Skills tell you HOW to explore. Check first. |
| "This feels productive" | Undisciplined action wastes time. Follow the process. |
```

Aggiungere al `get_guardrails` tool un check di "rationalization detection" opzionale.

---

## 11. Code Review Reception (anti-sycophancy)

### Gap
Il kit ha `validate_agent_report` per PR ma nessun processo per *ricevere* feedback di code review in modo sano.

### Cosa aggiungere

Template per `docs/agent/code-review-reception.md`:

```markdown
## Receiving Code Review

1. READ: Complete feedback without reacting
2. UNDERSTAND: Restate in own words
3. VERIFY: Check against codebase reality
4. EVALUATE: Makes sense for THIS codebase?
5. RESPOND: Technical or reasoned pushback
6. IMPLEMENT: One item, test each

NEVER:
- "You are absolutely right!" (performative agreement)
- "Great point!" / "Excellent feedback!"
- Gratitude expressions — actions > words

INSTEAD:
- "Fixed. [what changed]"
- "Good catch — [specific issue]. Fixed in [location]."
- [Just fix it]

If reviewer is wrong: push back with TECHNICAL reasoning.
You and reviewer are peers. User has authority.
```

### Principio
- La sycophancy è un problema reale negli agent (e negli umani)
- Il costruttore deve verificare prima di implementare un suggerimento
- "Fixed" è una frase completa

---

## 12. Git Worktree Management

### Gap
Il kit non ha tool per gestire worktree git. L'articolo li usa come "camere di contenimento" per isolamento.

### Cosa aggiungere

```typescript
// packages/toolshed-server/src/worktree.ts
interface WorktreeConfig {
  directory: '.worktrees' | 'worktrees';
  autoGitignore: boolean;
  verifyBaseline: boolean;
}

// Nuovo tool: setup_worktree
// 1. Check directory esistente
// 2. Check CLAUDE.md per preferenze
// 3. Verifica .gitignore
// 4. Crea worktree
// 5. Verifica baseline (test passano)
```

Aggiungere verifica di sicurezza:

```yaml
gates:
  worktree_safety:
    require_gitignore_check: true
    require_baseline_tests: true
```

---

## 13. Release Engineering Workflow

### Gap
Il kit ha `enable-mission` per iniziare ma non ha un workflow per *finire* e rilasciare il lavoro in sicurezza.

### Cosa aggiungere

```typescript
// packages/missions/src/release.ts
type ReleaseOption = 'merge-local' | 'create-pr' | 'keep-branch' | 'discard';

interface ReleaseRequest {
  branch: string;
  baseBranch: string;
  testCommand: string;
  prTitle?: string;
  prBody?: string;
}

// Nuovo tool: release_branch
// 1. Verifica test (HARD GATE)
// 2. Presenta 4 opzioni strutturate
// 3. Esegue scelta con verifiche post-azione
// 4. Cleanup worktree
```

### Principi
- **MAI** chiedere "what should we do?" — presenta opzioni strutturate
- Opzione "discard" richiede conferma digitata "discard" (come AWS "delete confirmation")
- Test verification DOPO il merge (non solo prima)
- Cleanup: ogni risorsa allocata viene deallocata

---

## 14. Skill Description = Trigger, non Riassunto

### Gap
Le descrizioni dei tool MCP potrebbero indurre l'agente a saltare il contenuto.

### Fix immediato
Rivedere tutte le descrizioni dei tool in `handlers.ts` e `tools.ts`:

```typescript
// BAD (riassume il workflow — agente potrebbe seguire la descrizione)
description: "Use when executing plans - dispatches subagent per task with code review"

// GOOD (solo condizioni di trigger)
description: "Use when executing implementation plans with independent tasks"
```

Stessa regola per i tool MCP: la descrizione dice **quando** usarlo, non **cosa** fa.

---

## 15. Opportunità esistenti da potenziare

### a) `analyze_spec_completeness`
Oggi controlla 8 categorie (Intent Engineering). Aggiungere:
- Scope decomposition check (rileva se la spec copre più sottosistemi indipendenti)
- YAGNI check (feature non richieste)

### b) `validate_agent_report`
Oggi verifica formato PNA. Aggiungere:
- "Test Plan" section obbligatoria
- Evidence di test execution

### c) Mission planner
Oggi crea piani da bullet list o frasi. Aggiungere:
- File structure mapping prima dei task
- "No TBD" enforcement (placeholders = plan failure)

### d) RunMissionLoop
Oggi supporta max 20 iterazioni. Aggiungere:
- Model routing per tipo di task
- `NEEDS_CONTEXT` handling (re-dispatch con più contesto)
- `DONE_WITH_CONCERNS` handling (review prima di procedere)

---

## 16. Roadmap prioritaria

| Priorità | Cosa | Perché |
|--|--|--|
| **P0** | Hard Gates + Gate Chain | Senza gate, tutti gli altri miglioramenti sono opzionali |
| **P1** | Sub-Agent Delegation Pattern | Sblocca l'esecuzione parallela disciplinata |
| **P1** | Spec Review + Plan Review | Cattura errori PRIMA di scrivere codice |
| **P2** | Code Review Reception | Previene sycophancy e bug da implementazione cieca |
| **P2** | Forensic Debugging | Dà un processo per il caso peggiore (bug in produzione) |
| **P3** | Skill Academy | Mantiene la qualità dei processi nel tempo |
| **P3** | Release Engineering + Worktrees | Rende il deployment sicuro e riproducibile |
| **P4** | Session Bootstrap (hooks alternativo) | Riduce contesto perso tra sessioni |
| **P4** | Rationalization Tables | Difesa psicologica contro shortcut dell'agente |

---

## Riferimenti

- **Articolo originale**: [Building a Senior Staff Engineer with Sub-Agent Teams in Claude Code](https://medium.com/@fareedkhandev/771298151392) — Fareed Khan, Apr 2026
- **Repo associato**: [FareedKhan-dev/claude-code-staff-engineer](https://github.com/FareedKhan-dev/claude-code-staff-engineer)
- **Progetto correlato**: [superpowers](https://github.com/jessems/superpowers) — plugin Claude Code con funzionalità simili
- **Claude Code hooks**: [code.claude.com/docs/en/hooks-guide](https://code.claude.com/docs/en/hooks-guide)
- **Agent teams**: [code.claude.com/docs/en/agent-teams.md](https://code.claude.com/docs/en/agent-teams.md)
