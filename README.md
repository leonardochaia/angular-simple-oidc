# angular-simple-oidc

An Angular (currently 8+, lower versions could be supported) library for the [Open Id Connect Protocol](https://openid.net/specs/openid-connect-core-1_0.html) implementing:

* Discovery Document
* Code Flow
* Refresh Tokens(in-progress)
* Session Checks(in-progress)

## Motivation

Why another OIDC library?
I needed a library that is:

* Compilant with the OIDC protocol
* Returns descriptive error messages
* Works well with observables
* Integrates seamlesly with NGRX
* PRs are merged with caution
* OIDC protocol practically does not change, so I expect only bugfixes to be merged once it's stable.
* Respects Semantic Versioning.
* Mayor versions to be released together with Angular's
* Basic features. More features only if I need them (refresh tokens, session checks) through other modules/packages
