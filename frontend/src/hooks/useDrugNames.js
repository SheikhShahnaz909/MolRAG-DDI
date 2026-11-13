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
      .then((res) => res.json())
      .then((data) => {
        const list = pick(data);
        cache[key] = list;
        if (!cancelled) setNames(list);
      })
      .catch(() => {}); // autocomplete just falls back to the static list
    return () => {
      cancelled = true;
    };
  }, [key, path, pick]);

  return names;
}

const pickPredictable = (data) => data.drugs || [];
const pickCatalog = (data) => (data.drugs || []).map((d) => d.drug_name);

// Only drugs the model can predict with, so a suggestion can never 404 on submit.
export function usePredictableDrugs() {
  return useNames("predictable", "/api/predictable-drugs", pickPredictable);
}

// The full browsing catalog (Drug Information / Compare only need catalog data).
export function useCatalogDrugs() {
  return useNames("catalog", "/api/drugs?page_size=5000", pickCatalog);
}
