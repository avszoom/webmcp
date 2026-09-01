import type { PrefillToolCall } from '../webmcp/demoCalls'

export interface ConciergeInterviewAnswers {
  travelPurpose: string
  destinationCity: string
  arrivalDate: string
  departureDate: string
  currentEmployer: string
  jobTitle: string
  employmentStart: string
  currentCity: string
  currentCountry: string
}

export const emptyConciergeInterview: ConciergeInterviewAnswers = {
  travelPurpose: '',
  destinationCity: '',
  arrivalDate: '',
  departureDate: '',
  currentEmployer: '',
  jobTitle: '',
  employmentStart: '',
  currentCity: '',
  currentCountry: '',
}

export function createPersonalConciergeCalls(
  answers: ConciergeInterviewAnswers,
): PrefillToolCall[] {
  return [
    {
      toolName: 'provide_travel_information',
      label: 'Structuring your trip answer',
      input: {
        source: 'user_statement',
        purpose: answers.travelPurpose,
        destination_city: answers.destinationCity,
        arrival_date: answers.arrivalDate,
        departure_date: answers.departureDate,
      },
    },
    {
      toolName: 'provide_employment_history',
      label: 'Structuring your work answer',
      input: {
        source: 'user_statement',
        current_employer: answers.currentEmployer,
        job_title: answers.jobTitle,
        employment_start_date: answers.employmentStart,
      },
    },
    {
      toolName: 'provide_address_history',
      label: 'Structuring your residence answer',
      input: {
        source: 'user_statement',
        current_city: answers.currentCity,
        current_country: answers.currentCountry,
      },
    },
  ]
}
