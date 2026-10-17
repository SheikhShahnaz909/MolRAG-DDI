import { useState, useRef, useEffect, useId } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, X } from "lucide-react";
import DRUG_LIST from "../data/drugList";

// Searchable, alphabetically-sorted drug dropdown.
// Typing filters the list live. Keyboard: Arrow Up/Down to move, Enter to pick, Esc to close.
// drugList: optional override for which set of names to suggest from (e.g. only
// drugs the model can actually predict with, vs the full browsing catalog).
// Falls back to the static DRUG_LIST if not provided, so existing usages are unaffected.
export default function DrugAutocomplete({ value, onChange, placeholder = "Search a drug...", onRemove, drugList }) {
  const [query, setQuery] = useState(value || "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const wrapRef = useRef(null);
  const listId = useId();

  const sourceList = drugList && drugList.length > 0 ? drugList : DRUG_LIST;

  useEffect(() => setQuery(value || ""), [value]);

  useEffect(() => {
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const matches = sourceList.filter((d) =>
    d.toLowerCase().startsWith(query.toLowerCase())
  ).slice(0, 8);

  const showList = open && query && matches.length > 0;

  // Keep the highlighted option visible when the list scrolls.
  useEffect(() => {
    if (active >= 0) document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, listId]);

  function selectDrug(name) {
    setQuery(name);
    onChange(name);
    setOpen(false);
    setActive(-1);
  }

  function handleKeyDown(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (matches.length ? (a + 1) % matches.length : -1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (matches.length ? (a <= 0 ? matches.length - 1 : a - 1) : -1));
    } else if (e.key === "Enter") {
      if (showList && active >= 0) {
        e.preventDefault(); // pick the option instead of submitting the form
        selectDrug(matches[active]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  }

  return (
    <div className="relative" ref={wrapRef}>
      <div className="group relative">
        <Search className="w-4 h-4 text-clinical-muted absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none
                           transition-colors group-focus-within:text-clinical-teal" />
        <input
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          autoComplete="off"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-11 pr-10 py-3.5 rounded-xl border border-clinical-border bg-white/70 font-mono text-sm
                     transition-all duration-200 hover:border-clinical-tealLight/70
                     focus:outline-none focus:bg-white focus:border-clinical-teal focus:ring-4 focus:ring-clinical-teal/10"
        />
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove drug"
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-clinical-muted
                       hover:text-severity-severe hover:bg-severity-severeBg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {showList && (
          <motion.ul
            id={listId}
            role="listbox"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute z-20 mt-2 w-full bg-white rounded-2xl border border-clinical-border shadow-lift
                       max-h-56 overflow-y-auto py-1.5"
          >
            {matches.map((d, i) => (
              <li
                key={d}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => e.preventDefault()} // keep focus in the input
                onClick={() => selectDrug(d)}
                onMouseEnter={() => setActive(i)}
                className={`px-4 py-2 text-sm font-mono cursor-pointer transition-colors
                            ${i === active ? "bg-clinical-mist text-clinical-navy" : "text-clinical-text"}`}
              >
                {d}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}