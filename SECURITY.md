# Security Policy

## Supported versions

Only the active stable release line receives security fixes. Upgrade to the latest version to keep receiving patches automatically through the in-app updater.

| Version | Supported |
| ------- | --------- |
| 1.3.x   | Yes       |
| < 1.3   | No        |

## Cryptographic release signing

Every official release and update is signed with an Ed25519 keypair. The public key is embedded in the application binary at build time.

Public key:

```
dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IDFFRTIyOTRBRjBBNTVBODkKUldTSldxWHdTaW5pSG5vS0J5b0JLcmtQaHRMNE1xUW5xSUpjZS85b2dubnozaFNkMmtVeUFaWjUK
```

During an update check, the in-app updater downloads the matching signature (`.sig`) alongside the installer and verifies it before any file is written. If the signature does not match the embedded key, the update is aborted and the installed version is left untouched.

## Reporting a vulnerability

Do not file public GitHub issues for security problems. Send a private report to:

`prathamreet@gmail.com`

Please include:

* A clear description of the issue and the affected version.
* Reproduction steps, ideally with a minimal proof of concept.
* The impact you believe it has (data exposure, code execution, denial of service, and so on).

We acknowledge reports within 48 hours, work with you on a fix, and credit you in the release notes if you want the credit.
