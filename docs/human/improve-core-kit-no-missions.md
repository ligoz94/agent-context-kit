# agent-context-kit Core — Gap Analysis (senza Missions)

> Basato sull'articolo di Fareed Khan — confronto con ciò che il **core kit** (Toolshed MCP + LangChain + CLI + templates) ha oggi e cosa manca.  
> Esclude deliberatamente il pacchetto `missions` per isolare le lacune del toolkit di base.

---

## Cosa abbiamo oggi (core)

| Componente | Cosa fa |
|---|---|
| **22 MCP tools** | Leggere contesto (10), validare/persistere (4), safety/verify (4), mission (4 — esclusi) |
| **LangChain wrappers** | `createContextKitTools`, `createGuardrailsMiddleware`, callback handler |
| **CLI** | `init`, `setup`, `sync`, `check`, `list`, `new-spec` |
| **Template system** | `manifest.yaml`, L0/L1/L2 docs, feature specs, ADRs, prompts |
| **Guardrails** | `request_human_approval`, `verify_action` (6 check types) |
| **Context layers** | L0 identity, L1 rules, L2 knowledge, L3 task — tutti accessibili via MCP |

---

## Gap #1: Hard Gates non esistono

### Oggi
`request_human_approval` è un tool MCP che l'agente **può** chiamare. Non c'è nulla che lo **obblighi** a chiamarlo. Non esiste il concetto di "gate chain" — una sequenza di fasi dove ogni fase bl occa la successiva finché non superata.

### Cosa manca
Nel modello di Fareed ci sono **hard gate** bloccanti:
- **No code before design approval** — l'agente non può scrivere codice finché l'umano non approva un design doc
- **No merge before tests pass** — il merge è bloccato se i test falliscono

### Aggiungere al kit
```yaml
# manifest.yaml → nuova sezione
gates:
  require_design_approval: true    # MCP tool check_gate("design-approved") fallisce se no design
  require_plan_review: true        # MCP tool check_gate("plan-reviewed") fallisce se no review
  require_tests_before_merge: true
  require_code_review: true
```

Nuovo tool MCP: `check_gate(gate_name)` → `{ passed: bool, evidence: string | null }`
Nuovo tool MCP: `advance_gate(gate_name, evidence_path)` → sposta il gate

Il `get_guardrails` tool dovrebbe anche restituire `gates` come requisiti bloccanti.

---

## Gap #2: Session Bootstrap — nessun onboarding automatico

### Oggi
L'agente ha tool per *tirare* contesto su richiesta (`get_project_identity`, `get_guardrails`, ecc.). Ma ogni sessione parte completamente blank — l'agente non sa che deve chiamarli.

### Cosa manca
Fareed usa `hooks/session-start` che carica automaticamente il "manuale del dipendente" in ogni sessione. Il principio: *every session IS day one — the agent has no memory of yesterday*.

### Aggiungere al kit
```yaml
# manifest.yaml → nuova sezione
session:
  bootstrap:
    auto_load_identity: true      # inietta L0 nel contesto iniziale
    auto_load_context_policy: true # inietta L1
    inject_greeting: |
      You have agent-context-kit enabled. 
      Run `get_guardrails()` before starting work.
```

Il meccanismo non può usare Claude Code hooks (non sono MCP). Soluzioni possibili:

1. **Nuovo tool `get_session_bootstrap()`** che restituisce il payload completo da iniettare — l'agente DEVE chiamarlo all'inizio (documentato in CLAUDE.md template)
2. **Hook CLI `context-kit session-start`** che stampa contesto in formato che l'agente può leggere
3. **Template CLAUDE.md** che istruisce l'agente: "RUN get_guardrails() IMMEDIATELY"

Il template CLAUDE.md oggi dice cosa fare ma non impone un ORDINE. Aggiungere:

```
## FIRST ACTION
Run `get_session_bootstrap()` before any other action.
This loads project identity, guardrails, and context policy.
```

---

## Gap #3: Nessuna disciplina di processo — "1% Rule"

### Oggi
I tool MCP e gli standard sono *suggerimenti*. L'agente decide autonomamente se usarli. L'articolo dimostra che gli agenti razionalizzano per saltare i processi.

### Cosa manca
La **1% Rule**: "If you think there is even a 1% chance a skill might apply, you ABSOLUTELY MUST invoke the skill."

