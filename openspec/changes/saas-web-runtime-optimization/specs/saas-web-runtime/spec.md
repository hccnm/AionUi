# Delta for SaaS Web Runtime

## ADDED Requirements

### Requirement: Web Runtime Must Not Depend on Desktop-Only Startup Hooks

The SaaS Web runtime MUST be able to boot without registering Electron-only startup hooks, tray listeners, deep-link listeners, or desktop DevTools triggers.

#### Scenario: Browser boot path

- GIVEN the application is opened in a browser-hosted SaaS environment
- WHEN the main web entry initializes
- THEN desktop-only startup hooks are not attached to the critical path
- AND the application continues to function through browser + backend bridge only

### Requirement: Browser Startup Must Use a Minimal Request Budget

The SaaS Web startup path MUST limit eager requests to data required for authentication, base configuration, and the first visible screen.

#### Scenario: Initial authenticated load

- GIVEN the user opens the authenticated SaaS Web UI
- WHEN the first screen is rendered
- THEN non-critical data such as optional cron, skill, extension, or heavy catalog requests are deferred or lazily loaded
- AND repeated consumers reuse shared cached results where possible

### Requirement: Web Build Must Not Rely on Sibling Desktop Package Resolution

The SaaS Web project MUST progressively remove reliance on a sibling `AionUi/node_modules` fallback for runtime correctness.

#### Scenario: Dependency boundary review

- GIVEN the web project is built or developed independently
- WHEN imports are resolved
- THEN required dependencies are either declared by the web project or explicitly classified as temporary migration debt
- AND desktop-only package coupling is tracked for removal

### Requirement: SaaS Navigation Surfaces Must Be Visually Symmetric

The sidebar and settings navigation MUST present consistent spacing, alignment, and selection rhythm in the SaaS Web layout.

#### Scenario: Sidebar and settings visual inspection

- GIVEN the user opens the conversation sidebar or settings sidebar in SaaS Web
- WHEN group headers, list items, and selected states are rendered
- THEN the layout shows consistent left padding, icon slots, border rhythm, and visual balance
- AND no obvious asymmetry remains like the issues shown in the supplied screenshots

### Requirement: Optimization Must Preserve Backend Bridge Behavior

The optimization MUST NOT remove APIs that only appear local by name but are actually implemented through SaaS backend HTTP or WebSocket bridges.

#### Scenario: Bridge-safe cleanup

- GIVEN a candidate module or API includes names such as `ipcBridge`, `fs`, `shell`, or `platform`
- WHEN cleanup decisions are made
- THEN the implementation is classified by actual runtime path rather than naming
- AND backend bridge behavior required by SaaS Web remains intact
