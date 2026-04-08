const fs = require('fs');
const path = require('path');

// Years: 2021-2033
const years = [2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033];

// Geographies with their region grouping
const regions = {
  "North America": ["U.S.", "Canada"],
  "Europe": ["U.K.", "Germany", "Italy", "France", "Spain", "Russia", "Rest of Europe"],
  "Asia Pacific": ["China", "India", "Japan", "South Korea", "ASEAN", "Australia", "Rest of Asia Pacific"],
  "Latin America": ["Brazil", "Argentina", "Mexico", "Rest of Latin America"],
  "Middle East & Africa": ["GCC", "South Africa", "Rest of Middle East & Africa"]
};

// Hierarchical "By Offering" tree — leaves carry shares (must sum to ~1.0 across all leaves in this segType)
const byOfferingTree = {
  "Software": {
    "Integrated Software Platforms": {
      "End-to-End Dealership Management Suites": 0.14,
      "Unified Front-Office + Back-Office Platforms": 0.10
    },
    "Standalone Software Platforms": {
      "Modular / Point Solutions": 0.07
    },
    "Core Functional Modules": {
      "Vehicle Inventory Management": 0.07,
      "Sales Management & Deal Structuring": 0.07,
      "Finance, Accounting & Insurance (F&I) Systems": 0.07,
      "Title & Registration Automation": 0.04
    },
    "Digital & Advanced Capabilities": {
      "Digital Retailing & Online Car Buying Platforms": 0.07,
      "Advanced Analytics & Business Intelligence": 0.05,
      "AI-Based Pricing & Demand Forecasting": 0.04
    },
    "Customer & Revenue Growth Tools": {
      "Marketing Automation & Lead Management": 0.05,
      "Trade-In, Appraisal & Valuation Tools": 0.03,
      "Customer Engagement & Loyalty Platforms": 0.04
    },
    "Others (Document Management, E-Signature & Contract Automation, etc.)": 0.02
  },
  "Services": {
    "Implementation & System Integration": 0.06,
    "Training & Support": 0.04,
    "Managed Services and Hosted Operations": 0.04
  }
};

// Growth multipliers for By Offering leaves (relative to regional CAGR)
const byOfferingGrowth = {
  "End-to-End Dealership Management Suites": 1.05,
  "Unified Front-Office + Back-Office Platforms": 1.08,
  "Modular / Point Solutions": 0.92,
  "Vehicle Inventory Management": 1.00,
  "Sales Management & Deal Structuring": 1.02,
  "Finance, Accounting & Insurance (F&I) Systems": 0.98,
  "Title & Registration Automation": 1.10,
  "Digital Retailing & Online Car Buying Platforms": 1.22,
  "Advanced Analytics & Business Intelligence": 1.18,
  "AI-Based Pricing & Demand Forecasting": 1.30,
  "Marketing Automation & Lead Management": 1.15,
  "Trade-In, Appraisal & Valuation Tools": 1.08,
  "Customer Engagement & Loyalty Platforms": 1.12,
  "Others (Document Management, E-Signature & Contract Automation, etc.)": 1.05,
  "Implementation & System Integration": 0.95,
  "Training & Support": 0.90,
  "Managed Services and Hosted Operations": 1.10
};

// Other (flat) segment types
const segmentTypes = {
  "By Functionality": {
    "Sales & CRM Management": 0.24,
    "Inventory Management": 0.18,
    "Finance & Insurance (F&I)": 0.17,
    "Service & Parts Management": 0.16,
    "Accounting & Compliance": 0.13,
    "Analytics & Reporting": 0.12
  },
  "By Deployment Model": {
    "Cloud-based (SaaS)": 0.62,
    "On-premise": 0.22,
    "Hybrid": 0.16
  },
  "By Business Size": {
    "Small Dealerships (Single Location)": 0.28,
    "Mid-size Dealerships (2–5 Locations)": 0.37,
    "Large Dealer Groups (6+ Locations)": 0.35
  },
  "By Vehicle Type": {
    "Passenger Vehicles": 0.68,
    "Light Commercial Vehicles (LCV)": 0.22,
    "Heavy Commercial Vehicles (HCV)": 0.10
  }
};

// Regional base values (USD Million) for 2021 - global Automotive DMS market ~$8B in 2021
const regionBaseValues = {
  "North America": 3000,
  "Europe": 2200,
  "Asia Pacific": 1800,
  "Latin America": 600,
  "Middle East & Africa": 400
};

