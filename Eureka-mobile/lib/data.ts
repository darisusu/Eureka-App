const dummyData = {
  categories: [
    { name: "Drinks" },
    { name: "Porridge" },
    { name: "Fish Soup" },
  ],
  menu: [
    {
      name: "Fish Soup",
      description: "Clear broth with sliced fish",
      image_url: "https://placehold.co/600x400/png?text=Fish+Soup",
      price: 6.5,
      category_name: "Fish Soup",
      prep_time_min: 7,
    },
    {
      name: "Century Egg Pork Porridge",
      description: "Smooth porridge with pork and century egg",
      image_url: "https://placehold.co/600x400/png?text=Pork+Porridge",
      price: 4.8,
      category_name: "Porridge",
      prep_time_min: 5,
    },
    {
      name: "Teh C",
      description: "Freshly brewed tea",
      image_url: "https://placehold.co/600x400/png?text=Teh+C",
      price: 1.2,
      category_name: "Drinks",
      prep_time_min: 1,
    },
  ],
};

export default dummyData;