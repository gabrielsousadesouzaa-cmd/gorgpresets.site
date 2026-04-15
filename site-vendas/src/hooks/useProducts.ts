import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { mockProducts, Product } from "@/data/products";
import { slugify } from "@/lib/slugify";

// Função utilitária para mapear dados do banco para o frontend de forma ultra-segura
const mapProduct = (p: any): Product => {
  if (!p) return mockProducts[0]; // Fallback crítico se o objeto for nulo

  // Função interna para tentar parse de arrays ou strings de arrays
  const safeArray = (val: any) => {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
      try {
        // Se for formato Postgres "{item1,item2}"
        if (val.startsWith('{') && val.endsWith('}')) {
          return val.slice(1, -1).split(',').map(s => s.trim().replace(/^"|"$/g, ''));
        }
        // Se for JSON "['item1','item2']"
        return JSON.parse(val);
      } catch (e) {
        return [val]; // Retorna como único item se falhar
      }
    }
    return [];
  };

  return {
    ...p,
    id: String(p.id || Math.random()), 
    name: p.name || "Sem Nome",
    slug: slugify(p.name || ""),
    description: (() => {
      const d = p.description;
      if (typeof d === 'string' && d.startsWith('{')) { try { return JSON.parse(d); } catch(e){}}
      return d || "";
    })(),
    detailedDescription: (() => {
      const d = p.detailed_description || p.description;
      if (typeof d === 'string' && d.startsWith('{')) { try { return JSON.parse(d); } catch(e){}}
      return d || "";
    })(),
    price: parseFloat(String(p.price)) || 0,
    originalPrice: p.original_price ? parseFloat(String(p.original_price)) : 0,
    discount: parseInt(String(p.discount)) || 0,
    image: p.image || "https://images.unsplash.com/photo-1542038784456-1ea8e935640e",
    images: safeArray(p.images).length > 0 ? safeArray(p.images) : [p.image || "https://images.unsplash.com/photo-1542038784456-1ea8e935640e"],
    category: p.category || "Creative",
    tags: safeArray(p.tags),
    whatsIncluded: safeArray(p.whats_included),
    idealFor: safeArray(p.ideal_for),
    checkoutUrl: p.checkout_url || "#",
    isNew: !!p.is_new,
    isBestseller: !!p.is_bestseller,
    salesCount: parseInt(String(p.sales_count)) || 0,
    priceUSD: p.price_usd ? parseFloat(String(p.price_usd)) : null,
    priceEUR: p.price_eur ? parseFloat(String(p.price_eur)) : null,
    originalPriceUSD: p.original_price_usd ? parseFloat(String(p.original_price_usd)) : null,
    originalPriceEUR: p.original_price_eur ? parseFloat(String(p.original_price_eur)) : null,
  };
};

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    async function fetchProducts() {
      if (!supabase) {
        setProducts(mockProducts);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data, error: sbError } = await supabase
          .from("products")
          .select("*")
          .order("created_at", { ascending: false });

        if (sbError) throw sbError;

        if (data && data.length > 0) {
          const processed = data.map(mapProduct);
          setProducts(processed);
        } else {
          setProducts(mockProducts);
        }
      } catch (err) {
        console.error("Supabase fetch error, falling back to mock:", err);
        setError(err);
        setProducts(mockProducts);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

  return { products, loading, error };
}

export function useProduct(slug: string | undefined) {
  const [product, setProduct] = useState<Product | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }

    async function fetchProduct() {
      if (!supabase) {
        // Busca mock por slug ou id (retrocompatibilidade)
        const found = mockProducts.find(p => p.slug === slug || p.id === slug);
        setProduct(found);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Busca todos e filtra por slug derivado do nome
        const { data, error } = await supabase
          .from("products")
          .select("*");

        if (error || !data) {
          const found = mockProducts.find(p => p.slug === slug || p.id === slug);
          setProduct(found);
        } else {
          const all = data.map(mapProduct);
          const found = all.find(p => p.slug === slug || p.id === slug);
          setProduct(found);
        }
      } catch (err) {
        console.error("Single fetch error:", err);
        const found = mockProducts.find(p => p.slug === slug || p.id === slug);
        setProduct(found);
      } finally {
        setLoading(false);
      }
    }

    fetchProduct();
  }, [slug]);

  return { product, loading };
}