// Country share within region
const countryShares = {
  "North America": { "U.S.": 0.85, "Canada": 0.15 },
  "Europe": { "U.K.": 0.20, "Germany": 0.24, "Italy": 0.12, "France": 0.16, "Spain": 0.10, "Russia": 0.06, "Rest of Europe": 0.12 },
  "Asia Pacific": { "China": 0.30, "India": 0.14, "Japan": 0.22, "South Korea": 0.10, "ASEAN": 0.12, "Australia": 0.07, "Rest of Asia Pacific": 0.05 },
  "Latin America": { "Brazil": 0.42, "Argentina": 0.14, "Mexico": 0.30, "Rest of Latin America": 0.14 },
  "Middle East & Africa": { "GCC": 0.48, "South Africa": 0.22, "Rest of Middle East & Africa": 0.30 }
};

// Growth rates (CAGR) per region
const regionGrowthRates = {
  "North America": 0.085,
  "Europe": 0.082,
  "Asia Pacific": 0.115,
  "Latin America": 0.095,
  "Middle East & Africa": 0.090
};

// Segment-specific growth multipliers for flat segments
const segmentGrowthMultipliers = {
  "By Functionality": {
    "Sales & CRM Management": 1.05,
    "Inventory Management": 0.98,
    "Finance & Insurance (F&I)": 1.00,
    "Service & Parts Management": 0.96,
    "Accounting & Compliance": 0.94,
    "Analytics & Reporting": 1.20
  },
  "By Deployment Model": {
    "Cloud-based (SaaS)": 1.18,
    "On-premise": 0.72,
    "Hybrid": 1.05
  },
  "By Business Size": {
    "Small Dealerships (Single Location)": 0.92,
    "Mid-size Dealerships (2–5 Locations)": 1.05,
    "Large Dealer Groups (6+ Locations)": 1.10
  },
  "By Vehicle Type": {
    "Passenger Vehicles": 1.00,
    "Light Commercial Vehicles (LCV)": 1.08,
    "Heavy Commercial Vehicles (HCV)": 1.04
  }
};

// Volume multiplier: dealership software seats/licenses per USD Million (~120 licenses per $1M)
const volumePerMillionUSD = 120;

// Seeded pseudo-random for reproducibility
let seed = 42;
function seededRandom() {
  seed = (seed * 16807 + 0) % 2147483647;
  return (seed - 1) / 2147483646;
}

function addNoise(value, noiseLevel = 0.03) {
  return value * (1 + (seededRandom() - 0.5) * 2 * noiseLevel);
}

function roundTo1(val) {
  return Math.round(val * 10) / 10;
}

function roundToInt(val) {
  return Math.round(val);
}

function generateTimeSeries(baseValue, growthRate, roundFn) {
  const series = {};
  for (let i = 0; i < years.length; i++) {
    const year = years[i];
    const rawValue = baseValue * Math.pow(1 + growthRate, i);
    series[year] = roundFn(addNoise(rawValue));
  }
  return series;
}

// Sum two year-series objects (mutates target)
function addSeries(target, src) {
  for (const k of Object.keys(src)) {
    if (/^\d{4}$/.test(k)) {
      target[k] = (target[k] || 0) + src[k];
    }
  }
}

function roundSeries(series, roundFn) {
  const out = {};
  for (const k of Object.keys(series)) out[k] = roundFn(series[k]);
  return out;
}

// Recursively build a nested By Offering data tree.
// Returns { tree: nested-with-aggregates, totalSeries: raw (unrounded) sum }
function buildOfferingNode(node, baseUnit, growth, roundFn) {
  // Leaf: numeric share
  if (typeof node === 'number') {
    const segBase = baseUnit * node;
    const series = {};
    for (let i = 0; i < years.length; i++) {
      const y = years[i];
      series[y] = addNoise(segBase * Math.pow(1 + growth, i));
    }
    return { tree: roundSeries(series, roundFn), totalSeries: series };
  }
  // Parent: object of children
  const tree = {};
  const total = {};
  for (const [childName, childNode] of Object.entries(node)) {
    let childGrowth = growth;
    if (typeof childNode === 'number') {
      const mult = byOfferingGrowth[childName];
      childGrowth = growth * (mult !== undefined ? mult : 1.0);
    }
    const built = buildOfferingNode(childNode, baseUnit, childGrowth, roundFn);
    tree[childName] = built.tree;
    addSeries(total, built.totalSeries);
  }
  // Attach parent aggregate year data alongside children
  const rounded = roundSeries(total, roundFn);
  for (const k of Object.keys(rounded)) tree[k] = rounded[k];
  return { tree, totalSeries: total };
}

