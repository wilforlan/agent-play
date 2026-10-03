export type AmenityOwnershipFlags = {
  readonly sold: boolean;
  readonly mine: boolean;
};

/**
 * Derive sprite/tooltip ownership flags for amenity sale state vs viewer.
 *
 * @public
 */
export const amenityOwnershipFlags = (input: {
  sale: {
    status: "available" | "sold" | "transfer_available";
    soldToPlayerId?: string;
  };
  viewerPlayerId: string | null;
}): AmenityOwnershipFlags => {
  const ownerId = input.sale.soldToPlayerId?.trim() ?? "";
  const mine =
    ownerId.length > 0 &&
    input.viewerPlayerId !== null &&
    ownerId === input.viewerPlayerId;
  const sold = input.sale.status === "sold" && !mine;
  return { sold, mine };
};
