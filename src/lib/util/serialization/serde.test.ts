import type { State } from '$lib/types';
import { describe, expect, it } from 'vitest';
import { deserializeState, serializeState, type SerdeType } from './serde';
import { defaultState } from '../state/state';

const verifySerde = (state: State, serde?: SerdeType): string => {
  const serialized = serializeState(state, serde);
  const deserialized = deserializeState(serialized);
  // serializeState strips transient fields (renderCount, updateDiagram, pan, zoom, validation*)
  // so deserialized won't have them — compare against persistent fields only
  const {
    renderCount,
    updateDiagram,
    pan,
    zoom,
    validationError,
    validationErrorLine,
    validationSuggestions,
    ...persistentState
  } = state;
  expect(deserialized).to.deep.equal(persistentState);
  return serialized;
};

describe('Serde tests', () => {
  it('should serialize and deserialize with default serde', () => {
    const serialized = verifySerde(defaultState);
    expect(serialized).toMatch(/^pako:/);
  });

  it('should serialize and deserialize with base64 serde', () => {
    const serialized = verifySerde(defaultState, 'base64');
    expect(serialized).toMatch(/^base64:/);
  });

  it('should serialize and deserialize with pako serde', () => {
    const serialized = verifySerde(defaultState, 'pako');
    expect(serialized).toMatch(/^pako:/);
  });

  it('should throw error for unrecognized serde', () => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    expect(() => serializeState(defaultState, 'unknown')).toThrowError(
      'Unknown serde type: unknown'
    );
    expect(() => deserializeState('unknown:hello')).toThrowError('Unknown serde type: unknown');
  });
});
