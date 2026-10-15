# earnings-call-intelligence Specification

## Purpose
Tracking and visual analysis of Taiwan and US earnings calls (法人說明會 / 財報電話會議), investor conference webcasts, presentation decks, and 2MD AnyDoc guidance/CapEx extraction.

## Requirements

### Requirement: Multi-Market Earnings Call Aggregation
The system SHALL aggregate scheduled and historical earnings calls across Taiwan (TWSE/TPEX/MOPS) and US markets (Yahoo Finance/Investing.com), providing ticker, company name, conference date/time, session type, webcast links, and presentation slide URLs.

#### Scenario: User queries upcoming earnings calls for a specific stock
- **WHEN** user requests earnings calls for a target ticker (e.g., "2330 法說會" or "NVDA earnings call")
- **THEN** the system displays the stock's scheduled or recent earnings conference details, including date, session time, conference venue/type, webcast stream URL, and presentation slide links.

#### Scenario: User queries market-wide earnings call calendar
- **WHEN** user queries general earnings conferences without a ticker (e.g., "本週法說會日程" or "近期財報電話會議")
- **THEN** the system returns an aggregated multi-stock earnings call calendar filtered by timeframe and market.

### Requirement: Interactive Earnings Call Visualization Card
The system SHALL render an `<EarningsCallCard />` component above the assistant text caption, supporting interactive market switching (Taiwan, US, All) and conference status filtering (Live/Today, Upcoming, Historical Replay).

#### Scenario: User filters conferences by market or timeline status
- **WHEN** user clicks on market tabs or timeline status pills on the `<EarningsCallCard />`
- **THEN** the card dynamically filters the list of conferences matching the selected criteria without reloading or triggering new server turns.

### Requirement: One-Click AI Presentation Analysis
The system SHALL provide an instant analysis trigger on conference presentation decks that integrates with the 2MD AnyDoc parsing engine to extract forward-looking management guidance, capital expenditure projections, capacity utilization, and key financial takeaways.

#### Scenario: User triggers AI presentation deck parsing
- **WHEN** user clicks "AI 解析簡報" on an earnings call entry with an available presentation deck
- **THEN** the system processes the document via 2MD AnyDoc and displays a structured briefing containing management guidance, CapEx figures, and strategic highlights.

#### Scenario: Presentation deck is unavailable
- **WHEN** an earnings call entry does not have an attached presentation deck
- **THEN** the AI analysis button is disabled or hidden, and the system offers alternative webcast or IR search links.

### Requirement: Timezone Resilience and Boundary Clamping
The system SHALL isolate and format conference timestamps according to their native market timezones (`Asia/Taipei` for Taiwan market events, `America/New_York` for US market events) and respect end-of-day boundary definitions.

#### Scenario: Displaying conference times in local market and user context
- **WHEN** displaying Taiwan and US earnings calls side by side or individually
- **THEN** the system displays the time in the market's respective standard timezone with clear market tags, preventing UTC date boundary shifts.
