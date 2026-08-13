import type { Prisma } from "@/generated/prisma/client";
import { jsonOk, requireSession, withErrorHandling } from "@/lib/api";
import { USER_STORAGE_QUOTA_BYTES } from "@/lib/constants";
import { buildCategoryFilter, serializeFile } from "@/lib/files";
import { prisma } from "@/lib/prisma";
import { listFilesQuerySchema } from "@/lib/validation";

/**
 * GET /api/files
 *
 * The dashboard's list endpoint: the caller's own files, with search, category
 * and visibility filters, sorting, and pagination.
 *
 * Query: `q, category, visibility, sort, order, page, limit`
 * 200: `{ files, pagination, storage }`
 *
 * `ownerId` is part of the `where` clause rather than a check applied after
 * loading, so another user's rows are never read in the first place.
 */
export const GET = withErrorHandling(async (request: Request) => {
  const session = await requireSession();

  const { searchParams } = new URL(request.url);
  const query = listFilesQuerySchema.parse(Object.fromEntries(searchParams));

  const where: Prisma.FileWhereInput = {
    ownerId: session.userId,
    ...(query.q
      ? { filename: { contains: query.q, mode: "insensitive" } }
      : {}),
    ...(query.category ? buildCategoryFilter(query.category) : {}),
    ...(query.visibility ? { isPublic: query.visibility === "public" } : {}),
  };

  const skip = (query.page - 1) * query.limit;

  // One round trip for the page, the filtered count, and the account-wide
  // usage total, instead of three sequential queries.
  const [files, total, usage] = await prisma.$transaction([
    prisma.file.findMany({
      where,
      orderBy: { [query.sort]: query.order },
      skip,
      take: query.limit,
    }),
    prisma.file.count({ where }),
    prisma.file.aggregate({
      where: { ownerId: session.userId },
      _sum: { fileSize: true },
      _count: true,
    }),
  ]);

  const used = usage._sum.fileSize ?? 0;

  return jsonOk({
    files: await Promise.all(files.map(serializeFile)),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
      hasMore: skip + files.length < total,
    },
    storage: {
      used,
      quota: USER_STORAGE_QUOTA_BYTES,
      // Total across the account, unaffected by the active filters.
      fileCount: usage._count,
    },
  });
});
