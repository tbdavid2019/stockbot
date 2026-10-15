# Spec Delta

## Purpose

Aggregates and visualizes Taiwan government procurement tenders, bidding win rates, contract value histories, procuring agency profiles, advance procurement forecasts, and Article 101 black swan debarment audits via ToBid open intelligence.

## ADDED Requirements

### Requirement: Entity Resolution and Tender Aggregation
The system SHALL map TWSE/TPEX stock tickers and colloquial company names across B2G sectors to their official legal entities, querying ToBid to retrieve total award amounts, tender win rates, top procuring agencies, and recent major contracts.

#### Scenario: User queries government procurement for a specific B2G stock
- **WHEN** user asks for tender or procurement records for a target company (e.g., "2634 標案" or "漢翔 得標紀錄")
- **THEN** the system resolves the ticker to its legal entity, retrieves cumulative award value, win rate percentage, top 5 procuring agencies (e.g. 國防部、空軍司令部), and recent awards.

#### Scenario: Company has no government procurement history
- **WHEN** user queries procurement for a company with no recorded public tenders in the ToBid database
- **THEN** the system returns a clear indication that no public tender records were found, without throwing an error.

### Requirement: Procurement Compliance and Black Swan Risk Audit
The system SHALL query ToBid vendor compliance records (`vendor_compliance`) to detect active or historical debarment under Article 101 of the Government Procurement Act (拒絕往來廠商/停權), raising high-priority risk warnings for affected listed companies and core subsidiaries.

#### Scenario: Target company has active procurement debarment
- **WHEN** an audited company or core subsidiary has an active debarment status under Article 101
- **THEN** the system renders a prominent red alert warning detailing the debarment effective date, expiration date, and cause, flagging it as a material fundamental risk.

#### Scenario: Target company has clean compliance record
- **WHEN** the company has no active or pending debarment records
- **THEN** the system displays a verified green compliance status badge indicating normal bidding eligibility.

### Requirement: Interactive Government Bids UI Card
The system SHALL render an interactive `<GovBidsCard />` component above the assistant text caption, displaying contract totals, winning rates, agency concentration, competitor head-to-head match records, compliance badges, and recent contracts.

#### Scenario: Rendering procurement intelligence card
- **WHEN** the procurement intelligence tool `showGovProcurement` is triggered
- **THEN** `<GovBidsCard />` is rendered above the response text with summary metrics, top 5 procuring agency breakdown, competitor matchup history, and tender timeline.

#### Scenario: User filters tenders by agency or timeframe
- **WHEN** user interacts with timeframe or agency filter chips in `<GovBidsCard />`
- **THEN** the card dynamically updates displayed contract entries locally without triggering a new server turn.

### Requirement: Forward Procurement Forecast and Tender Search
The system SHALL provide access to advance procurement forecasts and keyword tender searches across Taiwan government procuring agencies.

#### Scenario: User inquires about future procurement forecasts
- **WHEN** user queries upcoming procurement plans (e.g., "台電強韌電網 採購預告" or "近期資安標案")
- **THEN** the system queries ToBid procurement forecasts (`procurement_forecast`) and returns pre-announcement tender plans with estimated budgets and expected announcement dates.

### Requirement: Upstream Timeout and Resilient Fallback
The system SHALL enforce a strict request timeout (3-5 seconds) for all external calls to the ToBid endpoint (`https://api.tobid.tw/mcp`) and gracefully degrade without interrupting the assistant conversation flow.

#### Scenario: ToBid API timeout or service unavailability
- **WHEN** an external call to ToBid exceeds the 4-second timeout or responds with an HTTP error
- **THEN** the system logs the incident, falls back to alternative web search or returns an informative message, preventing chat interruption or unhandled rejection.
