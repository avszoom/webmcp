# Title

VisaFlow: The Adaptive WebMCP Agent

## One-line Summary

VisaFlow turns a 55-field visa form into a guided voice conversation, using WebMCP to choose the right path, derive answers, fill the live application, and flag only what needs review.

## Problem

Long government forms ask people to translate a complex life story into an unfamiliar sequence of fields. Conditional sections make the experience worse: applicants answer questions that may not apply, repeat facts, and discover missing evidence late. A conventional chatbot can explain a form, but without a semantic connection to the website it must be tightly coupled to page structure or automate fragile clicks and selectors.

## Solution

VisaFlow is a fictional U.S. visitor-visa application where a person and an agent complete the applicable path together. The user speaks, types, or attaches synthetic supporting documents. GPT-5.6 Terra extracts explicit facts, makes transparent deterministic derivations, creates reviewable proposals for reasonable interpretations, and asks one story-shaped follow-up covering several related gaps.

The application publishes 22 typed WebMCP tools. The agent discovers those tools, inspects available paths, selects the valid route, applies multiple facts in bounded semantic calls, and asks the website to calculate progress and readiness. The form changes immediately without UI navigation, while the website validates every write and remains the source of truth.

## Why This Matters

This pattern can make high-friction public-service, healthcare, insurance, education, and financial forms more accessible without surrendering control to an opaque agent. The human contributes context and judgment, the agent connects facts and reduces repetition, and the website enforces its own rules and review boundaries.

What was difficult before is now a collaboration: a person can tell one coherent story, an agent can connect that story across many conditional fields, and the website can safely accept only the values that fit its current semantic contract.

## How We Used AI

- GPT-5.6 Terra runs behind a same-origin Worker endpoint using the OpenAI Responses API.
- Strict structured output separates route decisions, explicit updates, document facts, deterministic derivations, reviewable candidates, partial facts, and the next question.
- Each request includes a compact authoritative memory packet: current route, resolved answers, remaining applicable questions, recent discussion, partial facts, and pending review IDs.
- The planner is instructed to extract every supported fact from an answer, never repeat resolved topics, and ask one natural question covering up to five compatible gaps.
- The LLM never writes application state. Its plan is translated into WebMCP calls, then validated by website-owned tool handlers.
- Uploaded documents are untrusted evidence, not instructions, and all document-derived values remain reviewable.

## How We Used Codex

Codex helped turn the initial hackathon concept into a functioning product through repeated build-and-test loops. It implemented the conditional application model, WebMCP tool surface, conversational UI, server-side planner endpoint, multilingual and voice flows, document processing, provenance and review states, completion receipt, tests, and ChatGPT Sites deployment. It also analyzed real conversation logs to fix repeated questions, dropped date context, slow multi-turn filling, address handling, review errors, document limits, and visual layout problems. Every production iteration was built and tested before publication.

## Key Features

- 55-question adaptive application with tourism, business, family, funding, and prior-travel branches
- 22 discoverable typed WebMCP tools for routing, inspection, validated writes, evidence, derivations, and review
- Voice input, spoken questions, text input, and document-assisted extraction
- High-density story prompts that fill several related fields per turn
- Live path selection that removes irrelevant questions without page navigation
- Visible separation of stated, document-derived, deterministically derived, and reviewable proposed values
- Consolidated final attention queue for uncertain and sensitive information
- English, Spanish, French, and Hindi interfaces
- Transparent action history and live completion metrics
- Gated fictional completion receipt after all applicable fields and reviews are resolved

## Architecture

The React client owns the domain model and browser-local application state. `WebMcpContext` registers 22 tools with `document.modelContext`; the embedded guide or an external WebMCP agent can discover and execute them. Tool handlers validate route applicability, input type, option values, dates, confidence, provenance, and confirmation requirements before committing to shared state.

The same-origin `/api/interview` Worker calls the OpenAI Responses API using GPT-5.6 Terra and a strict JSON schema. It returns a plan only. The client converts that plan into bounded WebMCP calls, and the resulting state update immediately changes the visible form, progress, activity history, and final-review queue.

Full details and diagrams: [ARCHITECTURE.md](ARCHITECTURE.md)

