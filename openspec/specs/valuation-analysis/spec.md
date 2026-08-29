# valuation-analysis Specification

## Purpose
Provides comprehensive intrinsic valuation calculations using Discounted Cash Flow (DCF), peer multiple triangulation, and a 5x5 WACC by terminal growth sensitivity matrix.

## Requirements

### Requirement: Company Intrinsic Valuation Triangulation
The system SHALL compute an intrinsic valuation for an equity ticker by combining a 5-year Discounted Free Cash Flow to Firm (FCFF) projection, peer multiple comparison (P/E, EV/EBITDA, EV/Sales), and dynamic WACC discounting based on current 10-year Treasury yields.

#### Scenario: User requests valuation or DCF for a valid ticker
- **WHEN** the user asks for "valuation of AAPL", "DCF for NVDA", "fair value of TSLA", or "合理價"
- **THEN** the system executes the valuation calculation, renders a `<CompanyValuationCard />` containing the blended fair value, implied upside/downside percentage, DCF bridge, peer multiple breakdown, and a 5×5 sensitivity matrix above the textual response.

#### Scenario: Ticker has missing beta or negative earnings
- **WHEN** the target ticker has negative LTM EBITDA or missing beta
- **THEN** the system uses sector benchmark defaults for beta and falls back to EV/Revenue and DCF rather than failing or returning invalid null values.

### Requirement: 5x5 WACC and Terminal Growth Sensitivity Matrix
The system SHALL render a 5×5 matrix evaluating implied share prices across WACC ranges ($\pm 1\%$ in $0.5\%$ increments) and terminal growth rates $g$ ($1.5\%$ to $3.5\%$ in $0.5\%$ increments).

#### Scenario: Viewing valuation sensitivity
- **WHEN** the valuation card is rendered
- **THEN** the base-case cell is visually highlighted, and each matrix cell displays the corresponding calculated share price and upside/downside vs current market price.
