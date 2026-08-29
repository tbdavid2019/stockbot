## Purpose

Generates structured pre-earnings briefings and post-earnings recaps, tracking consensus revenue and EPS expectations, estimate ranges, analyst price targets, and historical 4-quarter beat/miss surprise records.

## ADDED Requirements

### Requirement: Structured Pre-Earnings Briefing
The system SHALL compile a pre-earnings briefing card for any target ticker containing the scheduled reporting date, market session (before open / after close), consensus EPS & revenue estimates (average, low, high, analyst count, YoY growth rate), and analyst price target distributions.

#### Scenario: User inquires about upcoming earnings
- **WHEN** user asks "when is NVDA earnings", "what does wall street expect for TSLA earnings", or "財報前瞻 AAPL"
- **THEN** the system renders an `<EarningsBriefingCard />` showing the date, consensus range spread, analyst price target upside/downside, and key operational metrics to watch.

### Requirement: Historical Beat and Miss Track Record
The system SHALL display the past 4 quarters of reported EPS vs estimated EPS, calculating the surprise percentage and beat/miss frequency.

#### Scenario: Displaying historical earnings accuracy
- **WHEN** the pre-earnings briefing is triggered
- **THEN** a historical track record table is displayed indicating past quarterly performance and average surprise percentage.