function generateData(isVolume) {
  const data = {};
  const roundFn = isVolume ? roundToInt : roundTo1;
  const multiplier = isVolume ? volumePerMillionUSD : 1;

  for (const [regionName, countries] of Object.entries(regions)) {
    const regionBase = regionBaseValues[regionName] * multiplier;
    const regionGrowth = regionGrowthRates[regionName];

    // Region-level data
    data[regionName] = {};
    // Hierarchical By Offering
    data[regionName]["By Offering"] = buildOfferingNode(byOfferingTree, regionBase, regionGrowth, roundFn).tree;
    // Flat segments
    for (const [segType, segments] of Object.entries(segmentTypes)) {
      data[regionName][segType] = {};
      for (const [segName, share] of Object.entries(segments)) {
        const segGrowth = regionGrowth * segmentGrowthMultipliers[segType][segName];
        const segBase = regionBase * share;
        data[regionName][segType][segName] = generateTimeSeries(segBase, segGrowth, roundFn);
      }
    }

    // "By Country" for each region
    data[regionName]["By Country"] = {};
    for (const country of countries) {
      const cShare = countryShares[regionName][country];
      const countryGrowthVariation = 1 + (seededRandom() - 0.5) * 0.06;
      const countryBase = regionBase * cShare;
      const countryGrowth = regionGrowth * countryGrowthVariation;
      data[regionName]["By Country"][country] = generateTimeSeries(countryBase, countryGrowth, roundFn);
    }

    // Country-level data
    for (const country of countries) {
      const cShare = countryShares[regionName][country];
      const countryBase = regionBase * cShare;
      const countryGrowthVariation = 1 + (seededRandom() - 0.5) * 0.04;
      const countryGrowth = regionGrowth * countryGrowthVariation;

      data[country] = {};
      // Hierarchical By Offering for country (with slight share variation)
      data[country]["By Offering"] = buildOfferingNode(byOfferingTree, countryBase * (1 + (seededRandom() - 0.5) * 0.06), countryGrowth, roundFn).tree;
      for (const [segType, segments] of Object.entries(segmentTypes)) {
        data[country][segType] = {};
        for (const [segName, share] of Object.entries(segments)) {
          const segGrowth = countryGrowth * segmentGrowthMultipliers[segType][segName];
          const segBase = countryBase * share;
          const shareVariation = 1 + (seededRandom() - 0.5) * 0.1;
          data[country][segType][segName] = generateTimeSeries(segBase * shareVariation, segGrowth, roundFn);
        }
      }
    }
  }

  return data;
}

// Generate both datasets
seed = 42;
const valueData = generateData(false);
seed = 7777;
const volumeData = generateData(true);

// Build segmentation_analysis.json structure (Global view)
function buildStructureNode(node) {
  if (typeof node === 'number') return {};
  const out = {};
  for (const [k, v] of Object.entries(node)) out[k] = buildStructureNode(v);
  return out;
}
const globalStructure = { Global: {} };
globalStructure.Global["By Offering"] = buildStructureNode(byOfferingTree);
for (const [segType, segments] of Object.entries(segmentTypes)) {
  globalStructure.Global[segType] = {};
  for (const segName of Object.keys(segments)) {
    globalStructure.Global[segType][segName] = {};
  }
}
globalStructure.Global["By Region"] = {};
for (const [regionName, countries] of Object.entries(regions)) {
  globalStructure.Global["By Region"][regionName] = {};
  for (const country of countries) {
    globalStructure.Global["By Region"][regionName][country] = {};
  }
}

// Write files
const outDir = path.join(__dirname, 'public', 'data');
fs.writeFileSync(path.join(outDir, 'value.json'), JSON.stringify(valueData, null, 2));
fs.writeFileSync(path.join(outDir, 'volume.json'), JSON.stringify(volumeData, null, 2));
fs.writeFileSync(path.join(outDir, 'segmentation_analysis.json'), JSON.stringify(globalStructure, null, 2));

console.log('Generated value.json, volume.json, segmentation_analysis.json successfully');
console.log('Geographies:', Object.keys(valueData).length);
console.log('Segment types:', Object.keys(valueData['North America']));
