import React, { createContext, useContext, useState, ReactNode } from "react";

export type LandType = "Freehold" | "Leasehold" | "Mailo";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type LandCover = "Urban" | "Peri-Urban" | "Rural";
export type SearchMethod = "title" | "parcel";
export type Purpose = "Buying" | "Collateral Assessment" | "Investment Due Diligence";

export interface PlotDetails {
  searchMethod: SearchMethod;
  volume?: string;
  folio?: string;
  county?: string;
  district?: string;
  blockNumber?: string;
  plotNumber?: string;
  landType: LandType;
  plotSize: number;
  plotSizeUnit: "Decimals" | "Acres" | "Square Metres";
  askingPrice?: number;
  purpose: Purpose;
}

export interface GISFeatures {
  roadProximity: number;
  buildingDensity: number;
  landCover: LandCover;
  urbanRuralClassification: string;
}

export interface SearchResult {
  id: string;
  plotRef: string;
  location: string;
  plotDetails: PlotDetails;
  registeredOwner: string;
  titleStatus: "CLEAN" | "ENCUMBERED";
  encumbrances: string[];
  ownershipTransfers: number;
  lastTransferDate: string;
  estimatedPriceLow: number;
  estimatedPriceHigh: number;
  developmentPotential: number;
  gisFeatures: GISFeatures;
  riskLevel: RiskLevel;
  mlAnomalyScore: number;
  graphRiskScore: number;
  combinedRiskScore: number;
  fraudFlags: string[];
  stampDuty: number;
  totalTransactionCost: number;
  certificateHash: string;
  blockchainTxHash: string;
  certificateId: string;
  dateSearched: string;
  priceTrend: { month: string; price: number }[];
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomHex(len: number) {
  return Array.from({ length: len }, () => Math.floor(Math.random() * 16).toString(16)).join("");
}

function generateResult(details: PlotDetails): SearchResult {
  const plotRef = details.searchMethod === "title"
    ? `VOL ${details.volume} FOL ${details.folio}`
    : `${details.district}/${details.blockNumber}/${details.plotNumber}`;

  const locations = ["Kampala Central", "Nakawa Division", "Makindye", "Rubaga", "Kawempe", "Entebbe", "Wakiso"];
  const location = locations[randomInt(0, locations.length - 1)];

  const basePricePerDecimal = randomInt(8000000, 15000000);
  let sizeInDecimals = details.plotSize;
  if (details.plotSizeUnit === "Acres") sizeInDecimals = details.plotSize * 10;
  else if (details.plotSizeUnit === "Square Metres") sizeInDecimals = details.plotSize / 405;

  const landCoverOptions: LandCover[] = ["Urban", "Peri-Urban", "Rural"];
  const weights = [0.6, 0.3, 0.1];
  const r = Math.random();
  const landCover = r < weights[0] ? "Urban" : r < weights[0] + weights[1] ? "Peri-Urban" : "Rural";

  const multiplier = landCover === "Urban" ? 1.2 : landCover === "Peri-Urban" ? 0.9 : 0.6;
  const basePrice = Math.round(basePricePerDecimal * sizeInDecimals * multiplier);
  const variance = 0.15;
  const estimatedPriceLow = Math.round(basePrice * (1 - variance));
  const estimatedPriceHigh = Math.round(basePrice * (1 + variance));
  const midPrice = Math.round((estimatedPriceLow + estimatedPriceHigh) / 2);

  let riskLevel: RiskLevel = "LOW";
  let fraudFlags: string[] = [];
  let mlScore = randomInt(5, 30);
  let graphScore = randomInt(5, 35);

  if (details.askingPrice) {
    const ratio = details.askingPrice / midPrice;
    if (ratio > 1.3) {
      riskLevel = "HIGH";
      mlScore = randomInt(60, 90);
      graphScore = randomInt(55, 85);
      fraudFlags = [
        "Plot changed ownership 3 times within 8 months",
        "Broker node linked to 2 previously disputed plots",
        "Active mortgage detected — not disclosed by current seller",
        "ML anomaly score exceeds threshold for abnormal transfer frequency",
      ];
    } else if (ratio > 1.1) {
      riskLevel = "MEDIUM";
      mlScore = randomInt(35, 55);
      graphScore = randomInt(30, 50);
      fraudFlags = ["Ownership transferred twice in 14 months"];
    }
  }

  if (riskLevel === "LOW" && Math.random() < 0.2) {
    riskLevel = "HIGH";
    mlScore = randomInt(55, 85);
    graphScore = randomInt(50, 80);
    fraudFlags = [
      "Plot changed ownership 3 times within 8 months",
      "Broker node linked to 2 previously disputed plots",
      "Active mortgage detected — not disclosed by current seller",
    ];
  }

  if (riskLevel === "LOW") {
    fraudFlags = ["No fraud indicators detected. Ownership history appears clean."];
  }

  const combinedRiskScore = Math.round((mlScore + graphScore) / 2);
  const stampDutyRate = details.landType === "Mailo" ? 0.01 : 0.015;
  const stampDuty = Math.round(midPrice * stampDutyRate);
  const totalTransactionCost = stampDuty + 10000 + 10000 + 10000 + 250000;

  const owners = ["Nakato Joyce Namukasa", "Okello David Mukasa", "Auma Grace Nalubega", "Ssemwogerere John"];
  const titleStatus: "CLEAN" | "ENCUMBERED" = riskLevel === "HIGH" && Math.random() > 0.5 ? "ENCUMBERED" : "CLEAN";

  const baseTrend = midPrice / sizeInDecimals;
  const priceTrend = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar"].map((month, i) => ({
    month,
    price: Math.round(baseTrend * (0.9 + i * 0.02 + Math.random() * 0.05)),
  }));

  return {
    id: crypto.randomUUID(),
    plotRef,
    location,
    plotDetails: details,
    registeredOwner: owners[randomInt(0, owners.length - 1)],
    titleStatus,
    encumbrances: titleStatus === "ENCUMBERED" ? ["Existing mortgage with Centenary Bank"] : [],
    ownershipTransfers: randomInt(1, 4),
    lastTransferDate: `${randomInt(1, 28)} ${["January","February","March","April","May","June"][randomInt(0,5)]} ${randomInt(2020, 2025)}`,
    estimatedPriceLow,
    estimatedPriceHigh,
    developmentPotential: randomInt(45, 92),
    gisFeatures: {
      roadProximity: randomInt(55, 95),
      buildingDensity: randomInt(40, 90),
      landCover,
      urbanRuralClassification: landCover === "Urban" ? "Urban Core" : landCover === "Peri-Urban" ? "Suburban Transition" : "Rural Hinterland",
    },
    riskLevel,
    mlAnomalyScore: mlScore,
    graphRiskScore: graphScore,
    combinedRiskScore,
    fraudFlags,
    stampDuty,
    totalTransactionCost,
    certificateHash: randomHex(64),
    blockchainTxHash: "0x" + randomHex(64),
    certificateId: `PLT-2026-${randomInt(100000, 999999)}`,
    dateSearched: new Date().toLocaleDateString("en-GB"),
    priceTrend,
  };
}

