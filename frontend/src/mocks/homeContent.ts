export type TrendMock = {
  description: string
  image?: string
  platform: 'LinkedIn' | 'Instagram' | 'Facebook' | 'Blog'
  title: string
  visualTone: 'work' | 'coast' | 'horizon' | 'editorial'
}

export type RecentContentMock = {
  icon: 'article' | 'gallery' | 'post'
  meta: string
  title: string
  type: string
}

// Presentation-only data. Radar and Biblioteca will replace these mocks with their own data sources.
export const homeTrendMocks: TrendMock[] = [
  {
    platform: 'LinkedIn',
    image: trendLinkedin,
    title: 'IA en el día a día profesional',
    description: 'Experiencias reales, casos de uso y aprendizajes que inspiran.',
    visualTone: 'work',
  },
  {
    platform: 'Instagram',
    image: trendInstagram,
    title: 'Vida slow y productividad',
    description: 'Cómo la tecnología puede ayudarnos a vivir con más calma.',
    visualTone: 'coast',
  },
  {
    platform: 'Facebook',
    image: trendFacebook,
    title: 'Planes y experiencias en la costa',
    description: 'Ideas para disfrutar del entorno y compartir lo cercano.',
    visualTone: 'horizon',
  },
  {
    platform: 'Blog',
    image: trendBlog,
    title: 'Últimos avances en IA generativa',
    description: 'Novedades, investigaciones y oportunidades para explorar.',
    visualTone: 'editorial',
  },
]

export const homeRecentContentMocks: RecentContentMock[] = [
  {
    type: 'Post LinkedIn',
    title: 'IA y productividad',
    meta: 'Última edición: hoy, 10:24',
    icon: 'post',
  },
  {
    type: 'Carrusel Instagram',
    title: 'Consejos rápidos',
    meta: 'Última edición: ayer, 16:15',
    icon: 'gallery',
  },
  {
    type: 'Artículo Blog',
    title: 'Tendencias en IA',
    meta: 'Última edición: 22 sept 2026',
    icon: 'article',
  },
]
import trendBlog from '../assets/home/trend-blog.png'
import trendFacebook from '../assets/home/trend-facebook.png'
import trendInstagram from '../assets/home/trend-instagram.png'
import trendLinkedin from '../assets/home/trend-linkedin.png'
