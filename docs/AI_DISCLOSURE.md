# AI development disclosure

Mate4Mobile was built with substantial AI assistance. The development roles, as identified by the maintainer, were:

| Model | Role |
| --- | --- |
| GPT6 Astra | Planner |
| DeepSeek 4.1 Flash 1017 | Builder |

The maintainer directed the product and design and tried the app against their own TeslaMate installation. AI assistance included implementation and supporting project work; this is not a claim that every line was manually written or independently audited.

These names describe the development workflow, not runtime dependencies or endorsements by the model providers. Mate4Mobile does not need an LLM account, API key or AI service to display your TeslaMate data.

The maintainer remains responsible for published changes. Automated checks and practical testing help identify problems but do not guarantee security, accuracy or compatibility with every deployment. See the [release validation record](RELEASE.md), [security model](../.github/SECURITY.md) and [contribution guide](../.github/CONTRIBUTING.md).

The optional [AI-assisted setup prompt](AI_SETUP.md) is a convenience for users who choose to use an external coding assistant. That assistant has its own access and data-handling behaviour; keep passwords, tokens, cookies and driving history out of its chat and logs.
