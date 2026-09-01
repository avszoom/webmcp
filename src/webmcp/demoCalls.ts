export interface PrefillToolCall {
  toolName: string
  label: string
  input: Record<string, unknown>
}

export const approvedProfileDemoCalls: PrefillToolCall[] = [
  {
    toolName: 'provide_identity_information',
    label: 'Adding identity information',
    input: {
      source: 'approved_profile', given_names: 'Alex Jamie', family_name: 'Morgan',
      other_names: 'None', date_of_birth: '1993-06-18', place_of_birth: 'Pune, India',
      national_id: 'DEMO-4839-2011',
    },
  },
  {
    toolName: 'provide_passport_information',
    label: 'Adding passport information',
    input: {
      source: 'approved_profile', passport_number: 'P00048291', issuing_country: 'India',
      issue_date: '2022-02-14', expiration_date: '2032-02-13', holds_second_passport: 'No',
    },
  },
  {
    toolName: 'provide_contact_information',
    label: 'Adding contact information',
    input: {
      source: 'approved_profile', email: 'alex.morgan@example.com', phone: '+1 617 555 0142',
      alternate_phone: '+1 617 555 0198', preferred_contact_method: 'Email',
      public_social_profile: 'linkedin.com/in/alex-morgan-demo',
    },
  },
  {
    toolName: 'provide_address_history',
    label: 'Adding address history',
    input: {
      source: 'approved_profile', current_street: '44 Harbor Street, Apt 8', current_city: 'Boston',
      current_region: 'Massachusetts', current_postal_code: '02110', current_country: 'United States',
    },
  },
  {
    toolName: 'provide_employment_history',
    label: 'Adding employment history',
    input: {
      source: 'approved_profile', current_employer: 'Northstar Labs', job_title: 'Product Designer',
      employment_start_date: '2023-04-03', employer_address: '125 Summer Street, Boston, MA',
      approximate_monthly_income: 'USD 8,500',
    },
  },
  {
    toolName: 'provide_education_information',
    label: 'Adding education information',
    input: {
      source: 'approved_profile', highest_education_level: 'Master’s degree',
      institution_name: 'Rhode Island School of Design', field_of_study: 'Digital Media',
      graduation_date: '2020-05-30',
    },
  },
  {
    toolName: 'provide_travel_information',
    label: 'Adding travel information',
    input: {
      source: 'approved_profile', purpose: 'Business', arrival_date: '2026-10-12',
      departure_date: '2026-10-21', destination_city: 'London',
      address_during_stay: '18 Bloomsbury Square, London',
    },
  },
  {
    toolName: 'provide_family_information',
    label: 'Adding family information',
    input: {
      source: 'approved_profile', marital_status: 'Married', spouse_or_partner_name: 'Taylor Morgan',
      father_full_name: 'Rohan Morgan', mother_full_name: 'Anita Morgan',
    },
  },
]
