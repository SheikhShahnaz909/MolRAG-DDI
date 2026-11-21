
import { useEffect, useState } from "react";
import { API_URL } from "../config";

// Fetched once per page load and shared by every page that needs it.
const cache = {};

function useNames(key, path, pick) {
  const [names, setNames] = useState(cache[key] || []);

  useEffect(() => {
    if (cache[key]) return undefined;

    let cancelled = false;

    fetch(`${API_URL}${path}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`API request failed: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        const list = pick(data);
        cache[key] = list;

        if (!cancelled) {
          setNames(list);
        }
      })
      .catch((error) => {
        console.error(`Failed to load ${key} drug list:`, error);
      });

    return () => {
      cancelled = true;
    };
  }, [key, path, pick]);

  return names;
}

const pickPredictable = (data) => data.drugs || [];

const pickCatalog = (data) =>
  (data.drugs || []).map((d) => d.drug_name);

// Only drugs the model can predict with.
export function usePredictableDrugs() {
  return useNames(
    "predictable",
    "/predictable-drugs",
    pickPredictable
  );
}

// Full browsing catalog for Drug Information and Compare Drugs.
export function useCatalogDrugs() {
  return useNames(
    "catalog",
    "/drugs?page_size=5000",
    pickCatalog
  );
}
