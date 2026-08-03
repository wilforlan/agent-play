const APW_NUMBER_FORMAT = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const APU_NUMBER_FORMAT = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

export const formatApwBalance = (balanceUsd: number): string => {
  if (!Number.isFinite(balanceUsd)) return "$—";
  const rounded = Math.round(balanceUsd * 100) / 100;
  return `$${APW_NUMBER_FORMAT.format(rounded)}`;
};

export const formatApuCount = (n: number): string => {
  if (!Number.isFinite(n) || n < 0) return "0";
  return APU_NUMBER_FORMAT.format(Math.floor(n));
};
