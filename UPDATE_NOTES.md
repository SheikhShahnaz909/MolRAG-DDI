# MolRAG-DDI update

## Frontend  (folder: frontend/)
1. Copy `frontend/src/` over your `src/` folder. Keep your own `src/data/drugList.js` (it is not included here).
2. Replace `tailwind.config.js` and `index.html`. Add `.env.example` (copy to `.env` for deployment).
3. Delete `src/components/MoleculeHero.jsx` (no longer used).
4. Stop and restart `npm run dev` (Tailwind config changed).

## Backend  (folder: backend/) -- copy each file to the same path in your backend/
config.py, main.py, requirements.txt, routers/prediction.py, routers/drugs_router.py,
services/rag.py, services/side_effects.py (new), utils/drug_lookup.py, utils/drug_names.py (new), utils/db.py,
scripts/build_side_effects.py, .env.example

## Side effects (new, bigger file)
- Copy `backend/models/drug_side_effects.csv` over your old one (it replaces it; 1,125 rows instead of 514).
- `backend/models/side_effects_alias_report.csv` lists every row added under another spelling or salt form (e.g. ACETAMINOPHEN from PARACETAMOL). Skim it and delete any row you disagree with from the main file.
- `backend/scripts/build_side_effects.py` rebuilds the file from the dataset:
  `python scripts/build_side_effects.py --dataset path/to/medicine_data.csv`
- Restart uvicorn afterwards (the file is read at startup).
Then:  pip install -r requirements.txt   and fully restart uvicorn.

## Delete
backend/scripts/populate_mongodb.py (old copy with a password inside it).

## Test list
1. /docs -> GET /api/predictable-drugs returns names.
2. Predict with a brand name ("Dolo") + a drug name in lowercase.
3. Prediction page shows "Live progress from the server".
4. Results page: probabilities, evidence text, side effects, Grad-CAM images.
5. History -> View opens a saved result.
6. Toggle dark mode on Home and on Login.

## Live side effects (new)
- The prediction and `GET /api/drugs/{name}/side-effects?external=auto|always|never` now check the local file first,
  then the FDA drug-label API (openFDA). Answers are cached in MongoDB (collection `side_effect_cache`).
- Test it: open /docs, run GET /api/drugs/{drug_name}/side-effects with a drug that is NOT in the local file and external=always.
- Optional settings are in backend/.env.example (SIDE_EFFECTS_EXTERNAL, OPENFDA_API_KEY).
- Needs no new packages (uses Python's urllib).

## Added after the handoff review
- Aspirin, Paracetamol, "Warfarin sodium" etc. now resolve to the model's own drug (Acetylsalicylic acid, Acetaminophen, Warfarin). Do NOT add "Aspirin" with add_new_drugs.py: the model already has it under Acetylsalicylic acid.
- If you have `models/drug_side_effects_fda.csv` (drug_name, side_effects, source) it is used automatically as saved FDA excerpts; no network call for those drugs.
- Do NOT paste the old "FDA fallback" snippet into rag.py: side-effect loading moved to services/side_effects.py and the snippet would break rag.py.
- UI text no longer claims DrugBank, PubMed or Graph Neural Networks (Home, How It Works, About, login panel).
- Team roles on the About page are unchanged: please confirm them.
