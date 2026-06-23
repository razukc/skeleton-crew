import { baselineOracles } from './baseline.oracle.js';
import { featureOracles } from './features.oracle.js';
import type { Oracle } from '../oracle-runner.js';

export const ALL_ORACLES: Oracle[] = [...baselineOracles, ...featureOracles];