Il template `context-policy.md` oggi è descrittivo. Dovrebbe contenere una sezione imperativa:

```markdown
## Skill/Process Enforcement

<HARD-RULE>
If you think there is even a 1% chance a process, gate, or tool 
applies to what you are doing, you MUST use it.

This is not negotiable. This is not optional.
</HARD-RULE>
```

Aggiungere anche **Red Flags Table** al template `context-policy.md`:

```markdown
### Red Flags — Recognize Rationalization

| If you think... | Reality |
|---|---|
| "This is just a simple question" | Questions are tasks. Check guardrails. |
| "Let me explore the codebase first" | Tools tell you HOW to explore. Check first. |
| "This doesn't need a formal process" | If a tool/process exists, use it. |
| "I know what the project does" | Tools evolve. Read current context. |
| "This feels productive" | Undisciplined action wastes time. |
```

---

## Gap #4: Nessun dispatch pattern per sub-agents

### Oggi
Tutti i tool MCP operano nel contesto del main agent. Non c'è modo di "spawnare un fresh sub-agent con contesto isolato per un task specifico".

### Cosa manca
Fareed dispatches **fresh Claude Code sessions** per task individuali, con:
- Contestualizzazione precisa (solo ciò che serve per quel task)
- Model selection (task meccanici → modello cheap)
- Status return: DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED
- **MAI** re-dispatch senza cambiamenti

### Aggiungere al kit
```yaml
# manifest.yaml → nuova sezione
orchestration:
  subagent_model_fast: claude-3-5-haiku   # per task meccanici
  subagent_model_standard: claude-3-5-sonnet # per task normali
  default_model: standard
```

Nuovo tool MCP: `dispatch_subagent(task_description, context_files[], model?)`
- Prende descrizione task + file di contesto
- Restituisce risultato con status strutturato
- **Non** eredita la cronologia della sessione corrente

Questo è il pattern più potente dell'articolo e il kit non ha nulla di simile.

---

## Gap #5: Spec Review non è separata

### Oggi
`analyze_spec_completeness` è una self-check — lo stesso agente che ha scritto la spec la analizza. C'è bias cognitivo.

### Cosa manca
Nell'articolo, la spec review è fatta da un **fresh sub-agent** con unico compito: "tear the spec apart". Categorie calibrate: completeness, consistency, clarity, scope, YAGNI.

### Aggiungere al kit
Modificare `analyze_spec_completeness` — renderlo un **dispatch pattern**:

```
analyze_spec_completeness(spec_path) 
→ dispatch FRESH sub-agent con prompt "spec reviewer"
→ restituisce: { approved: bool, issues: [{category, severity, description}], summary }
```

Oppure aggiungere tool separato: `review_spec_external(spec_path)`.

---

## Gap #6: Plan Review contro Spec

### Oggi
Non esiste. Il kit non ha tool per verificare che un piano di implementazione copra TUTTI i requisiti di una spec.

### Cosa manca
Un reviewer che prende plan + spec e verifica:
1. Ogni requisito della spec ha un task corrispondente
2. Nessun task non richiesto (scope creep)
3. Task granularità 2-5 minuti

### Aggiungere al kit
Nuovo tool MCP: `review_plan(spec_path, plan_path)` → dispatch sub-agent reviewer

Template prompt da includere nel kit:

```
You are a plan document reviewer.
Spec: {spec_path}
Plan: {plan_path}

Check: completeness, spec alignment, task decomposition, buildability.
Approve unless serious gaps exist.
```

---

## Gap #7: Tool Descriptions trigger, non riassunti

### Oggi
Le descrizioni dei tool MCP in `handlers.ts` (e di conseguenza in `tools.ts` per LangChain) potrebbero riassumere il workflow, inducendo l'agente a saltare il contenuto.

### Cosa manca
L'articolo ha scoperto un bug: se la descrizione dice "code review between tasks", l'agente fa UNA review anziché DUE (spec compliance + code quality), perché segue la descrizione invece di leggere il tool content.

### Fix immediato
Audit di TUTTE le descrizioni in `handlers.ts` e `tools.ts`:

```
// BAD: "Validates a PR body against the PNA Agent Report standard: 
//       8 required fields..."

// GOOD: "Use before merging to check PR body format"
```

Regola: la descrizione dice **quando** usare il tool, non **cosa** fa né come funziona.