// Pre-populated mock data
const initialSearches: SearchResult[] = [
  generateResult({ searchMethod: "title", volume: "312", folio: "4", landType: "Freehold", plotSize: 5, plotSizeUnit: "Decimals", purpose: "Buying" }),
  generateResult({ searchMethod: "title", volume: "198", folio: "12", landType: "Mailo", plotSize: 2, plotSizeUnit: "Acres", askingPrice: 180000000, purpose: "Investment Due Diligence" }),
  generateResult({ searchMethod: "parcel", district: "Wakiso", county: "Busiro", blockNumber: "45", plotNumber: "231", landType: "Leasehold", plotSize: 10, plotSizeUnit: "Decimals", purpose: "Collateral Assessment" }),
  generateResult({ searchMethod: "title", volume: "450", folio: "7", landType: "Freehold", plotSize: 3, plotSizeUnit: "Decimals", askingPrice: 500000000, purpose: "Buying" }),
];

interface SearchContextType {
  searches: SearchResult[];
  currentResult: SearchResult | null;
  addSearch: (details: PlotDetails) => SearchResult;
  setCurrentResult: (r: SearchResult | null) => void;
  getResultById: (id: string) => SearchResult | undefined;
}

const SearchContext = createContext<SearchContextType | null>(null);

export const useSearch = () => {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error("useSearch must be used within SearchProvider");
  return ctx;
};

export const SearchProvider = ({ children }: { children: ReactNode }) => {
  const [searches, setSearches] = useState<SearchResult[]>(initialSearches);
  const [currentResult, setCurrentResult] = useState<SearchResult | null>(null);

  const addSearch = (details: PlotDetails) => {
    const result = generateResult(details);
    setSearches(prev => [result, ...prev]);
    setCurrentResult(result);
    return result;
  };

  const getResultById = (id: string) => searches.find(s => s.id === id);

  return (
    <SearchContext.Provider value={{ searches, currentResult, addSearch, setCurrentResult, getResultById }}>
      {children}
    </SearchContext.Provider>
  );
};