## Testing Instructions

1. Open the public application in ChatGPT's in-app browser or Chrome with WebMCP enabled.
2. Select voice or text input.
3. Give one rich trip answer, such as: “I live in Panvel, India and work as a software engineer at ABC. I am visiting my brother in New York from October 4 to October 10, 2026, staying with him, and paying for the trip myself.”
4. Confirm that the route changes to Family visit → Self-funded, irrelevant questions are removed, and multiple fields are applied.
5. Open **Agent decisions & WebMCP actions** and verify that semantic actions are visible.
6. Optionally attach synthetic files from `public/demo-documents` and submit another natural answer.
7. Complete the remaining story prompts, edit and approve the attention queue, and click **Finish & submit**.
8. Confirm that a fictional receipt and confirmation number appear.
9. Use **Start over** to reset the application.

Automated verification:

```bash
npm install
npm test
npm run build
```

Expected: 32 tests across five files pass, followed by a successful production build.

## Public Demo Link

https://adaptive-visitor-visa-webmcp.avszoom.chatgpt.site/

## Public Repository Link

https://github.com/avszoom/webmcp

## Demo Video

https://youtu.be/edlyolj64XI

Before final submission, verify that the video is public or unlisted, plays without sign-in, contains audio, and is under three minutes.

Suggested outline:

1. **0:00–0:20 — Problem:** show the 55-field application and explain why form-by-form completion is painful.
2. **0:20–0:45 — WebMCP distinction:** show that the page publishes 22 semantic tools; explain that the website owns the rules.
3. **0:45–1:45 — Collaboration:** give one rich voice answer, show route selection, removed questions, multi-field writes, derivations, and the next story prompt.
4. **1:45–2:20 — Documents and trust:** attach a synthetic document, show provenance and the consolidated attention queue.
5. **2:20–2:45 — Completion:** approve review, click Finish & submit, and show the fictional receipt.
6. **2:45–2:55 — Close:** “The human supplies meaning, the agent connects it, and the website enforces truth and policy.”

## Screenshot Shot List

1. Empty government-style application with the floating guide and 55-question starting state
2. Selected Family visit → Self-funded path with removed-question count and live progress
3. Conversation turn showing verified fields, Terra proposals, deterministic derivations, and WebMCP action count
4. Consolidated attention queue with editable reviewable values
5. Completed application with fictional submission receipt

## Submission Readiness Notes

- Public live URL: ready
- Public repository: ready
- MIT license: ready
- Source, build commands, testing instructions, and architecture: ready
- Demo description: drafted here
- Public demo video: missing
- Devpost custom questions: require final user choices and copy

## Known Limitations

- This is a fictional application and does not integrate with a government system.
- Voice recognition and speech synthesis depend on browser support and permissions.
- Native semantic discovery requires a WebMCP-capable browser; the app uses the same handlers as a compatibility fallback for its embedded guide.
- Draft state is local to one browser and is not synchronized between devices.
- Uploaded files are sent with the interview turn for extraction but are not stored by the website.
- Local Vite development runs the UI and semantic layer; the complete LLM interview endpoint is part of the Worker deployment.
- Rate limiting is designed for a hackathon demonstration, not a high-volume production service.

## TODO Official Form Fields

- **Submitter Type:** choose Individual, Team of Individuals, or Organization.
- **Country of residence:** select the real country for every team member.
- **App Status:** likely New; confirm before entering.
- **Existing-project updates:** not applicable if App Status is New.
- **Live URL:** `https://adaptive-visitor-visa-webmcp.avszoom.chatgpt.site/`
- **Private judge testing instructions:** use the Testing Instructions section above; no sign-in is required.
- **Public code repository:** `https://github.com/avszoom/webmcp`
- **Agents/clients tested:** confirm final wording; current evidence supports ChatGPT's in-app browser and WebMCP-enabled Chrome.
- **AI tools used:** OpenAI Responses API with GPT-5.6 Terra and Codex.
- **Level of learning:** choose None, Moderate, or Significant.
- **Career AI value:** choose Yes or No.
- **Demo video URL:** `https://youtu.be/edlyolj64XI` — verify public/unlisted playback and duration.