---

## Gap #8: Nessun Forensic Debugging workflow

### Oggi
Il kit non ha tool per debugging strutturato. Se l'agente trova un bug, non ha un processo da seguire.

### Cosa manca
4-phase forensic process:

1. **OBSERVE** — what exactly happens, where, conditions (fresh terminal output, non memoria)
2. **HYPOTHESIZE** — 3 ipotesi con probabilità, per ciascuna: cosa la prova/confuta
3. **ISOLATE** — esperimenti mirati, una variabile per volta
4. **FIX** — root cause, non sintomo. Poi defense-in-depth: cos'altro potrebbe fallire allo stesso modo?

### Aggiungere al kit
Nuovo tool MCP: `start_debugging(bug_description)` → guida strutturata passo passo

Template `docs/agent/forensic-debugging.md`:

```markdown
## Forensic Debugging

### Phase 1: Observe
Get FRESH reproduction. Terminal output, not memory.
- What exactly happens?
- Where?
- Under what conditions?
- What changed recently? (git log, environment)

### Phase 2: Hypothesize
Generate 3 hypotheses ranked by probability.
For each: what would prove it? What would disprove it?

### Phase 3: Isolate
One variable at a time. Document results.
- Change ONE thing
- Run
- Record outcome

### Phase 4: Fix & Fortify
Fix root cause (not symptom).
Then ask: what other system could fail the same way?
Add defense for each.
```

---

## Gap #9: Code Review Reception — anti-sycophancy

### Oggi
`validate_agent_report` controlla il formato del PR. Ma non c'è nulla che insegni all'agente COME ricevere feedback di review.

### Cosa manca
Nell'articolo, la reception della code review è un'abilità separata con regole precise contro la sycophancy.

### Aggiungere al kit
Template `docs/agent/code-review-reception.md` (da includere in `setup`):

```markdown
## Code Review Reception

### Process
1. READ: Complete feedback without reacting
2. UNDERSTAND: Restate in own words or ask
3. VERIFY: Check against codebase reality
4. EVALUATE: Technically sound for THIS codebase?
5. RESPOND: Technical acknowledgment or reasoned pushback
6. IMPLEMENT: One item at a time, test each

### NEVER
- "You are absolutely right!"
- "Great point!" / "Excellent feedback!"
- Gratitude expressions

### INSTEAD
- "Fixed. [what changed]"
- "Good catch — [specific issue]. Fixed in [location]."
- [Just fix it]

### If reviewer is wrong
Push back with TECHNICAL reasoning, not deference.
You and reviewer are peers. The user has authority.
```

---

## Gap #10: TDD non è enforceato

### Oggi
Non c'è nulla nel kit che richieda o enforcei TDD. I template menzionano test ma non impongono test-first.

### Cosa manca
L'articolo tratta TDD come "Iron Law" con hard gate.

### Aggiungere al kit
```yaml
# manifest.yaml → in profiles
profiles:
  tdd:
    gates:
      require_tests_before_code: true
    standards:
      - tdd
```

Nuovo standard template `docs/agent/standard-tdd.md`:

```markdown
# TDD — Iron Law

<HARD-GATE>
Write implementation code before test? 
Delete it. Start over.

No exceptions:
- Don't keep as "reference"
- Don't "adapt" it while writing tests  
- Don't look at it
- Delete means delete
</HARD-GATE>
```

Aggiungere al tool `verify_action` un check type `tdd_compliance` che controlla git log: il commit del test deve precedere il commit del codice.

---

## Gap #11: Skill/Rule Testing (TDD per documentazione)

### Oggi
Il kit genera template e regole ma non ha modo di *testare* se funzionano. Una regola scritta in un template potrebbe non cambiare affatto il comportamento dell'agente.

### Cosa manca
"Se non hai visto un agente fallire SENZA la regola, non sai se la regola insegna la cosa giusta."

### Aggiungere al kit
Nuovo tool MCP: `test_rule(rule_path, test_scenario)` → verifica che la regola cambi il comportamento

Il tool:
1. Lancia sub-agent SENZA regola → registra comportamento (baseline)
2. Lancia sub-agent CON regola → verifica compliance
3. Se non c'è differenza → la regola è inefficace

---

## Gap #12: Release Engineering — nessun "completamento" sicuro

