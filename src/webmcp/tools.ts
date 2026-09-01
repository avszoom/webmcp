import { fictionalProfile } from '../data/demoProfile'
import { questions, questionsBySection, sections } from '../data/questions'
import { deriveInsightsFromValues } from '../agent/derivations'
import { buildApplicationFlow } from '../agent/applicationFlow'
import {
  appendToolActivity,
  applyAgentAnswersToState,
  createToolActivity,
  getApplicationMetrics,
  type AgentAnswerInput,
} from '../state/applicationState'
import type {
  ApplicationPurpose,
  ApplicationState,
  FundingSource,
  PriorVisitStatus,
  SectionId,
} from '../types'
import type { WebMcpToolDefinition } from './types'

interface ToolRuntime {
  getState: () => ApplicationState
  commitState: (state: ApplicationState) => void
}

type ToolData = Record<string, unknown>

const questionMap = new Map(questions.map((question) => [question.id, question]))
const approvedFactMap = new Map(fictionalProfile.facts.map((fact) => [fact.questionId, fact]))

const sourceSchema = {
  type: 'string',
  enum: ['approved_profile', 'user_statement', 'document'],
  description: 'Where the supplied facts came from. Do not claim approved_profile unless the value came from get_approved_profile_facts.',
}

const confidenceSchema = {
  type: 'number',
  minimum: 0,
  maximum: 1,
  description: 'Confidence from 0 to 1. This does not bypass confirmation for sensitive fields.',
}

const stringField = (description: string) => ({ type: 'string', minLength: 1, description })
const dateField = (description: string) => ({
  type: 'string',
  pattern: '^\\d{4}-\\d{2}-\\d{2}$',
  description: `${description} in YYYY-MM-DD format.`,
})
const yesNoField = (description: string) => ({ type: 'string', enum: ['Yes', 'No'], description })
const questionIdValues = questions.map((question) => question.id)

function schemaFor(
  fields: Record<string, Record<string, unknown>>,
  options: { required?: string[] } = {},
) {
  const fieldNames = Object.keys(fields)
  return {
    type: 'object',
    properties: {
      ...fields,
      source: sourceSchema,
      confidence: confidenceSchema,
    },
    required: ['source', ...(options.required ?? [])],
    anyOf: fieldNames.map((name) => ({ required: [name] })),
    additionalProperties: false,
  }
}

function emptySchema() {
  return { type: 'object', properties: {}, additionalProperties: false }
}

function toolResponse(summary: string, data: ToolData, isError = false) {
  return {
    content: [{ type: 'text', text: summary }],
    structuredContent: data,
    isError,
  }
}

function asRecord(input: unknown): Record<string, unknown> {
  return input && typeof input === 'object' && !Array.isArray(input)
    ? (input as Record<string, unknown>)
    : {}
}

function isDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function isUnknownPlaceholder(value: string) {
  return ['unknown', 'n/a', 'na', 'not sure', 'tbd', 'guess'].includes(value.trim().toLowerCase())
}

function sourceLabelFor(
  state: ApplicationState,
  source: string,
  questionId: string,
  value: string,
): { label?: string; error?: string } {
  if (source === 'approved_profile') {
    if (state.startMode !== 'demo') {
      return { error: 'No fictional profile is connected to this application.' }
    }
    const fact = approvedFactMap.get(questionId)
    if (!fact || fact.value.trim().toLowerCase() !== value.trim().toLowerCase()) {
      return { error: `${questionId} does not match the connected approved profile.` }
    }
    return { label: fact.sourceLabel }
  }
  if (source === 'user_statement') return { label: 'User statement (via agent)' }
  if (source === 'document') return { label: 'User-provided document' }
  return { error: 'source must be approved_profile, user_statement, or document.' }
}

function getSectionStatus(state: ApplicationState, sectionId: SectionId) {
  const applicable = new Set(state.flow?.applicableQuestionIds ?? questions.map((question) => question.id))
  const sectionQuestions = questionsBySection[sectionId].filter((question) => applicable.has(question.id))
  const answered = sectionQuestions.filter((question) => state.answers[question.id]).length
  return { section_id: sectionId, answered, total: sectionQuestions.length }
}

function statusPayload(state: ApplicationState) {
  const metrics = getApplicationMetrics(state)
  return {
    started: state.hasStarted,
    mode: state.startMode,
    review_status: state.reviewStatus,
    ...metrics,
    sections: sections.map((section) => getSectionStatus(state, section.id)),
  }
}

interface WriteConfig {
  toolName: string
  title: string
  activityTitle: string
  fields: Record<string, string>
  dateFields?: string[]
  emailFields?: string[]
}

