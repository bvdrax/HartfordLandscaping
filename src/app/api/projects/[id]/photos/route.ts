import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSupabaseAdmin, PHOTOS_BUCKET } from '@/lib/supabase'
import { ok, notFound, serverError, err } from '@/lib/api'
import { requireSession, requireRole, ApiError } from '@/lib/middleware'
import { Role, PhotoCategory } from '@prisma/client'

const MANAGEMENT_ROLES: Role[] = [Role.OWNER, Role.PROJECT_MANAGER, Role.PLATFORM_ADMIN]
const VALID_CATEGORIES = Object.values(PhotoCategory)
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']

function getId(req: NextRequest): string {
  const parts = req.nextUrl.pathname.split('/')
  const photosIdx = parts.indexOf('photos')
  return photosIdx > 0 ? parts[photosIdx - 1] : ''
}

export async function GET(req: NextRequest) {
  try {
    const session = requireSession(req)
    const projectId = getId(req)

    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true, crewId: true } })
    if (!project) return notFound('Project')

    if (session.role === Role.FIELD_WORKER || session.role === Role.SUBCONTRACTOR) {
      const worker = await prisma.workerProfile.findUnique({ where: { userId: session.userId } })
      if (project.crewId !== worker?.crewId) {
        return NextResponse.json({ data: null, error: 'Forbidden', meta: null }, { status: 403 })
      }
    }

    const category = req.nextUrl.searchParams.get('category') as PhotoCategory | null
    const photos = await prisma.projectPhoto.findMany({
      where: { projectId, ...(category ? { category } : {}) },
      include: { uploadedBy: { select: { firstName: true, lastName: true } } },
      orderBy: { uploadedAt: 'desc' },
    })

    return ok({ photos })
  } catch (e) {
    if (e instanceof ApiError) {
      return NextResponse.json({ data: null, error: e.message, meta: null }, { status: e.status })
    }
    return serverError(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = requireSession(req)
    requireRole(session, [...MANAGEMENT_ROLES, Role.FIELD_WORKER, Role.SUBCONTRACTOR])
    const projectId = getId(req)

    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true, crewId: true } })
    if (!project) return notFound('Project')

    // Field workers can only upload to their crew's projects
    if (session.role === Role.FIELD_WORKER || session.role === Role.SUBCONTRACTOR) {
      const worker = await prisma.workerProfile.findUnique({ where: { userId: session.userId } })
      if (project.crewId !== worker?.crewId) {
        return NextResponse.json({ data: null, error: 'Forbidden', meta: null }, { status: 403 })
      }
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const category = formData.get('category') as string | null
    const caption = formData.get('caption') as string | null
    const areaTag = formData.get('areaTag') as string | null

    if (!file) return err('File is required')
    if (!category || !VALID_CATEGORIES.includes(category as PhotoCategory)) return err('Valid category is required')
    if (file.size > MAX_FILE_SIZE) return err('File too large (max 10 MB)')
    if (!ALLOWED_TYPES.includes(file.type)) return err('Invalid file type')

    const ext = file.name.split('.').pop() ?? 'jpg'
    const storagePath = `${projectId}/${crypto.randomUUID()}.${ext}`

    const arrayBuffer = await file.arrayBuffer()
    const supabase = getSupabaseAdmin()
    const { error: uploadError } = await supabase.storage
      .from(PHOTOS_BUCKET)
      .upload(storagePath, arrayBuffer, { contentType: file.type, upsert: false })

    if (uploadError) {
      console.error('Supabase upload error:', uploadError)
      return err('Failed to upload file')
    }

    const { data: urlData } = supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(storagePath)

    const photo = await prisma.projectPhoto.create({
      data: {
        projectId,
        uploadedByUserId: session.userId,
        storageUrl: urlData.publicUrl,
        category: category as PhotoCategory,
        caption: caption || null,
        areaTag: areaTag || null,
      },
    })

    return ok({ photo })
  } catch (e) {
    if (e instanceof ApiError) {
      return NextResponse.json({ data: null, error: e.message, meta: null }, { status: e.status })
    }
    return serverError(e)
  }
}
