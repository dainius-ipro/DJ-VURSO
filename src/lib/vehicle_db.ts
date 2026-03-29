// ═══════════════════════════════════════════
// VURSO — Vehicle Makes & Models Database
// European market focus + popular imports
// ═══════════════════════════════════════════

export interface VehicleMakeModels {
  make: string;
  models: string[];
}

export const VEHICLE_DB: VehicleMakeModels[] = [
  { make: "Abarth", models: ["500", "595", "695", "Punto"] },
  { make: "Alfa Romeo", models: ["Giulia", "Stelvio", "Giulietta", "MiTo", "159", "156", "147", "Tonale", "4C"] },
  { make: "Audi", models: ["A1", "A3", "A4", "A5", "A6", "A7", "A8", "Q2", "Q3", "Q5", "Q7", "Q8", "TT", "RS3", "RS4", "RS5", "RS6", "RS7", "S3", "S4", "S5", "S6", "e-tron", "e-tron GT", "Q4 e-tron"] },
  { make: "BMW", models: ["1 Series", "2 Series", "3 Series", "4 Series", "5 Series", "6 Series", "7 Series", "8 Series", "X1", "X2", "X3", "X4", "X5", "X6", "X7", "Z4", "M2", "M3", "M4", "M5", "M8", "iX", "iX3", "i3", "i4", "i7"] },
  { make: "Chevrolet", models: ["Aveo", "Cruze", "Captiva", "Orlando", "Spark", "Trax", "Camaro", "Corvette"] },
  { make: "Chrysler", models: ["300C", "Pacifica", "Voyager", "PT Cruiser"] },
  { make: "Citroën", models: ["C1", "C3", "C3 Aircross", "C4", "C4 Cactus", "C5", "C5 Aircross", "C5 X", "Berlingo", "SpaceTourer", "DS3", "DS4", "DS5", "Jumpy", "Jumper"] },
  { make: "Cupra", models: ["Ateca", "Born", "Formentor", "Leon", "Tavascan"] },
  { make: "Dacia", models: ["Duster", "Logan", "Sandero", "Spring", "Jogger", "Lodgy", "Dokker"] },
  { make: "Daewoo", models: ["Lanos", "Matiz", "Nubira", "Leganza", "Kalos", "Tacuma"] },
  { make: "DS", models: ["DS3", "DS4", "DS5", "DS7", "DS9"] },
  { make: "Dodge", models: ["Charger", "Challenger", "Durango", "Ram", "Nitro", "Journey", "Caliber"] },
  { make: "Fiat", models: ["500", "500X", "500L", "500e", "Panda", "Tipo", "Punto", "Bravo", "Doblo", "Ducato", "Fiorino", "Qubo", "Stilo", "Linea"] },
  { make: "Ford", models: ["Fiesta", "Focus", "Mondeo", "Kuga", "Puma", "EcoSport", "Explorer", "Mustang", "Ranger", "Transit", "Transit Connect", "Transit Custom", "Galaxy", "S-MAX", "C-MAX", "B-MAX", "Ka", "Maverick", "Tourneo"] },
  { make: "Honda", models: ["Civic", "Accord", "CR-V", "HR-V", "Jazz", "e", "ZR-V", "CR-Z", "Insight", "Legend", "FR-V"] },
  { make: "Hyundai", models: ["i10", "i20", "i30", "i40", "Tucson", "Santa Fe", "Kona", "Ioniq", "Ioniq 5", "Ioniq 6", "Bayon", "ix20", "ix35", "ix55", "Accent", "Elantra", "Sonata", "Veloster", "Genesis"] },
  { make: "Infiniti", models: ["Q30", "Q50", "Q60", "Q70", "QX30", "QX50", "QX70", "FX"] },
  { make: "Iveco", models: ["Daily"] },
  { make: "Jaguar", models: ["XE", "XF", "XJ", "F-Pace", "E-Pace", "I-Pace", "F-Type", "X-Type", "S-Type"] },
  { make: "Jeep", models: ["Renegade", "Compass", "Cherokee", "Grand Cherokee", "Wrangler", "Gladiator", "Avenger"] },
  { make: "Kia", models: ["Picanto", "Rio", "Ceed", "ProCeed", "Sportage", "Sorento", "Niro", "EV6", "EV9", "Stonic", "XCeed", "Stinger", "Soul", "Optima", "Venga", "Carens"] },
  { make: "Lancia", models: ["Ypsilon", "Delta", "Musa", "Phedra"] },
  { make: "Land Rover", models: ["Defender", "Discovery", "Discovery Sport", "Range Rover", "Range Rover Sport", "Range Rover Evoque", "Range Rover Velar", "Freelander"] },
  { make: "Lexus", models: ["CT", "IS", "ES", "GS", "LS", "NX", "RX", "UX", "LC", "LX", "RC", "RZ"] },
  { make: "Mazda", models: ["2", "3", "6", "CX-3", "CX-30", "CX-5", "CX-60", "MX-5", "MX-30", "5", "MPV", "RX-8"] },
  { make: "Mercedes-Benz", models: ["A-Class", "B-Class", "C-Class", "CLA", "CLS", "E-Class", "S-Class", "GLA", "GLB", "GLC", "GLE", "GLS", "G-Class", "EQA", "EQB", "EQC", "EQE", "EQS", "AMG GT", "SL", "SLK", "CLK", "ML", "GL", "Vito", "Sprinter", "V-Class"] },
  { make: "MG", models: ["ZS", "HS", "MG4", "MG5", "Marvel R"] },
  { make: "Mini", models: ["Cooper", "Countryman", "Clubman", "Paceman", "Cabrio", "Electric"] },
  { make: "Mitsubishi", models: ["ASX", "Eclipse Cross", "Outlander", "L200", "Space Star", "Pajero", "Lancer", "Colt", "Galant", "Carisma"] },
  { make: "Nissan", models: ["Micra", "Note", "Juke", "Qashqai", "X-Trail", "Leaf", "Ariya", "Navara", "Pathfinder", "Murano", "Pulsar", "Primera", "Almera", "Tiida", "370Z", "GT-R"] },
  { make: "Opel", models: ["Corsa", "Astra", "Insignia", "Mokka", "Crossland", "Grandland", "Combo", "Vivaro", "Movano", "Zafira", "Meriva", "Adam", "Karl", "Vectra", "Omega", "Signum", "Cascada"] },
  { make: "Peugeot", models: ["108", "208", "308", "408", "508", "2008", "3008", "5008", "Rifter", "Partner", "Expert", "Boxer", "e-208", "e-2008", "e-308", "206", "207", "306", "307", "406", "407", "607", "806", "807", "1007", "4007", "4008", "RCZ"] },
  { make: "Porsche", models: ["911", "Cayenne", "Macan", "Panamera", "Taycan", "Boxster", "Cayman", "718"] },
  { make: "Renault", models: ["Clio", "Megane", "Captur", "Kadjar", "Koleos", "Scenic", "Talisman", "Twingo", "Zoe", "Kangoo", "Trafic", "Master", "Arkana", "Austral", "Espace", "Laguna", "Fluence", "Latitude", "Modus", "Wind"] },
  { make: "Saab", models: ["9-3", "9-5", "9-2X", "9-4X", "9-7X"] },
  { make: "SEAT", models: ["Ibiza", "Leon", "Arona", "Ateca", "Tarraco", "Alhambra", "Toledo", "Altea", "Mii", "Cordoba"] },
  { make: "Škoda", models: ["Fabia", "Octavia", "Superb", "Karoq", "Kodiaq", "Kamiq", "Enyaq", "Scala", "Citigo", "Rapid", "Roomster", "Yeti"] },
  { make: "Smart", models: ["ForTwo", "ForFour", "#1", "#3"] },
  { make: "SsangYong", models: ["Tivoli", "Korando", "Rexton", "Musso", "Rodius"] },
  { make: "Subaru", models: ["Impreza", "XV", "Forester", "Outback", "Legacy", "Levorg", "WRX", "BRZ", "Solterra"] },
  { make: "Suzuki", models: ["Swift", "Vitara", "S-Cross", "Ignis", "Jimny", "Across", "Swace", "Baleno", "Celerio", "SX4", "Alto", "Splash", "Kizashi", "Grand Vitara"] },
  { make: "Tesla", models: ["Model 3", "Model Y", "Model S", "Model X", "Cybertruck"] },
  { make: "Toyota", models: ["Yaris", "Yaris Cross", "Corolla", "Camry", "C-HR", "RAV4", "Highlander", "Land Cruiser", "Hilux", "Supra", "GR86", "Aygo", "Avensis", "Verso", "Prius", "Auris", "ProAce", "bZ4X", "Mirai"] },
  { make: "Volkswagen", models: ["Polo", "Golf", "Passat", "Tiguan", "T-Roc", "T-Cross", "Touareg", "Touran", "Arteon", "ID.3", "ID.4", "ID.5", "ID.7", "ID. Buzz", "Caddy", "Transporter", "Multivan", "Crafter", "Amarok", "Up!", "Jetta", "Scirocco", "Sharan", "Eos", "CC", "Beetle", "Bora", "Lupo"] },
  { make: "Volvo", models: ["S40", "S60", "S80", "S90", "V40", "V50", "V60", "V70", "V90", "XC40", "XC60", "XC70", "XC90", "C30", "C40", "C70", "EX30", "EX90"] },
  // ── Asian & Other ──
  { make: "BYD", models: ["Atto 3", "Han", "Tang", "Dolphin", "Seal"] },
  { make: "GWM", models: ["Ora 03", "WEY Coffee 01", "Haval Jolion", "Haval H6"] },
  { make: "Polestar", models: ["1", "2", "3", "4"] },
  { make: "Maserati", models: ["Ghibli", "Levante", "Quattroporte", "MC20", "Grecale", "GranTurismo"] },
  { make: "Ferrari", models: ["Roma", "Portofino", "F8 Tributo", "SF90", "296 GTB", "812", "Purosangue"] },
  { make: "Lamborghini", models: ["Huracán", "Urus", "Revuelto"] },
  { make: "Bentley", models: ["Continental GT", "Flying Spur", "Bentayga"] },
  { make: "Rolls-Royce", models: ["Ghost", "Phantom", "Cullinan", "Spectre", "Wraith", "Dawn"] },
  { make: "Aston Martin", models: ["DB11", "DB12", "Vantage", "DBX", "DBS"] },
  { make: "McLaren", models: ["720S", "750S", "Artura", "GT"] },
  { make: "Lotus", models: ["Eletre", "Emira", "Evija"] },
];

