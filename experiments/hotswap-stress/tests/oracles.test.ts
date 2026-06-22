import { describe, it, expect } from 'vitest';
import {
  oracleNoServerErrors,
  oracleWholeShape,
  oracleConfigSnapshot,
  oracleListIsArray,
  oracleAllV1,
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
    expect(oracleWholeShape([torn]).pass).toBe(false);
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

  it('oracleNoServerErrors ignores a PRE-phase 5xx (crash-signal discipline)', () => {
    // A 5xx before the swap window is harness noise, not a finding.
    const samples = [sample({ status: 200 }), sample({ status: 500, phase: 'pre' })];
    expect(oracleNoServerErrors(samples).pass).toBe(true);
  });

  it('oracleNoServerErrors counts a status-0 connection failure as a server error', () => {
    // The verify sampler records a failed fetch as status 0; mid/post-phase
    // it must count as a failure.
    const samples = [sample({ status: 200 }), sample({ status: 0, phase: 'post' })];
    expect(oracleNoServerErrors(samples).pass).toBe(false);
  });

  it('oracleConfigSnapshot fails when the probe never ran (both undefined)', () => {
    // The `validated !== undefined` guard must prevent undefined === undefined
    // from green-lighting a probe that never recorded anything.
    expect(oracleConfigSnapshot({}).pass).toBe(false);
  });

  it('oracleListIsArray fails when a 200 response body is a non-array scalar (hijack)', () => {
    // A committed cross-plugin hijack returns the scalar 'HIJACK' with status 200 —
    // invisible to a 5xx check, so this body-shape oracle must catch it.
    const ok = sample({ status: 200, body: [{ id: '1' }] });
    const hijacked = sample({ status: 200, body: 'HIJACK' });
    expect(oracleListIsArray([ok]).pass).toBe(true);
    expect(oracleListIsArray([ok, hijacked]).pass).toBe(false);
  });

  it('oracleListIsArray ignores non-200 samples (404 body is an object, not a tear)', () => {
    // Only successful responses must be arrays; a 404 error object is ordinary.
    const notFound = sample({ status: 404, body: { error: 'not found' } });
    expect(oracleListIsArray([notFound]).pass).toBe(true);
  });

  it('oracleAllV1 fails when any response body contains a v2-tagged post (leaked rollback)', () => {
    // A throwing swap must roll back cleanly; if its v2 tagger leaked, a live
    // /posts body would carry tag:'v2'. The all-v1 oracle asserts it never does.
    const v1 = sample({ body: [{ id: '1' }, { id: '2' }] });
    const leaked = sample({ body: [{ id: '1', tag: 'v2' }] });
    expect(oracleAllV1([v1]).pass).toBe(true);
    expect(oracleAllV1([v1, leaked]).pass).toBe(false);
  });
});
