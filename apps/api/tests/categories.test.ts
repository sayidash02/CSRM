import request from 'supertest';
import app from '../src/app';
import prisma from '../src/lib/prisma';

describe('Categories & Sub-Categories API', () => {
  let createdCategoryId: string;
  let createdSubCategoryId: string;

  it('POST /api/categories - Should create a new category', async () => {
    const res = await request(app)
      .post('/api/categories')
      .send({ name: 'Test Kategori Custom' });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Test Kategori Custom');
    expect(res.body.data.id).toBeDefined();
    createdCategoryId = res.body.data.id;
  });

  it('POST /api/categories - Should return 409 when category name already exists', async () => {
    const res = await request(app)
      .post('/api/categories')
      .send({ name: 'Test Kategori Custom' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBeDefined();
  });

  it('PUT /api/categories/:id - Should update category name', async () => {
    const res = await request(app)
      .put(`/api/categories/${createdCategoryId}`)
      .send({ name: 'Test Kategori Custom Renamed' });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Test Kategori Custom Renamed');
  });

  it('POST /api/categories/sub-categories - Should create a sub-category', async () => {
    const res = await request(app)
      .post('/api/categories/sub-categories')
      .send({
        category_id: createdCategoryId,
        name: 'Test Sub-Kategori Custom'
      });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Test Sub-Kategori Custom');
    expect(res.body.data.category_id).toBe(createdCategoryId);
    createdSubCategoryId = res.body.data.id;
  });

  it('PUT /api/categories/sub-categories/:id - Should update sub-category name', async () => {
    const res = await request(app)
      .put(`/api/categories/sub-categories/${createdSubCategoryId}`)
      .send({ name: 'Test Sub-Kategori Renamed' });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Test Sub-Kategori Renamed');
  });

  it('GET /api/categories - Should list categories with sub-categories', async () => {
    const res = await request(app).get('/api/categories');
    expect(res.status).toBe(200);
    const cat = res.body.data.find((c: any) => c.id === createdCategoryId);
    expect(cat).toBeDefined();
    expect(cat.name).toBe('Test Kategori Custom Renamed');
    expect(cat.sub_categories.some((s: any) => s.id === createdSubCategoryId)).toBe(true);
  });

  it('DELETE /api/categories/sub-categories/:id - Should delete sub-category when not in use', async () => {
    const res = await request(app).delete(`/api/categories/sub-categories/${createdSubCategoryId}`);
    expect(res.status).toBe(200);
  });

  it('DELETE /api/categories/:id - Should delete category when not in use', async () => {
    const res = await request(app).delete(`/api/categories/${createdCategoryId}`);
    expect(res.status).toBe(200);
  });
});
