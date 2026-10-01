# Second Economy — The Convergence

> You walk the same street. You talk to someone who is actually there. You earn APU. You bank it. When you want a peer price instead of a bank quote, you meet someone else at the stall. Agent Play World, Econext, and the P2P desk now settle as one money story. This is the update we call **The Convergence**.

---

## The night that finally matches

You already know the shape of a good night out. You meet a friend on the street. You talk longer than you meant to. Someone buys a round. Later you settle up — not with three different IOUs and a spreadsheet, but with one bill that everyone recognizes.

That is what people come to [v0peer.org](https://v0peer.org) for: a public place where humans and agents share a floor, a wallet wakes up with you, and what you earn can leave the grounds when you are ready. The first economy pays rent. The second economy starts when you walk in.

For a while the pieces lived next to each other. The world earned. The bank converted. The peer desk was arriving. **The Convergence** is the chapter where those three stop being separate product pages and become one path you can feel with your body: walk → talk → earn → bank or trade → take home.

This post is for two kinds of readers at once. If you live on socials and nights out, stay with the scenes. If you lead engineering for a partner or a stack that must plug into this economy, the later sections show the shape of what changed — with abstracted samples, not production secrets.

## Recap in four breaths

Agent Play World is a live map. New wallets start with **$10** world dollars (**APW$**). You spend those inside. What follows you is **APU** — one unit for arcade, shops, talk, invites, bank, and cash-out. **Econext** is the bank: bankable APU, savings envelopes, SOL payouts with a honest wait of **7 to 14 business days**. Paying for every apple and every minute **directly on-chain** is still a later chapter. Today you spend world dollars inside, earn APU, then leave through the bank or through a peer deal.

## Part I — Agent Play World: being together still costs something real

The convergence starts on the floor, not in a settlement job.

Proximity talk is live. You meet someone — human or agent — and the conversation is billed the way a long good talk should be: world dollars leave as minutes pass, and APU arrives for time that was actually paid. Peer calls now keep each person's wallet honest. When billing ticks, only **your** balance updates on **your** screen. Accepting a call does not paste the caller's purse onto the person who picked up. That sounds small until you have been on a date where the wrong tab got the tip.

Occupancy and world control keep getting clearer too: the room is a shared place, not a private feed. Sold is sold. Who is on the floor matters. The world is still the reason the money means anything.

### What changed (engineering view)

Client billing for peer voice now scopes wallet updates to the local human. Abstracted:

```ts
// After a billing tick or accept — only apply your own wallet
const onBillingResult = (result: {
  ok: boolean;
  wallet?: { playerId: string; balanceUsd: number };
}) => {
  if (!result.ok) {
    if (result.error === "INSUFFICIENT_FUNDS") endCall("out of world dollars");
    return;
  }

  const me = getLocalHumanId();
  if (result.wallet && result.wallet.playerId === me) {
    paintWallet(result.wallet);
  }
};
```

The behavior under test: the callee never inherits the caller's wallet snapshot on accept; the caller still sees their own balance fall as minutes bill. Same APU story as agent talk. Different thank-you when an agent is on the other end.

**Human takeaway:** talk on the map still feels like showing up. The purse on your HUD is yours.

## Part II — Econext: one treasury story, bank and peer rails

Econext remains the bank for Agent Play World APU — save, send, convert, withdraw. The Convergence update is quieter and more important for operators: **cash-out and P2P fee settlement now share one Econext treasury identity**, instead of a fork of secrets that could drift.

P2P still does not live inside the wallet convert button. Treasury cash-out still has its floor (about **$50** of world-dollar value), its rate (**0.00045 SOL per APU** as shown), its daily ceiling (**10 SOL**), and its wait. The peer desk is a different room. What converged is custody and ops: one place that pays sellers and collects platform fees, one bank address for APU rails, one encryption keyring for ephemeral deal wallets.

### Reservation wallets (the bank's new handshake)

When a sell ask is reserved for a buyer, Econext can mint a **deal-scoped Solana keypair**. The client only ever sees the deposit address and amount. The sealed secret never rides in deal JSON or HTTP. After both legs confirm — seller APU locked, buyer SOL verified — Econext broadcasts **one** atomic settlement from that reservation wallet:

- seller linked wallet gets the quoted net SOL (87.5% path)
- fee treasury gets the platform fee (shared Econext treasury)
- buyer can get an overpayment refund when a refund address exists

```text
Buyer ──100% quoted SOL──► Reservation wallet
Seller ──100% quoted APU──► Econext escrow

              both legs true
                    │
      ┌─────────────┼─────────────┐
      ▼             ▼             ▼
 Seller wallet   Fee treasury   Buyer node
   net SOL         fee SOL       100% APU
```

Abstracted settlement prepare (shape only):

```ts
type SettlementSplit = {
  sellerPayoutLamports: number;
  feeTreasuryLamports: number;
  refundLamports: number;
};

const prepareDealSettlement = (input: {
  reservation: SealedCustody; // encrypted; never returned to clients
  sellerAddress: string;
  feeTreasuryAddress: string; // same Econext treasury pubkey as cash-out
  refundAddress?: string;
  amounts: SettlementSplit;
}) => {
  const signer = openCustody(input.reservation);
  const tx = buildAtomicTransfers({
    from: signer.publicKey,
    toSeller: input.amounts.sellerPayoutLamports,
    toFeeTreasury: input.amounts.feeTreasuryLamports,
    toRefund: input.amounts.refundLamports,
  });
  return signAndStage(tx, signer);
};
```

Legacy deals that already pointed at a shared hot address keep that path until they settle or expire. New reserves prefer the reservation wallet when the ephemeral flag is on.

**Human takeaway:** when you cash out at the bank or settle a peer deal, you are not trusting two different companies with two different vault stories. You are still at Econext. The wait on bank cash-out is still honest. Peer settlement is still "both legs or nobody is paid."

## Part III — P2P platform: the stall next to the bank

The P2P desk is the public stall beside the bank window. Sellers post asks in APU. Buyers lift them with SOL. The price that prints is the price two people accepted — not a peg and not a convert button.

You connect with the same World Passport credentials you already use on Econext. Guests can read the open book. Posting and taking need a live session. Locking an ask moves APU into escrow. Reserving an ask opens a deal room and a funding window. Confirming SOL walks a clear ladder: read the signature → step-up credentials → verify on Solana → settle.

```ts
const CONFIRM_STEPS = [
  "parse",    // read the explorer signature the buyer pasted
  "step_up",  // prove the same World Passport again
  "verify",   // deposit landed on the reservation address
  "settle",   // release APU + broadcast the SOL split
] as const;
```

The UI stays thin on purpose. Trading, escrow, auth, and Scanner writes live on Econext HTTP. The P2P app does not hold Redis, does not talk Solana RPC, and never asks for a Phantom seed. Nobody at Agent Play, Econext, or V0Peer needs your recovery words. If someone asks, that someone is not us.

**Human takeaway:** if the bank quote is not the night you want, you can meet a peer. Same passport. Same APU. A different table.

## The Convergence, drawn for leaders

Three surfaces. One economy.

**Agent Play World** is what people feel as walk, talk, buy, and Maple Ave. Systems own presence, world dollars, earning APU, and peer voice billing.

**Econext** is the bank, envelopes, cash-out, and deal custody. Systems own bankable APU, treasury, reservation wallets, and Scanner.

**Econext P2P** is the open book: reserve, send SOL, wait for both legs. The UI and session live here; all money truth still comes through Econext APIs.

Identity is one World Passport. Money unit is one APU. Exit rails are bank convert **or** peer SOL, not a third coin. Settlement rule is the same romance as a bill that actually paid: it either happened or it did not.

If you are integrating: treat the world as the demand surface, Econext as the ledger and custody plane, and P2P as a priced peer venue that never forks identity or invents a second vault.

## What is still a later chapter

Direct crypto checkout for every shop item and every minute of talk, on-chain as you go, is not how the world runs today. APU is not a coin you buy on a public exchange. APW$ is not the dollars in an ordinary bank. Taxes on SOL that arrive are yours to handle. We will not pretend otherwise.

## Come with us

- Walk the world at [v0peer.org](https://v0peer.org) — talk to someone on the floor, finish a Maple Ave. round, open your wallet.
- Bank and cash out at [Econext](https://econext.llc) when you are ready to take earnings home.
- When you want a peer price, open the P2P stall with the same passport — both legs lock, or nobody is paid.

The second economy was always one night out. **The Convergence** is the update where the street, the bank, and the stall finally share one bill.

— *The Agent Play team*

---

## Media pack

- Slug: `second-economy-the-convergence`
- Filename: `docs/blog/second-economy-the-convergence.md`
- Cover beat (six words): Street bank stall one bill
- Cover path: `docs/blog/agent-play-second-economy-convergence-substack.png` · LinkedIn: `docs/blog/agent-play-second-economy-convergence-linkedin.png`
- Sanity: featured yes · category: economy / world
- Honesty flags: later chapter for direct on-chain checkout; bank wait 7–14 days; P2P is peer price not peg
- Social hook: Second Economy — The Convergence. The street, the bank, and the peer stall now settle as one money story.
- Social scene: You meet someone on the map, talk longer than planned, earn APU, then either bank it or meet a peer at the stall — same passport, same unit.
- Social come-with-us: Walk [v0peer.org](https://v0peer.org). Bank at [econext.llc](https://econext.llc). Peer trade with the same World Passport.
- Cover alt: Architecture diagram of Agent Play World, Econext bank, and P2P desk converging on one APU and Solana settlement path.
