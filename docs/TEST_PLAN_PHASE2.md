# PlotSure Phase 2 Test Plan

## Overview
This document outlines the testing strategy for Phase 2 features: GIS/Map Integration, Enhanced Pricing, and Enhanced PDF Certificates.

---

## Test Environments

| Environment | URL | Purpose |
|-------------|-----|---------|
| Development | http://localhost:5173 | Local testing |
| Docker | http://localhost:8000 | Backend API |
| Codespaces | Auto-forwarded | Cloud development |

---

## Automation Tests

### Frontend Tests
```bash
npm run test        # Unit tests with Vitest
npm run lint       # ESLint code quality
npm run build      # Production build
```

### Backend Tests
```bash
cd backend
pytest            # Python tests with pytest
ruff check .       # Linting with Ruff
```

### Docker Tests
```bash
docker-compose up --build
docker exec plotsure-backend pytest
```

---

## Manual Browser Testing

### Pre-requisites
1. Docker containers running
2. Supabase project configured
3. User registered and logged in

---

## Test 1: Map Component

### Objective
Verify the interactive Uganda map loads and allows district selection

### Steps
1. Navigate to Land Search page
2. Verify map displays with Uganda centered
3. Click on different regions (Kampala, Wakiso, Jinja)
4. Verify district name appears in selected field
5. Zoom in/out with mouse wheel
6. Verify map zooms smoothly

### Expected Results
| Step | Pass Criteria |
|------|-------------|
| Map loads | Uganda visible on initial load |
| District click | Name appears in selection |
| Zoom | Map zooms without errors |

### Test Data
| Test Case | Region Clicked | Expected District |
|----------|--------------|------------------|
| 1 | Central Kampala | Kampala |
| 2 | Near Entebbe | Entebbe |
| 3 | Western Mbarara | Mbarara |
| 4 | Northern Gulu | Gulu |

---

## Test 2: Enhanced Price Calculation

### Objective
Verify pricing uses 2025-2026 district data with accurate estimates

### Steps
1. Select a district (e.g., Kampala)
2. Enter plot details (size: 1 decimal)
3. Submit verification
4. Note the displayed price
5. Repeat for different districts

### Expected Results
| District | Expected Price Range (1 decimal) |
|----------|-------------------------------|
| Kampala Central | UGX 13-18M |
| Wakiso | UGX 7-9M |
| Jinja | UGX 3-4M |
| Gulu | UGX 1.8-2.5M |

### Verification
- Price should be within ±15% of estimated
- Annual growth rate should display
- Category (prime/high/medium/low) should show

---

## Test 3: Enhanced PDF Certificate

### Objective
Verify certificate includes QR code, price breakdown, and risk explanation

### Steps
1. Perform a plot verification
2. Click "Generate Certificate"
3. Download the PDF
4. Open and verify contents

### Expected Results
| Section | Pass Criteria |
|--------|------------|
| QR Code | Present and scannable |
| Certificate ID | Matches generated ID |
| Price Breakdown | Shows base price, size, growth % |
| Estimated Value | Within calculated range |
| Risk Assessment | Level + explanation |
| Tamper Evidence | SHA-256 hash present |

### QR Code Verification
1. Scan QR code with phone camera
2. Should navigate to verification URL
3. Should display certificate validity

---

## Test 4: Risk Assessment

### Objective
Verify risk levels are calculated correctly

### Test Cases
| Scenario | Transfer Count | Encumbrances | Expected Risk |
|----------|---------------|--------------|---------------|
| Clean title | 0 | None | LOW |
| Recent transfer | 1 | None | MEDIUM |
| Multiple transfers | 3 | None | HIGH |
| With encumbrance | 0 | Mortgage | HIGH |

---

## Test 5: End-to-End Flow

### Complete Test Scenario
1. Register new user
2. Navigate to land search
3. Use map to select "Wakiso" district
4. Enter plot details (block 001, plot 123, 1 decimal)
5. Click verify
6. View results (price, risk level)
7. Generate certificate
8. Download and verify PDF
9. Use QR code to verify authenticity

### Expected Timeline
- Total time: ~3 minutes
- All steps should complete without errors

---

## Bug Reporting

### Template
```
**Title**: [Brief description]

**Environment**: 
- Browser: 
- OS:

**Steps to Reproduce**:
1. 
2. 

**Expected**:
**Actual**:

**Screenshot**:
```

---

## Performance Benchmarks

| Metric | Target | Threshold |
|--------|--------|----------|
| Map load time | < 2s | < 5s |
| Verification API | < 3s | < 10s |
| PDF generation | < 5s | < 15s |
| Page navigation | < 1s | < 3s |

---

## Sign-off

| Role | Name | Date | Status |
|------|------|------|--------|
| QA | | | |
| Developer | | | |
| Product | | | |