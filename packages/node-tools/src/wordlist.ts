const ADJECTIVES = [
  "amber", "ancient", "autumn", "azure", "bold", "brisk", "calm", "cedar", "clear", "cool",
  "coral", "crimson", "dawn", "deep", "delta", "dry", "dusky", "eager", "early", "ember",
  "even", "faint", "fern", "fiery", "fine", "first", "flint", "floral", "frost", "gentle",
  "golden", "grand", "gray", "green", "hidden", "hollow", "indigo", "iron", "ivory", "jade",
  "jolly", "keen", "kind", "lilac", "lively", "lunar", "maple", "meadow", "mellow", "misty",
  "modern", "navy", "noble", "olive", "onyx", "opal", "pearl", "plain", "proud", "quiet",
  "rapid", "raw", "red", "rich", "river", "royal", "rustic", "sable", "saffron", "scarlet",
  "shady", "silver", "silent", "slate", "soft", "solid", "solar", "spruce", "steel", "stone",
  "stormy", "sunny", "swift", "teal", "timber", "topaz", "urban", "velvet", "verdant", "violet",
  "vivid", "warm", "wild", "windy", "winter", "wooden", "young", "zen", "zesty", "bright",
] as const;

const NOUNS = [
  "anchor", "angle", "apple", "arch", "atlas", "aura", "bamboo", "beacon", "birch", "blossom",
  "breeze", "brook", "cactus", "candle", "canyon", "cloud", "comet", "coral", "cove", "crest",
  "dune", "echo", "elm", "fjord", "flame", "forest", "galaxy", "garden", "glade", "granite",
  "harbor", "horizon", "iris", "island", "jungle", "kelp", "lagoon", "lantern", "lotus", "mesa",
  "mist", "moon", "nebula", "nectar", "oasis", "orchid", "otter", "pine", "planet", "plume",
  "prairie", "quartz", "raven", "reef", "ridge", "river", "sakura", "sand", "sapphire", "savanna",
  "shadow", "shore", "sky", "solstice", "star", "stone", "storm", "summit", "sunset", "surf",
  "thunder", "tulip", "valley", "violet", "wave", "willow", "wind", "zenith", "orbit", "signal",
  "cipher", "pixel", "matrix", "vector", "kernel", "socket", "thread", "packet", "module", "system",
  "schema", "ledger", "canvas", "engine", "fusion", "radius", "vertex", "bridge", "cluster", "domain",
] as const;

const buildWordList = (): string[] => {
  const words = ADJECTIVES.flatMap((adjective) =>
    NOUNS.map((noun) => `${adjective}-${noun}`)
  );
  return words.slice(0, 3000);
};

export const WORDLIST = buildWordList();
