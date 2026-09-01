export type SectionId =
  | 'identity'
  | 'passport'
  | 'contact'
  | 'addresses'
  | 'employment'
  | 'education'
  | 'travel'
  | 'family'
  | 'documents'
  | 'review'

export type QuestionType = 'text' | 'date' | 'select' | 'yes-no' | 'textarea'

export type Sensitivity = 'standard' | 'sensitive'

export type VerificationStatus = 'unverified' | 'confirmed' | 'needs_confirmation'

export interface ApplicationSection {
  id: SectionId
  title: string
  shortTitle: string
  description: string
}

export interface ApplicationQuestion {
  id: string
  sectionId: SectionId
  label: string
  helper?: string
  type: QuestionType
  placeholder?: string
  options?: string[]
  required: boolean
  sensitivity: Sensitivity
  evidenceRequired?: boolean
}

export interface AnswerRecord {
  value: string
  source: 'human' | 'fictional_profile' | 'agent'
  sourceLabel: string
  confidence: number
  verificationStatus: VerificationStatus
  sensitivity: Sensitivity
  lastUpdated: string
}

export interface ApplicationConflict {
  id: string
  questionId: string
  message: string
  sources: string[]
}

export interface ToolActivity {
  id: string
  toolName: string
  title: string
  detail: string
  status: 'success' | 'pending' | 'conflict' | 'blocked'
  timestamp: string
}

export interface DerivedInsight {
  id: 'trip_duration' | 'passport_validity' | 'age_at_travel' | 'employment_tenure'
  label: string
  value: string
  explanation: string
  sourceQuestionIds: string[]
  createdAt: string
}

export type StartMode = 'demo' | 'personal'

export type ApplicationPurpose = 'tourism' | 'business' | 'family_visit' | 'undetermined'
export type FundingSource = 'self' | 'employer' | 'host' | 'mixed' | 'undetermined'
export type PriorVisitStatus = 'yes' | 'no' | 'undetermined'

export interface ApplicationFlow {
  purpose: ApplicationPurpose
  funding: FundingSource
  priorVisit: PriorVisitStatus
  labels: string[]
  applicableQuestionIds: string[]
  excludedQuestionIds: string[]
  decisions: string[]
}

export interface ApplicationState {
  hasStarted: boolean
  startMode: StartMode | null
  activeSectionId: SectionId
  answers: Record<string, AnswerRecord>
  conflicts: ApplicationConflict[]
  activity: ToolActivity[]
  derivedInsights: DerivedInsight[]
  flow: ApplicationFlow | null
  reviewStatus: 'not_started' | 'in_progress' | 'ready'
  welcomeNoticeVisible: boolean
}

export interface ApplicationMetrics {
  total: number
  completed: number
  missing: number
  needsConfirmation: number
  conflicts: number
  evidenceNeeded: number
  percentage: number
}