function executeWrite(runtime: ToolRuntime, input: unknown, config: WriteConfig) {
  const args = asRecord(input)
  const state = runtime.getState()
  if (!state.hasStarted) {
    return toolResponse(
      'The user must choose a first-run path before application answers can be added.',
      { ok: false, code: 'APPLICATION_NOT_STARTED' },
      true,
    )
  }

  const source = typeof args.source === 'string' ? args.source : ''
  const confidence = typeof args.confidence === 'number' ? args.confidence : 0.95
  const errors: string[] = []
  const entries: AgentAnswerInput[] = []

  if (confidence < 0 || confidence > 1) errors.push('confidence must be between 0 and 1.')

  for (const [property, questionId] of Object.entries(config.fields)) {
    if (args[property] === undefined || args[property] === null) continue
    if (typeof args[property] !== 'string') {
      errors.push(`${property} must be a string.`)
      continue
    }
    const value = args[property].trim()
    if (!value || isUnknownPlaceholder(value)) {
      errors.push(`${property} must contain known information; leave it out when unknown.`)
      continue
    }
    if (config.dateFields?.includes(property) && !isDate(value)) {
      errors.push(`${property} must be a real date in YYYY-MM-DD format.`)
      continue
    }
    if (config.emailFields?.includes(property) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      errors.push(`${property} must be a valid email address.`)
      continue
    }

    const sourceResult = sourceLabelFor(state, source, questionId, value)
    if (sourceResult.error) {
      errors.push(sourceResult.error)
      continue
    }
    entries.push({ questionId, value, sourceLabel: sourceResult.label!, confidence })
  }

  if (!entries.length && !errors.length) errors.push('Provide at least one known field value.')
  if (errors.length) {
    return toolResponse(
      `${config.title} was not applied because validation failed.`,
      { ok: false, code: 'VALIDATION_ERROR', errors },
      true,
    )
  }

  const outcome = applyAgentAnswersToState(
    state,
    entries,
    config.toolName,
    config.activityTitle,
  )
  runtime.commitState(outcome.state)

  return toolResponse(
    `${outcome.result.applied.length} ${config.title.toLowerCase()} field${outcome.result.applied.length === 1 ? '' : 's'} added. Unknown values were not invented.`,
    {
      ok: true,
      ...outcome.result,
      application_status: statusPayload(outcome.state),
    },
  )
}

const identityFields = {
  given_names: 'legal_given_names',
  family_name: 'legal_family_name',
  other_names: 'other_names',
  date_of_birth: 'date_of_birth',
  place_of_birth: 'place_of_birth',
  national_id: 'national_id',
}

const passportFields = {
  passport_number: 'passport_number',
  issuing_country: 'passport_country',
  issue_date: 'passport_issue_date',
  expiration_date: 'passport_expiry_date',
  holds_second_passport: 'second_passport',
}

const contactFields = {
  email: 'email',
  phone: 'phone',
  alternate_phone: 'alternate_phone',
  preferred_contact_method: 'preferred_contact',
  public_social_profile: 'social_handle',
}

const addressFields = {
  current_street: 'current_street',
  current_city: 'current_city',
  current_region: 'current_region',
  current_postal_code: 'current_postal_code',
  current_country: 'current_country',
  previous_address: 'previous_address',
}

const employmentFields = {
  current_employer: 'current_employer',
  job_title: 'job_title',
  employment_start_date: 'employment_start',
  employer_address: 'employer_address',
  approximate_monthly_income: 'monthly_income',
  previous_employer: 'previous_employer',
}

const educationFields = {
  highest_education_level: 'highest_education',
  institution_name: 'institution_name',
  field_of_study: 'field_of_study',
  graduation_date: 'graduation_date',
}

const travelFields = {
  purpose: 'travel_purpose',
  arrival_date: 'arrival_date',
  departure_date: 'departure_date',
  destination_city: 'destination_city',
  address_during_stay: 'stay_address',
  visited_before: 'prior_visits',
  prior_visa_refusal: 'prior_refusal',
}

const familyFields = {
  marital_status: 'marital_status',
  spouse_or_partner_name: 'spouse_name',
  father_full_name: 'father_name',
  mother_full_name: 'mother_name',
  number_of_dependants: 'dependants',
  immediate_family_at_destination: 'family_at_destination',
}

