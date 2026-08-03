import {
  listActiveParkingOccupancies,
  type ParkingStreetContent,
} from "@agent-play/sdk/browser";

export type ParkingCarSelectionOption = {
  readonly purchaseId: string;
  readonly label: string;
  readonly disabled: boolean;
  readonly disabledReason: string | null;
};

export const buildParkingCarSelectionOptions = (input: {
  cars: ReadonlyArray<{ purchaseId: string; label: string }>;
  parkingStreet: ParkingStreetContent;
  nowIso: string;
}): ReadonlyArray<ParkingCarSelectionOption> => {
  const active = listActiveParkingOccupancies(
    input.parkingStreet,
    input.nowIso
  );
  const parkedByPurchaseId = new Map(
    active.map((occupancy) => [occupancy.carPurchaseId, occupancy] as const)
  );
  return input.cars.map((car) => {
    const parked = parkedByPurchaseId.get(car.purchaseId);
    if (parked === undefined) {
      return {
        purchaseId: car.purchaseId,
        label: car.label,
        disabled: false,
        disabledReason: null,
      };
    }
    const until =
      parked.expiresAt === null
        ? "parked (forever)"
        : `parked until ticket expires`;
    return {
      purchaseId: car.purchaseId,
      label: `${car.label} — ${until}`,
      disabled: true,
      disabledReason: "Car is already parked",
    };
  });
};

export const hasSelectableParkingCar = (
  cars: ReadonlyArray<ParkingCarSelectionOption>
): boolean => cars.some((car) => !car.disabled);
