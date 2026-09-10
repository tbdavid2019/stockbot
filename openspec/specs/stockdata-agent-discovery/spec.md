# stockdata-agent-discovery Specification

## Purpose
界定 Stockbot 如何識別與使用 Stockdata 的 OpenAPI、MCP、WebMCP 與 Agent manifest，讓未來可擴充自動化 Agent 呼叫，同時不讓 discovery 服務故障影響一般聊天與卡片。

## Requirements

### Requirement: Discovery metadata retrieval

The system SHALL be able to retrieve and validate Stockdata's documented OpenAPI and Agent discovery metadata from configured endpoints, while treating REST endpoint contracts as the primary runtime integration contract.

#### Scenario: Discovery document is valid
- **WHEN** a discovery document is fetched successfully
- **THEN** the system records supported endpoint names, transports, versions, and source URL for diagnostics or future tool registration

#### Scenario: Discovery document is unavailable
- **WHEN** an OpenAPI, MCP, or manifest endpoint fails
- **THEN** existing REST-backed user features remain usable and the discovery failure is limited to diagnostics or optional integrations

### Requirement: Transport boundary

The system SHALL keep REST, MCP SSE, and WebMCP transport concerns behind a provider boundary so user-facing cards do not depend on a particular transport.

#### Scenario: REST is selected
- **WHEN** a supported REST endpoint exists for a requested feature
- **THEN** Stockbot uses the REST adapter without requiring MCP or browser-side WebMCP access

#### Scenario: An optional transport is selected in a controlled environment
- **WHEN** an operator explicitly enables an MCP or WebMCP integration
- **THEN** the transport is used only through the provider boundary and returns the same normalized data contract as REST

### Requirement: No credential leakage

The system SHALL keep any provider or MCP credentials server-side and SHALL never expose them in rendered cards, serialized chat history, public manifests, or browser requests.

#### Scenario: Authenticated provider request
- **WHEN** an upstream request requires authentication
- **THEN** credentials are read only from server-side environment configuration and the normalized result contains no secret values
