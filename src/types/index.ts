export type BookStatus = 'to-read' | 'in-progress' | 'completed'

export interface DailyPlan {
  [day: string]: {
    chapters: number[]
    target_date: string
  }
}

export interface Book {
  id: string
  user_id: string
  title: string
  author: string | null
  cover_url: string | null
  status: BookStatus
  reading_motivation: string | null
  core_questions: string[] | null
  daily_plan: DailyPlan | null
  created_at: string
  updated_at: string
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

export type NewBook = Omit<Book, 'id' | 'created_at' | 'updated_at'>