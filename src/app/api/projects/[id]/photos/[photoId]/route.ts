import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSupabaseAdmin, PHOTOS_BUCKET } from '@/lib/supabase'
import { ok, notFound, serverError } from '@/lib/api'
import { requireSession, requireRole, ApiError } from '@/lib/middleware'
import { Role } from '@prisma/client'

const MANAGEMENT_ROLES: Role[] = [Role.OWNER, Role.PROJECT_MANAGER, Role.PLATFORM_ADMIN]

function getPhotoId(req: NextRequest): string {
  return req.nextUrl.pathname.split('/').pop() ?? ''
}

export async function DELETE(req: NextRequest) {
  try {
    const session = requireSession(req)
    requireRole(session, MANAGEMENT_ROLES)
    const photoId = getPhotoId(req)

    const photo = await prisma.projectPhoto.findUnique({ where: { id: photoId } })
    if (!photo) return notFound('Photo')

    // Extract storage path from URL
    const url = new URL(photo.storageUrl)
    const pathParts = url.pathname.split(`/${PHOTOS_BUCKET}/`)
    const storagePath = pathParts[1] ?? ''

    if (storagePath) {
      const { error } = await getSupabaseAdmin().storage.from(PHOTOS_BUCKET).remove([storagePath])
      if (error) console.error('Supabase delete error:', error)
    }

    await prisma.projectPhoto.delete({ where: { id: photoId } })

    return ok({ deleted: true })
  } catch (e) {
    if (e instanceof ApiError) {
      return NextResponse.json({ data: null, error: e.message, meta: null }, { status: e.status })
    }
    return serverError(e)
  }
}
