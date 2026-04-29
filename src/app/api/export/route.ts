import { NextResponse } from 'next/server'
import { createClient, getUser } from '@/lib/supabase/server'
import { jsPDF } from 'jspdf'

export async function GET(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.redirect(new URL('/login', request.url))

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'books' // books, actions, all

  const supabase = await createClient()

  if (type === 'books' || type === 'all') {
    const { data: books } = await supabase
      .from('books')
      .select('*, categories(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    const doc = new jsPDF()
    doc.setFontSize(20)
    doc.text('Reading OS - My Bookshelf', 20, 20)
    doc.setFontSize(10)
    doc.text(`Generated: ${new Date().toLocaleDateString('zh-CN')}`, 20, 30)

    let y = 45
    doc.setFontSize(14)
    doc.text('Books', 20, y)
    y += 10

    if (books && books.length > 0) {
      books.forEach((book: any) => {
        if (y > 270) { doc.addPage(); y = 20 }
        doc.setFontSize(12)
        doc.text(book.title, 20, y)
        y += 6
        doc.setFontSize(10)
        if (book.author) doc.text(`Author: ${book.author}`, 25, y)
        y += 5
        doc.text(`Status: ${book.status === 'to-read' ? 'To Read' : book.status === 'in-progress' ? 'In Progress' : 'Completed'}`, 25, y)
        if (book.categories) {
          y += 5
          doc.text(`Category: ${book.categories.name}`, 25, y)
        }
        if (book.reading_motivation) {
          y += 5
          const lines = doc.splitTextToSize(`Motivation: ${book.reading_motivation}`, 170)
          if (y + lines.length * 5 > 270) { doc.addPage(); y = 20 }
          doc.text(lines, 25, y)
          y += lines.length * 5
        }
        y += 10
      })
    } else {
      doc.setFontSize(10)
      doc.text('No books yet.', 25, y)
    }

    if (type === 'books') {
      const pdfOutput = doc.output('arraybuffer')
      return new NextResponse(pdfOutput, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="reading-os-books.pdf"',
        },
      })
    }

    // For 'all', we continue to actions below
  }

  if (type === 'actions' || type === 'all') {
    const doc = new jsPDF()
    doc.setFontSize(20)
    doc.text('Reading OS - Action Items', 20, 20)
    doc.setFontSize(10)
    doc.text(`Generated: ${new Date().toLocaleDateString('zh-CN')}`, 20, 30)

    let y = 45

    const { data: actions } = await supabase
      .from('action_items')
      .select('*, books(title)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    doc.setFontSize(14)
    doc.text('Action Items', 20, y)
    y += 10

    if (actions && actions.length > 0) {
      actions.forEach((action: any) => {
        if (y > 270) { doc.addPage(); y = 20 }
        doc.setFontSize(12)
        const statusIcon = action.status === 'completed' ? '[x]' : '[ ]'
        doc.text(`${statusIcon} ${action.action_description}`, 20, y)
        y += 6
        doc.setFontSize(10)
        if (action.books) doc.text(`From: ${action.books.title}`, 25, y)
        if (action.due_date) {
          y += 5
          doc.text(`Due: ${action.due_date}`, 25, y)
        }
        y += 10
      })
    } else {
      doc.setFontSize(10)
      doc.text('No action items yet.', 25, y)
    }

    const pdfOutput = doc.output('arraybuffer')
    return new NextResponse(pdfOutput, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="reading-os-${type}.pdf"`,
      },
    })
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
}
