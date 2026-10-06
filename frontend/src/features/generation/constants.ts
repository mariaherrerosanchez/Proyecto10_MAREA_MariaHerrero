import type { Platform } from '../../generation/types'

export const suggestedNiches = [
  'Tecnología',
  'Inteligencia Artificial',
  'QA / Testing',
  'Marketing',
  'Educación',
  'Salud',
  'Finanzas',
  'Belleza',
  'Gastronomía',
  'Inmobiliario',
  'Empleo / Carrera profesional',
] as const

export const languageOptions = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
  { value: 'it', label: 'Italiano' },
] as const

export const objectiveOptions = ['Divulgación', 'Informar', 'Inspirar', 'Educar', 'Promocionar'] as const

export const toneOptions = ['Cercano y profesional', 'Claro y directo', 'Inspirador', 'Experto y didáctico'] as const

export const platformLabels: Record<Platform, string> = {
  linkedin: 'LinkedIn',
  instagram: 'Instagram',
  facebook: 'Facebook',
  blog: 'Blog',
}