### Oggi
Il kit aiuta a INIZIARE e ORGANIZZARE il lavoro ma non aiuta a FINIRLO in sicurezza.

### Cosa manca
Fareed ha un workflow structured per il rilascio: verify tests → present options (4 strutturate) → execute scelta → cleanup.

### Aggiungere al kit
Nuovo tool MCP: `finish_work(branch, base_branch)`:
1. Verifica test (HARD GATE)
2. Presenta 4 opzioni: merge locale, create PR, keep branch, discard
3. Opzione discard richiede conferma digitata "discard"
4. Cleanup post-azione (branch, worktree)

Template `docs/agent/release-workflow.md`:

```markdown
## Release Workflow

### Step 1: Verify
Tests MUST pass. If not: stop. Nothing happens until tests pass.

### Step 2: Options
1. Merge locally to {base}
2. Create PR on remote
3. Keep branch as-is
4. Discard work (requires typed confirmation "discard")

Never ask open-ended questions. Always present structured options.
```

---

## Gap #13: Git Worktree primitives

### Oggi
Il kit non ha tool per worktree git.

### Cosa manca
Fareed usa worktree come "camere di contenimento" — directory fisicamente separate che condividono lo stesso repo.

### Aggiungere al kit
Nuovo tool MCP: `setup_worktree(branch, base?)`:
1. Check directory esistente (`.worktrees/` preferito)
2. Verifica `.gitignore`
3. Crea worktree
4. Verifica baseline (test passano)

---

## Gap #14: Skill/Rule descriptions usano formato sbagliato

### Oggi
Le descrizioni dei tool e delle skill nel kit potrebbero riassumere il contenuto, portando l'agente a saltare la lettura.

### Fix
Per OGNI tool MCP e standard template, la descrizione deve dire SOLO quando applicarlo, mai cosa fa né come:

```
BAD:  "Validate agent report — checks 8 required fields..."
GOOD: "Use before creating a pull request to validate format"

BAD:  "Review spec completeness — checks 8 categories..."
GOOD: "Use after writing a design spec to check for gaps"
```

---

## Riepilogo: cosa aggiungere al core kit

### Nuovi tool MCP (7)
| Tool | Descrizione |
|---|---|
| `get_session_bootstrap()` | Contesto iniziale: identity + guardrails + policy |
| `check_gate(gate_name)` | Verifica se un gate è superato |
| `advance_gate(gate_name, evidence)` | Marca gate come superato |
| `dispatch_subagent(task, context, model?)` | Spawna fresh sub-agent isolato |
| `review_spec(spec_path)` | Fresh agent recensisce la spec |
| `review_plan(spec_path, plan_path)` | Verifica copertura spec vs plan |
| `start_debugging(description)` | Guida 4-phase forensic debug |
| `finish_work(branch, base)` | Release engineering: verify → options → cleanup |
| `test_rule(rule_path, scenario)` | TDD per documentazione — testa efficacia regole |

### Nuovi templates (5)
| Template | Contenuto |
|---|---|
| `standard-tdd.md` | Iron Law + hard gate |
| `forensic-debugging.md` | 4-phase process |
| `code-review-reception.md` | Anti-sycophancy, verify before implement |
| `release-workflow.md` | Verify → options → execute → cleanup |
| `rationalization-tables.md` | Red flags per ogni fase |

### Modifiche esistenti
| Cosa | Modifica |
|---|---|
| `manifest.yaml` template | Aggiungere sezioni `gates`, `session.bootstrap`, `orchestration` |
| `context-policy.md` template | Aggiungere 1% Rule + Red Flags Table |
| `CLAUDE.md` template | Istruzione "RUN get_session_bootstrap() FIRST" |
| `handlers.ts` / `tools.ts` | Audit tutte le descrizioni — solo trigger, non riassunto |
| `verify_action` | Aggiungere check type `tdd_compliance` |
| `request_human_approval` | Integrare con gate chain |

### Principi trasversali
1. **Hard gate > soft suggestion** — ogni gate deve essere bloccante
2. **Fresh agent > self-check** — separazione delle responsabilità per review
3. **Structured options > open questions** — mai "what should we do?"
4. **Trigger description > summary description** — agente segue la scorciatoia
5. **Tested rules > written rules** — se non hai visto fallire senza, non sai se funziona
6. **Verify before implement > trust reviewer** — anti-sycophancy strutturale
