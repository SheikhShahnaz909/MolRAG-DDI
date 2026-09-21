import { useState, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";
import DRUG_LIST from "../data/drugList";

// Reusable searchable, alphabetically-sorted drug dropdown.
// Typing filters the list live; selecting an item fills the field.
export default function DrugAutocomplete({ value, onChange, placeholder = "Search a drug...", onRemove }) {
  const [query, setQuery] = useState(value || "");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => setQuery(value || ""), [value]);

  useEffect(() => {
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const matches = DRUG_LIST.filter((d) =>
    d.toLowerCase().startsWith(query.toLowerCase())
  ).slice(0, 8);

  function selectDrug(name) {
    setQuery(name);
    onChange(name);
    setOpen(false);
  }

  return (
    <div className="relative" ref={wrapRef}>
      <div className="relative">
        <Search className="w-4 h-4 text-clinical-muted absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full pl-10 pr-9 py-3 rounded-lg border border-clinical-border
                     focus:outline-none focus:ring-2 focus:ring-clinical-teal font-mono text-sm"
        />
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove drug"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-clinical-muted hover:text-severity-severe"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {open && query && matches.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full card max-h-56 overflow-y-auto py-1">
          {matches.map((d) => (
            <li key={d}>
              <button
                type="button"
                onClick={() => selectDrug(d)}
                className="w-full text-left px-4 py-2 text-sm hover:bg-clinical-bg font-mono"
              >
                {d}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
