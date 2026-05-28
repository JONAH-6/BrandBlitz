import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SequenceStore } from "./sequence";

const submitTransactionMock = vi.fn();
const loadAccountMock = vi.fn();
const paymentMock = vi.fn((operation) => operation);
const memoTextMock = vi.fn((value: string) => value);

class MockAccount {
  constructor(
    public readonly accountId: string,
    private sequence: string
  ) {}

  sequenceNumber(): string {
    return this.sequence;
  }

  incrementSequenceNumber(): void {
    this.sequence = (BigInt(this.sequence) + 1n).toString();
  }
}

class MockTransactionBuilder {
  static sourceSequences: string[] = [];

  constructor(private readonly source: MockAccount) {}

  addMemo(): this {
    return this;
  }

  setTimeout(): this {
    return this;
  }

  addOperation(): this {
    return this;
  }

  build() {
    MockTransactionBuilder.sourceSequences.push(this.source.sequenceNumber());
    return {
      sign: vi.fn(),
    };
  }
}

vi.mock("./client", () => ({
  getHorizonServer: vi.fn(() => ({
    loadAccount: loadAccountMock,
    submitTransaction: submitTransactionMock,
  })),
  getUsdcAsset: vi.fn(() => "USDC"),
  getNetworkPassphrase: vi.fn(() => "Test Network"),
}));

vi.mock("@stellar/stellar-sdk", () => ({
  Account: MockAccount,
  Keypair: {
    fromSecret: vi.fn(() => ({
      publicKey: () => "GTESTPUBLICKEY",
    })),
  },
  TransactionBuilder: MockTransactionBuilder,
  Operation: {
    payment: paymentMock,
  },
  Memo: {
    text: memoTextMock,
  },
  BASE_FEE: "100",
}));

import { submitBatchPayout } from "./payout";

class InMemorySequenceStore implements SequenceStore {
  private readonly values = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.values.get(key) ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    this.values.set(key, value);
  }

  async del(key: string): Promise<void> {
    this.values.delete(key);
  }

  async incr(key: string): Promise<number> {
    const next = Number(this.values.get(key) ?? "0") + 1;
    this.values.set(key, next.toString());
    return next;
  }

  async setIfAbsent(key: string, value: string): Promise<boolean> {
    if (this.values.has(key)) {
      return false;
    }

    this.values.set(key, value);
    return true;
  }
}

describe("submitBatchPayout", () => {
  beforeEach(() => {
    MockTransactionBuilder.sourceSequences = [];
    vi.clearAllMocks();
  });

  it("resets the reserved sequence and retries once on tx_bad_seq", async () => {
    const store = new InMemorySequenceStore();
    const onSequenceReset = vi.fn();

    loadAccountMock
      .mockResolvedValueOnce(new MockAccount("GTESTPUBLICKEY", "100"))
      .mockResolvedValueOnce(new MockAccount("GTESTPUBLICKEY", "101"));

    submitTransactionMock
      .mockRejectedValueOnce({
        message: "tx_bad_seq",
        response: {
          data: {
            extras: {
              result_codes: {
                transaction: "tx_bad_seq",
              },
            },
          },
        },
      })
      .mockResolvedValueOnce({ hash: "tx-success" });

    const results = await submitBatchPayout(
      [{ address: "GDESTINATION", amount: "1.0000000" }],
      "SSECRET",
      "challenge-123",
      "testnet",
      {
        sequenceStore: store,
        onSequenceReset,
      }
    );

    expect(results).toEqual([
      {
        txHash: "tx-success",
        recipients: [{ address: "GDESTINATION", amount: "1.0000000" }],
        success: true,
      },
    ]);
    expect(submitTransactionMock).toHaveBeenCalledTimes(2);
    expect(onSequenceReset).toHaveBeenCalledTimes(1);
    expect(MockTransactionBuilder.sourceSequences).toEqual(["100", "101"]);
  });
});
