## Purpose

補充 Stockbot 現有總經卡片，讓使用者能查看 Stockdata 的市場風險 regime、動態曝險、FedWatch、企業財報日曆、商品與 Polymarket 宏觀情緒。

## ADDED Requirements

### Requirement: Market risk regime

The system SHALL display Stockdata's market macro regime with the relevant index, volatility, semiconductor, risk label, effective date, and recommended exposure percentage when provided.

#### Scenario: Regime response is available
- **WHEN** the user asks for macro risk or recommended market exposure
- **THEN** Stockbot renders the regime, exposure range or percentage, factors, and provider timestamp in a native card

#### Scenario: Exposure is not provided
- **WHEN** the provider returns a regime without a numeric exposure recommendation
- **THEN** Stockbot displays the regime without fabricating an exposure percentage

### Requirement: Macro event and market data views

The system SHALL provide separate user-visible views for FedWatch rate probabilities, US corporate earnings calendars, global economic calendars, and key commodity summaries.

#### Scenario: User requests a macro dataset
- **WHEN** the user asks for Fed rate odds, upcoming US earnings, economic events, or gold/copper/oil data
- **THEN** Stockbot calls the matching Stockdata endpoint and renders the returned date, estimates, actuals, and source links where available

#### Scenario: One macro endpoint fails
- **WHEN** one requested macro dataset is unavailable
- **THEN** the other successfully retrieved datasets remain renderable and the failed dataset is explicitly marked unavailable

### Requirement: Polymarket macro sentiment

The system SHALL display Stockdata's Polymarket-derived macro sentiment separately from factual market data and SHALL label it as prediction-market sentiment with its event, probability, timestamp, and source.

#### Scenario: Sentiment data is available
- **WHEN** the user asks about prediction-market expectations for rates, tariffs, recession, or AI/technology events
- **THEN** Stockbot renders the relevant probability and event context with a non-deterministic sentiment disclaimer

#### Scenario: Sentiment data is unavailable
- **WHEN** Polymarket data cannot be retrieved or does not contain the requested event
- **THEN** Stockbot reports that no current prediction-market reading was found and does not substitute a model-generated percentage

### Requirement: Freshness and source labeling

Every macro card SHALL show the provider source, data-through timestamp, and stale state when the data exceeds its endpoint freshness policy.

#### Scenario: Cached macro result is reused
- **WHEN** a cached result is served within its freshness policy
- **THEN** the card identifies the result timestamp and source without presenting it as a live tick
