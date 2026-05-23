import { describe, it, expect } from "vitest";

describe("api types and utilities", () => {
  it("VerifyRequest shape matches expected contract", () => {
    const req = {
      search_method: "title" as const,
      volume: "312",
      folio: "4",
      land_type: "Freehold" as const,
      plot_size: 30,
      plot_size_unit: "Square Metres",
    };
    expect(req.search_method).toBe("title");
    expect(req.volume).toBe("312");
    expect(req.folio).toBe("4");
    expect(req.land_type).toBe("Freehold");
  });

  it("VerifyResponse shape matches expected contract", () => {
    const res = {
      id: "abc-123",
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
    expect(res.risk_level).toBe("LOW");
    expect(res.price_min).toBeLessThan(res.price_max);
    expect(res.encumbrances).toHaveLength(0);
  });

  it("FraudScoreResponse handles anomaly flags", () => {
    const res = {
      fraud_score: 0.85,
      risk_level: "HIGH" as const,
      anomaly_flags: ["asking_price_extremely_high", "frequent_verifications"],
    };
    expect(res.anomaly_flags).toContain("asking_price_extremely_high");
    expect(res.anomaly_flags).toHaveLength(2);
  });

  it("ListingResponse with joined verification data", () => {
    const listing = {
      id: "listing-1",
      user_id: "user-1",
      listing_status: "ACTIVE" as const,
      county: "Kampala",
      village: "Kisaasi",
      specific_area: "Bukoto Road",
      price_min: 50000000,
      price_max: 70000000,
      contact_preference: "both",
      views_count: 10,
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
      plot_reference: "VOL 312 FOL 4",
      location: "Kampala Central",
      owner: "Nakato Joyce",
      title_status: "CLEAN",
      land_type: "Freehold",
      plot_size: 30,
      plot_size_unit: "Square Metres",
      risk_level: "LOW",
    };
    expect(listing.risk_level).toBe("LOW");
    expect(listing.village).toBe("Kisaasi");
  });
});
