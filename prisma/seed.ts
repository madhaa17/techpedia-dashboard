import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { faker } from "@faker-js/faker";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding...");

  try {
    // Clean up existing data (optional - be careful in production!)
    await cleanDatabase();

    // Seed admin user
    const adminUser = await seedAdminUser();
    console.log(`✅ Created admin user: ${adminUser.email}`);

    // Seed regular customers
    const customers = await seedCustomers(10);
    console.log(`✅ Created ${customers.length} customers`);

    // Seed brands
    const brands = await seedBrands();
    console.log(`✅ Created ${brands.length} brands`);

    // Seed categories
    const categories = await seedCategories();
    console.log(`✅ Created ${categories.length} categories`);

    // Seed products
    const products = await seedProducts(brands, categories, 50);
    console.log(`✅ Created ${products.length} products`);

    // Seed customer addresses
    const addresses = await seedAddresses(customers);
    console.log(`✅ Created ${addresses.length} customer addresses`);

    console.log("✨ Database seeding completed successfully!");
  } catch (error) {
    console.error("❌ Database seeding failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function cleanDatabase() {
  // Delete in reverse order to respect foreign key constraints
  console.log("🧹 Cleaning existing data...");

  await prisma.salesReport.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.cartItem.deleteMany({});
  await prisma.productReview.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.brand.deleteMany({});
  await prisma.address.deleteMany({});
  await prisma.user.deleteMany({});

  console.log("✅ Database cleaned");
}

async function seedAdminUser() {
  const hashedPassword = await bcrypt.hash("admin123", 12);

  return await prisma.user.create({
    data: {
      name: "Admin User",
      email: "admin@example.com",
      password: hashedPassword,
      role: Role.ADMIN,
    },
  });
}

async function seedCustomers(count: number) {
  const customers = [];
  const hashedPassword = await bcrypt.hash("password123", 10);

  for (let i = 0; i < count; i++) {
    const customer = await prisma.user.create({
      data: {
        name: faker.person.fullName(),
        email: faker.internet.email().toLowerCase(),
        password: hashedPassword,
        role: Role.CUSTOMER,
      },
    });
    customers.push(customer);
  }

  return customers;
}

async function seedBrands() {
  const brandNames = [
    "TechPro",
    "Luxify",
    "EcoGoods",
    "SportMaster",
    "HomeEssentials",
    "FashionPlus",
    "GadgetHub",
    "OrganicLife",
    "ArtisanCraft",
    "PetLover",
  ];

  const brands = [];

  for (const name of brandNames) {
    const brand = await prisma.brand.create({
      data: { name },
    });
    brands.push(brand);
  }

  return brands;
}

async function seedCategories() {
  const categoryNames = [
    "Electronics",
    "Fashion",
    "Home & Kitchen",
    "Sports & Outdoors",
    "Beauty & Personal Care",
    "Books",
    "Toys & Games",
    "Health & Wellness",
    "Automotive",
    "Pet Supplies",
  ];

  const categories = [];

  for (const name of categoryNames) {
    const category = await prisma.category.create({
      data: { name },
    });
    categories.push(category);
  }

  return categories;
}

async function seedProducts(brands: any[], categories: any[], count: number) {
  const products = [];

  for (let i = 0; i < count; i++) {
    const randomBrand = brands[Math.floor(Math.random() * brands.length)];
    const randomCategory =
      categories[Math.floor(Math.random() * categories.length)];

    const product = await prisma.product.create({
      data: {
        name: faker.commerce.productName(),
        description: faker.commerce.productDescription(),
        price: parseFloat(faker.commerce.price({ min: 10, max: 1000 })),
        stock: faker.number.int({ min: 0, max: 100 }),
        imageUrl: `https://picsum.photos/seed/${faker.string.uuid()}/500/500`,
        brandId: randomBrand.id,
        categoryId: randomCategory.id,
      },
    });

    products.push(product);
  }

  return products;
}

async function seedAddresses(customers: any[]) {
  const addresses = [];

  for (const customer of customers) {
    // Create 1-3 addresses per customer
    const addressCount = faker.number.int({ min: 1, max: 3 });

    for (let i = 0; i < addressCount; i++) {
      const address = await prisma.address.create({
        data: {
          userId: customer.id,
          recipientName: customer.name,
          phoneNumber: faker.phone.number(),
          addressLine: faker.location.streetAddress(),
          city: faker.location.city(),
          postalCode: faker.location.zipCode(),
          isDefault: i === 0, // First address is default
        },
      });

      addresses.push(address);
    }
  }

  return addresses;
}

// Execute the seed function
main()
  .then(() => console.log("Seeding completed"))
  .catch((e) => console.error(e));
