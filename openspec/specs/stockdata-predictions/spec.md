# stockdata-predictions Specification

## Purpose
讓使用者在 Stockbot 中查看 Stockdata 已計算的 LSTM、TimesFM、玄鐵與多策略共振訊號，並以可辨識模型來源與預測期間的原生卡片呈現。

## Requirements

### Requirement: Prediction and resonance views

The system SHALL expose Stockdata views for TimesFM bullish and bearish rankings, LSTM bullish and bearish rankings, Xuantie pullback candidates, and the resonance categories actually returned by the single Stockdata resonance endpoint, including triple, quadruple, or dual-ML tags when present.

#### Scenario: User requests a market-wide recommendation
- **WHEN** the user asks for the strongest resonance, TimesFM, LSTM, or Xuantie candidates
- **THEN** Stockbot calls the matching Stockdata endpoint and renders a ranked card containing ticker, market, signal type or returned resonance tag, forecast horizon, and data timestamp

#### Scenario: User requests a bearish ranking
- **WHEN** the user asks which stocks are forecast to fall or need defensive attention
- **THEN** Stockbot renders the bearish ranking and clearly labels it as a model forecast rather than a guaranteed outcome

### Requirement: Per-symbol prediction history

The system SHALL allow a user to request a symbol's Stockdata prediction trajectory and SHALL display historical forecasts, moving-average context, institutional-flow context, and observed dates when those fields are returned.

#### Scenario: Symbol history is available
- **WHEN** the user requests prediction history for a resolvable ticker
- **THEN** Stockbot renders the historical trajectory with model name, forecast date, observation date, and missing values omitted rather than invented

#### Scenario: Symbol cannot be resolved
- **WHEN** Stockdata cannot resolve the requested company or ticker
- **THEN** Stockbot asks for or displays the unresolved identifier and does not silently substitute another security

### Requirement: Batch snapshot display

The system SHALL provide a latest-market-snapshot view that can display Stockdata's batch price, target, moving-average, valuation, and label fields with filterable market or index context when supported by the endpoint.

#### Scenario: Latest batch is current
- **WHEN** the user asks for the latest Stockdata market snapshot
- **THEN** Stockbot displays the batch timestamp, market scope, available fields, and any model labels in a native card

#### Scenario: Latest batch is stale or partial
- **WHEN** the snapshot is stale, incomplete, or unavailable
- **THEN** the card shows the status and only renders fields actually returned by the provider

### Requirement: Model provenance and uncertainty

Every prediction card SHALL identify the contributing model or resonance rule, forecast horizon, provider timestamp, and an uncertainty or limitation note when supplied by Stockdata.

#### Scenario: Prediction metadata is returned
- **WHEN** a prediction includes model and confidence metadata
- **THEN** the card displays that metadata adjacent to the predicted change or ranking

#### Scenario: Prediction metadata is absent
- **WHEN** the provider omits confidence or uncertainty data
- **THEN** the card displays the missing field as unavailable and does not infer a confidence score
