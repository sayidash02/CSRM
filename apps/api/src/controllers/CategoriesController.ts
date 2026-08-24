import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { catchAsync } from '../lib/catchAsync';

export const getCategories = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const categories = await prisma.categories.findMany({
    include: {
      sub_categories: {
        orderBy: { name: 'asc' }
      }
    },
    orderBy: { name: 'asc' }
  });

  const serialized = categories.map(c => ({
    id: c.id.toString(),
    name: c.name,
    sub_categories: c.sub_categories.map(s => ({
      id: s.id.toString(),
      category_id: s.category_id.toString(),
      name: s.name
    }))
  }));

  res.status(200).json({ data: serialized });
});

export const createCategory = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { name } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: 'Nama kategori wajib diisi' });
    return;
  }

  const cleanName = name.trim();
  const existing = await prisma.categories.findFirst({
    where: { name: cleanName }
  });

  if (existing) {
    res.status(409).json({ error: `Kategori '${cleanName}' sudah ada` });
    return;
  }

  const category = await prisma.categories.create({
    data: { name: cleanName }
  });

  res.status(201).json({
    data: {
      id: category.id.toString(),
      name: category.name,
      sub_categories: []
    }
  });
});

export const updateCategory = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { name } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: 'Nama kategori wajib diisi' });
    return;
  }

  const cleanName = name.trim();
  const targetId = BigInt(id as string);

  const existing = await prisma.categories.findFirst({
    where: { name: cleanName, id: { not: targetId } }
  });

  if (existing) {
    res.status(409).json({ error: `Kategori dengan nama '${cleanName}' sudah digunakan` });
    return;
  }

  const updated = await prisma.categories.update({
    where: { id: targetId },
    data: { name: cleanName },
    include: { sub_categories: true }
  });

  res.status(200).json({
    data: {
      id: updated.id.toString(),
      name: updated.name,
      sub_categories: updated.sub_categories.map(s => ({
        id: s.id.toString(),
        category_id: s.category_id.toString(),
        name: s.name
      }))
    }
  });
});

export const deleteCategory = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const targetId = BigInt(id as string);

  const category = await prisma.categories.findUnique({
    where: { id: targetId }
  });

  if (!category) {
    res.status(404).json({ error: 'Kategori tidak ditemukan' });
    return;
  }

  const inUseCount = await prisma.daily_activities.count({
    where: { category_id: targetId, is_deleted: false }
  });

  if (inUseCount > 0) {
    res.status(400).json({
      error: `Kategori '${category.name}' tidak dapat dihapus karena sedang digunakan oleh ${inUseCount} kegiatan aktif.`
    });
    return;
  }

  // Delete associated sub_categories first then the category
  await prisma.sub_categories.deleteMany({
    where: { category_id: targetId }
  });

  await prisma.categories.delete({
    where: { id: targetId }
  });

  res.status(200).json({ message: `Kategori '${category.name}' berhasil dihapus` });
});

export const createSubCategory = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const categoryIdParam = req.params.categoryId || req.body.category_id;
  const { name } = req.body;

  if (!categoryIdParam) {
    res.status(400).json({ error: 'Kategori induk wajib dipilih' });
    return;
  }

  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: 'Nama sub-kategori wajib diisi' });
    return;
  }

  const cleanName = name.trim();
  const categoryId = BigInt(categoryIdParam as string);

  const category = await prisma.categories.findUnique({
    where: { id: categoryId }
  });

  if (!category) {
    res.status(404).json({ error: 'Kategori induk tidak ditemukan' });
    return;
  }

  const existing = await prisma.sub_categories.findFirst({
    where: { category_id: categoryId, name: cleanName }
  });

  if (existing) {
    res.status(409).json({ error: `Sub-kategori '${cleanName}' sudah ada pada kategori '${category.name}'` });
    return;
  }

  const subCategory = await prisma.sub_categories.create({
    data: {
      category_id: categoryId,
      name: cleanName
    }
  });

  res.status(201).json({
    data: {
      id: subCategory.id.toString(),
      category_id: subCategory.category_id.toString(),
      name: subCategory.name
    }
  });
});

export const updateSubCategory = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { name, category_id } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: 'Nama sub-kategori wajib diisi' });
    return;
  }

  const cleanName = name.trim();
  const targetId = BigInt(id as string);

  const current = await prisma.sub_categories.findUnique({
    where: { id: targetId }
  });

  if (!current) {
    res.status(404).json({ error: 'Sub-kategori tidak ditemukan' });
    return;
  }

  const targetCategoryId = category_id ? BigInt(category_id as string) : current.category_id;

  const existing = await prisma.sub_categories.findFirst({
    where: {
      category_id: targetCategoryId,
      name: cleanName,
      id: { not: targetId }
    }
  });

  if (existing) {
    res.status(409).json({ error: `Sub-kategori '${cleanName}' sudah ada pada kategori tersebut` });
    return;
  }

  const updated = await prisma.sub_categories.update({
    where: { id: targetId },
    data: {
      name: cleanName,
      ...(category_id ? { category_id: targetCategoryId } : {})
    }
  });

  res.status(200).json({
    data: {
      id: updated.id.toString(),
      category_id: updated.category_id.toString(),
      name: updated.name
    }
  });
});

export const deleteSubCategory = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const targetId = BigInt(id as string);

  const subCategory = await prisma.sub_categories.findUnique({
    where: { id: targetId }
  });

  if (!subCategory) {
    res.status(404).json({ error: 'Sub-kategori tidak ditemukan' });
    return;
  }

  const inUseCount = await prisma.daily_activities.count({
    where: { sub_category_id: targetId, is_deleted: false }
  });

  if (inUseCount > 0) {
    res.status(400).json({
      error: `Sub-kategori '${subCategory.name}' tidak dapat dihapus karena sedang digunakan oleh ${inUseCount} kegiatan aktif.`
    });
    return;
  }

  await prisma.sub_categories.delete({
    where: { id: targetId }
  });

  res.status(200).json({ message: `Sub-kategori '${subCategory.name}' berhasil dihapus` });
});
