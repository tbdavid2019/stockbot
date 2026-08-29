# derivatives-microstructure Specification

## Purpose
Provides interactive Black-Scholes options payoff curve visualization, ETF Net Asset Value (NAV) premium/discount monitoring with dealer Gamma Exposure (GEX) analysis, and stock liquidity and market impact estimation.

## Requirements

### Requirement: Interactive Options Payoff Simulator
The system SHALL calculate and visually render multi-leg options strategy payoff curves (expiration intrinsic value curve and current theoretical Black-Scholes curve) with dynamic sliders for spot price, strikes, days to expiration (DTE), and implied volatility (IV).

#### Scenario: Visualizing multi-leg options structures
- **WHEN** user asks to visualize an options strategy such as "show payoff for SPY iron condor", "butterfly spread on NVDA", or "選擇權損益模擬"
- **THEN** the system renders an interactive `<OptionsPayoffCard />` with real-time sliders, max profit, max loss, breakevens, and current theoretical P&L.

### Requirement: ETF Premium and NAV Divergence Tracking
The system SHALL calculate the percentage divergence between an ETF's market price and its Net Asset Value (NAV), comparing against category peer medians and detecting potential dealer gamma squeeze conditions.

#### Scenario: User queries ETF NAV premium or discount
- **WHEN** user asks "is BITO trading at a premium", "IBIT discount to NAV", or "ETF 溢折價"
- **THEN** the system renders an `<EtfPremiumCard />` displaying the price, NAV, divergence percentage, bid-ask spread context, and category peer comparison.

### Requirement: Stock Liquidity and Institutional Market Impact Estimator
The system SHALL compute liquidity metrics including bid-ask spread (bps), annualized float turnover, Amihud illiquidity ratio, and Square-root Market Impact ($\text{Impact} = \sigma \sqrt{Q/V}$) for custom order sizes.

#### Scenario: Estimating large trade slippage and execution cost
- **WHEN** user asks "how liquid is AAPL", "what is the market impact of trading 50k shares", or "流動性分析"
- **THEN** the system renders a `<StockLiquidityCard />` with liquidity tier rating, days to trade float, and an order size slippage curve.
