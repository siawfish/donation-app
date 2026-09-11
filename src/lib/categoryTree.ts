/**
 * The listing taxonomy: Department → Category → Subcategory.
 *
 * Modelled on Vinted's picker — gender-led departments (Women, Men, Kids & Baby)
 * come first since that's how people actually think when listing clothing, then
 * ungendered departments cover everything else Givny takes (furniture,
 * electronics, books, and so on). A listing is tagged with the specific
 * subcategory the donor picks; `CategoryPicker` drives the drill-down UI and
 * `getItem`/`AddDonation` only ever deal with the flat `{ id, name }` leaf.
 *
 * Add to this tree freely — nothing else needs to change. IDs are derived from
 * names, so renaming a node changes its id; only rename a node that's already
 * live in Firestore if you're prepared to re-tag existing listings.
 */

export type Gender = "women" | "men" | "kids"

export interface CategoryLeaf {
  id: string
  name: string
}

export interface CategoryBranch extends CategoryLeaf {
  subcategories: CategoryLeaf[]
}

export interface Department extends CategoryLeaf {
  gender?: Gender
  categories: CategoryBranch[]
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

interface RawCategory {
  name: string
  subs: string[]
}

interface RawDepartment {
  name: string
  gender?: Gender
  categories: RawCategory[]
}

const RAW_TREE: RawDepartment[] = [
  {
    name: "Women",
    gender: "women",
    categories: [
      {
        name: "Clothing",
        subs: [
          "Dresses", "Tops & T-Shirts", "Blouses & Shirts", "Knitwear & Jumpers",
          "Hoodies & Sweatshirts", "Jeans", "Trousers & Leggings", "Skirts",
          "Shorts", "Jackets & Coats", "Blazers & Suits", "Jumpsuits & Playsuits",
          "Swimwear & Beachwear", "Lingerie & Nightwear", "Maternity Wear",
        ],
      },
      { name: "Shoes", subs: ["Trainers", "Heels", "Flats & Loafers", "Boots", "Sandals", "Slippers"] },
      { name: "Bags & Purses", subs: ["Handbags", "Backpacks", "Purses & Wallets", "Travel & Weekend Bags"] },
      {
        name: "Accessories",
        subs: ["Jewellery", "Watches", "Scarves & Wraps", "Belts", "Hats & Caps", "Sunglasses", "Hair Accessories", "Gloves"],
      },
      { name: "Beauty", subs: ["Makeup", "Skincare", "Haircare", "Fragrance", "Nail Care"] },
    ],
  },
  {
    name: "Men",
    gender: "men",
    categories: [
      {
        name: "Clothing",
        subs: [
          "T-Shirts", "Shirts", "Knitwear & Jumpers", "Hoodies & Sweatshirts",
          "Jeans", "Trousers & Chinos", "Shorts", "Jackets & Coats",
          "Suits & Blazers", "Swimwear", "Underwear & Nightwear",
        ],
      },
      { name: "Shoes", subs: ["Trainers", "Formal Shoes", "Boots", "Sandals", "Slippers"] },
      { name: "Bags", subs: ["Backpacks", "Briefcases & Laptop Bags", "Wallets", "Travel & Weekend Bags"] },
      { name: "Accessories", subs: ["Watches", "Belts", "Hats & Caps", "Sunglasses", "Ties", "Gloves"] },
      { name: "Grooming", subs: ["Skincare", "Haircare", "Shaving & Grooming Tools", "Fragrance"] },
    ],
  },
  {
    name: "Kids & Baby",
    gender: "kids",
    categories: [
      { name: "Girls' Clothing (2–8 yrs)", subs: ["Tops", "Dresses & Skirts", "Bottoms", "Outerwear", "Sleepwear", "Swimwear", "Multipacks"] },
      { name: "Girls' Clothing (9–16 yrs)", subs: ["Tops", "Dresses & Skirts", "Bottoms", "Outerwear", "Sleepwear", "Swimwear", "Multipacks"] },
      { name: "Boys' Clothing (2–8 yrs)", subs: ["Tops", "Bottoms", "Outerwear", "Sleepwear", "Swimwear", "Multipacks"] },
      { name: "Boys' Clothing (9–16 yrs)", subs: ["Tops", "Bottoms", "Outerwear", "Sleepwear", "Swimwear", "Multipacks"] },
      { name: "Baby & Toddler Clothing (0–3 yrs)", subs: ["Bodysuits & Sleepsuits", "Tops & Bottoms", "Outerwear", "Sleepwear", "Multipacks", "Shoes & Booties"] },
      { name: "Kids' Shoes", subs: ["Trainers", "School Shoes", "Boots", "Sandals", "Slippers"] },
      { name: "Kids' Accessories", subs: ["Hats & Gloves", "Bags & Backpacks", "Hair Accessories", "Jewellery"] },
      { name: "Nursery, Feeding & Safety", subs: ["Prams & Pushchairs", "Car Seats", "Cots & Bedding", "Feeding & Bottles", "Baby Monitors", "Changing & Bathing"] },
      { name: "Kids' Toys & Games", subs: ["Action Figures & Dolls", "Building & Construction", "Educational Toys", "Ride-Ons & Outdoor", "Puzzles"] },
    ],
  },
  {
    name: "Home & Living",
    categories: [
      { name: "Furniture", subs: ["Sofas & Armchairs", "Tables & Desks", "Chairs & Stools", "Beds & Mattresses", "Wardrobes & Storage", "Shelving & Bookcases", "Outdoor Furniture"] },
      { name: "Kitchen & Dining", subs: ["Cookware", "Tableware & Cutlery", "Small Kitchen Appliances", "Storage Containers", "Kitchen Textiles"] },
      { name: "Home Decor", subs: ["Wall Art & Mirrors", "Rugs & Carpets", "Candles & Fragrance", "Vases & Ornaments", "Clocks"] },
      { name: "Bedding & Bath", subs: ["Bedding Sets", "Cushions & Throws", "Curtains & Blinds", "Towels & Bath Linen"] },
      { name: "Garden & Outdoor", subs: ["Garden Furniture", "Plants & Pots", "Tools & Equipment", "BBQs & Outdoor Cooking"] },
      { name: "Storage & Organisation", subs: ["Boxes & Baskets", "Shelving Units", "Hangers"] },
    ],
  },
  {
    name: "Electronics & Tech",
    categories: [
      { name: "Phones & Accessories", subs: ["Mobile Phones", "Cases & Covers", "Chargers & Cables", "Headphones & Earphones"] },
      { name: "Computers & Laptops", subs: ["Laptops", "Desktops", "Monitors", "Keyboards & Mice", "Printers & Scanners"] },
      { name: "TV, Audio & Cameras", subs: ["Televisions", "Speakers & Soundbars", "Cameras & Camcorders", "DVD & Blu-ray Players"] },
      { name: "Gaming Hardware", subs: ["Consoles", "Controllers & Accessories", "VR Headsets"] },
      { name: "Smart Home & Wearables", subs: ["Smart Speakers", "Smartwatches & Fitness Trackers", "Smart Lighting"] },
    ],
  },
  {
    name: "Books, Movies & Music",
    categories: [
      { name: "Books", subs: ["Fiction", "Non-Fiction", "Children's Books", "Textbooks & Educational", "Comics & Graphic Novels", "Cookbooks"] },
      { name: "Movies & TV", subs: ["DVDs & Blu-rays"] },
      { name: "Music", subs: ["Vinyl Records", "CDs", "Musical Instruments"] },
    ],
  },
  {
    name: "Sports & Outdoors",
    categories: [
      { name: "Fitness Equipment", subs: ["Weights & Dumbbells", "Yoga & Pilates", "Cardio Machines"] },
      { name: "Team Sports", subs: ["Football", "Basketball", "Rugby"] },
      { name: "Racket Sports", subs: ["Tennis", "Badminton", "Squash"] },
      { name: "Cycling", subs: ["Bikes", "Helmets & Safety", "Bike Accessories"] },
      { name: "Camping & Hiking", subs: ["Tents", "Sleeping Bags", "Backpacks", "Camping Gear"] },
      { name: "Water Sports", subs: ["Swimwear & Wetsuits", "Surfing & Paddleboarding"] },
      { name: "Winter Sports", subs: ["Skiing & Snowboarding Gear"] },
    ],
  },
  {
    name: "Games & Hobbies",
    categories: [
      { name: "Games", subs: ["Board Games", "Card Games", "Video Games", "Puzzles"] },
      { name: "Arts & Crafts", subs: ["Craft Supplies", "Drawing & Painting", "Sewing & Knitting Supplies"] },
      { name: "Collectibles & Hobbies", subs: ["Trading Cards", "Figurines & Models", "Memorabilia", "Stamps & Coins"] },
    ],
  },
  {
    name: "Health & Beauty",
    categories: [
      { name: "Personal Care", subs: ["Toiletries", "Oral Care", "Skincare", "Haircare"] },
      { name: "Health & Wellness", subs: ["First Aid", "Vitamins & Supplements", "Mobility Aids"] },
      { name: "Beauty Tools", subs: ["Hair Styling Tools", "Makeup Brushes & Tools"] },
    ],
  },
  {
    name: "Appliances",
    categories: [
      { name: "Large Appliances", subs: ["Fridges & Freezers", "Washing Machines & Dryers", "Dishwashers", "Ovens & Cookers"] },
      { name: "Small Appliances", subs: ["Kettles & Toasters", "Microwaves", "Vacuum Cleaners", "Irons"] },
    ],
  },
  {
    name: "Food & Drink",
    categories: [
      { name: "Pantry & Groceries", subs: ["Non-Perishable Food", "Drinks", "Baby Food & Formula"] },
    ],
  },
  {
    name: "Office & School",
    categories: [
      { name: "Stationery", subs: ["Pens & Pencils", "Notebooks & Paper", "Art Supplies"] },
      { name: "School Equipment", subs: ["School Bags", "Calculators", "Lunch Boxes & Bottles"] },
      { name: "Office Equipment", subs: ["Desks & Chairs", "Filing & Storage", "Printers & Shredders"] },
    ],
  },
  {
    name: "Pets",
    categories: [
      { name: "Dog Supplies", subs: ["Beds", "Leads & Collars", "Toys", "Carriers"] },
      { name: "Cat Supplies", subs: ["Beds", "Scratching Posts", "Carriers", "Toys"] },
      { name: "Other Pets", subs: ["Small Animal Supplies", "Bird Supplies", "Fish & Aquarium"] },
      { name: "Pet Accessories", subs: ["Bowls & Feeders", "Grooming Supplies"] },
    ],
  },
  {
    name: "Other",
    categories: [{ name: "Miscellaneous", subs: ["Other"] }],
  },
]

/** Built once at module load: raw names above, turned into id-bearing nodes. */
export const CATEGORY_TREE: Department[] = RAW_TREE.map((dept) => {
  const deptId = slugify(dept.name)
  return {
    id: deptId,
    name: dept.name,
    gender: dept.gender,
    categories: dept.categories.map((cat) => {
      const catId = `${deptId}__${slugify(cat.name)}`
      return {
        id: catId,
        name: cat.name,
        subcategories: cat.subs.map((sub) => ({
          id: `${catId}__${slugify(sub)}`,
          name: sub,
        })),
      }
    }),
  }
})

export function getDepartments(): Department[] {
  return CATEGORY_TREE
}

/**
 * The department a category or subcategory id belongs to — every id in this
 * tree is built as `department`, `department__category`, or
 * `department__category__subcategory`, so the department is always the first
 * segment. Used to bucket a listing's specific subcategory under the coarser
 * department filter shown when browsing, so the two always agree on what
 * counts as a match.
 */
export function getDepartmentIdForCategoryId(id: string): string {
  return id.split("__")[0]
}

export function getCategoriesFor(departmentId: string): CategoryBranch[] {
  return CATEGORY_TREE.find((d) => d.id === departmentId)?.categories ?? []
}

export function getSubcategoriesFor(departmentId: string, categoryId: string): CategoryLeaf[] {
  return getCategoriesFor(departmentId).find((c) => c.id === categoryId)?.subcategories ?? []
}

/** Every leaf (subcategory) in the tree, each carrying its ancestor chain — the set a listing can actually be tagged with. */
export function flattenLeaves(): { leaf: CategoryLeaf; department: Department; category: CategoryBranch }[] {
  return CATEGORY_TREE.flatMap((department) =>
    department.categories.flatMap((category) =>
      category.subcategories.map((leaf) => ({ leaf, department, category }))
    )
  )
}

/** Looks up a previously-picked subcategory id and rebuilds "Department › Category › Subcategory" for display. */
export function describeLeaf(id: string): string | null {
  const found = flattenLeaves().find((entry) => entry.leaf.id === id)
  if (!found) return null
  return `${found.department.name} › ${found.category.name} › ${found.leaf.name}`
}