// ── Helpers ──

/** Get all make names sorted */
export function getAllMakes(): string[] {
  return VEHICLE_DB.map(v => v.make).sort();
}

/** Get models for a specific make */
export function getModelsForMake(make: string): string[] {
  const entry = VEHICLE_DB.find(v => v.make.toLowerCase() === make.toLowerCase());
  return entry?.models || [];
}

/** Search makes by prefix/contains */
export function searchMakes(query: string): string[] {
  const q = query.toLowerCase();
  return VEHICLE_DB
    .filter(v => v.make.toLowerCase().includes(q))
    .map(v => v.make)
    .sort((a, b) => {
      // Prioritize starts-with matches
      const aStarts = a.toLowerCase().startsWith(q) ? 0 : 1;
      const bStarts = b.toLowerCase().startsWith(q) ? 0 : 1;
      return aStarts - bStarts || a.localeCompare(b);
    });
}

/** Search models for a given make */
export function searchModels(make: string, query: string): string[] {
  const models = getModelsForMake(make);
  if (!query) return models;
  const q = query.toLowerCase();
  return models
    .filter(m => m.toLowerCase().includes(q))
    .sort((a, b) => {
      const aStarts = a.toLowerCase().startsWith(q) ? 0 : 1;
      const bStarts = b.toLowerCase().startsWith(q) ? 0 : 1;
      return aStarts - bStarts || a.localeCompare(b);
    });
}

/** Generate year range (current year down to 1970) */
export function getYearRange(): number[] {
  const currentYear = new Date().getFullYear() + 1; // +1 for next year models
  const years: number[] = [];
  for (let y = currentYear; y >= 1970; y--) years.push(y);
  return years;
}
