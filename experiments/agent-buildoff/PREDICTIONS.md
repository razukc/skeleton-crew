# Pre-Registered Predictions — Agent Build-Off

Recorded BEFORE any live agent run. Model: claude-opus-4-8. Phase-1 repeats: K=3.

| # | Claim | Predicted direction / magnitude |
|---|---|---|
| 1 | SCR tokens/feature at f1 | HIGHER than mono (plugin ceremony) — small margin |
| 2 | SCR tokens/feature by f8 | LOWER than mono (containment) — margin grows with N |
| 3 | Cost crossover index | exists somewhere in f3–f6; may be absent at this size |
| 4 | SCR read-surface per feature | roughly FLAT in N (plugin + contract) |
| 5 | Mono read-surface per feature | GROWS in N (shared state to reason about) |
| 6 | Modification (Phase 2) files-outside-target | SCR ~0; mono grows with feature count |
| 7 | Modification foreign oracle breaks | SCR 0; mono > 0 |
| 8 | Parallel contention (Phase 3) | SCR loud-and-local; mono silent or merge-clobber |
| 9 | Fault containment (Phase 4) | SCR contains both injected faults (deterministic) |

A null result (no crossover, flat differences) is a valid, publishable outcome
and would indicate SCR's overhead does not amortize at this app size.
