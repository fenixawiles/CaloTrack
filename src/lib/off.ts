import type { Food, Macros } from './types';
import { uid } from './db';

// Open Food Facts: free, public, no API key, CORS-enabled.
// Docs: https://openfoodfacts.github.io/openfoodfacts-server/api/
const BASE = 'https://world.openfoodfacts.org/api/v2/product/';
const FIELDS =
  'product_name,brands,serving_size,serving_quantity,nutriments,quantity,image_front_small_url';

export interface OffLookupResult {
  found: boolean;
  food?: Omit<Food, 'id' | 'createdAt' | 'updatedAt'>;
  raw?: any;
}

function num(v: unknown): number | undefined {
  const n = typeof v === 'string' ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Look up a barcode and normalise it into our Food shape.
 * Open Food Facts reports nutriments per 100g and (sometimes) per serving.
 * We prefer per-serving; otherwise we fall back to per-100g as a 100 g serving.
 */
export async function lookupBarcode(barcode: string): Promise<OffLookupResult> {
  const url = `${BASE}${encodeURIComponent(barcode)}.json?fields=${FIELDS}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) return { found: false };
  const data = await res.json();
  if (data.status !== 1 || !data.product) return { found: false };

  const p = data.product;
  const n = p.nutriments ?? {};

  const perServingKcal = num(n['energy-kcal_serving']);
  const per100Kcal = num(n['energy-kcal_100g']);

  let caloriesPerServing: number | undefined;
  let servingSize = 100;
  let servingUnit: Food['servingUnit'] = 'g';
  let macros: Macros = {};

  if (perServingKcal != null) {
    caloriesPerServing = Math.round(perServingKcal);
    const sq = num(p.serving_quantity);
    if (sq) servingSize = sq;
    macros = {
      protein: num(n.proteins_serving),
      carbs: num(n.carbohydrates_serving),
      fat: num(n.fat_serving)
    };
  } else if (per100Kcal != null) {
    caloriesPerServing = Math.round(per100Kcal);
    servingSize = 100;
    servingUnit = 'g';
    macros = {
      protein: num(n.proteins_100g),
      carbs: num(n.carbohydrates_100g),
      fat: num(n.fat_100g)
    };
  }

  if (caloriesPerServing == null) {
    // Product exists but has no usable energy data.
    return {
      found: true,
      food: {
        name: p.product_name || 'Unknown product',
        brand: p.brands || undefined,
        caloriesPerServing: 0,
        servingSize,
        servingUnit,
        barcode,
        source: 'off'
      },
      raw: p
    };
  }

  const hasMacro = macros.protein != null || macros.carbs != null || macros.fat != null;

  return {
    found: true,
    food: {
      name: p.product_name || 'Unknown product',
      brand: p.brands || undefined,
      caloriesPerServing,
      servingSize,
      servingUnit,
      macros: hasMacro ? macros : undefined,
      barcode,
      source: 'off'
    },
    raw: p
  };
}

export function offToFood(partial: Omit<Food, 'id' | 'createdAt' | 'updatedAt'>): Food {
  const now = Date.now();
  return { ...partial, id: uid(), createdAt: now, updatedAt: now };
}
