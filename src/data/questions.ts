import type { ApplicationQuestion, ApplicationSection } from '../types'

export const sections: ApplicationSection[] = [
  {
    id: 'identity',
    title: 'Personal identity',
    shortTitle: 'Identity',
    description: 'Your legal identity and birth information.',
  },
  {
    id: 'passport',
    title: 'Passport & travel document',
    shortTitle: 'Passport',
    description: 'Details from the document you plan to travel with.',
  },
  {
    id: 'contact',
    title: 'Contact information',
    shortTitle: 'Contact',
    description: 'How application staff can reach you.',
  },
  {
    id: 'addresses',
    title: 'Address history',
    shortTitle: 'Addresses',
    description: 'Your current residence and recent address history.',
  },
  {
    id: 'employment',
    title: 'Employment history',
    shortTitle: 'Employment',
    description: 'Your present role and recent work history.',
  },
  {
    id: 'education',
    title: 'Education',
    shortTitle: 'Education',
    description: 'Your highest and most relevant education.',
  },
  {
    id: 'travel',
    title: 'Travel information',
    shortTitle: 'Travel',
    description: 'The purpose, timing, and history of your travel.',
  },
  {
    id: 'family',
    title: 'Family information',
    shortTitle: 'Family',
    description: 'Immediate family and relevant relationships.',
  },
  {
    id: 'documents',
    title: 'Supporting documents',
    shortTitle: 'Documents',
    description: 'Evidence that supports this application.',
  },
  {
    id: 'review',
    title: 'Review & declarations',
    shortTitle: 'Review',
    description: 'Confirm accuracy and prepare the application for human review.',
  },
]

const q = (
  question: Omit<ApplicationQuestion, 'required' | 'sensitivity'> &
    Partial<Pick<ApplicationQuestion, 'required' | 'sensitivity'>>,
): ApplicationQuestion => ({
  required: true,
  sensitivity: 'standard',
  ...question,
})

