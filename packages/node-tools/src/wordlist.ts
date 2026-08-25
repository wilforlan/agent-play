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
  "alpine", "arctic", "ashen", "auburn", "bronze", "canyon", "cobalt", "copper", "cosmic", "crisp",
  "daring", "dusk", "eastern", "endless", "fabled", "fair", "far", "feral", "foggy", "forest",
  "glacial", "glowing", "hazy", "humble", "inner", "ivory", "jade", "keen", "lumen", "marble",
  "northern", "open", "outer", "pale", "pine", "polar", "prime", "primal", "pure", "quiet",
  "radiant", "rising", "salty", "sandy", "sienna", "sierra", "simple", "sleek", "small", "smooth",
  "southern", "still", "stout", "subtle", "tidal", "true", "umber", "vast", "vital", "western",
  "amber", "blooming", "clouded", "current", "dapple", "earthen", "flinty", "goldenrod", "harbor",
  "jasper", "kindled", "leafy", "littoral", "mossy", "narrow", "nickel", "obsidian", "orchid",
  "pebbled", "quartz", "rooted", "runic", "russet", "shadow", "silken", "sparse", "starlit", "sunlit",
  "temperate", "terra", "veiled", "waking", "willow", "woven", "zephyr",
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
  "shield", "sword", "axe", "bow", "crossbow", "spear", "dagger", "katana", "nunchaku", "whip",
  "chain", "flail", "morningstar", "morning", "sun", "universe",
  "acorn", "anvil", "arbor", "basin", "bay", "bluff", "boulder", "branch", "cinder", "citadel",
  "cliff", "clover", "cobalt", "copper", "crater", "creek", "delta", "dew", "drift", "ember",
  "estuary", "falcon", "field", "finch", "fjord", "flint", "ford", "forge", "geyser", "glacier",
  "grove", "gulf", "haven", "heath", "helm", "heron", "hive", "inlet", "islet", "ivory",
  "jasper", "keel", "knoll", "larch", "lark", "ledge", "lichen", "lighthouse", "maple", "marina",
  "marsh", "meadow", "mirror", "monolith", "moss", "needle", "nickel", "oak", "obsidian", "olive",
  "onyx", "opal", "orchard", "osprey", "oxbow", "pass", "pebble", "petal", "pinnacle", "plaza",
  "pond", "poplar", "port", "prism", "quarry", "quill", "rapids", "reed", "refuge", "ripple",
  "runnel", "sage", "salmon", "spire", "spring", "spruce", "strait", "stream", "terrace", "thicket",
  "tide", "timber", "torch", "trail", "trench", "trout", "tundra", "vault", "vista", "voyage",
  "walnut", "waterfall", "weir", "well", "wharf", "wheat", "wick", "woodland", "yarrow", "zephyr",
] as const;

const uniqueSorted = (words: readonly string[]): string[] => {
  return [...new Set(words)].sort((left, right) => left.localeCompare(right));
};

const buildWordList = (): string[] => {
  const adjectives = uniqueSorted(ADJECTIVES);
  const nouns = uniqueSorted(NOUNS);
  return adjectives.flatMap((adjective) =>
    nouns.map((noun) => `${adjective}-${noun}`)
  );
};

export const WORDLIST = buildWordList();
