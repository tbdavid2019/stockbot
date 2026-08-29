# sepa-momentum Specification

## Purpose
Evaluates growth and momentum stocks using Mark Minervini's SEPA (Specific Entry Point Analysis) framework, including an 8-condition Trend Template scorecard, 4-Stage classification, VCP pattern identification, and risk-adjusted position sizing.

## Requirements

### Requirement: SEPA 8-Condition Trend Template Verification
The system SHALL evaluate a stock against the 8 mandatory Minervini Trend Template conditions:
1. Price > 150MA and Price > 200MA
2. 150MA > 200MA
3. 200MA trending upward for at least 1 month
4. 50MA > 150MA and 50MA > 200MA
5. Price > 50MA
6. Price >= 30% above 52-week low
7. Price within 25% of 52-week high
8. Relative Strength (RS) rating > 70th percentile

#### Scenario: Evaluating a qualified Stage 2 momentum leader
- **WHEN** user asks "should I buy NVDA", "SEPA analysis for TSLA", "is AAPL in Stage 2", or "檢查趨勢模板"
- **THEN** the system returns an 8-item scorecard indicating Pass/Fail status for each condition along with actual numerical values, overall stage classification, and fundamental growth grades.

#### Scenario: Evaluating a stock failing Trend Template
- **WHEN** a stock is trading below its 200MA or in Stage 4 decline
- **THEN** the system marks the Trend Template as failed, identifies the stock as Stage 4 or Stage 1, and advises caution or passing on the setup.

### Requirement: Risk-Adjusted Position Sizing Calculator
The system SHALL compute recommended share purchase quantity and stop-loss levels based on account equity, maximum risk percentage per trade (default 1-2%), and distance to the initial stop-loss level ($7\sim8\%$).

#### Scenario: Generating position sizing parameters
- **WHEN** a valid SEPA breakout or pullback setup is identified
- **THEN** the system outputs exact suggested entry pivot price, $+5\%$ buy zone boundary, hard initial stop price, breakeven trigger price ($+8\%$), and share allocation calculation.