export const questions: ApplicationQuestion[] = [
  q({ id: 'legal_given_names', sectionId: 'identity', label: 'Given name(s)', type: 'text', placeholder: 'As shown on your passport' }),
  q({ id: 'legal_family_name', sectionId: 'identity', label: 'Family name', type: 'text', placeholder: 'As shown on your passport' }),
  q({ id: 'other_names', sectionId: 'identity', label: 'Other names used', type: 'text', placeholder: 'Leave blank if none', required: false }),
  q({ id: 'date_of_birth', sectionId: 'identity', label: 'Date of birth', type: 'date', sensitivity: 'sensitive' }),
  q({ id: 'place_of_birth', sectionId: 'identity', label: 'City and country of birth', type: 'text', placeholder: 'City, country' }),
  q({ id: 'national_id', sectionId: 'identity', label: 'National identification number', helper: 'This remains pending until you confirm it.', type: 'text', placeholder: 'Confirmation required', sensitivity: 'sensitive' }),

  q({ id: 'passport_number', sectionId: 'passport', label: 'Passport number', helper: 'Sensitive values always require human confirmation.', type: 'text', placeholder: 'Confirmation required', sensitivity: 'sensitive' }),
  q({ id: 'passport_country', sectionId: 'passport', label: 'Issuing country', type: 'select', options: ['India', 'United States', 'United Kingdom', 'Canada', 'Australia', 'Other'] }),
  q({ id: 'passport_issue_date', sectionId: 'passport', label: 'Issue date', type: 'date' }),
  q({ id: 'passport_expiry_date', sectionId: 'passport', label: 'Expiration date', type: 'date' }),
  q({ id: 'second_passport', sectionId: 'passport', label: 'Do you hold another valid passport?', type: 'yes-no' }),

  q({ id: 'email', sectionId: 'contact', label: 'Email address', type: 'text', placeholder: 'name@example.com' }),
  q({ id: 'phone', sectionId: 'contact', label: 'Primary phone number', type: 'text', placeholder: '+1 555 000 0000' }),
  q({ id: 'alternate_phone', sectionId: 'contact', label: 'Alternate phone number', type: 'text', required: false }),
  q({ id: 'preferred_contact', sectionId: 'contact', label: 'Preferred contact method', type: 'select', options: ['Email', 'Phone', 'Either'] }),
  q({ id: 'social_handle', sectionId: 'contact', label: 'Public social profile', helper: 'Optional.', type: 'text', required: false }),

  q({ id: 'current_street', sectionId: 'addresses', label: 'Current street address', type: 'text', placeholder: 'Street and unit' }),
  q({ id: 'current_city', sectionId: 'addresses', label: 'Current city', type: 'text' }),
  q({ id: 'current_region', sectionId: 'addresses', label: 'State or region', type: 'text' }),
  q({ id: 'current_postal_code', sectionId: 'addresses', label: 'Postal code', type: 'text' }),
  q({ id: 'current_country', sectionId: 'addresses', label: 'Country of residence', type: 'select', options: ['United States', 'India', 'United Kingdom', 'Canada', 'Australia', 'Other'] }),
  q({ id: 'previous_address', sectionId: 'addresses', label: 'Previous address', helper: 'Your most recent address before the current one.', type: 'textarea', placeholder: 'Street, city, region, postal code, country' }),

  q({ id: 'current_employer', sectionId: 'employment', label: 'Current employer', type: 'text' }),
  q({ id: 'job_title', sectionId: 'employment', label: 'Job title', type: 'text' }),
  q({ id: 'employment_start', sectionId: 'employment', label: 'Employment start date', type: 'date' }),
  q({ id: 'employer_address', sectionId: 'employment', label: 'Employer address', type: 'textarea' }),
  q({ id: 'monthly_income', sectionId: 'employment', label: 'Approximate monthly income', type: 'text', sensitivity: 'sensitive' }),
  q({ id: 'previous_employer', sectionId: 'employment', label: 'Previous employer', type: 'text', placeholder: 'Most recent previous employer' }),

  q({ id: 'highest_education', sectionId: 'education', label: 'Highest education level', type: 'select', options: ['Secondary school', 'Bachelor’s degree', 'Master’s degree', 'Doctorate', 'Other'] }),
  q({ id: 'institution_name', sectionId: 'education', label: 'Institution name', type: 'text' }),
  q({ id: 'field_of_study', sectionId: 'education', label: 'Field of study', type: 'text' }),
  q({ id: 'graduation_date', sectionId: 'education', label: 'Graduation date', type: 'date' }),

  q({ id: 'travel_purpose', sectionId: 'travel', label: 'Primary purpose of travel', type: 'select', options: ['Tourism', 'Business', 'Study', 'Family visit', 'Other'] }),
  q({ id: 'arrival_date', sectionId: 'travel', label: 'Planned arrival date', type: 'date' }),
  q({ id: 'departure_date', sectionId: 'travel', label: 'Planned departure date', type: 'date' }),
  q({ id: 'destination_city', sectionId: 'travel', label: 'Primary destination city', type: 'text' }),
  q({ id: 'stay_address', sectionId: 'travel', label: 'Address during stay', type: 'textarea' }),
  q({ id: 'prior_visits', sectionId: 'travel', label: 'Have you visited before?', type: 'yes-no' }),
  q({ id: 'prior_refusal', sectionId: 'travel', label: 'Have you ever been refused a visa?', helper: 'The agent must never infer this answer.', type: 'yes-no', sensitivity: 'sensitive' }),

  q({ id: 'marital_status', sectionId: 'family', label: 'Marital status', type: 'select', options: ['Single', 'Married', 'Divorced', 'Widowed', 'Prefer not to say'] }),
  q({ id: 'spouse_name', sectionId: 'family', label: 'Spouse or partner name', type: 'text', required: false }),
  q({ id: 'father_name', sectionId: 'family', label: 'Father’s full name', type: 'text' }),
  q({ id: 'mother_name', sectionId: 'family', label: 'Mother’s full name', type: 'text' }),
  q({ id: 'dependants', sectionId: 'family', label: 'Number of dependants', type: 'text' }),
  q({ id: 'family_at_destination', sectionId: 'family', label: 'Immediate family at destination?', type: 'yes-no' }),

  q({ id: 'passport_scan', sectionId: 'documents', label: 'Passport biographic page', type: 'text', placeholder: 'Not attached', evidenceRequired: true }),
  q({ id: 'employment_letter', sectionId: 'documents', label: 'Employment verification', type: 'text', placeholder: 'Not attached', evidenceRequired: true }),
  q({ id: 'bank_statement', sectionId: 'documents', label: 'Proof of funds', type: 'text', placeholder: 'Not attached', evidenceRequired: true, sensitivity: 'sensitive' }),
  q({ id: 'travel_itinerary', sectionId: 'documents', label: 'Travel itinerary', type: 'text', placeholder: 'Not attached', evidenceRequired: true }),
  q({ id: 'supporting_letter', sectionId: 'documents', label: 'Additional supporting letter', type: 'text', placeholder: 'Optional', required: false, evidenceRequired: true }),

  q({ id: 'review_name_match', sectionId: 'review', label: 'Identity details match the passport', type: 'yes-no' }),
  q({ id: 'review_dates', sectionId: 'review', label: 'Travel dates are accurate', type: 'yes-no' }),
  q({ id: 'review_history', sectionId: 'review', label: 'Address and employment history is complete', type: 'yes-no' }),
  q({ id: 'review_sensitive', sectionId: 'review', label: 'Sensitive information has been confirmed', type: 'yes-no' }),
  q({ id: 'review_declaration', sectionId: 'review', label: 'I confirm this application is accurate and ready to submit', type: 'yes-no', sensitivity: 'sensitive' }),
]

export const questionsBySection = Object.fromEntries(
  sections.map((section) => [
    section.id,
    questions.filter((question) => question.sectionId === section.id),
  ]),
)
