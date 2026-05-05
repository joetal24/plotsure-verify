import React, { createContext, useContext, useState, ReactNode } from "react";
import {
  verifyPlot,
  getVerification,
  getSearchHistory,
  type VerifyRequest,
  type VerifyResponse,
  type SearchHistoryItem,
} from "@/lib/api";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

// Re-export types used by components
export type LandType = "Freehold" | "Leasehold" | "Mailo";
export type SearchMethod = "title" | "parcel";

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
}

// SearchResult maps to the API VerifyResponse with frontend-friendly fields
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
  riskLevel: RiskLevel;
  fraudScore?: number;
  fraudRiskLevel?: RiskLevel;
  anomalyFlags?: string[];
  dateSearched: string;
  isCached?: boolean;
  isStale?: boolean;
}

function buildDevDummySearches(): SearchResult[] {
  const today = new Date();
  const fmt = (offsetDays: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - offsetDays);
    return d.toLocaleDateString("en-GB");
  };

  return [
    {
      id: "demo-search-1",
      plotRef: "VOL 312 FOL 4",
      location: "Kampala Central",
      plotDetails: {
        searchMethod: "title",
        volume: "312",
        folio: "4",
        landType: "Freehold",
        plotSize: 30,
        plotSizeUnit: "Decimals",
      },
      registeredOwner: "Nakato Joyce Namukasa",
      titleStatus: "CLEAN",
      encumbrances: [],
      ownershipTransfers: 1,
      lastTransferDate: "2024-06-11",
      estimatedPriceLow: 380000000,
      estimatedPriceHigh: 445000000,
      riskLevel: "LOW",
      dateSearched: fmt(1),
    },
    {
      id: "demo-search-2",
      plotRef: "Wakiso/12/97",
      location: "Wakiso",
      plotDetails: {
        searchMethod: "parcel",
        county: "Busiro",
        district: "Wakiso",
        blockNumber: "12",
        plotNumber: "97",
        landType: "Mailo",
        plotSize: 50,
        plotSizeUnit: "Decimals",
      },
      registeredOwner: "Okello David Mukasa",
      titleStatus: "ENCUMBERED",
      encumbrances: ["Existing mortgage with Centenary Bank"],
      ownershipTransfers: 4,
      lastTransferDate: "2025-01-08",
      estimatedPriceLow: 465000000,
      estimatedPriceHigh: 575000000,
      riskLevel: "HIGH",
      dateSearched: fmt(4),
    },
    {
      id: "demo-search-3",
      plotRef: "VOL 128 FOL 19",
      location: "Mukono",
      plotDetails: {
        searchMethod: "title",
        volume: "128",
        folio: "19",
        landType: "Leasehold",
        plotSize: 1.5,
        plotSizeUnit: "Acres",
      },
      registeredOwner: "Auma Grace Nalubega",
      titleStatus: "CLEAN",
      encumbrances: [],
      ownershipTransfers: 2,
      lastTransferDate: "2024-02-27",
      estimatedPriceLow: 83000000,
      estimatedPriceHigh: 101000000,
      riskLevel: "MEDIUM",
      dateSearched: fmt(8),
    },
  ];
}

function apiResponseToResult(
  res: VerifyResponse,
  details: PlotDetails
): SearchResult {
  return {
    id: res.id,
    plotRef: res.plot_reference,
    location: res.location,
    plotDetails: details,
    registeredOwner: res.owner,
    titleStatus: res.title_status as "CLEAN" | "ENCUMBERED",
    encumbrances: res.encumbrances,
    ownershipTransfers: res.transfer_count,
    lastTransferDate: res.last_transfer_date,
    estimatedPriceLow: res.price_min,
    estimatedPriceHigh: res.price_max,
    riskLevel: res.risk_level,
    fraudScore: res.fraud_score,
    fraudRiskLevel: res.fraud_risk_level,
    anomalyFlags: res.anomaly_flags,
    dateSearched: new Date(res.created_at).toLocaleDateString("en-GB"),
    isCached: res.is_cached,
    isStale: res.is_stale,
  };
}

interface SearchContextType {
  searches: SearchResult[];
  currentResult: SearchResult | null;
  loading: boolean;
  error: string | null;
  addSearch: (details: PlotDetails) => Promise<SearchResult>;
  setCurrentResult: (r: SearchResult | null) => void;
  getResultById: (id: string) => SearchResult | undefined;
  fetchHistory: () => Promise<void>;
}

const SearchContext = createContext<SearchContextType | null>(null);

export const useSearch = () => {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error("useSearch must be used within SearchProvider");
  return ctx;
};

export const SearchProvider = ({ children }: { children: ReactNode }) => {
  const [searches, setSearches] = useState<SearchResult[]>([]);
  const [currentResult, setCurrentResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addSearch = async (details: PlotDetails): Promise<SearchResult> => {
    setLoading(true);
    setError(null);

    try {
      const apiRequest: VerifyRequest = {
        search_method: details.searchMethod,
        volume: details.volume,
        folio: details.folio,
        county: details.county,
        district: details.district,
        block_number: details.blockNumber,
        plot_number: details.plotNumber,
        land_type: details.landType,
        plot_size: details.plotSize,
        plot_size_unit: details.plotSizeUnit,
        asking_price: details.askingPrice,
      };

      const res = await verifyPlot(apiRequest);
      const result = apiResponseToResult(res, details);
      setSearches((prev) => [result, ...prev]);
      setCurrentResult(result);
      return result;
    } catch (err: any) {
      const msg = err.message || "Verification failed";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getResultById = (id: string) => searches.find((s) => s.id === id);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const history = await getSearchHistory();
      const results: SearchResult[] = history.map((item) => ({
        id: item.id,
        plotRef: item.plot_reference,
        location: item.location,
        plotDetails: {} as PlotDetails,
        registeredOwner: "",
        titleStatus: "CLEAN" as const,
        encumbrances: [],
        ownershipTransfers: 0,
        lastTransferDate: "",
        estimatedPriceLow: item.price_min,
        estimatedPriceHigh: item.price_max,
        riskLevel: item.risk_level,
        dateSearched: new Date(item.created_at).toLocaleDateString("en-GB"),
      }));

      if (import.meta.env.DEV && results.length === 0) {
        setSearches(buildDevDummySearches());
        return;
      }

      setSearches(results);
    } catch (err: any) {
      setError(err.message || "Failed to load history");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SearchContext.Provider
      value={{
        searches,
        currentResult,
        loading,
        error,
        addSearch,
        setCurrentResult,
        getResultById,
        fetchHistory,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
};
