export interface ApprovedFact {
  questionId: string
  value: string
  sourceLabel: string
}

export const fictionalProfile = {
  id: 'alex-morgan-demo',
  name: 'Alex Morgan',
  label: 'Fictional demo profile',
  description: 'A synthetic profile created only for this WebMCP demonstration.',
  facts: [
    { questionId: 'legal_given_names', value: 'Alex Jamie', sourceLabel: 'Identity profile' },
    { questionId: 'legal_family_name', value: 'Morgan', sourceLabel: 'Identity profile' },
    { questionId: 'other_names', value: 'None', sourceLabel: 'Identity profile' },
    { questionId: 'date_of_birth', value: '1993-06-18', sourceLabel: 'Identity profile' },
    { questionId: 'place_of_birth', value: 'Pune, India', sourceLabel: 'Identity profile' },
    { questionId: 'national_id', value: 'DEMO-4839-2011', sourceLabel: 'Identity profile' },

    { questionId: 'passport_number', value: 'P00048291', sourceLabel: 'Demo passport' },
    { questionId: 'passport_country', value: 'India', sourceLabel: 'Demo passport' },
    { questionId: 'passport_issue_date', value: '2022-02-14', sourceLabel: 'Demo passport' },
    { questionId: 'passport_expiry_date', value: '2032-02-13', sourceLabel: 'Demo passport' },
    { questionId: 'second_passport', value: 'No', sourceLabel: 'Demo passport' },

    { questionId: 'email', value: 'alex.morgan@example.com', sourceLabel: 'Contact profile' },
    { questionId: 'phone', value: '+1 617 555 0142', sourceLabel: 'Contact profile' },
    { questionId: 'alternate_phone', value: '+1 617 555 0198', sourceLabel: 'Contact profile' },
    { questionId: 'preferred_contact', value: 'Email', sourceLabel: 'Contact profile' },
    { questionId: 'social_handle', value: 'linkedin.com/in/alex-morgan-demo', sourceLabel: 'Contact profile' },

    { questionId: 'current_street', value: '44 Harbor Street, Apt 8', sourceLabel: 'Address profile' },
    { questionId: 'current_city', value: 'Boston', sourceLabel: 'Address profile' },
    { questionId: 'current_region', value: 'Massachusetts', sourceLabel: 'Address profile' },
    { questionId: 'current_postal_code', value: '02110', sourceLabel: 'Address profile' },
    { questionId: 'current_country', value: 'United States', sourceLabel: 'Address profile' },

    { questionId: 'current_employer', value: 'Northstar Labs', sourceLabel: 'Demo résumé' },
    { questionId: 'job_title', value: 'Product Designer', sourceLabel: 'Demo résumé' },
    { questionId: 'employment_start', value: '2023-04-03', sourceLabel: 'Demo résumé' },
    { questionId: 'employer_address', value: '125 Summer Street, Boston, MA', sourceLabel: 'Demo résumé' },
    { questionId: 'monthly_income', value: 'USD 8,500', sourceLabel: 'Demo résumé' },

    { questionId: 'highest_education', value: 'Master’s degree', sourceLabel: 'Demo résumé' },
    { questionId: 'institution_name', value: 'Rhode Island School of Design', sourceLabel: 'Demo résumé' },
    { questionId: 'field_of_study', value: 'Digital Media', sourceLabel: 'Demo résumé' },
    { questionId: 'graduation_date', value: '2020-05-30', sourceLabel: 'Demo résumé' },

    { questionId: 'travel_purpose', value: 'Business', sourceLabel: 'Demo itinerary' },
    { questionId: 'arrival_date', value: '2026-10-12', sourceLabel: 'Demo itinerary' },
    { questionId: 'departure_date', value: '2026-10-21', sourceLabel: 'Demo itinerary' },
    { questionId: 'destination_city', value: 'London', sourceLabel: 'Demo itinerary' },
    { questionId: 'stay_address', value: '18 Bloomsbury Square, London', sourceLabel: 'Demo itinerary' },

    { questionId: 'marital_status', value: 'Married', sourceLabel: 'Identity profile' },
    { questionId: 'spouse_name', value: 'Taylor Morgan', sourceLabel: 'Identity profile' },
    { questionId: 'father_name', value: 'Rohan Morgan', sourceLabel: 'Identity profile' },
    { questionId: 'mother_name', value: 'Anita Morgan', sourceLabel: 'Identity profile' },
  ] satisfies ApprovedFact[],
}

export const approvedSourceGroups = [
  { name: 'Identity dossier', count: 15, state: 'Approved' },
  { name: 'Demo résumé', count: 9, state: 'Approved' },
  { name: 'Demo itinerary', count: 5, state: 'Approved' },
  { name: 'Contact & address', count: 10, state: 'Approved' },
]
