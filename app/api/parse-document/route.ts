import { NextRequest, NextResponse } from 'next/server'
import { parseDocument2MD } from '@/lib/2md'

export const maxDuration = 60 // Allow up to 60s for large PDF parsing

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { success: false, error: '未找到上傳檔案' },
        { status: 400 }
      )
    }

    // Limit file size to 25MB
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: '檔案大小超過 25MB 上限' },
        { status: 400 }
      )
    }

    const filename = file.name || 'document.pdf'
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const result = await parseDocument2MD(buffer, filename)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || '檔案解析失敗' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      filename: result.filename,
      title: result.title,
      pages: result.pages,
      size: file.size,
      content: result.content
    })
  } catch (error: any) {
    console.error('[API /api/parse-document] Error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || '內部伺服器錯誤' },
      { status: 500 }
    )
  }
}
