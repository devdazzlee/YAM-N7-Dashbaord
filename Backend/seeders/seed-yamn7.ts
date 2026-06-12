import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import axios from 'axios';
import { v2 as cloudinary } from 'cloudinary';
import { ImageStatus, Role } from '@prisma/client';
import { prisma } from '../src/prisma/client';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const ADMIN_EMAIL = 'admin@yam-n7.com';
const ADMIN_PASSWORD = 'YamN7@Admin2026';

const CATEGORIES = [
  {
    name: 'Attars',
    slug: 'attars',
    code: '1001',
    imageUrl: 'https://picsum.photos/seed/yamn7-attars/800/800',
  },
  {
    name: 'Oud',
    slug: 'oud',
    code: '1002',
    imageUrl: 'https://picsum.photos/seed/yamn7-oud/800/800',
  },
  {
    name: "Men's Fragrances",
    slug: 'mens-fragrances',
    code: '1003',
    imageUrl: 'https://picsum.photos/seed/yamn7-mens/800/800',
  },
  {
    name: "Women's Fragrances",
    slug: 'womens-fragrances',
    code: '1004',
    imageUrl: 'https://picsum.photos/seed/yamn7-womens/800/800',
  },
  {
    name: 'Gift Sets',
    slug: 'gift-sets',
    code: '1005',
    imageUrl: 'https://picsum.photos/seed/yamn7-gifts/800/800',
  },
] as const;

const PERFUMES = [
  {
    name: 'Rose Attar',
    slug: 'rose-attar',
    categorySlug: 'attars',
    code: '2001',
    sku: '100000001',
    price: 4500,
    description: 'A rich, traditional rose attar with long-lasting warmth.',
    imageUrl: 'https://picsum.photos/seed/yamn7-rose-attar/800/800',
    is_featured: true,
  },
  {
    name: 'Jasmine Attar',
    slug: 'jasmine-attar',
    categorySlug: 'attars',
    code: '2002',
    sku: '100000002',
    price: 4200,
    description: 'Delicate jasmine notes blended into a smooth attar base.',
    imageUrl: 'https://picsum.photos/seed/yamn7-jasmine-attar/800/800',
    is_featured: false,
  },
  {
    name: 'Royal Oud',
    slug: 'royal-oud',
    categorySlug: 'oud',
    code: '2003',
    sku: '100000003',
    price: 12500,
    description: 'Deep oud with smoky woods and a luxurious finish.',
    imageUrl: 'https://picsum.photos/seed/yamn7-royal-oud/800/800',
    is_featured: true,
  },
  {
    name: 'Black Oud',
    slug: 'black-oud',
    categorySlug: 'oud',
    code: '2004',
    sku: '100000004',
    price: 9800,
    description: 'Bold black oud with amber and spice undertones.',
    imageUrl: 'https://picsum.photos/seed/yamn7-black-oud/800/800',
    is_featured: false,
  },
  {
    name: 'Midnight Musk',
    slug: 'midnight-musk',
    categorySlug: 'mens-fragrances',
    code: '2005',
    sku: '100000005',
    price: 7500,
    description: 'A masculine musk fragrance for evening wear.',
    imageUrl: 'https://picsum.photos/seed/yamn7-midnight/800/800',
    is_featured: true,
  },
  {
    name: 'Ocean Breeze',
    slug: 'ocean-breeze',
    categorySlug: 'mens-fragrances',
    code: '2006',
    sku: '100000006',
    price: 6800,
    description: 'Fresh aquatic notes with citrus and cedar.',
    imageUrl: 'https://picsum.photos/seed/yamn7-ocean/800/800',
    is_featured: false,
  },
  {
    name: 'Velvet Rose',
    slug: 'velvet-rose',
    categorySlug: 'womens-fragrances',
    code: '2007',
    sku: '100000007',
    price: 8200,
    description: 'Elegant rose and peony with a soft powdery trail.',
    imageUrl: 'https://picsum.photos/seed/yamn7-velvet-rose/800/800',
    is_featured: true,
  },
  {
    name: 'Golden Amber',
    slug: 'golden-amber',
    categorySlug: 'womens-fragrances',
    code: '2008',
    sku: '100000008',
    price: 7900,
    description: 'Warm amber and vanilla with a radiant golden glow.',
    imageUrl: 'https://picsum.photos/seed/yamn7-golden-amber/800/800',
    is_featured: false,
  },
  {
    name: 'Luxury Duo Set',
    slug: 'luxury-duo-set',
    categorySlug: 'gift-sets',
    code: '2009',
    sku: '100000009',
    price: 11000,
    description: 'Curated duo of signature fragrances in premium packaging.',
    imageUrl: 'https://picsum.photos/seed/yamn7-luxury-duo/800/800',
    is_featured: true,
  },
  {
    name: 'Signature Trio',
    slug: 'signature-trio',
    categorySlug: 'gift-sets',
    code: '2010',
    sku: '100000010',
    price: 14500,
    description: 'Three bestselling YAM-N7 scents in an exclusive gift box.',
    imageUrl: 'https://picsum.photos/seed/yamn7-signature-trio/800/800',
    is_featured: false,
  },
] as const;

