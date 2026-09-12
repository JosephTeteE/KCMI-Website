# KCMI QA Mutation Policy (QA1)

## Classes

| Class | Meaning | Examples |
|-------|---------|----------|
| SAFE | Read-only observation | Assert landmarks |
| NAVIGATION | Change route without writing content | Hub nav links |
| LOCAL_STATE | UI-only state | Open menu, wizard Next, Preview, tour |
| DRAFT_WRITE | Persist non-public content | Save Program draft |
| PUBLIC_WRITE | Change visitor-visible content | Make live, livestream on |
| DESTRUCTIVE | Delete/archive irreversible | Delete media |
| EXTERNAL | Leave first-party app | YouTube, maps |

## Production hard stop

Hosts:

- `kcmi-rcc.org`
- `www.kcmi-rcc.org`

**Refuse:** DRAFT_WRITE, PUBLIC_WRITE, DESTRUCTIVE.

No ordinary command override.

## Hosted staging (`kcmi-preview.josephtete.com`)

Allowed freely: SAFE, NAVIGATION, LOCAL_STATE.

**DRAFT_WRITE** only when the record title starts with:

`STAGING QA —`

Known fixture Program id:

`4798d76c-6112-4870-9f52-7d1ab38d06bd`

**PUBLIC_WRITE** / **DESTRUCTIVE**: not executed by the generic crawler/full suite. Only explicit isolated scenarios with documented rollback and human intent.

## Interaction rules

- No blind click-everything crawlers
- No `force: true` without documented test-level reason
- No arbitrary short `waitForTimeout` as synchronization
- Prefer role/accessible name locators and web-first assertions

## Implementation

`platform/e2e/qa/mutation-policy.ts` — `assertMutationAllowed()`.
