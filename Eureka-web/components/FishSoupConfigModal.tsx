"use client";

import { getDrinkMenuItems, getSetMealUpgradeItem } from "@/lib/supabase";
import type { CartItemUpgrade, FishSoupConfig, FishSoupSelectedOption, MenuItem, MenuOptionGroup } from "@/type";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

interface FishSoupConfigModalProps {
    item: MenuItem;
    categoryName?: string;
    optionGroups: MenuOptionGroup[];
    showUpgrade: boolean;
    onAdd: (config: FishSoupConfig, specialRequest?: string, upgrade?: CartItemUpgrade) => void;
    onClose: () => void;
}

const priceLabel = (adder: number) =>
    adder === 0 ? "Free" : `+$${adder.toFixed(2)}`;

const FishSoupConfigModal = ({
    item,
    categoryName: _categoryName,
    optionGroups,
    showUpgrade,
    onAdd,
    onClose,
}: FishSoupConfigModalProps) => {
    const soupGroup = optionGroups.find((g) => g.name === "Choose Soup");
    const baseGroup = optionGroups.find((g) => g.name === "Choose Base");
    const addOnGroup = optionGroups.find((g) => g.name === "Add-ons");

    const [selectedSoupId, setSelectedSoupId] = useState<string | null>(null);
    const [selectedBase1Id, setSelectedBase1Id] = useState<string | null>(null);
    // null = "None" (no second base — the second base is optional)
    const [selectedBase2Id, setSelectedBase2Id] = useState<string | null>(null);
    const [selectedAddOnIds, setSelectedAddOnIds] = useState<Set<string>>(new Set());
    const [specialRequest, setSpecialRequest] = useState("");
    const [selectedDrinkId, setSelectedDrinkId] = useState<string | null | undefined>(undefined);
    const [drinkOptions, setDrinkOptions] = useState<MenuItem[]>([]);
    const [upgradeItem, setUpgradeItem] = useState<{ id: string; price: number } | null>(null);
    const [loadingUpgrade, setLoadingUpgrade] = useState(false);

    useEffect(() => {
        if (!showUpgrade) return;
        setLoadingUpgrade(true);
        Promise.all([getDrinkMenuItems(), getSetMealUpgradeItem()])
            .then(([drinks, fetchedUpgradeItem]) => {
                setDrinkOptions(drinks as MenuItem[]);
                setUpgradeItem(fetchedUpgradeItem);
            })
            .catch(() => {})
            .finally(() => setLoadingUpgrade(false));
    }, [showUpgrade]);

    const upgradeAvailable = !loadingUpgrade && !!upgradeItem && drinkOptions.length > 0;
    const upgradePrice = upgradeItem?.price ?? 0;

    const soupOption = soupGroup?.options.find((o) => o.id === selectedSoupId);
    const base1Option = baseGroup?.options.find((o) => o.id === selectedBase1Id);
    const base2Option = selectedBase2Id ? baseGroup?.options.find((o) => o.id === selectedBase2Id) : undefined;
    const addOnOptions = addOnGroup?.options.filter((o) => selectedAddOnIds.has(o.id)) ?? [];

    const optionsAdder =
        (soupOption?.price_adder ?? 0) +
        (base1Option?.price_adder ?? 0) +
        (base2Option?.price_adder ?? 0) +
        addOnOptions.reduce((s, a) => s + a.price_adder, 0);
    const upgradeAdder = selectedDrinkId && upgradeAvailable ? upgradePrice : 0;
    const totalPrice = item.price + optionsAdder + upgradeAdder;

    const canAdd = !!selectedSoupId && !!selectedBase1Id;

    const toggleAddOn = (id: string) => {
        setSelectedAddOnIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleAdd = () => {
        if (!soupGroup || !baseGroup || !soupOption || !base1Option) return;

        const toSelected = (group: MenuOptionGroup, opt: typeof soupOption): FishSoupSelectedOption => ({
            groupId: group.id,
            groupName: group.name,
            optionId: opt.id,
            optionName: opt.name,
            priceAdder: opt.price_adder,
        });

        const baseOptions = [toSelected(baseGroup, base1Option)];
        if (base2Option) baseOptions.push(toSelected(baseGroup, base2Option));

        const config: FishSoupConfig = {
            soupOption: toSelected(soupGroup, soupOption),
            baseOptions,
            addOns: addOnGroup
                ? (addOnGroup.options
                    .filter((o) => selectedAddOnIds.has(o.id))
                    .map((o) => toSelected(addOnGroup, o)))
                : [],
        };

        const selectedDrink = selectedDrinkId ? drinkOptions.find((d) => d.id === selectedDrinkId) : null;
        const upgrade = selectedDrink && upgradeItem
            ? { upgradeItemId: upgradeItem.id, drinkName: selectedDrink.name, upgradePrice: upgradeItem.price }
            : undefined;

        onAdd(config, specialRequest.trim() || undefined, upgrade);
    };

    // Split base options into rice (free) and noodle (paid)
    const riceOptions = baseGroup?.options.filter((o) => o.price_adder === 0) ?? [];
    const noodleOptions = baseGroup?.options.filter((o) => o.price_adder > 0) ?? [];
    const noodleAdder = noodleOptions[0]?.price_adder ?? 0.8;

    const renderBaseChoices = (
        radioName: string,
        selectedId: string | null,
        onSelect: (id: string | null) => void,
        includeNone: boolean,
    ) => (
        <>
            {riceOptions.length > 0 && (
                <>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Rice — Free</p>
                    <div className="flex flex-col mb-3">
                        {riceOptions.map((opt) => (
                            <label
                                key={opt.id}
                                className="flex items-center gap-3 py-2.5 border-b border-gray-100 cursor-pointer last:border-0"
                            >
                                <input
                                    type="radio"
                                    name={radioName}
                                    checked={selectedId === opt.id}
                                    onChange={() => onSelect(opt.id)}
                                    className="accent-primary w-4 h-4 flex-shrink-0"
                                />
                                <span className="body-regular text-dark-100">{opt.name}</span>
                            </label>
                        ))}
                    </div>
                </>
            )}

            {noodleOptions.length > 0 && (
                <>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                        Noodle — +${noodleAdder.toFixed(2)}
                    </p>
                    <div className="flex flex-col">
                        {noodleOptions.map((opt) => (
                            <label
                                key={opt.id}
                                className="flex items-center gap-3 py-2.5 border-b border-gray-100 cursor-pointer last:border-0"
                            >
                                <input
                                    type="radio"
                                    name={radioName}
                                    checked={selectedId === opt.id}
                                    onChange={() => onSelect(opt.id)}
                                    className="accent-primary w-4 h-4 flex-shrink-0"
                                />
                                <span className="body-regular text-dark-100">{opt.name}</span>
                            </label>
                        ))}
                    </div>
                </>
            )}

            {includeNone && (
                <label className="flex items-center gap-3 py-2.5 mt-1 cursor-pointer">
                    <input
                        type="radio"
                        name={radioName}
                        checked={selectedId === null}
                        onChange={() => onSelect(null)}
                        className="accent-primary w-4 h-4 flex-shrink-0"
                    />
                    <span className="body-regular text-gray-400">None</span>
                </label>
            )}
        </>
    );

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
            <div className="bg-white rounded-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center gap-x-4 p-5 border-b border-gray-100">
                    {item.image_url ? (
                        <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                        />
                    ) : (
                        <div className="w-16 h-16 rounded-xl bg-gray-100 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                        <p className="base-bold text-dark-100 line-clamp-1">{item.name}</p>
                        <p className="paragraph-bold text-primary mt-0.5">${item.price.toFixed(2)}</p>
                    </div>
                    <button onClick={onClose} className="p-1 flex-shrink-0">
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                <div className="px-5 py-4 flex flex-col gap-5">
                    {/* Soup */}
                    {soupGroup && (
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <p className="paragraph-bold text-dark-100">
                                    {soupGroup.name}
                                    <span className="text-red-500 ml-1">*</span>
                                </p>
                                <p className="text-xs text-gray-400">Required</p>
                            </div>
                            <div className="flex flex-col gap-0">
                                {soupGroup.options.map((opt) => (
                                    <label
                                        key={opt.id}
                                        className="flex items-center justify-between py-2.5 border-b border-gray-100 cursor-pointer last:border-0"
                                    >
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="radio"
                                                name={`soup-${item.id}`}
                                                checked={selectedSoupId === opt.id}
                                                onChange={() => setSelectedSoupId(opt.id)}
                                                className="accent-primary w-4 h-4 flex-shrink-0"
                                            />
                                            <span className="body-regular text-dark-100">{opt.name}</span>
                                        </div>
                                        <span className={`text-sm font-medium ${opt.price_adder === 0 ? "text-green-600" : "text-dark-100"}`}>
                                            {priceLabel(opt.price_adder)}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Base 1 (required) */}
                    {baseGroup && (
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <p className="paragraph-bold text-dark-100">
                                    Choose Base 1
                                    <span className="text-red-500 ml-1">*</span>
                                </p>
                                <p className="text-xs text-gray-400">Required</p>
                            </div>
                            {renderBaseChoices(`base1-${item.id}`, selectedBase1Id, setSelectedBase1Id, false)}
                        </div>
                    )}

                    {/* Base 2 (optional — same option allowed for a double portion) */}
                    {baseGroup && (
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <p className="paragraph-bold text-dark-100">Add a 2nd Base</p>
                                <p className="text-xs text-gray-400">Optional</p>
                            </div>
                            {renderBaseChoices(`base2-${item.id}`, selectedBase2Id, setSelectedBase2Id, true)}
                        </div>
                    )}

                    {/* Add-ons */}
                    {addOnGroup && addOnGroup.options.length > 0 && (
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <p className="paragraph-bold text-dark-100">{addOnGroup.name}</p>
                                <p className="text-xs text-gray-400">Optional</p>
                            </div>
                            <div className="flex flex-col">
                                {addOnGroup.options.map((opt) => (
                                    <label
                                        key={opt.id}
                                        className="flex items-center justify-between py-2.5 border-b border-gray-100 cursor-pointer last:border-0"
                                    >
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                checked={selectedAddOnIds.has(opt.id)}
                                                onChange={() => toggleAddOn(opt.id)}
                                                className="accent-primary w-4 h-4 flex-shrink-0 rounded"
                                            />
                                            <span className="body-regular text-dark-100">{opt.name}</span>
                                        </div>
                                        <span className="text-sm font-medium text-dark-100">
                                            +${opt.price_adder.toFixed(2)}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Set meal upgrade */}
                    {showUpgrade && (loadingUpgrade || upgradeAvailable) && (
                        <div className="border-t border-gray-100 pt-1">
                            <div className="flex items-center justify-between mb-3">
                                <p className="paragraph-bold text-dark-100">
                                    Make it a set (+${upgradePrice.toFixed(2)})
                                </p>
                                <p className="text-xs text-gray-400">Choose max 1 (optional)</p>
                            </div>
                            {loadingUpgrade ? (
                                <p className="text-sm text-gray-400">Loading drinks...</p>
                            ) : (
                                <div className="flex flex-col">
                                    {drinkOptions.map((drink) => (
                                        <label
                                            key={drink.id}
                                            className="flex items-center gap-3 py-2.5 cursor-pointer border-b border-gray-100"
                                        >
                                            <input
                                                type="radio"
                                                name={`fs-upgrade-${item.id}`}
                                                checked={selectedDrinkId === drink.id}
                                                onChange={() => setSelectedDrinkId(drink.id)}
                                                className="accent-primary w-4 h-4 flex-shrink-0"
                                            />
                                            <span className="body-regular text-dark-100 flex-1">{drink.name}</span>
                                        </label>
                                    ))}
                                    <label className="flex items-center gap-3 py-2.5 cursor-pointer">
                                        <input
                                            type="radio"
                                            name={`fs-upgrade-${item.id}`}
                                            checked={selectedDrinkId === null}
                                            onChange={() => setSelectedDrinkId(null)}
                                            className="accent-primary w-4 h-4 flex-shrink-0"
                                        />
                                        <span className="body-regular text-gray-400">No thanks</span>
                                    </label>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Special request */}
                    <div>
                        <p className="body-regular text-gray-200">Special request</p>
                        <textarea
                            className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-base leading-5 resize-none outline-none focus:border-primary"
                            placeholder="(Subject to availability)"
                            maxLength={200}
                            rows={3}
                            value={specialRequest}
                            onChange={(e) => setSpecialRequest(e.target.value)}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-x-3 px-5 pb-5">
                    <button onClick={onClose} className="px-4 py-2">
                        <span className="paragraph-bold text-gray-200">Cancel</span>
                    </button>
                    <button
                        onClick={handleAdd}
                        disabled={!canAdd}
                        className="bg-primary px-4 py-2 rounded-full hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <span className="paragraph-bold text-white">
                            Add to Cart — ${totalPrice.toFixed(2)}
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FishSoupConfigModal;
