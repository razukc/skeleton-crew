import { describe, it, expect } from 'vitest';
import {
  oracleNoServerErrors,
  oracleWholeShape,
  oracleConfigSnapshot,
} from '../harness/oracles.js';
import type { Sample } from '../harness/load.js';

function sample(partial: Partial<Sample>): Sample {
  return { status: 200, body: [], t: 0, phase: 'mid', ...partial };
}

describe('oracles', () => {
  it('oracleNoServerErrors fails when a mid-phase 5xx is present', () => {
    const samples = [sample({ status: 200 }), sample({ status: 500, phase: 'mid' })];
    expect(oracleNoServerErrors(samples).pass).toBe(false);
  });

  it('oracleNoServerErrors ignores 404s', () => {
    const samples = [sample({ status: 200 }), sample({ status: 404, phase: 'mid' })];
    expect(oracleNoServerErrors(samples).pass).toBe(true);
  });

  it('oracleWholeShape fails on a mixed v1/v2 batch within one response', () => {
    // A single list response containing both tagged and untagged posts = torn.
    const torn = sample({ body: [{ id: '1', tag: 'v2' }, { id: '2' }] });
    expect(oracleWholeShape(torn ? [torn] : []).pass).toBe(false);
  });

  it('oracleWholeShape passes when every response is uniformly v1 or v2', () => {
    const v1 = sample({ body: [{ id: '1' }, { id: '2' }] });
    const v2 = sample({ body: [{ id: '1', tag: 'v2' }, { id: '2', tag: 'v2' }] });
    expect(oracleWholeShape([v1, v2]).pass).toBe(true);
  });

  it('oracleConfigSnapshot fails when validate and setup saw different pageSize', () => {
    expect(oracleConfigSnapshot({ validated: 10, setup: 20 }).pass).toBe(false);
    expect(oracleConfigSnapshot({ validated: 10, setup: 10 }).pass).toBe(true);
  });
});
