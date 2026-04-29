export type BookStatus = 'to-read' | 'in-progress' | 'completed'

export type ReadingMode = 'skim' | 'deep'

export type BookGenre = 'philosophy' | 'science' | 'business' | 'literature'

export const READING_MODE_LABELS: Record<ReadingMode, string> = {
  'skim': '粗读模式',
  'deep': '精读模式',
}

export const BOOK_GENRE_LABELS: Record<BookGenre, string> = {
  'philosophy': '哲学/社科',
  'science': '硬科学/数学',
  'business': '商业/工具',
  'literature': '文学/小说',
}

export interface DailyPlan {
  [day: string]: {
    chapters: number[]
    target_date: string
  }
}

export interface Profile {
  id: string
  openai_api_key: string | null
  created_at: string
}

export interface Category {
  id: string
  user_id: string
  name: string
  color: string
  created_at: string
}

export interface Book {
  id: string
  user_id: string
  title: string
  author: string | null
  cover_url: string | null
  status: BookStatus
  reading_mode: ReadingMode
  book_genre: BookGenre | null
  current_chapter: number
  reading_motivation: string | null
  core_questions: string[] | null
  daily_plan: DailyPlan | null
  category_id: string | null
  created_at: string
  updated_at: string
  categories?: Category | null
}

export interface ChapterReview {
  id: string
  user_id: string
  book_id: string
  chapter_number: number
  chapter_title: string | null
  key_points: string[] | null
  answers_core_questions: boolean | null
  reflection: string | null
  created_at: string
}

export type ActionItemStatus = 'pending' | 'in-progress' | 'completed'

export interface ActionItem {
  id: string
  user_id: string
  book_id: string
  action_description: string
  status: ActionItemStatus
  due_date: string | null
  created_at: string
}

export interface ExtendedReading {
  id: string
  user_id: string
  book_id: string
  keywords: string[] | null
  recommended_book_title: string | null
  recommended_book_author: string | null
  is_read: boolean
  created_at: string
}

export interface GatekeeperResult {
  passed: boolean
  feedback: string
  actionable_advice: string
}