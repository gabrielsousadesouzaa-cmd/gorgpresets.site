import { slugify } from "@/lib/slugify";

export interface Product {
    id: string;
    slug: string;
    name: string;
    description: string;
    detailedDescription: string;
    whatsIncluded: string[];
    idealFor: string[];
    price: number; 
    originalPrice: number;
    discount: number;
    image: string;
    images: string[];
    category: string; 
    tags: string[];
    checkoutUrl: string;
    isNew: boolean;
    isBestseller: boolean;
    salesCount: number;
}


export const mockProducts: Product[] = [
    {
        id: "1",
        slug: slugify("DEEP BLACK"),
        name: "DEEP BLACK",
        description: "Transforme sua foto num aesthetic monocromático profundo.",
        detailedDescription: "O pack DEEP BLACK foi projetado para criar a estética perfeita das maiores influenciadoras.",
        whatsIncluded: ["5 Presets Profissionais"],
        idealFor: ["Selfies impecáveis", "Lifestyle"],
        price: 24.90,
        originalPrice: 49.80,
        discount: 50,
        image: "https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?auto=format&fit=crop&q=80&w=600&h=600",
        images: [
            "https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?auto=format&fit=crop&q=80&w=600&h=600",
            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600&h=600",
            "https://images.unsplash.com/photo-1506667523932-e919e61831a1?auto=format&fit=crop&q=80&w=600&h=600",
            "https://images.unsplash.com/photo-1516244754848-0ca5ec869502?auto=format&fit=crop&q=80&w=600&h=600",
            "https://images.unsplash.com/photo-1504198453319-5ce911bafcde?auto=format&fit=crop&q=80&w=600&h=600",
            "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&q=80&w=600&h=600"
        ],
        category: "Creative",
        tags: ["Black", "Creative"],
        checkoutUrl: "",
        isNew: false,
        isBestseller: true,
        salesCount: 1540
    },
    {
        id: "2",
        slug: slugify("VERÃO"),
        name: "VERÃO",
        description: "Tons quentes para suas fotos de praia.",
        detailedDescription: "O pack VERÃO traz a vibração do sol e do mar para suas fotos.",
        whatsIncluded: ["5 Presets Profissionais"],
        idealFor: ["Praia", "Golden Hour"],
        price: 19.90,
        originalPrice: 39.80,
        discount: 50,
        image: "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&q=80&w=600&h=600",
        images: [
            "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&q=80&w=600&h=600",
            "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=600&h=600",
            "https://images.unsplash.com/photo-1504198458649-3128b932f49e?auto=format&fit=crop&q=80&w=600&h=600",
            "https://images.unsplash.com/photo-1533167649158-6d508895b980?auto=format&fit=crop&q=80&w=600&h=600",
            "https://images.unsplash.com/photo-1538964173425-93884d739596?auto=format&fit=crop&q=80&w=600&h=600",
            "https://images.unsplash.com/photo-1520116467321-f1466a0117ec?auto=format&fit=crop&q=80&w=600&h=600"
        ],
        category: "Travel",
        tags: ["Praia", "Travel"],
        checkoutUrl: "",
        isNew: true,
        isBestseller: true,
        salesCount: 3200
    },
    {
        id: "3",
        slug: slugify("SILENT LUXURY"),
        name: "SILENT LUXURY",
        description: "Minimalista, cores sóbrias e elegantes.",
        detailedDescription: "Inspirado na estética Old Money.",
        whatsIncluded: ["5 Presets Premium"],
        idealFor: ["Moda", "Luxo"],
        price: 29.90,
        originalPrice: 59.80,
        discount: 50,
        image: "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&q=80&w=600&h=600",
        images: [
            "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&q=80&w=600&h=600",
            "https://images.unsplash.com/photo-1491336477066-31156b5e4f35?auto=format&fit=crop&q=80&w=600&h=600",
            "https://images.unsplash.com/photo-1519235106638-30cc49b4f434?auto=format&fit=crop&q=80&w=600&h=600",
            "https://images.unsplash.com/photo-1470468969717-61d5d54fd036?auto=format&fit=crop&q=80&w=600&h=600",
            "https://images.unsplash.com/photo-1506630448388-4e683c67ddb0?auto=format&fit=crop&q=80&w=600&h=600",
            "https://images.unsplash.com/photo-1522075464040-34449103ff2f?auto=format&fit=crop&q=80&w=600&h=600"
        ],
        category: "Lifestyle",
        tags: ["Luxury", "Lifestyle"],
        checkoutUrl: "",
        isNew: false,
        isBestseller: true,
        salesCount: 890
    },
    {
        id: "4",
        slug: slugify("URBAN DARK"),
        name: "URBAN DARK",
        description: "Estética noturna pesada e industrial.",
        detailedDescription: "Ideal para fotos de noite...",
        whatsIncluded: ["5 Presets Urbanos"],
        idealFor: ["Arquitetura", "Street"],
        price: 14.90,
        originalPrice: 24.90,
        discount: 40,
        image: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&q=80&w=600&h=600",
        images: [
            "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&q=80&w=600&h=600",
            "https://images.unsplash.com/photo-1517404215738-15263e9f9178?auto=format&fit=crop&q=80&w=600&h=600",
            "https://images.unsplash.com/photo-1449156003053-c30177707471?auto=format&fit=crop&q=80&w=600&h=600",
            "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=600&h=600",
            "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&q=80&w=600&h=600",
            "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&q=80&w=600&h=600"
        ],
        category: "Negócios",
        tags: ["Negócios", "Urban"],
        checkoutUrl: "",
        isNew: false,
        isBestseller: false,
        salesCount: 450
    },
    {
        id: "5",
        slug: slugify("MINIMALIST HOME"),
        name: "MINIMALIST HOME",
        description: "Claridade e tons neutros para interiores.",
        detailedDescription: "Perfeito para fotos de casa.",
        whatsIncluded: ["5 Presets Minimalistas"],
        idealFor: ["Decor", "Home"],
        price: 17.90,
        originalPrice: 35.80,
        discount: 50,
        image: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&q=80&w=600&h=600",
        images: [
            "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&q=80&w=600&h=600",
            "https://images.unsplash.com/photo-1505691722718-468430a38669?auto=format&fit=crop&q=80&w=600&h=600",
            "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&q=80&w=600&h=600",
            "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&q=80&w=600&h=600",
            "https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&q=80&w=600&h=600",
            "https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?auto=format&fit=crop&q=80&w=600&h=600"
        ],
        category: "Essential",
        tags: ["Essential", "Home"],
        checkoutUrl: "",
        isNew: true,
        isBestseller: false,
        salesCount: 670
    },
    {
        id: "6",
        slug: slugify("COLD WINTER"),
        name: "COLD WINTER",
        description: "Realça tons azuis e brancos frios.",
        detailedDescription: "Ideal para neve.",
        whatsIncluded: ["5 Presets Cold"],
        idealFor: ["Travel", "Winter"],
        price: 19.90,
        originalPrice: 39.80,
        discount: 50,
        image: "https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&q=80&w=600&h=600",
        images: [
            "https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&q=80&w=600&h=600",
            "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&q=80&w=600&h=600",
            "https://images.unsplash.com/photo-1454496522488-7a8e488e8606?auto=format&fit=crop&q=80&w=600&h=600",
            "https://images.unsplash.com/photo-1502126324834-38f8e02d7160?auto=format&fit=crop&q=80&w=600&h=600",
            "https://images.unsplash.com/photo-1483921020237-2ff51e8e4b22?auto=format&fit=crop&q=80&w=600&h=600",
            "https://images.unsplash.com/photo-1489440543286-3b9338b57891?auto=format&fit=crop&q=80&w=600&h=600"
        ],
        category: "Travel",
        tags: ["Travel", "Winter"],
        checkoutUrl: "",
        isNew: false,
        isBestseller: false,
        salesCount: 230
    }
];
