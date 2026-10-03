import { describe, expect, it } from "vitest";
import {
  TRANSFER_SALE_FEE_BPS,
  TRANSFER_SALE_FEE_CAP_USD,
  calculateTransferSaleFee,
} from "./transfer-sale-fee.js";

describe("transfer-sale-fee", () => {
  it("exposes 150 bps and a 100 APW$ cap", () => {
    expect(TRANSFER_SALE_FEE_BPS).toBe(150);
    expect(TRANSFER_SALE_FEE_CAP_USD).toBe(100);
  });

  it("charges 1.5% of the listing price", () => {
    const result = calculateTransferSaleFee({ priceUsd: 1000 });
    expect(result.feeUsd).toBe(15);
    expect(result.sellerCreditUsd).toBe(985);
  });

  it("rounds fee and seller credit to two decimal places", () => {
    const result = calculateTransferSaleFee({ priceUsd: 33.33 });
    expect(result.feeUsd).toBe(0.5);
    expect(result.sellerCreditUsd).toBe(32.83);
  });

  it("caps the fee at 100 APW$", () => {
    const result = calculateTransferSaleFee({ priceUsd: 20_000 });
    expect(result.feeUsd).toBe(100);
    expect(result.sellerCreditUsd).toBe(19_900);
  });

  it("applies the cap exactly at the threshold price", () => {
    const result = calculateTransferSaleFee({ priceUsd: 100 / 0.015 });
    expect(result.feeUsd).toBe(100);
    expect(result.sellerCreditUsd).toBe(result.priceUsd - 100);
  });
});
