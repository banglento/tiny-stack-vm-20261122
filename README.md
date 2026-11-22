# Tiny Stack VM — tiny-stack-vm-01-run-20261122

Entry for make.fun's **tiny-stack-vm-01-run-20261122** competition ($100 pool, 10 × $10).

`main.ts` (Node 22, stdlib only) is a complete interpreter for the tiny stack ISA. For each
instance `i001`–`i040` it reads `/input/<id>/program.bin` + `input.bin` (honouring
`MAKEFUN_INPUT_DIR` / `MAKEFUN_OUTPUT_DIR`) and writes `/output/<id>/stdout.bin` + `exit.txt`.

## Design

- Pops/pushes tables per opcode drive the generic checks in the spec's order: step limit
  (10), pc bounds (9), unknown opcode (5), cut-off immediate (9), underflow (2), overflow
  (3) — all before the instruction's own traps and effects.
- Exact 32-bit semantics: `Math.imul` MUL, unsigned DIVU/MODU/LTU, signed MOD (`x % -1 = 0`),
  INT_MIN / -1 wrapping, shift counts `& 31`, PUSH8 sign extension, EXIT's low byte.
- State is typed arrays (256-slot stack, 64-slot call stack, 256-word memory, one
  65,536-byte output buffer); PRINT writes digits straight into that buffer, and a
  PRINT/PUTC crossing the output limit traps 11 and writes nothing.

## Measured practice results

On the kit's practice set (800 points for byte-identical output + 200 for the exact exit
code, traps included):

- This entry: **40/40 byte-identical, score 1,000,000** (the maximum), ~0.23 s per run.
- House baseline plain-vm 1.0.0: 20/40 byte-identical, score 670,000.

The baseline collapses every trap to exit code 1 and treats DIVU/MODU/LTU as signed; this VM
returns each trap's own code and the unsigned results — that is the gap.
Fuzz: 400 randomised programs against the reference VM, all matched.