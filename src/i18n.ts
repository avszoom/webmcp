import type { SectionId } from './types'

export type Locale = 'en' | 'es' | 'fr' | 'hi'

const strings = {
  en: {
    language: 'Language', help: 'Help', application: 'Online Nonimmigrant Visa Application',
    subtitle: 'Tourist and visitor visa · Form DS-160 style demonstration', saved: 'Draft saved',
    reset: 'Start over', original: 'Original application', questions: 'questions', completed: 'Completed',
    missing: 'Remaining', confirm: 'To confirm', evidence: 'Evidence', section: 'Section', answered: 'answered',
    saveContinue: 'Save and continue', required: 'Fields marked * are required for review.',
  },
  es: {
    language: 'Idioma', help: 'Ayuda', application: 'Solicitud de visa de no inmigrante en línea',
    subtitle: 'Visa de turista y visitante · Demostración estilo formulario DS-160', saved: 'Borrador guardado',
    reset: 'Empezar de nuevo', original: 'Solicitud original', questions: 'preguntas', completed: 'Completadas',
    missing: 'Restantes', confirm: 'Por confirmar', evidence: 'Pruebas', section: 'Sección', answered: 'respondidas',
    saveContinue: 'Guardar y continuar', required: 'Los campos marcados con * son obligatorios.',
  },
  fr: {
    language: 'Langue', help: 'Aide', application: 'Demande de visa non-immigrant en ligne',
    subtitle: 'Visa de tourisme et de visite · Démonstration de type DS-160', saved: 'Brouillon enregistré',
    reset: 'Recommencer', original: 'Demande initiale', questions: 'questions', completed: 'Terminées',
    missing: 'Restantes', confirm: 'À confirmer', evidence: 'Justificatifs', section: 'Section', answered: 'répondues',
    saveContinue: 'Enregistrer et continuer', required: 'Les champs marqués * sont obligatoires.',
  },
  hi: {
    language: 'भाषा', help: 'सहायता', application: 'ऑनलाइन गैर-आप्रवासी वीज़ा आवेदन',
    subtitle: 'पर्यटक और आगंतुक वीज़ा · DS-160 शैली प्रदर्शन', saved: 'ड्राफ्ट सहेजा गया',
    reset: 'फिर से शुरू करें', original: 'मूल आवेदन', questions: 'प्रश्न', completed: 'पूर्ण',
    missing: 'शेष', confirm: 'पुष्टि करें', evidence: 'प्रमाण', section: 'अनुभाग', answered: 'उत्तर',
    saveContinue: 'सहेजें और आगे बढ़ें', required: '* चिह्नित फ़ील्ड आवश्यक हैं।',
  },
} as const

export type CopyKey = keyof typeof strings.en

export function t(locale: Locale, key: CopyKey) {
  return strings[locale][key]
}

const sectionNames: Record<Locale, Partial<Record<SectionId, string>>> = {
  en: {},
  es: { identity: 'Identidad', passport: 'Pasaporte', contact: 'Contacto', addresses: 'Direcciones', employment: 'Empleo', education: 'Educación', travel: 'Viaje', family: 'Familia', documents: 'Documentos', review: 'Revisión' },
  fr: { identity: 'Identité', passport: 'Passeport', contact: 'Coordonnées', addresses: 'Adresses', employment: 'Emploi', education: 'Études', travel: 'Voyage', family: 'Famille', documents: 'Documents', review: 'Révision' },
  hi: { identity: 'पहचान', passport: 'पासपोर्ट', contact: 'संपर्क', addresses: 'पते', employment: 'रोज़गार', education: 'शिक्षा', travel: 'यात्रा', family: 'परिवार', documents: 'दस्तावेज़', review: 'समीक्षा' },
}

export function sectionName(locale: Locale, sectionId: SectionId, fallback: string) {
  return sectionNames[locale][sectionId] ?? fallback
}

const questionNames: Record<Locale, Record<string, string>> = {
  en: {},
  es: {
    travel_purpose: 'Propósito principal del viaje', arrival_date: 'Fecha prevista de llegada', departure_date: 'Fecha prevista de salida',
    destination_city: 'Ciudad principal de destino', stay_address: 'Dirección durante la estancia', prior_visits: '¿Ha visitado antes?',
    prior_refusal: '¿Alguna vez le han negado una visa?', legal_given_names: 'Nombre(s)', legal_family_name: 'Apellido',
  },
  fr: {
    travel_purpose: 'Objet principal du voyage', arrival_date: "Date d’arrivée prévue", departure_date: 'Date de départ prévue',
    destination_city: 'Ville principale de destination', stay_address: 'Adresse pendant le séjour', prior_visits: 'Avez-vous déjà visité le pays ?',
    prior_refusal: 'Un visa vous a-t-il déjà été refusé ?', legal_given_names: 'Prénom(s)', legal_family_name: 'Nom de famille',
  },
  hi: {
    travel_purpose: 'यात्रा का मुख्य उद्देश्य', arrival_date: 'नियोजित आगमन तिथि', departure_date: 'नियोजित प्रस्थान तिथि',
    destination_city: 'मुख्य गंतव्य शहर', stay_address: 'ठहरने का पता', prior_visits: 'क्या आपने पहले यात्रा की है?',
    prior_refusal: 'क्या कभी वीज़ा अस्वीकार हुआ है?', legal_given_names: 'दिया गया नाम', legal_family_name: 'उपनाम',
  },
}

export function questionName(locale: Locale, questionId: string, fallback: string) {
  return questionNames[locale][questionId] ?? fallback
}
