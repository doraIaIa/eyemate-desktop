# Privacy And Security Documentation Authority

```yaml
decision_status: proposed
owner_boundary_status: approved-for-discovery
release_scope: m5-enterprise-discovery
implementation_status: not-started
```

`docs/privacy/` remains the authoritative privacy root for the current personal EyeMate product and M0-M4 scope.

`docs/privacy-security/enterprise/` is the authoritative privacy/security root only for M5 Enterprise Discovery. It does not override M0-M4 privacy documents, accepted ADRs, personal product intended use or implementation status.

Enterprise privacy invariants are defined in `docs/privacy-security/enterprise/enterprise-privacy-invariants.md`. No other Enterprise Discovery document may redefine those invariants with equal authority; other documents may only reference them.
