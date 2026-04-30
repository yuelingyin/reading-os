-- Create book_contents table for storing extracted EPUB content
CREATE TABLE IF NOT EXISTS book_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  chapter_number INTEGER NOT NULL,
  chapter_title TEXT,
  content TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_book_contents_book_id ON book_contents(book_id);
CREATE INDEX IF NOT EXISTS idx_book_contents_chapter ON book_contents(book_id, chapter_number);

-- Add has_source_file field to books table
ALTER TABLE books ADD COLUMN IF NOT EXISTS has_source_file BOOLEAN DEFAULT false;
ALTER TABLE books ADD COLUMN IF NOT EXISTS total_chapters INTEGER DEFAULT 0;

-- Enable RLS on book_contents
ALTER TABLE book_contents ENABLE ROW LEVEL SECURITY;

-- Create policy for book_contents: only owner can access
CREATE POLICY "Users can only access their own book contents"
ON book_contents
FOR ALL
USING (auth.uid() = user_id);

-- Update books RLS if not already configured
ALTER TABLE books ENABLE ROW LEVEL SECURITY;