export function createVisaApplicationTools(runtime: ToolRuntime): WebMcpToolDefinition[] {
  const readAnnotations = { readOnlyHint: true, untrustedContentHint: false }

  return [
    {
      name: 'inspect_application_flows',
      title: 'Inspect application flows',
      description: 'Discover the application routes and the human facts that determine which visitor-visa questions apply. Use this instead of guessing from the visible form or clicking through conditional pages.',
      inputSchema: emptySchema(),
      annotations: readAnnotations,
      execute: () => toolResponse(
        'Three visitor application flows are available. Purpose, funding, and prior travel determine the applicable route.',
        {
          ok: true,
          original_question_count: questions.length,
          routing_dimensions: [
            { id: 'purpose', values: ['tourism', 'business', 'family_visit'], unlocks: 'Primary visitor path' },
            { id: 'funding', values: ['self', 'employer', 'host', 'mixed'], unlocks: 'Financial and evidence requirements' },
            { id: 'prior_visit', values: ['yes', 'no'], unlocks: 'Returning or first-time visitor history' },
          ],
        },
      ),
    },
    {
      name: 'select_application_flow',
      title: 'Select application flow',
      description: 'Evaluate known user answers against the website’s routing rules and select the applicable visitor-visa path without navigating conditional pages. Omit dimensions that are not known yet.',
      inputSchema: {
        type: 'object',
        properties: {
          purpose: { type: 'string', enum: ['tourism', 'business', 'family_visit', 'undetermined'] },
          funding: { type: 'string', enum: ['self', 'employer', 'host', 'mixed', 'undetermined'] },
          prior_visit: { type: 'string', enum: ['yes', 'no', 'undetermined'] },
        },
        required: ['purpose'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (input) => {
        const args = asRecord(input)
        const state = runtime.getState()
        const purpose = args.purpose as ApplicationPurpose
        if (!['tourism', 'business', 'family_visit', 'undetermined'].includes(purpose)) {
          return toolResponse('A valid purpose is required to select an application flow.', { ok: false, code: 'INVALID_PURPOSE' }, true)
        }
        const funding = (typeof args.funding === 'string' ? args.funding : state.flow?.funding ?? 'undetermined') as FundingSource
        const priorVisit = (typeof args.prior_visit === 'string' ? args.prior_visit : state.flow?.priorVisit ?? 'undetermined') as PriorVisitStatus
        const flow = buildApplicationFlow(purpose, funding, priorVisit)
        const previousTotal = state.flow?.applicableQuestionIds.length ?? questions.length
        const nextState = appendToolActivity(
          { ...state, flow },
          createToolActivity(
            'select_application_flow',
            'Application path recalculated',
            `${flow.labels.join(' · ')} · ${questions.length - flow.applicableQuestionIds.length} questions excluded`,
            'success',
          ),
        )
        runtime.commitState(nextState)
        return toolResponse(
          `${flow.labels.join(', ')} selected. ${flow.applicableQuestionIds.length} of ${questions.length} questions currently apply.`,
          {
            ok: true,
            previous_question_count: previousTotal,
            applicable_question_count: flow.applicableQuestionIds.length,
            excluded_question_count: flow.excludedQuestionIds.length,
            flow,
          },
        )
      },
    },
    {
      name: 'get_next_best_question',
      title: 'Get next best question',
      description: 'Ask the application which unresolved human decision has the highest routing value. Returns one semantic question and why it matters; it does not read or expose sensitive answer values.',
      inputSchema: emptySchema(),
      annotations: readAnnotations,
      execute: () => {
        const flow = runtime.getState().flow
        const next = !flow
          ? { id: 'purpose', question: 'What is the purpose, destination, and timing of the trip?', unlocks: 18 }
          : flow.funding === 'undetermined'
            ? { id: 'funding', question: 'Who will pay for the trip?', unlocks: 8 }
            : flow.priorVisit === 'undetermined'
              ? { id: 'prior_visit', question: 'Have you visited the United States before?', unlocks: 6 }
              : { id: 'review', question: 'Review the remaining uncertain and sensitive answers.', unlocks: 0 }
        return toolResponse(
          `${next.question} This is currently the highest-value clarification.`,
          { ok: true, next_question: next, reason: `${next.unlocks} application requirements can be resolved or routed.` },
        )
      },
    },
    {
      name: 'simulate_flow_change',
      title: 'Simulate application flow change',
      description: 'Preview how a changed purpose, funding source, or prior-visit answer would alter applicable questions before mutating the application.',
      inputSchema: {
        type: 'object',
        properties: {
          purpose: { type: 'string', enum: ['tourism', 'business', 'family_visit'] },
          funding: { type: 'string', enum: ['self', 'employer', 'host', 'mixed'] },
          prior_visit: { type: 'string', enum: ['yes', 'no'] },
        },
        additionalProperties: false,
      },
      annotations: readAnnotations,
      execute: (input) => {
        const args = asRecord(input)
        const current = runtime.getState().flow ?? buildApplicationFlow('undetermined')
        const proposed = buildApplicationFlow(
          (args.purpose as ApplicationPurpose | undefined) ?? current.purpose,
          (args.funding as FundingSource | undefined) ?? current.funding,
          (args.prior_visit as PriorVisitStatus | undefined) ?? current.priorVisit,
        )
        const activated = proposed.applicableQuestionIds.filter((id) => !current.applicableQuestionIds.includes(id))
        const removed = current.applicableQuestionIds.filter((id) => !proposed.applicableQuestionIds.includes(id))
        return toolResponse(
          `The proposed change would activate ${activated.length} and remove ${removed.length} questions. No answers were changed.`,
          { ok: true, current, proposed, impact: { activated, removed } },
        )
      },
    },
    {
      name: 'get_application_status',
      title: 'Get application status',
      description: 'Read completion and exception counts for the fictional visa application. This tool does not change any answers.',
      inputSchema: emptySchema(),
      annotations: readAnnotations,
      execute: () => {
        const status = statusPayload(runtime.getState())
        return toolResponse(
          `${status.completed} of ${status.total} questions are completed; ${status.missing} remain missing.`,
          { ok: true, status },
        )
      },
    },
    {
      name: 'get_section_requirements',
      title: 'Get section requirements',
      description: 'List the semantic requirements and current answer state for one application section without returning sensitive answer values.',
      inputSchema: {
        type: 'object',
        properties: {
          section_id: { type: 'string', enum: sections.map((section) => section.id) },
        },
        required: ['section_id'],
        additionalProperties: false,
      },
      annotations: readAnnotations,
      execute: (input) => {
        const args = asRecord(input)
        const section = sections.find((item) => item.id === args.section_id)
        if (!section) {
          return toolResponse('Unknown section_id.', { ok: false, code: 'UNKNOWN_SECTION' }, true)
        }
        const state = runtime.getState()
        return toolResponse(
          `${section.title} contains ${questionsBySection[section.id].length} requirements.`,
          {
            ok: true,
            section,
            requirements: questionsBySection[section.id].map((question) => ({
              id: question.id,
              label: question.label,
              required: question.required,
              sensitive: question.sensitivity === 'sensitive',
              evidence_required: Boolean(question.evidenceRequired),
              status: state.answers[question.id]?.verificationStatus ?? 'missing',
              source: state.answers[question.id]?.sourceLabel ?? null,
            })),
          },
        )
      },
    },
    {
      name: 'list_unanswered_questions',
      title: 'List unanswered questions',
      description: 'Return only unanswered application questions, ordered to prioritize required and sensitive exceptions. Never invent answers for these questions.',
      inputSchema: {
        type: 'object',
        properties: {
          section_id: { type: 'string', enum: sections.map((section) => section.id) },
          limit: { type: 'integer', minimum: 1, maximum: 55, default: 10 },
        },
        additionalProperties: false,
      },
      annotations: readAnnotations,
      execute: (input) => {
        const args = asRecord(input)
        const state = runtime.getState()
        const sectionId = typeof args.section_id === 'string' ? args.section_id : null
        const limit = typeof args.limit === 'number' ? Math.min(55, Math.max(1, args.limit)) : 10
        const unanswered = questions
          .filter((question) => !state.answers[question.id]?.value.trim())
          .filter((question) => !sectionId || question.sectionId === sectionId)
          .sort((a, b) => Number(b.required) - Number(a.required) || Number(b.sensitivity === 'sensitive') - Number(a.sensitivity === 'sensitive'))
          .slice(0, limit)
          .map((question) => ({
            id: question.id,
            section_id: question.sectionId,
            question: question.label,
            required: question.required,
            sensitive: question.sensitivity === 'sensitive',
          }))
        return toolResponse(
          `${unanswered.length} unanswered question${unanswered.length === 1 ? '' : 's'} returned.`,
          { ok: true, questions: unanswered },
        )
      },
    },
    {
      name: 'get_conflicts',
      title: 'Get application conflicts',
      description: 'Read conflicts where a proposed answer differs from an existing application value. This tool does not resolve or overwrite conflicts.',
      inputSchema: emptySchema(),
      annotations: readAnnotations,
      execute: () => {
        const conflicts = runtime.getState().conflicts
        return toolResponse(
          conflicts.length ? `${conflicts.length} conflict${conflicts.length === 1 ? '' : 's'} need human review.` : 'No conflicts are currently recorded.',
          { ok: true, conflicts },
        )
      },
    },
    {
      name: 'get_approved_profile_facts',
      title: 'Get approved profile facts',
      description: 'Read the synthetic facts the user approved by connecting the fictional profile. Returns no data in the personal path.',
      inputSchema: {
        type: 'object',
        properties: {
          section_id: { type: 'string', enum: sections.map((section) => section.id) },
        },
        additionalProperties: false,
      },
      annotations: readAnnotations,
      execute: (input) => {
        const state = runtime.getState()
        if (state.startMode !== 'demo') {
          return toolResponse('No approved fictional profile is connected.', { ok: false, code: 'NO_APPROVED_PROFILE' }, true)
        }
        const args = asRecord(input)
        const sectionId = typeof args.section_id === 'string' ? args.section_id : null
        const facts = fictionalProfile.facts
          .filter((fact) => !sectionId || questionMap.get(fact.questionId)?.sectionId === sectionId)
          .map((fact) => ({
            field_id: fact.questionId,
            section_id: questionMap.get(fact.questionId)?.sectionId,
            label: questionMap.get(fact.questionId)?.label,
            value: fact.value,
            source: fact.sourceLabel,
            sensitive: questionMap.get(fact.questionId)?.sensitivity === 'sensitive',
          }))
        return toolResponse(
          `${facts.length} approved synthetic facts are available. Sensitive facts must still be confirmed after they are added.`,
          { ok: true, profile: fictionalProfile.name, facts },
        )
      },
    },
    {
      name: 'provide_identity_information',
      title: 'Provide identity information',
      description: 'Add known identity facts to the shared application. Omit unknown fields. National ID and date of birth remain pending for human confirmation.',
      inputSchema: schemaFor({
        given_names: stringField('Legal given names.'),
        family_name: stringField('Legal family name.'),
        other_names: stringField('Other names used, or the literal value None when explicitly known.'),
        date_of_birth: dateField('Date of birth'),
        place_of_birth: stringField('City and country of birth.'),
        national_id: stringField('National identification number. Sensitive; never guess.'),
      }),
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (input) => executeWrite(runtime, input, {
        toolName: 'provide_identity_information', title: 'Identity', activityTitle: 'Identity information added', fields: identityFields, dateFields: ['date_of_birth'],
      }),
    },
    {
      name: 'provide_passport_information',
      title: 'Provide passport information',
      description: 'Add known passport facts to the shared application. Never guess a document number. Passport number remains pending for human confirmation.',
      inputSchema: schemaFor({
        passport_number: stringField('Passport number. Sensitive; never guess.'),
        issuing_country: stringField('Passport issuing country.'),
        issue_date: dateField('Passport issue date'),
        expiration_date: dateField('Passport expiration date'),
        holds_second_passport: yesNoField('Whether another valid passport is held.'),
      }),
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (input) => {
        const args = asRecord(input)
        const issueDate = typeof args.issue_date === 'string' ? args.issue_date : runtime.getState().answers.passport_issue_date?.value
        const expiryDate = typeof args.expiration_date === 'string' ? args.expiration_date : runtime.getState().answers.passport_expiry_date?.value
        if (issueDate && expiryDate && issueDate >= expiryDate) {
          return toolResponse('Passport expiration must be after its issue date.', { ok: false, code: 'INVALID_DATE_RANGE' }, true)
        }
        return executeWrite(runtime, input, {
          toolName: 'provide_passport_information', title: 'Passport', activityTitle: 'Passport information added', fields: passportFields, dateFields: ['issue_date', 'expiration_date'],
        })
      },
    },
    {
      name: 'provide_contact_information',
      title: 'Provide contact information',
      description: 'Add known contact facts to the shared application. Omit anything the user has not provided or approved.',
      inputSchema: schemaFor({
        email: stringField('Primary email address.'),
        phone: stringField('Primary phone number.'),
        alternate_phone: stringField('Alternate phone number.'),
        preferred_contact_method: { type: 'string', enum: ['Email', 'Phone', 'Either'] },
        public_social_profile: stringField('Public social profile URL or handle.'),
      }),
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (input) => executeWrite(runtime, input, {
        toolName: 'provide_contact_information', title: 'Contact', activityTitle: 'Contact information added', fields: contactFields, emailFields: ['email'],
      }),
    },
    {
      name: 'provide_address_history',
      title: 'Provide address history',
      description: 'Add known current or previous address facts to the shared application. Omit incomplete addresses rather than guessing components.',
      inputSchema: schemaFor({
        current_street: stringField('Current street and unit.'),
        current_city: stringField('Current city.'),
        current_region: stringField('Current state or region.'),
        current_postal_code: stringField('Current postal code.'),
        current_country: stringField('Current country of residence.'),
        previous_address: stringField('Most recent previous full address.'),
      }),
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (input) => executeWrite(runtime, input, {
        toolName: 'provide_address_history', title: 'Address', activityTitle: 'Address history added', fields: addressFields,
      }),
    },
    {
      name: 'provide_employment_history',
      title: 'Provide employment history',
      description: 'Add known employment facts to the shared application. Income remains pending for human confirmation.',
      inputSchema: schemaFor({
        current_employer: stringField('Current employer.'),
        job_title: stringField('Current job title.'),
        employment_start_date: dateField('Employment start date'),
        employer_address: stringField('Employer address.'),
        approximate_monthly_income: stringField('Approximate monthly income with currency. Sensitive; never guess.'),
        previous_employer: stringField('Most recent previous employer.'),
      }),
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (input) => executeWrite(runtime, input, {
        toolName: 'provide_employment_history', title: 'Employment', activityTitle: 'Employment history added', fields: employmentFields, dateFields: ['employment_start_date'],
      }),
    },
    {
      name: 'provide_education_information',
      title: 'Provide education information',
      description: 'Add known education facts to the shared application. Omit unknown fields.',
      inputSchema: schemaFor({
        highest_education_level: stringField('Highest completed education level.'),
        institution_name: stringField('Institution name.'),
        field_of_study: stringField('Field of study.'),
        graduation_date: dateField('Graduation date'),
      }),
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (input) => executeWrite(runtime, input, {
        toolName: 'provide_education_information', title: 'Education', activityTitle: 'Education information added', fields: educationFields, dateFields: ['graduation_date'],
      }),
    },
    {
      name: 'provide_travel_information',
      title: 'Provide travel information',
      description: 'Add known travel-plan and travel-history facts to the shared application. Never infer prior visa refusals.',
      inputSchema: schemaFor({
        purpose: stringField('Primary purpose of travel.'),
        arrival_date: dateField('Planned arrival date'),
        departure_date: dateField('Planned departure date'),
        destination_city: stringField('Primary destination city.'),
        address_during_stay: stringField('Address during stay.'),
        visited_before: yesNoField('Whether the applicant has visited before.'),
        prior_visa_refusal: yesNoField('Whether a visa has ever been refused. Sensitive; never infer.'),
      }),
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (input) => {
        const args = asRecord(input)
        const arrival = typeof args.arrival_date === 'string' ? args.arrival_date : runtime.getState().answers.arrival_date?.value
        const departure = typeof args.departure_date === 'string' ? args.departure_date : runtime.getState().answers.departure_date?.value
        if (arrival && departure && arrival >= departure) {
          return toolResponse('Departure must be after arrival.', { ok: false, code: 'INVALID_DATE_RANGE' }, true)
        }
        return executeWrite(runtime, input, {
          toolName: 'provide_travel_information', title: 'Travel', activityTitle: 'Travel information added', fields: travelFields, dateFields: ['arrival_date', 'departure_date'],
        })
      },
    },
    {
      name: 'provide_family_information',
      title: 'Provide family information',
      description: 'Add known immediate-family facts to the shared application. Omit unknown relationships rather than guessing.',
      inputSchema: schemaFor({
        marital_status: stringField('Marital status.'),
        spouse_or_partner_name: stringField('Spouse or partner full name.'),
        father_full_name: stringField('Father full name.'),
        mother_full_name: stringField('Mother full name.'),
        number_of_dependants: stringField('Number of dependants.'),
        immediate_family_at_destination: yesNoField('Whether immediate family lives at the destination.'),
      }),
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (input) => executeWrite(runtime, input, {
        toolName: 'provide_family_information', title: 'Family', activityTitle: 'Family information added', fields: familyFields,
      }),
    },
    {
      name: 'provide_interview_answers',
      title: 'Apply adaptive interview answers',
      description: 'Apply facts stated during the adaptive interview, reviewable Terra proposals, or user-confirmed corrections. The website validates field IDs, dates, choices, applicability, provenance, and review status before every write.',
      inputSchema: {
        type: 'object',
        properties: {
          source: {
            type: 'string',
            enum: ['user_statement', 'agent_proposal', 'user_confirmation', 'document'],
            description: 'Use user_statement for spoken or typed facts, agent_proposal for a reasonable Terra interpretation that is written now and flagged for end review, user_confirmation for end-review approval or correction, and document only for a fictional evidence reference the user explicitly approved.',
          },
          answers: {
            type: 'array',
            minItems: 1,
            maxItems: 30,
            items: {
              type: 'object',
              properties: {
                question_id: { type: 'string', enum: questionIdValues },
                value: { type: 'string', minLength: 1, maxLength: 500 },
                confidence: confidenceSchema,
              },
              required: ['question_id', 'value', 'confidence'],
              additionalProperties: false,
            },
          },
        },
        required: ['source', 'answers'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: (input) => {
        const args = asRecord(input)
        const source = typeof args.source === 'string' ? args.source : ''
        const rawAnswers = Array.isArray(args.answers) ? args.answers : []
        const state = runtime.getState()
        const applicable = new Set(state.flow?.applicableQuestionIds ?? questionIdValues)
        const errors: string[] = []
        const entries: AgentAnswerInput[] = []

        if (!['user_statement', 'agent_proposal', 'user_confirmation', 'document'].includes(source)) {
          errors.push('source must be user_statement, agent_proposal, user_confirmation, or document.')
        }
        if (!rawAnswers.length || rawAnswers.length > 30) {
          errors.push('answers must contain between 1 and 30 facts.')
        }

        for (const rawAnswer of rawAnswers) {
          const answer = asRecord(rawAnswer)
          const questionId = typeof answer.question_id === 'string' ? answer.question_id : ''
          const value = typeof answer.value === 'string' ? answer.value.trim() : ''
          const confidence = typeof answer.confidence === 'number' ? answer.confidence : 0
          const question = questionMap.get(questionId)
          if (!question || !applicable.has(questionId)) {
            errors.push(`${questionId || 'Unknown field'} is not applicable to the selected path.`)
            continue
          }
          if (!value || isUnknownPlaceholder(value)) {
            errors.push(`${questionId} must contain an explicitly known value.`)
            continue
          }
          const minimumConfidence = source === 'agent_proposal' ? 0.5 : 0.7
          if (confidence < minimumConfidence || confidence > 1) {
            errors.push(`${questionId} confidence must be between ${minimumConfidence} and 1.`)
            continue
          }
          if (question.type === 'date' && !isDate(value)) {
            errors.push(`${questionId} must be a real date in YYYY-MM-DD format.`)
            continue
          }
          if (question.type === 'yes-no' && !['Yes', 'No'].includes(value)) {
            errors.push(`${questionId} must be Yes or No.`)
            continue
          }
          if (question.options && !question.options.includes(value)) {
            errors.push(`${questionId} must use one of the website's allowed choices.`)
            continue
          }
          entries.push({
            questionId,
            value,
            sourceLabel: source === 'document'
              ? 'Connected fictional evidence'
              : source === 'user_confirmation'
                ? 'User-confirmed Terra proposal'
                : source === 'agent_proposal'
                  ? 'Terra proposal · review at end'
                  : 'User statement (LLM extracted)',
            confidence,
            requiresConfirmation: source === 'agent_proposal',
            overwritePending: source === 'user_confirmation',
          })
        }

        if (errors.length || !entries.length) {
          return toolResponse(
            'Interview facts were not applied because website validation failed.',
            { ok: false, code: 'VALIDATION_ERROR', errors },
            true,
          )
        }

        const outcome = applyAgentAnswersToState(
          state,
          entries,
          'provide_interview_answers',
          'Adaptive interview facts applied',
        )
        runtime.commitState(outcome.state)
        const appliedKind = source === 'agent_proposal' ? 'reviewable Terra proposal' : 'interview fact'
        return toolResponse(
          `${outcome.result.applied.length} ${appliedKind}${outcome.result.applied.length === 1 ? '' : 's'} passed website validation and were applied.`,
          { ok: true, ...outcome.result, application_status: statusPayload(outcome.state) },
        )
      },
    },
    {
      name: 'confirm_sensitive_answers',
      title: 'Confirm sensitive answers',
      description: 'Mark existing sensitive answers as human-confirmed only after the user explicitly confirms them during review. This cannot create or alter answer values.',
      inputSchema: {
        type: 'object',
        properties: {
          question_ids: {
            type: 'array',
            minItems: 1,
            uniqueItems: true,
            items: { type: 'string', enum: questionIdValues },
          },
          explicit_confirmation: { type: 'boolean', const: true },
        },
        required: ['question_ids', 'explicit_confirmation'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (input) => {
        const args = asRecord(input)
        if (args.explicit_confirmation !== true || !Array.isArray(args.question_ids)) {
          return toolResponse('Explicit human confirmation is required.', { ok: false, code: 'CONFIRMATION_REQUIRED' }, true)
        }
        const state = runtime.getState()
        const answers = { ...state.answers }
        const confirmed: string[] = []
        const skipped: string[] = []
        for (const rawQuestionId of args.question_ids) {
          const questionId = typeof rawQuestionId === 'string' ? rawQuestionId : ''
          const question = questionMap.get(questionId)
          const existing = answers[questionId]
          if (!question || question.sensitivity !== 'sensitive' || !existing?.value.trim()) {
            skipped.push(questionId)
            continue
          }
          answers[questionId] = { ...existing, verificationStatus: 'confirmed', lastUpdated: new Date().toISOString() }
          confirmed.push(questionId)
        }
        const nextState = appendToolActivity(
          { ...state, answers },
          createToolActivity(
            'confirm_sensitive_answers',
            'Sensitive answers confirmed by the user',
            `${confirmed.length} existing answer${confirmed.length === 1 ? '' : 's'} confirmed; no values changed`,
            'success',
          ),
        )
        runtime.commitState(nextState)
        return toolResponse(
          `${confirmed.length} sensitive answer${confirmed.length === 1 ? '' : 's'} marked as explicitly confirmed.`,
          { ok: true, confirmed, skipped, application_status: statusPayload(nextState) },
        )
      },
    },
    {
      name: 'attach_evidence',
      title: 'Attach evidence reference',
      description: 'Attach a reference to fictional supporting evidence already provided by the user. This does not upload a real file or submit the application.',
      inputSchema: schemaFor({
        passport_biographic_page: stringField('Reference or filename for the passport biographic page.'),
        employment_verification: stringField('Reference or filename for employment verification.'),
        proof_of_funds: stringField('Reference or filename for proof of funds. Sensitive.'),
        travel_itinerary: stringField('Reference or filename for a travel itinerary.'),
        supporting_letter: stringField('Reference or filename for an additional supporting letter.'),
      }),
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: (input) => executeWrite(runtime, input, {
        toolName: 'attach_evidence', title: 'Evidence', activityTitle: 'Evidence reference attached',
        fields: {
          passport_biographic_page: 'passport_scan',
          employment_verification: 'employment_letter',
          proof_of_funds: 'bank_statement',
          travel_itinerary: 'travel_itinerary',
          supporting_letter: 'supporting_letter',
        },
      }),
    },
    {
      name: 'derive_application_insights',
      title: 'Derive application insights',
      description: 'Calculate transparent, non-sensitive values from answers already in the application, such as trip duration, passport validity for the planned dates, and employment tenure. Never guesses a personal fact.',
      inputSchema: emptySchema(),
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: () => {
        const state = runtime.getState()
        const values = Object.fromEntries(
          Object.entries(state.answers).map(([questionId, answer]) => [questionId, answer.value]),
        )
        const derivedInsights = deriveInsightsFromValues(values).map((insight) => ({
          ...insight,
          createdAt: new Date().toISOString(),
        }))
        const nextState = appendToolActivity(
          { ...state, derivedInsights },
          createToolActivity(
            'derive_application_insights',
            'Derived values explained',
            derivedInsights.length
              ? `${derivedInsights.length} safe calculation${derivedInsights.length === 1 ? '' : 's'} added with source fields`
              : 'No safe derived values are available yet',
            'success',
          ),
        )
        runtime.commitState(nextState)
        return toolResponse(
          derivedInsights.length
            ? `${derivedInsights.length} transparent application insights were calculated from existing answers.`
            : 'No application insights could be derived from the answers currently available.',
          { ok: true, insights: derivedInsights },
        )
      },
    },
    {
      name: 'request_review',
      title: 'Request human review',
      description: 'Check whether the fictional application is ready for human review. This never submits a government application and never bypasses unresolved exceptions.',
      inputSchema: emptySchema(),
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: () => {
        const state = runtime.getState()
        const metrics = getApplicationMetrics(state)
        const applicable = new Set(state.flow?.applicableQuestionIds ?? questionIdValues)
        const requiredMissing = questions.filter(
          (question) => applicable.has(question.id) && question.required && !state.answers[question.id]?.value.trim(),
        ).length
        const blockers = {
          required_missing: requiredMissing,
          confirmations_required: metrics.needsConfirmation,
          conflicts: metrics.conflicts,
          evidence_missing: metrics.evidenceNeeded,
        }
        const ready = Object.values(blockers).every((value) => value === 0)
        const nextState = appendToolActivity(
          { ...state, reviewStatus: ready ? 'ready' : 'in_progress' },
          createToolActivity(
            'request_review',
            ready ? 'Ready for human review' : 'Review blocked by unresolved items',
            ready ? 'All required checks passed' : `${Object.values(blockers).reduce((sum, value) => sum + value, 0)} exceptions remain`,
            ready ? 'success' : 'blocked',
          ),
        )
        runtime.commitState(nextState)
        return toolResponse(
          ready ? 'The fictional application is ready for human review.' : 'The application remains a draft. Resolve the listed blockers before review.',
          { ok: true, ready_for_review: ready, blockers, application_status: statusPayload(nextState) },
        )
      },
    },
  ]
}
