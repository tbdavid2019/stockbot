## Purpose

把 Stockdata 的全市場法人、券商分點與公司資料服務接入 Stockbot，讓使用者能從個股研究延伸到市場排名、主力交易與結構化公司情報。

## ADDED Requirements

### Requirement: Institutional ranking

The system SHALL provide a market-wide institutional-flow ranking view for foreign investors, investment trusts, dealers, and concentration fields returned by Stockdata, while retaining the existing per-symbol institutional card.

#### Scenario: User requests institutional leaders
- **WHEN** the user asks which stocks institutions are buying or selling
- **THEN** Stockbot renders a ranked list with market, date, institution category, net-flow unit, and source timestamp

#### Scenario: Ranking scope is unsupported
- **WHEN** Stockdata does not provide the requested market or institution category
- **THEN** the card states the unsupported scope and does not merge incompatible markets or units

### Requirement: Broker branch activity

The system SHALL provide a per-symbol broker-branch view using the available summary, trade-detail, and trend responses, containing branch names, buy/sell quantities, net position, date, and directional context from Stockdata.

#### Scenario: Broker data is available
- **WHEN** the user asks for main broker branches or dealer activity for a ticker
- **THEN** Stockbot renders the branch-level activity with the requested ticker and observation date

#### Scenario: Broker data is unavailable
- **WHEN** no branch data exists for the symbol or market
- **THEN** Stockbot displays an unavailable state and does not infer institutional activity from price movement

### Requirement: Company profile and live news

The system SHALL render Stockdata company-profile data, including resolved company name, business description, market capitalization when available, core business fields, and linked live news, with the response tied to the provider fetch/as-of timestamp.

#### Scenario: User asks what a company does
- **WHEN** a ticker or company name resolves in Stockdata
- **THEN** Stockbot displays the structured profile and linked news in a native card above the explanatory caption

#### Scenario: Company name is ambiguous
- **WHEN** more than one listing could match the user input
- **THEN** Stockbot presents the possible identifiers or requests a market clarification instead of selecting silently

### Requirement: Batch company profiles

The system SHALL support bounded batch loading of company profiles for a requested list or market scope and SHALL preserve partial successes.

#### Scenario: Batch contains mixed results
- **WHEN** some requested symbols resolve and others fail
- **THEN** Stockbot displays successful profiles and an explicit per-symbol failure state for unresolved entries

#### Scenario: Batch exceeds the supported size
- **WHEN** the requested list exceeds the provider or application limit
- **THEN** Stockbot applies a documented bound or asks the user to narrow the scope before issuing unbounded requests
