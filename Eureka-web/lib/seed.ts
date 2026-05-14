// Seed script — clears and repopulates categories + menu in Supabase.
// Run with: npx tsx --env-file=.env.local lib/seed.ts
// Never run against production data.

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
);

const categories = [
    { name: "Drinks", description: "Beverages and drinks" },
    { name: "Porridge", description: "Warm congee and porridge" },
    { name: "Fish Soup", description: "Fresh fish soup" },
];

const menuItems = [
    {
        name: "Fish Soup",
        description: "Clear broth with sliced fish",
        image_url: "https://placehold.co/600x400/png?text=Fish+Soup",
        price: 6.5,
        category_name: "Fish Soup",
    },
    {
        name: "Century Egg Pork Porridge",
        description: "Smooth porridge with pork and century egg",
        image_url: "https://placehold.co/600x400/png?text=Pork+Porridge",
        price: 4.8,
        category_name: "Porridge",
    },
    {
        name: "Teh C",
        description: "Freshly brewed tea",
        image_url: "https://placehold.co/600x400/png?text=Teh+C",
        price: 1.2,
        category_name: "Drinks",
    },
];

async function seed() {
    console.log("Clearing existing menu and categories...");
    await supabase.from("order_items").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("menu").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("dept_config").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("categories").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    console.log("Inserting categories...");
    const { data: insertedCategories, error: catErr } = await supabase
        .from("categories")
        .insert(categories)
        .select("id, name");

    if (catErr || !insertedCategories) {
        throw new Error(`Failed to insert categories: ${catErr?.message}`);
    }
    console.log(`  ✓ ${insertedCategories.length} categories`);

    const categoryMap = new Map(insertedCategories.map(c => [c.name, c.id]));

    console.log("Inserting menu items...");
    const { data: insertedMenu, error: menuErr } = await supabase
        .from("menu")
        .insert(
            menuItems.map(item => ({
                name: item.name,
                description: item.description,
                image_url: item.image_url,
                price: item.price,
                category_id: categoryMap.get(item.category_name) ?? null,
                is_available: true,
            }))
        )
        .select("id, name");

    if (menuErr || !insertedMenu) {
        throw new Error(`Failed to insert menu: ${menuErr?.message}`);
    }
    console.log(`  ✓ ${insertedMenu.length} menu items`);

    console.log("Done.");
}

seed().catch(err => {
    console.error(err);
    process.exit(1);
});
