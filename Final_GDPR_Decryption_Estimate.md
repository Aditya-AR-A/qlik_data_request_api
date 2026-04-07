# Final Effort Estimate: GDPR Decryption Field Hardcoding

Date: April 4, 2026
Owner: GDPR Decrypt Extension Workstream

## Objective
Implement the required GDPR field hardcoding updates in the Qlik extension so designated encrypted fields are properly decrypted during analytics usage, with full development and expanded testing coverage.

## Final Agreed Estimate
Total planned effort: 40 hours

This is the committed planning number for this scope.

## Effort Split Table (40 Hours)

| Step  | Workstream                                                               | Hours |
| ----- | ------------------------------------------------------------------------ | ----: |
| 1     | Field mapping and hardcode rule matrix finalization                      |     3 |
| 2     | Common field implementation (direct mappings)                            |     6 |
| 3     | Special-format implementation (concatenated full-name logic and aliases) |     8 |
| 4     | Test case preparation and validation setup                               |     4 |
| 5     | Non-production functional and regression testing                         |     6 |
| 6     | Extensive production testing and validation support                      |     8 |
| 7     | Defect fixing from test cycles                                           |     4 |
| 8     | Documentation and handover notes                                         |     2 |
| ----- | ------------------------------------------------------------------------ | ----- |
|       | Total                                                                    |    40 |

Note: This split includes production testing/validation effort and excludes production deployment activities.

## Scope Included
- Implement hardcoded GDPR field handling based on the confirmed field inventory.
- Support both common fields and special-format name scenarios (including concatenated full-name patterns where applicable).
- Add and validate logic for field aliases and format variations encountered in PP, TLC, CE, and EER analytics scripts.
- Perform functional and regression testing in non-production environments.
- Perform extensive production testing and validation support.
- Perform defect fixing within the same implementation window for issues found during testing.

## Scope Excluded
- Production deployment activities.
- Post-production monitoring tasks.

## Key Assumptions
- Source data is already encrypted before testing begins.
- Required non-production environments, production test windows, and test data are available when needed.
- Field inventory provided is the active baseline for implementation.
- No net-new scope is added after development starts.

## Testing Approach (Expanded)
Testing effort is intentionally increased to reduce risk before handoff.

Testing distribution for this plan:
- Non-production testing is reduced and focused on baseline validation.
- Production testing is expanded to cover the majority of validation scenarios.

Coverage includes:
- Common decrypted fields (email, username, first name, middle name, last name, full name where directly present).
- Special-format name handling where full name is derived from first/middle/last combinations.
- Null and empty-value behavior.
- Formatting consistency (spacing, punctuation, and middle-name optionality).
- Cross-app validation for PP, TLC, CE, and EER scenarios.
- Reset and fallback behavior checks for extension interactions.

## Delivery Window
Planned duration: approximately 5 working days (40 hours total).

## Risk and Change Control
- If additional fields, new naming formats, or new app-specific rules are introduced after start, estimate may require revision.
- If environment or test-data readiness is delayed, schedule impact is possible.

## Acceptance Basis
Work is considered complete for this scope when:
- Hardcoded GDPR field logic is implemented as agreed.
- Non-production baseline testing and planned production testing are completed.
- Critical and high-priority defects from this scope are resolved.
- Handover notes are provided for deployment by the responsible production team.
