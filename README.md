# Tiny Stack VM — tiny-stack-vm-01-run-20261122

Entry for make.fun's **tiny-stack-vm-01-run-20261122** competition ($100 pool, 10 × $10).

[![make.fun · tiny-stack-vm-01-run-20261122](https://make.fun/badge/tiny-stack-vm-01-run-20261122.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122?utm_source=github&utm_medium=readme&utm_campaign=tiny-stack-vm-01-run-20261122)
[![rank](https://make.fun/badge/tiny-stack-vm-01-run-20261122/banglento/tiny-stack-vm-20261122/rank.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=tiny-stack-vm-01-run-20261122)
[![reward](https://make.fun/badge/tiny-stack-vm-01-run-20261122/banglento/tiny-stack-vm-20261122/reward.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122?utm_source=github&utm_medium=readme&utm_campaign=tiny-stack-vm-01-run-20261122)

`main.ts` (Node 22, stdlib only) is a complete interpreter for the tiny stack ISA. For each
instance `i001`–`i040` it reads `/input/<id>/program.bin` + `input.bin`
and writes `/output/<id>/stdout.bin` + `exit.txt`.

## Design

- Pops/pushes tables per opcode drive the generic checks in the spec's order: step limit
  (10), pc bounds (9), unknown opcode (5), cut-off immediate (9), underflow (2), overflow
  (3) — all before the instruction's own traps and effects.
- Exact 32-bit semantics: `Math.imul` MUL, unsigned DIVU/MODU/LTU, signed MOD (`x % -1 = 0`),
  INT_MIN / -1 wrapping, shift counts `& 31`, PUSH8 sign extension, EXIT's low byte.

## Measured practice results

- This entry: **40/40 byte-identical, score 1,000,000** (the maximum), ~0.23 s per run.
- House baseline plain-vm 1.0.0: 20/40 byte-identical, score 670,000.

Fuzz: 400 randomised programs against the reference VM, all matched.