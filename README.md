# Adaptive Visitor Visa Application

A fictional, U.S.-government-style visitor visa application built for the WebMCP Challenge.
It demonstrates a human and an agent working together to determine which application path
applies, answer the highest-value questions, and complete supported fields through semantic
tools instead of UI navigation.

> This is not a U.S. government website. It does not submit a real visa application, and all
> connected-profile data is synthetic.

## Product experience

- A deliberately long 55-question application across 10 sections
- A GPT-5.6 Luna assistant that opens with the form and accepts voice or text answers
- Live LLM extraction and follow-up planning based on the current application state
- Live route selection for tourist, business, and family-visit applicants
- Application sections and evidence requirements that change with the selected path
- Rapid semantic filling from an approved fictional personal profile
- Visible provenance, derived trip duration, conflicts, and sensitive-answer confirmations
- English, Spanish, French, and Hindi application/assistant interfaces
- Traditional government-service visual language with an unmissable fictional-site disclaimer

## Why WebMCP matters

The personal agent knows the user; the website knows its conditional rules. WebMCP connects
those knowledge sets through 22 discoverable semantic tools. Four tools specifically expose
the routing intelligence:

- `inspect_application_flows`
- `select_application_flow`
- `get_next_best_question`
- `simulate_flow_change`

The remaining tools expose status, requirements, approved facts, safe section-level writes,
validated interview batches, explicit sensitive confirmation, derived insights, evidence
references, conflict handling, and review readiness. The agent can
select a route and apply structured answers without relying on DOM selectors or clicking
through conditional pages.

## Suggested walkthrough

1. Open the application and choose **Type instead** or **Start with voice**.
2. Say: “Tourism in New York, October 12 to October 21, 2026.”
3. Answer the agent's bundled funding and employment question.
4. Answer its adaptive travel-history and remaining-facts question.
5. Approve the fictional evidence references and complete the explicit final review.
6. Open **Agent decisions & WebMCP actions** to inspect the semantic actions.
7. Change the interface language from the header to see both the form and LLM interview adapt.

## Run locally

```bash
npm install
npm run dev
```

Use a WebMCP-capable in-app browser or enable WebMCP testing in Chrome. The hosted application
uses a server-side `OPENAI_API_KEY` secret; never put this value in browser code or commit it.
The semantic handlers remain available as a compatibility fallback in browsers without native
WebMCP support.

## Verify

```bash
npm test
npm run build
```

The current suite covers the application model, conditional route selection and simulation,
tool registration, safe state updates, conversational route selection, semantic prefilling,
and multilingual rendering.
