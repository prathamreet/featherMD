# Security Policy

## Supported Versions

Only the latest active versions of Feather MD are supported with security updates. We strongly encourage all users to upgrade to the latest stable release to receive security patches automatically.

| Version | Supported          |
| ------- | ------------------ |
| 1.3.x   | :white_check_mark: |
| < 1.3   | :x:                |

## Cryptographic Release Signing

To ensure the integrity of the application, all official releases and updates are cryptographically signed using an Ed25519 keypair. The public key is embedded within the application binary. 

* **Public Key:** `dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IDFFRTIyOTRBRjBBNTVBODkKUldTSldxWHdTaW5pSG5vS0J5b0JLcmtQaHRMNE1xUW5xSUpjZS85b2dubnozaFNkMmtVeUFaWjUK`

During update checks, the auto-updater automatically downloads the signature files (`.sig`) and verifies them before performing any installations. If the signatures do not match, the update will be aborted immediately.

## Reporting a Vulnerability

If you discover a security vulnerability within Feather MD, please **do not** open a public issue. Instead, report it privately to the maintainers to protect our users.

Please report all security vulnerabilities to:
* **prathamreet@gmail.com**

Please include the following information in your report:
* A detailed description of the vulnerability.
* Steps to reproduce the issue (and any proof-of-concept code).
* The potential impact of the vulnerability.

We will acknowledge receipt of your report within 48 hours and work with you to resolve the issue as quickly as possible.

