# Codex Handoff Notes

## Recommended immediate action

Do **not** build M5 production services yet. Keep current engineering milestone unchanged.

Use this prototype as an Enterprise Discovery artifact and ask Codex to:

1. Audit current M5/post-MVP references in the repository.
2. Reconcile them with `PROTOTYPE_SCOPE.md`.
3. Create an Enterprise Discovery Pack:
   - product brief;
   - actors and jobs-to-be-done;
   - data inventory;
   - three-plane architecture;
   - threat model;
   - privacy invariants;
   - metric dictionary;
   - campaign policy;
   - program implementation and participation report policy;
   - feature specs and acceptance;
   - open decisions and design-partner interview plan.
4. Copy this prototype into a clearly non-production folder such as:
   `prototypes/enterprise-pilot/`
5. Do not introduce backend, tenant, cloud sync or production dependencies.
6. Do not alter M0 implementation tasks.
7. Stop for owner review before implementation planning.

## Source-of-truth rule

The prototype illustrates intended UX. It does not override:
- Product Constitution;
- intended-use and claims;
- privacy/security invariants;
- versioned data contracts;
- approved ADRs;
- milestone scope.
