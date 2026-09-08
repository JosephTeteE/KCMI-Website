# ADR-0005: Public forms and bot protection

- **Status:** ACCEPTED
- **Date:** 2026-09-07
- **Deciders:** Human architecture review (KCMI Digital Platform)

## Context

**VERIFIED CURRENT STATE:** Many pastoral/engagement workflows use Google Forms; contact/camp use Google reCAPTCHA; schemas of Google Forms are not in-repo.

## Decision

### Bot protection

- Use **Cloudflare Turnstile** for public anti-bot challenges where needed
- Combine with application/server **rate limiting**
- Do **not** introduce reCAPTCHA into the new architecture unless a later ADR changes this

### Google Forms migration

- Replace Google Forms **gradually** with first-party KCMI forms
- Do **not** bulk-import sensitive historical data merely because it exists
- Purpose limitation: migrate active/open records where operationally necessary; import other historical records only after explicit review and justification
- Google Form field schemas remain **EXTERNAL VERIFICATION REQUIRED** before implementing each replacement workflow
- This external gap **does not block** unrelated foundation/public-site implementation

## Consequences

- Phase B/C can proceed without Forms schema exports
- Each form replacement needs a schema verification step before build of that workflow

## Alternatives considered

- Continue Google Forms indefinitely — rejected as long-term direction
- reCAPTCHA in new stack — rejected for V1
- Bulk historical import — rejected without purpose review

## Security / privacy notes

- Public writes need validation, Turnstile, and rate limits
- Pastoral forms inherit ADR-0003/0004 isolation

## References

- [REQUIREMENTS.md](../REQUIREMENTS.md)
- Phase 0 inventory Forms list
