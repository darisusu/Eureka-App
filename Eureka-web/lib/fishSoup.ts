import type { FishSoupConfig, FishSoupSelectedOption } from "@/type";

/**
 * Base selections for a fish soup config, tolerating the legacy single
 * `baseOption` shape that older persisted carts / order configs may carry.
 */
export const getBaseOptions = (config: FishSoupConfig): FishSoupSelectedOption[] => {
    if (config.baseOptions?.length) return config.baseOptions;
    const legacy = (config as unknown as { baseOption?: FishSoupSelectedOption }).baseOption;
    return legacy ? [legacy] : [];
};

/** Total price adder ($) contributed by soup + all bases + add-ons. */
export const fishSoupPriceAdder = (config?: FishSoupConfig): number => {
    if (!config) return 0;
    return config.soupOption.priceAdder
        + getBaseOptions(config).reduce((s, b) => s + b.priceAdder, 0)
        + config.addOns.reduce((s, a) => s + a.priceAdder, 0);
};

/**
 * Human-readable base summary, collapsing duplicates into a count:
 * "Thick Bee Hoon ×2" or "White Rice, Kway Teow".
 */
export const baseSummary = (config: FishSoupConfig): string => {
    const counts = new Map<string, number>();
    for (const b of getBaseOptions(config)) {
        counts.set(b.optionName, (counts.get(b.optionName) ?? 0) + 1);
    }
    return [...counts].map(([name, n]) => (n > 1 ? `${name} ×${n}` : name)).join(", ");
};

/**
 * Option IDs to charge server-side. Bases are listed once per selection (not
 * de-duplicated) so a double portion is charged for both base adders.
 */
export const fishSoupOptionIds = (config: FishSoupConfig): string[] => [
    config.soupOption.optionId,
    ...getBaseOptions(config).map(b => b.optionId),
    ...config.addOns.map(a => a.optionId),
];