async function uploadImage(url: string, folder: string, publicId: string): Promise<string> {
  const response = await axios.get<ArrayBuffer>(url, {
    responseType: 'arraybuffer',
    timeout: 30000,
    headers: { 'User-Agent': 'YAM-N7-Seed/1.0' },
  });

  const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: 'image',
        overwrite: true,
        transformation: [{ width: 1200, height: 1200, crop: 'limit', quality: 'auto', fetch_format: 'auto' }],
      },
      (error, uploadResult) => {
        if (error || !uploadResult) return reject(error ?? new Error('Cloudinary upload failed'));
        resolve(uploadResult);
      },
    );
    uploadStream.end(Buffer.from(response.data));
  });

  return result.secure_url;
}

async function ensureUnit() {
  const existing = await prisma.unit.findFirst({ where: { code: 'UNIT-001' } });
  if (existing) return existing;

  return prisma.unit.create({
    data: {
      code: 'UNIT-001',
      name: 'Bottle',
      is_active: true,
      display_on_pos: true,
    },
  });
}

async function seedAdmin() {
  const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (existing) {
    console.log(`Admin already exists: ${ADMIN_EMAIL}`);
    return existing;
  }

  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const admin = await prisma.user.create({
    data: {
      email: ADMIN_EMAIL,
      password: hashedPassword,
      role: Role.ADMIN,
    },
  });

  console.log(`Admin created: ${ADMIN_EMAIL}`);
  return admin;
}

async function seedCategories() {
  const categoryMap = new Map<string, string>();

  for (const cat of CATEGORIES) {
    const existing = await prisma.category.findUnique({ where: { slug: cat.slug } });
    if (existing) {
      categoryMap.set(cat.slug, existing.id);
      console.log(`Category exists: ${cat.name}`);
      continue;
    }

    const image = await uploadImage(cat.imageUrl, 'yamn7/categories', cat.slug);

    const created = await prisma.category.create({
      data: {
        name: cat.name,
        slug: cat.slug,
        code: cat.code,
        is_active: true,
        display_on_pos: true,
        display_on_branches: [],
        image,
        CategoryImages: {
          create: {
            image,
            status: ImageStatus.COMPLETE,
            is_active: true,
          },
        },
      },
    });

    categoryMap.set(cat.slug, created.id);
    console.log(`Category created: ${cat.name}`);
  }

  return categoryMap;
}

async function seedPerfumes(categoryMap: Map<string, string>, unitId: string) {
  for (const perfume of PERFUMES) {
    const existing = await prisma.product.findUnique({ where: { sku: perfume.sku } });
    if (existing) {
      console.log(`Product exists: ${perfume.name}`);
      continue;
    }

    const categoryId = categoryMap.get(perfume.categorySlug);
    if (!categoryId) {
      throw new Error(`Category not found for product: ${perfume.name}`);
    }

    const image = await uploadImage(perfume.imageUrl, 'yamn7/products', perfume.slug);

    await prisma.product.create({
      data: {
        name: perfume.name,
        code: perfume.code,
        sku: perfume.sku,
        description: perfume.description,
        category_id: categoryId,
        unit_id: unitId,
        purchase_rate: perfume.price * 0.6,
        sales_rate_exc_dis_and_tax: perfume.price,
        sales_rate_inc_dis_and_tax: perfume.price,
        discount_amount: 0,
        is_featured: perfume.is_featured,
        is_active: true,
        display_on_pos: true,
        has_images: true,
        ProductImage: {
          create: {
            image,
            status: ImageStatus.COMPLETE,
            is_active: true,
          },
        },
      },
    });

    console.log(`Product created: ${perfume.name}`);
  }
}

async function main() {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error('Cloudinary credentials are missing from .env');
  }

  console.log('Starting YAM-N7 database seed...');

  const unit = await ensureUnit();
  await seedAdmin();
  const categoryMap = await seedCategories();
  await seedPerfumes(categoryMap, unit.id);

  console.log('\nSeed completed successfully!');
  console.log('-----------------------------------');
  console.log(`Admin Email:    ${ADMIN_EMAIL}`);
  console.log(`Admin Password: ${ADMIN_PASSWORD}`);
  console.log('-----------------------------------');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
