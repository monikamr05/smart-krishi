const cropProfiles = [
  { name: "Wheat", n: 80, p: 50, k: 40, reason: "High nitrogen and moderate phosphorus crop." },
  { name: "Rice", n: 70, p: 35, k: 35, reason: "Performs in medium-high nitrogen conditions." },
  { name: "Maize", n: 65, p: 45, k: 35, reason: "Balanced nutrient demand with good yield potential." },
  { name: "Millet", n: 45, p: 25, k: 25, reason: "Suited for lower input and dryland conditions." },
  { name: "Groundnut", n: 35, p: 45, k: 35, reason: "Prefers stronger phosphorus support." },
  { name: "Cotton", n: 55, p: 30, k: 60, reason: "Needs higher potassium for boll development." },
  { name: "Pigeon Pea", n: 40, p: 30, k: 30, reason: "Legume with moderate nutrient requirements." },
  { name: "Sugarcane", n: 90, p: 40, k: 55, reason: "Heavy feeder crop with higher nutrient demand." },
];

function predictCrops(n, p, k, topN = 3) {
  const predictions = cropProfiles
    .map((crop) => {
      const distance = Math.abs(crop.n - n) + Math.abs(crop.p - p) + Math.abs(crop.k - k);
      const confidence = Math.max(5, Math.min(99, 100 - Math.round(distance)));
      return {
        crop: crop.name,
        confidence,
        reason: crop.reason,
        targetNPK: { n: crop.n, p: crop.p, k: crop.k },
      };
    })
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, topN);

  return predictions;
}

module.exports = { predictCrops };
