export interface SequenceStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<unknown>;
  del(key: string): Promise<unknown>;
  incr(key: string): Promise<number>;
  setIfAbsent?(key: string, value: string): Promise<boolean>;
}

export interface SequenceReservation {
  keyPrefix: string;
  baseSequence: string;
  offset: number;
  accountSequence: string;
  transactionSequence: string;
}

export interface SequenceResetInfo {
  keyPrefix: string;
  reason: string;
  baseSequence: string;
}

interface SequenceKeys {
  baseKey: string;
  offsetKey: string;
}

interface SequenceOptions {
  store: SequenceStore;
  keyPrefix: string;
  loadBaseSequence: () => Promise<string>;
}

interface ResetSequenceOptions extends SequenceOptions {
  reason: string;
  onReset?: (info: SequenceResetInfo) => void | Promise<void>;
}

const pendingBaseLoads = new Map<string, Promise<string>>();

function getSequenceKeys(keyPrefix: string): SequenceKeys {
  return {
    baseKey: `${keyPrefix}:base`,
    offsetKey: `${keyPrefix}:offset`,
  };
}

async function ensureBaseSequence({
  store,
  keyPrefix,
  loadBaseSequence,
}: SequenceOptions): Promise<string> {
  const { baseKey } = getSequenceKeys(keyPrefix);
  const existing = await store.get(baseKey);
  if (existing) {
    return existing;
  }

  const pending = pendingBaseLoads.get(baseKey);
  if (pending) {
    return pending;
  }

  const nextLoad = (async () => {
    const loaded = await loadBaseSequence();

    if (store.setIfAbsent) {
      const stored = await store.setIfAbsent(baseKey, loaded);
      if (stored) {
        return loaded;
      }

      return (await store.get(baseKey)) ?? loaded;
    }

    await store.set(baseKey, loaded);
    return loaded;
  })().finally(() => {
    pendingBaseLoads.delete(baseKey);
  });

  pendingBaseLoads.set(baseKey, nextLoad);
  return nextLoad;
}

export function buildSequenceKeyPrefix(network: string, publicKey: string): string {
  return `stellar:seq:${network}:${publicKey}`;
}

export async function reserveSequence(options: SequenceOptions): Promise<SequenceReservation> {
  const { store, keyPrefix } = options;
  const { offsetKey } = getSequenceKeys(keyPrefix);

  const baseSequence = await ensureBaseSequence(options);
  const offset = await store.incr(offsetKey);
  const accountSequence = (BigInt(baseSequence) + BigInt(offset - 1)).toString();

  return {
    keyPrefix,
    baseSequence,
    offset,
    accountSequence,
    transactionSequence: (BigInt(accountSequence) + 1n).toString(),
  };
}

export async function resetSequence(options: ResetSequenceOptions): Promise<string> {
  const { store, keyPrefix, loadBaseSequence, reason, onReset } = options;
  const { baseKey, offsetKey } = getSequenceKeys(keyPrefix);

  pendingBaseLoads.delete(baseKey);

  const baseSequence = await loadBaseSequence();
  await store.set(baseKey, baseSequence);
  await store.del(offsetKey);

  if (onReset) {
    await onReset({ keyPrefix, reason, baseSequence });
  }

  return baseSequence;
}
