// tiny-stack-vm-01-run-20261122: a complete, exact interpreter for make.fun's tiny stack ISA.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const POPS = new Int8Array(256).fill(-1);
const PUSH = new Int8Array(256);
for (const [op, po, pu] of [
  [0, 0, 0], [1, 0, 1], [2, 0, 1], [3, 1, 0], [4, 1, 2], [5, 2, 2], [6, 2, 3], [7, 3, 3],
  [0x17, 1, 1], [0x1b, 1, 1], [0x30, 0, 0], [0x31, 1, 0], [0x32, 1, 0], [0x33, 0, 0], [0x34, 0, 0],
  [0x40, 1, 1], [0x41, 2, 0], [0x50, 1, 0], [0x51, 1, 0], [0x52, 0, 1], [0x53, 1, 0],
] as const) { POPS[op] = po; PUSH[op] = pu; }
for (let op = 0x10; op <= 0x22; op++) {
  if (op !== 0x17 && op !== 0x1b && op !== 0x1f) { POPS[op] = 2; PUSH[op] = 1; }
}

function run(p: Uint8Array, inp: Uint8Array): { out: Uint8Array; code: number } {
  const D = new Int32Array(256);
  const C = new Int32Array(64);
  const M = new Int32Array(256);
  const buf = new Uint8Array(65536);
  const dig = new Uint8Array(10);
  let sp = 0, csp = 0, pc = 0, steps = 0, ip = 0, olen = 0;
  const done = (code: number) => ({ out: buf.slice(0, olen), code });
  for (;;) {
    if (steps >= 1000000) return done(10);
    if (pc < 0 || pc >= p.length) return done(9);
    const op = p[pc];
    const po = POPS[op];
    if (po < 0) return done(5);
    const imm = op === 1 ? 1 : op === 2 ? 4 : op >= 0x30 && op <= 0x33 ? 2 : 0;
    if (imm > 0 && pc + imm >= p.length) return done(9);
    steps++;
    if (sp < po) return done(2);
    const pu = PUSH[op];
    if (sp - po + pu > 256) return done(3);
    const nx = pc + 1 + imm;
    pc = nx;
    if (po === 2 && pu === 1) {
      const b = D[sp - 1];
      const a = D[sp - 2];
      let r: number;
      if (op === 0x10) r = (a + b) | 0;
      else if (op === 0x11) r = (a - b) | 0;
      else if (op === 0x12) r = Math.imul(a, b);
      else if (op === 0x13) { if (b === 0) return done(4); r = a === -2147483648 && b === -1 ? a : (a / b) | 0; }
      else if (op === 0x14) { if (b === 0) return done(4); r = b === -1 ? 0 : (a % b) | 0; }
      else if (op === 0x15) { if (b === 0) return done(4); r = Math.floor((a >>> 0) / (b >>> 0)) | 0; }
      else if (op === 0x16) { if (b === 0) return done(4); r = ((a >>> 0) % (b >>> 0)) | 0; }
      else if (op === 0x18) r = a & b;
      else if (op === 0x19) r = a | b;
      else if (op === 0x1a) r = a ^ b;
      else if (op === 0x1c) r = a << (b & 31);
      else if (op === 0x1d) r = a >> (b & 31);
      else if (op === 0x1e) r = (a >>> (b & 31)) | 0;
      else if (op === 0x20) r = a === b ? 1 : 0;
      else if (op === 0x21) r = a < b ? 1 : 0;
      else r = (a >>> 0) < (b >>> 0) ? 1 : 0;
      D[sp - 2] = r;
      sp--;
      continue;
    }
    switch (op) {
      case 0x00: return done(0);
      case 0x01: D[sp++] = (p[nx - 1] << 24) >> 24; break;
      case 0x02: D[sp++] = p[nx - 4] | (p[nx - 3] << 8) | (p[nx - 2] << 16) | (p[nx - 1] << 24); break;
      case 0x03: sp--; break;
      case 0x04: D[sp] = D[sp - 1]; sp++; break;
      case 0x05: { const t = D[sp - 1]; D[sp - 1] = D[sp - 2]; D[sp - 2] = t; break; }
      case 0x06: D[sp] = D[sp - 2]; sp++; break;
      case 0x07: { const a = D[sp - 3]; D[sp - 3] = D[sp - 2]; D[sp - 2] = D[sp - 1]; D[sp - 1] = a; break; }
      case 0x17: D[sp - 1] = (-D[sp - 1]) | 0; break;
      case 0x1b: D[sp - 1] = ~D[sp - 1]; break;
      case 0x30: case 0x31: case 0x32: {
        const rel = ((p[nx - 2] | (p[nx - 1] << 8)) << 16) >> 16;
        let take = op === 0x30;
        if (op !== 0x30) { const v = D[--sp]; take = op === 0x31 ? v === 0 : v !== 0; }
        if (take) pc = nx + rel;
        break;
      }
      case 0x33:
        if (csp >= 64) return done(7);
        C[csp++] = nx;
        pc = p[nx - 2] | (p[nx - 1] << 8);
        break;
      case 0x34:
        if (csp === 0) return done(8);
        pc = C[--csp];
        break;
      case 0x40: {
        const a = D[sp - 1];
        if (a < 0 || a > 255) return done(6);
        D[sp - 1] = M[a];
        break;
      }
      case 0x41: {
        const a = D[sp - 1];
        if (a < 0 || a > 255) return done(6);
        M[a] = D[sp - 2];
        sp -= 2;
        break;
      }
      case 0x50: {
        let v = D[--sp];
        const neg = v < 0;
        if (neg) v = -v;
        let nd = 0;
        do { dig[nd++] = 48 + (v % 10); v = Math.floor(v / 10); } while (v > 0);
        if (olen + nd + (neg ? 1 : 0) > 65536) return done(11);
        if (neg) buf[olen++] = 45;
        while (nd > 0) buf[olen++] = dig[--nd];
        break;
      }
      case 0x51:
        if (olen >= 65536) return done(11);
        buf[olen++] = D[--sp] & 255;
        break;
      case 0x52: D[sp++] = ip < inp.length ? inp[ip++] : -1; break;
      case 0x53: return done(D[--sp] & 255);
      default: return done(5);
    }
  }
}

const I = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const O = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
for (const id of readdirSync(I).sort()) {
  const r = run(readFileSync(join(I, id, 'program.bin')), readFileSync(join(I, id, 'input.bin')));
  mkdirSync(join(O, id), { recursive: true });
  writeFileSync(join(O, id, 'stdout.bin'), r.out);
  writeFileSync(join(O, id, 'exit.txt'), `${r.code}\n`);
}
