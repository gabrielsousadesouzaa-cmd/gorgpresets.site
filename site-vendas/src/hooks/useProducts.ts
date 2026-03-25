import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { mockProducts, Product } from "@/data/products";

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
    description: p.description || "",
    detailedDescription: p.detailed_description || p.description || "",
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

export function useProduct(id: string | undefined) {
  const [product, setProduct] = useState<Product | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    async function fetchProduct() {
      if (!supabase) {
        const found = mockProducts.find(p => p.id === id);
        setProduct(found);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("id", id)
          .single();

        if (error || !data) {
          const found = mockProducts.find(p => p.id === id);
          setProduct(found);
        } else {
          setProduct(mapProduct(data));
        }
      } catch (err) {
        console.error("Single fetch error:", err);
        const found = mockProducts.find(p => p.id === id);
        setProduct(found);
      } finally {
        setLoading(false);
      }
    }

    fetchProduct();
  }, [id]);

  return { product, loading };
}
