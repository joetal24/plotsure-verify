import { describe, it, expect } from "vitest";

describe("SearchContext utilities", () => {
  it("maps api response to search result shape", () => {
    const apiResponse = {
      id: "search-1",
      plot_reference: "VOL 312 FOL 4",
      location: "Kampala Central",
      owner: "Nakato Joyce",
      title_status: "CLEAN",
      encumbrances: [],
      transfer_count: 1,
      last_transfer_date: "2024-06-11",
      risk_level: "LOW" as const,
      price_min: 380000000,
      price_max: 445000000,
      land_type: "Freehold",
      plot_size: 30,
      plot_size_unit: "Square Metres",
      created_at: "2025-01-01T00:00:00Z",
      fraud_score: 0.1,
      fraud_risk_level: "LOW" as const,
      anomaly_flags: [],
    };

    const details = {
      searchMethod: "title" as const,
      volume: "312",
      folio: "4",
      district: "Kampala",
      landType: "Freehold" as const,
      plotSize: 30,
      plotSizeUnit: "Square Metres" as const,
    };

    const result = {
      id: apiResponse.id,
      plotRef: apiResponse.plot_reference,
      location: apiResponse.location,
      plotDetails: details,
      registeredOwner: apiResponse.owner,
      titleStatus: apiResponse.title_status as "CLEAN" | "ENCUMBERED",
      encumbrances: apiResponse.encumbrances,
      ownershipTransfers: apiResponse.transfer_count,
      lastTransferDate: apiResponse.last_transfer_date,
      estimatedPriceLow: apiResponse.price_min,
      estimatedPriceHigh: apiResponse.price_max,
      riskLevel: apiResponse.risk_level,
      fraudScore: apiResponse.fraud_score,
      fraudRiskLevel: apiResponse.fraud_risk_level,
      anomalyFlags: apiResponse.anomaly_flags,
      dateSearched: expect.any(String),
    };

    expect(result.riskLevel).toBe("LOW");
    expect(result.plotRef).toBe("VOL 312 FOL 4");
    expect(result.estimatedPriceLow).toBeLessThan(result.estimatedPriceHigh);
    expect(result.plotDetails.landType).toBe("Freehold");
  });

  it("handles cached results with isCached flag", () => {
    const cached = {
      id: "search-1",
      plot_reference: "VOL 312 FOL 4",
      location: "Kampala Central",
      owner: "Nakato Joyce",
      title_status: "CLEAN",
      encumbrances: [],
      transfer_count: 1,
      last_transfer_date: "2024-06-11",
      risk_level: "LOW" as const,
      price_min: 380000000,
      price_max: 445000000,
      land_type: "Freehold",
      plot_size: 30,
      plot_size_unit: "Square Metres",
      created_at: "2025-01-01T00:00:00Z",
      is_cached: true,
      is_stale: false,
    };

    expect(cached.is_cached).toBe(true);
    expect(cached.is_stale).toBe(false);
  });

  it("handles high-risk result with anomaly flags", () => {
    const highRisk = {
      id: "search-2",
      plot_reference: "Kampala/12/45",
      location: "Wakiso",
      owner: "Okello David",
      title_status: "ENCUMBERED",
      encumbrances: ["Existing mortgage with Centenary Bank"],
      transfer_count: 5,
      last_transfer_date: "2025-03-01",
      risk_level: "HIGH" as const,
      price_min: 100000000,
      price_max: 150000000,
      land_type: "Mailo",
      plot_size: 2,
      plot_size_unit: "Acres",
      created_at: "2025-06-01T00:00:00Z",
      fraud_score: 0.85,
      fraud_risk_level: "HIGH" as const,
      anomaly_flags: ["high_transfer_count", "asking_price_extremely_high"],
    };

    expect(highRisk.risk_level).toBe("HIGH");
    expect(highRisk.anomaly_flags).toContain("high_transfer_count");
    expect(highRisk.encumbrances.length).toBeGreaterThan(0);
  });
});
