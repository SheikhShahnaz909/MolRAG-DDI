"""
Drug-name matching helpers shared by the side-effects builder script and the
live side-effect lookup. Pure Python (no heavy imports).

match_key("PARACETAMOL") == match_key("ACETAMINOPHEN") == "ACETAMINOPHEN"
match_key("WARFARIN SODIUM") == "WARFARIN"
"""
import re

SALT_WORDS = {
    "HYDROCHLORIDE", "DIHYDROCHLORIDE", "HCL", "HYDROBROMIDE", "BROMIDE", "CHLORIDE", "SODIUM", "DISODIUM",
    "POTASSIUM", "CALCIUM", "MAGNESIUM", "SULFATE", "SULPHATE", "BISULFATE", "ACETATE", "DIACETATE",
    "MALEATE", "FUMARATE", "HEMIFUMARATE", "TARTRATE", "BITARTRATE", "BESYLATE", "BESILATE", "MESYLATE",
    "MESILATE", "SUCCINATE", "CITRATE", "PHOSPHATE", "NITRATE", "PROPIONATE", "DIPROPIONATE", "VALERATE",
    "MONOHYDRATE", "DIHYDRATE", "TRIHYDRATE", "HYDRATE", "ANHYDROUS", "PROXETIL", "AXETIL", "MEDOXOMIL",
    "TROMETHAMINE", "LACTATE", "GLUCONATE", "STEARATE", "PALMITATE", "DECANOATE", "ENANTHATE",
    "CIPIONATE", "FUROATE", "ETABONATE", "TOSYLATE", "OXALATE", "HYDROXIDE", "BENZOATE",
}
# Inorganic cations are the drug itself, so never strip around them.
CATION_CORES = {"SODIUM", "POTASSIUM", "CALCIUM", "MAGNESIUM", "ZINC", "IRON", "FERROUS", "FERRIC",
                "LITHIUM", "ALUMINIUM", "ALUMINUM", "COPPER", "MANGANESE"}

# Different names for the same drug (INN / USAN / British / Indian spellings).
# Values are the US (USAN) names, which is what US sources such as FDA labels use.
SYNONYMS = {
    "PARACETAMOL": "ACETAMINOPHEN", "SALBUTAMOL": "ALBUTEROL", "AMOXYCILLIN": "AMOXICILLIN",
    "CEFALEXIN": "CEPHALEXIN", "PETHIDINE": "MEPERIDINE", "MESALAZINE": "MESALAMINE",
    "RIFAMPICIN": "RIFAMPIN", "SUXAMETHONIUM": "SUCCINYLCHOLINE", "ADRENALINE": "EPINEPHRINE",
    "NORADRENALINE": "NOREPINEPHRINE", "FRUSEMIDE": "FUROSEMIDE", "LIGNOCAINE": "LIDOCAINE",
    "GLIBENCLAMIDE": "GLYBURIDE", "GLYCERYL TRINITRATE": "NITROGLYCERIN", "CICLOSPORIN": "CYCLOSPORINE",
    "CHLORPHENAMINE": "CHLORPHENIRAMINE", "CLOMIFENE": "CLOMIPHENE", "BECLOMETHASONE": "BECLOMETASONE",
    "ISOPRENALINE": "ISOPROTERENOL", "HYOSCINE": "SCOPOLAMINE", "DICYCLOVERINE": "DICYCLOMINE",
    "THYROXINE": "LEVOTHYROXINE", "ASPIRIN": "ACETYLSALICYLIC ACID", "GLYCOPYRRONIUM": "GLYCOPYRROLATE",
    "CROMOGLICATE": "CROMOLYN", "CHLORTALIDONE": "CHLORTHALIDONE", "ORCIPRENALINE": "METAPROTERENOL",
    "METAMIZOLE": "DIPYRONE", "BENZHEXOL": "TRIHEXYPHENIDYL", "PHENOBARBITONE": "PHENOBARBITAL",
    "L-CARNITINE": "LEVOCARNITINE", "CALCIPOTRIOL": "CALCIPOTRIENE", "LEVOSALBUTAMOL": "LEVALBUTEROL",
    "MECLOZINE": "MECLIZINE", "LEVO-CARNITINE": "LEVOCARNITINE", "PROPYL THIOURACIL": "PROPYLTHIOURACIL",
}


def match_key(name: str) -> str:
    x = re.sub(r"\s+", " ", str(name).upper().replace("SULPH", "SULF")).strip()
    x = SYNONYMS.get(x, x)
    tokens = x.split(" ")
    if tokens[0] not in CATION_CORES:
        while len(tokens) > 1 and tokens[-1] in SALT_WORDS:
            tokens.pop()
    core = " ".join(tokens)
    return SYNONYMS.get(core, core)


def label_search_names(name: str) -> list:
    """Names worth searching for in a US source, best first: the normalized
    (USAN) name, then the name as given."""
    key = match_key(name)
    given = re.sub(r"\s+", " ", str(name).upper()).strip()
    return [key] + ([given] if given != key else [])


def search_terms(name: str) -> list:
    """Lower-case words a text might use for this drug: its normalized (USAN) name, the name as
    given, and the other spellings from SYNONYMS (e.g. ACETYLSALICYLIC ACID -> aspirin).
    Only terms of 4+ letters, so a short abbreviation can't match by accident."""
    key = match_key(name)
    given = re.sub(r"\s+", " ", str(name).upper()).strip()
    terms = {key, given}
    for variant, usan in SYNONYMS.items():
        if usan in (key, given) or variant in (key, given):
            terms.update({variant, usan})
    return sorted({t.lower() for t in terms if len(t) >= 4})