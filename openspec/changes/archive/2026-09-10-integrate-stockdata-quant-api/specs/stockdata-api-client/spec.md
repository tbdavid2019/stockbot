## Purpose

提供一個可靠且可追溯的外部量化資料來源，讓 Stockbot 能安全呼叫 `stockdata.david888.com` 並將回應交給各功能卡片使用。

## ADDED Requirements

### Requirement: External provider configuration

The system SHALL read the Stockdata base URL from environment configuration, defaulting to the documented `stockdata.david888.com` service, and SHALL NOT require credentials to be embedded in source code or client bundles.

#### Scenario: Provider configuration is available
- **WHEN** a Stockdata-backed tool is invoked
- **THEN** the request uses the configured provider base URL and records the provider name in the returned source metadata

#### Scenario: Provider configuration is missing or malformed
- **WHEN** the configured URL is absent or invalid
- **THEN** the tool reports an unavailable provider state and does not issue a request to an arbitrary URL

### Requirement: Typed and validated provider responses

The system SHALL validate the shape of every provider response before rendering it, normalize ticker and market identifiers, and preserve `asOf`, source URL, model, horizon, and stale-status metadata when supplied.

#### Scenario: Valid response
- **WHEN** the provider returns a response matching the endpoint contract
- **THEN** the normalized data and its source metadata are available to the corresponding Stockbot card

#### Scenario: Invalid or incomplete response
- **WHEN** the provider response cannot be validated
- **THEN** the system renders an explicit unavailable or partial-data state and excludes invalid numeric fields

### Requirement: Resilient request behavior

The system SHALL apply bounded timeouts, limited retry or fallback behavior, and in-flight request deduplication for Stockdata requests, and SHALL distinguish provider errors from valid empty results.

#### Scenario: Provider timeout
- **WHEN** a Stockdata request exceeds its configured timeout
- **THEN** the card remains renderable, identifies the provider as unavailable, and uses an approved local fallback only where one exists

#### Scenario: Concurrent duplicate request
- **WHEN** multiple components request the same endpoint, symbol, and parameter set concurrently
- **THEN** the system reuses one in-flight request rather than issuing duplicate upstream calls

### Requirement: JSON-safe persistence

The system SHALL return only serializable normalized data to chat history persistence so Stockdata-backed cards can be restored from localStorage without an active server stream.

#### Scenario: Chat history is restored
- **WHEN** a saved Stockdata tool result is loaded
- **THEN** the corresponding card renders from the saved JSON result and retains its source and stale-status labels

### Requirement: Bounded payload and token protection

The system SHALL truncate or bound large array payloads (e.g. max 10–15 records for rankings and broker lists) and clip long narrative text before passing data into LLM captions or tool results.

#### Scenario: Large dataset returned from provider
- **WHEN** the provider returns a list exceeding the maximum row bound
- **THEN** the client slices the array to the configured bound and appends a truncation warning without dropping critical metadata
