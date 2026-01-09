#!/usr/bin/env node

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as bcrypt from 'bcrypt';
import {
  users,
  tables,
  menuCategories,
  menuItems,
  menuItemImages,
  modifierGroups,
  modifierOptions,
  orders,
  orderItems,
  orderItemModifiers,
  menuItemReviews,
  systemSettings,
} from '../src/db/schema';

/**
 * Comprehensive database seeding script for Smart Restaurant
 * Populates initial data for:
 * - Users (admin, waiters, kitchen staff, customers)
 * - Tables with QR codes
 * - Menu categories and items
 * - Modifiers
 * - Sample orders
 * - Reviews
 * - System settings
 */

async function seedDatabase() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const client = postgres(dbUrl);
  const db = drizzle(client);

  try {
    console.log('🌱 Starting database seed...\n');

    // 1. Seed Users
    console.log('👥 Seeding users...');
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash('Password123!', saltRounds);

    const insertedUsers = await db
      .insert(users)
      .values([
        {
          email: 'admin@restaurant.com',
          password: passwordHash,
          role: 'admin',
          name: 'Restaurant Admin',
          phone: '0123456789',
          is_active: true,
          email_verified: true,
        },
        {
          email: 'waiter1@restaurant.com',
          password: passwordHash,
          role: 'waiter',
          name: 'John Waiter',
          phone: '0123456790',
          is_active: true,
          email_verified: true,
        },
        {
          email: 'waiter2@restaurant.com',
          password: passwordHash,
          role: 'waiter',
          name: 'Sarah Waiter',
          phone: '0123456791',
          is_active: true,
          email_verified: true,
        },
        {
          email: 'kitchen1@restaurant.com',
          password: passwordHash,
          role: 'kitchen_staff',
          name: 'Chef Mike',
          phone: '0123456792',
          is_active: true,
          email_verified: true,
        },
        {
          email: 'kitchen2@restaurant.com',
          password: passwordHash,
          role: 'kitchen_staff',
          name: 'Chef Lisa',
          phone: '0123456793',
          is_active: true,
          email_verified: true,
        },
        {
          email: 'customer1@example.com',
          password: passwordHash,
          role: 'customer',
          name: 'Alice Johnson',
          phone: '0987654321',
          is_active: true,
          email_verified: true,
        },
        {
          email: 'customer2@example.com',
          password: passwordHash,
          role: 'customer',
          name: 'Bob Smith',
          phone: '0987654322',
          is_active: true,
          email_verified: true,
        },
        {
          email: 'customer3@example.com',
          password: passwordHash,
          role: 'customer',
          name: 'Carol Davis',
          phone: '0987654323',
          is_active: true,
          email_verified: true,
        },
      ])
      .returning();
    console.log(`✅ Created ${insertedUsers.length} users\n`);

    // 2. Seed Tables
    console.log('🪑 Seeding tables...');
    const insertedTables = await db
      .insert(tables)
      .values([
        {
          table_number: 'T01',
          capacity: 2,
          location: 'Window Side',
          description: 'Cozy table by the window',
          is_active: true,
          short_code: 'WIN01',
        },
        {
          table_number: 'T02',
          capacity: 4,
          location: 'Center',
          description: 'Central dining area',
          is_active: true,
          short_code: 'CTR02',
        },
        {
          table_number: 'T03',
          capacity: 4,
          location: 'Center',
          description: 'Central dining area',
          is_active: true,
          short_code: 'CTR03',
        },
        {
          table_number: 'T04',
          capacity: 6,
          location: 'Private Room',
          description: 'Semi-private dining area',
          is_active: true,
          short_code: 'PRV04',
        },
        {
          table_number: 'T05',
          capacity: 8,
          location: 'Private Room',
          description: 'Large table for groups',
          is_active: true,
          short_code: 'PRV05',
        },
        {
          table_number: 'T06',
          capacity: 2,
          location: 'Bar Area',
          description: 'Bar seating',
          is_active: true,
          short_code: 'BAR06',
        },
        {
          table_number: 'T07',
          capacity: 4,
          location: 'Outdoor',
          description: 'Patio seating',
          is_active: true,
          short_code: 'OUT07',
        },
        {
          table_number: 'T08',
          capacity: 4,
          location: 'Outdoor',
          description: 'Patio seating',
          is_active: true,
          short_code: 'OUT08',
        },
      ])
      .returning();
    console.log(`✅ Created ${insertedTables.length} tables\n`);

    // 3. Seed Menu Categories
    console.log('📋 Seeding menu categories...');
    const categories = await db
      .insert(menuCategories)
      .values([
        {
          name: 'Appetizers',
          description: 'Start your meal with these delicious starters',
          display_order: 1,
          is_active: true,
        },
        {
          name: 'Salads',
          description: 'Fresh and healthy salad options',
          display_order: 2,
          is_active: true,
        },
        {
          name: 'Main Courses',
          description: 'Hearty main dishes',
          display_order: 3,
          is_active: true,
        },
        {
          name: 'Seafood',
          description: 'Fresh from the ocean',
          display_order: 4,
          is_active: true,
        },
        {
          name: 'Pasta & Rice',
          description: 'Italian and Asian favorites',
          display_order: 5,
          is_active: true,
        },
        {
          name: 'Desserts',
          description: 'Sweet treats to end your meal',
          display_order: 6,
          is_active: true,
        },
        {
          name: 'Beverages',
          description: 'Refreshing drinks',
          display_order: 7,
          is_active: true,
        },
        {
          name: 'Coffee & Tea',
          description: 'Hot beverages',
          display_order: 8,
          is_active: true,
        },
      ])
      .returning();
    console.log(`✅ Created ${categories.length} categories\n`);

    // 4. Seed Menu Items
    console.log('🍽️ Seeding menu items...');
    const items = await db
      .insert(menuItems)
      .values([
        // Appetizers
        {
          category_id: categories[0].id,
          name: 'Caesar Salad',
          description: 'Crisp romaine lettuce with Caesar dressing, parmesan cheese, and croutons',
          price: '8.99',
          status: 'available',
          display_order: 1,
          preparation_time: 10,
          chef_recommendation: false,
          dietary_tags: ['vegetarian'],
        },
        {
          category_id: categories[0].id,
          name: 'Chicken Wings',
          description: 'Spicy buffalo wings with blue cheese dip and celery sticks',
          price: '12.99',
          status: 'available',
          display_order: 2,
          preparation_time: 15,
          chef_recommendation: true,
          dietary_tags: ['spicy'],
        },
        {
          category_id: categories[0].id,
          name: 'Spring Rolls',
          description: 'Fresh Vietnamese spring rolls with shrimp and vegetables',
          price: '9.99',
          status: 'available',
          display_order: 3,
          preparation_time: 8,
          chef_recommendation: false,
          dietary_tags: ['healthy'],
        },
        {
          category_id: categories[0].id,
          name: 'Mozzarella Sticks',
          description: 'Breaded mozzarella cheese sticks with marinara sauce',
          price: '10.99',
          status: 'available',
          display_order: 4,
          preparation_time: 12,
          chef_recommendation: false,
          dietary_tags: ['vegetarian'],
        },
        // Salads
        {
          category_id: categories[1].id,
          name: 'Greek Salad',
          description: 'Fresh vegetables with feta cheese, olives, and olive oil dressing',
          price: '11.99',
          status: 'available',
          display_order: 1,
          preparation_time: 8,
          chef_recommendation: false,
          dietary_tags: ['vegetarian', 'healthy'],
        },
        {
          category_id: categories[1].id,
          name: 'Chicken Caesar Salad',
          description: 'Classic Caesar salad topped with grilled chicken breast',
          price: '14.99',
          status: 'available',
          display_order: 2,
          preparation_time: 12,
          chef_recommendation: true,
          dietary_tags: ['high-protein'],
        },
        // Main Courses
        {
          category_id: categories[2].id,
          name: 'Grilled Ribeye Steak',
          description: 'Premium ribeye steak grilled to perfection, served with mashed potatoes',
          price: '32.99',
          status: 'available',
          display_order: 1,
          preparation_time: 25,
          chef_recommendation: true,
          dietary_tags: ['high-protein'],
        },
        {
          category_id: categories[2].id,
          name: 'BBQ Ribs',
          description: 'Fall-off-the-bone ribs with our signature BBQ sauce',
          price: '28.99',
          status: 'available',
          display_order: 2,
          preparation_time: 30,
          chef_recommendation: true,
          dietary_tags: [],
        },
        {
          category_id: categories[2].id,
          name: 'Beef Burger',
          description: 'Juicy beef patty with lettuce, tomato, cheese, and special sauce',
          price: '16.99',
          status: 'available',
          display_order: 3,
          preparation_time: 15,
          chef_recommendation: false,
          dietary_tags: [],
        },
        {
          category_id: categories[2].id,
          name: 'Chicken Parmesan',
          description: 'Breaded chicken breast topped with marinara and melted cheese',
          price: '19.99',
          status: 'available',
          display_order: 4,
          preparation_time: 20,
          chef_recommendation: false,
          dietary_tags: [],
        },
        // Seafood
        {
          category_id: categories[3].id,
          name: 'Grilled Salmon',
          description: 'Fresh Atlantic salmon with lemon herb butter sauce',
          price: '24.99',
          status: 'available',
          display_order: 1,
          preparation_time: 18,
          chef_recommendation: true,
          dietary_tags: ['healthy', 'high-protein'],
        },
        {
          category_id: categories[3].id,
          name: 'Fish and Chips',
          description: 'Beer-battered cod with crispy fries and tartar sauce',
          price: '18.99',
          status: 'available',
          display_order: 2,
          preparation_time: 20,
          chef_recommendation: false,
          dietary_tags: [],
        },
        {
          category_id: categories[3].id,
          name: 'Shrimp Scampi',
          description: 'Garlic butter shrimp served over linguine pasta',
          price: '22.99',
          status: 'available',
          display_order: 3,
          preparation_time: 15,
          chef_recommendation: true,
          dietary_tags: ['high-protein'],
        },
        // Pasta & Rice
        {
          category_id: categories[4].id,
          name: 'Spaghetti Carbonara',
          description: 'Classic Italian pasta with bacon, eggs, and parmesan',
          price: '17.99',
          status: 'available',
          display_order: 1,
          preparation_time: 15,
          chef_recommendation: false,
          dietary_tags: [],
        },
        {
          category_id: categories[4].id,
          name: 'Pad Thai',
          description: 'Traditional Thai rice noodles with shrimp and peanuts',
          price: '16.99',
          status: 'available',
          display_order: 2,
          preparation_time: 12,
          chef_recommendation: true,
          dietary_tags: ['spicy'],
        },
        {
          category_id: categories[4].id,
          name: 'Mushroom Risotto',
          description: 'Creamy Italian rice with wild mushrooms and truffle oil',
          price: '19.99',
          status: 'available',
          display_order: 3,
          preparation_time: 20,
          chef_recommendation: true,
          dietary_tags: ['vegetarian'],
        },
        // Desserts
        {
          category_id: categories[5].id,
          name: 'Chocolate Lava Cake',
          description: 'Warm chocolate cake with molten center, served with vanilla ice cream',
          price: '8.99',
          status: 'available',
          display_order: 1,
          preparation_time: 10,
          chef_recommendation: true,
          dietary_tags: [],
        },
        {
          category_id: categories[5].id,
          name: 'Tiramisu',
          description: 'Classic Italian dessert with coffee-soaked ladyfingers',
          price: '7.99',
          status: 'available',
          display_order: 2,
          preparation_time: 5,
          chef_recommendation: false,
          dietary_tags: [],
        },
        {
          category_id: categories[5].id,
          name: 'Cheesecake',
          description: 'New York style cheesecake with berry compote',
          price: '7.99',
          status: 'available',
          display_order: 3,
          preparation_time: 5,
          chef_recommendation: false,
          dietary_tags: ['vegetarian'],
        },
        {
          category_id: categories[5].id,
          name: 'Ice Cream Sundae',
          description: 'Three scoops with your choice of toppings',
          price: '6.99',
          status: 'available',
          display_order: 4,
          preparation_time: 5,
          chef_recommendation: false,
          dietary_tags: ['vegetarian'],
        },
        // Beverages
        {
          category_id: categories[6].id,
          name: 'Coca Cola',
          description: 'Classic cola drink',
          price: '2.99',
          status: 'available',
          display_order: 1,
          preparation_time: 2,
          chef_recommendation: false,
          dietary_tags: [],
        },
        {
          category_id: categories[6].id,
          name: 'Fresh Orange Juice',
          description: 'Freshly squeezed orange juice',
          price: '4.99',
          status: 'available',
          display_order: 2,
          preparation_time: 3,
          chef_recommendation: false,
          dietary_tags: ['healthy'],
        },
        {
          category_id: categories[6].id,
          name: 'Lemonade',
          description: 'Homemade fresh lemonade',
          price: '3.99',
          status: 'available',
          display_order: 3,
          preparation_time: 3,
          chef_recommendation: false,
          dietary_tags: ['healthy'],
        },
        {
          category_id: categories[6].id,
          name: 'Iced Tea',
          description: 'Refreshing iced tea with lemon',
          price: '2.99',
          status: 'available',
          display_order: 4,
          preparation_time: 2,
          chef_recommendation: false,
          dietary_tags: [],
        },
        // Coffee & Tea
        {
          category_id: categories[7].id,
          name: 'Espresso',
          description: 'Strong Italian coffee',
          price: '3.99',
          status: 'available',
          display_order: 1,
          preparation_time: 5,
          chef_recommendation: false,
          dietary_tags: [],
        },
        {
          category_id: categories[7].id,
          name: 'Cappuccino',
          description: 'Espresso with steamed milk foam',
          price: '4.99',
          status: 'available',
          display_order: 2,
          preparation_time: 5,
          chef_recommendation: true,
          dietary_tags: [],
        },
        {
          category_id: categories[7].id,
          name: 'Green Tea',
          description: 'Premium Japanese green tea',
          price: '3.99',
          status: 'available',
          display_order: 3,
          preparation_time: 5,
          chef_recommendation: false,
          dietary_tags: ['healthy'],
        },
      ])
      .returning();
    console.log(`✅ Created ${items.length} menu items\n`);

    // 5. Seed Modifiers
    console.log('⚙️ Seeding modifiers...');

    // Burger modifiers
    const burgerItem = items.find((i) => i.name === 'Beef Burger');
    if (burgerItem) {
      const burgerSizeGroup = await db
        .insert(modifierGroups)
        .values({
          menu_item_id: burgerItem.id,
          name: 'Size',
          type: 'single',
          is_required: true,
          display_order: 1,
        })
        .returning();

      await db.insert(modifierOptions).values([
        {
          modifier_group_id: burgerSizeGroup[0].id,
          name: 'Regular',
          price_adjustment: '0.00',
          display_order: 1,
          is_available: true,
        },
        {
          modifier_group_id: burgerSizeGroup[0].id,
          name: 'Large',
          price_adjustment: '3.00',
          display_order: 2,
          is_available: true,
        },
      ]);

      const burgerExtrasGroup = await db
        .insert(modifierGroups)
        .values({
          menu_item_id: burgerItem.id,
          name: 'Extras',
          type: 'multiple',
          is_required: false,
          display_order: 2,
        })
        .returning();

      await db.insert(modifierOptions).values([
        {
          modifier_group_id: burgerExtrasGroup[0].id,
          name: 'Extra Cheese',
          price_adjustment: '1.50',
          display_order: 1,
          is_available: true,
        },
        {
          modifier_group_id: burgerExtrasGroup[0].id,
          name: 'Bacon',
          price_adjustment: '2.50',
          display_order: 2,
          is_available: true,
        },
        {
          modifier_group_id: burgerExtrasGroup[0].id,
          name: 'Avocado',
          price_adjustment: '2.00',
          display_order: 3,
          is_available: true,
        },
      ]);
    }

    // Coffee modifiers
    const cappuccinoItem = items.find((i) => i.name === 'Cappuccino');
    if (cappuccinoItem) {
      const coffeeSizeGroup = await db
        .insert(modifierGroups)
        .values({
          menu_item_id: cappuccinoItem.id,
          name: 'Size',
          type: 'single',
          is_required: true,
          display_order: 1,
        })
        .returning();

      await db.insert(modifierOptions).values([
        {
          modifier_group_id: coffeeSizeGroup[0].id,
          name: 'Small',
          price_adjustment: '0.00',
          display_order: 1,
          is_available: true,
        },
        {
          modifier_group_id: coffeeSizeGroup[0].id,
          name: 'Medium',
          price_adjustment: '1.00',
          display_order: 2,
          is_available: true,
        },
        {
          modifier_group_id: coffeeSizeGroup[0].id,
          name: 'Large',
          price_adjustment: '2.00',
          display_order: 3,
          is_available: true,
        },
      ]);

      const coffeeExtrasGroup = await db
        .insert(modifierGroups)
        .values({
          menu_item_id: cappuccinoItem.id,
          name: 'Add-ons',
          type: 'multiple',
          is_required: false,
          display_order: 2,
        })
        .returning();

      await db.insert(modifierOptions).values([
        {
          modifier_group_id: coffeeExtrasGroup[0].id,
          name: 'Extra Shot',
          price_adjustment: '1.00',
          display_order: 1,
          is_available: true,
        },
        {
          modifier_group_id: coffeeExtrasGroup[0].id,
          name: 'Vanilla Syrup',
          price_adjustment: '0.50',
          display_order: 2,
          is_available: true,
        },
        {
          modifier_group_id: coffeeExtrasGroup[0].id,
          name: 'Caramel Syrup',
          price_adjustment: '0.50',
          display_order: 3,
          is_available: true,
        },
      ]);
    }

    // Steak modifiers
    const steakItem = items.find((i) => i.name === 'Grilled Ribeye Steak');
    if (steakItem) {
      const steakCookingGroup = await db
        .insert(modifierGroups)
        .values({
          menu_item_id: steakItem.id,
          name: 'Cooking Temperature',
          type: 'single',
          is_required: true,
          display_order: 1,
        })
        .returning();

      await db.insert(modifierOptions).values([
        {
          modifier_group_id: steakCookingGroup[0].id,
          name: 'Rare',
          price_adjustment: '0.00',
          display_order: 1,
          is_available: true,
        },
        {
          modifier_group_id: steakCookingGroup[0].id,
          name: 'Medium Rare',
          price_adjustment: '0.00',
          display_order: 2,
          is_available: true,
        },
        {
          modifier_group_id: steakCookingGroup[0].id,
          name: 'Medium',
          price_adjustment: '0.00',
          display_order: 3,
          is_available: true,
        },
        {
          modifier_group_id: steakCookingGroup[0].id,
          name: 'Medium Well',
          price_adjustment: '0.00',
          display_order: 4,
          is_available: true,
        },
        {
          modifier_group_id: steakCookingGroup[0].id,
          name: 'Well Done',
          price_adjustment: '0.00',
          display_order: 5,
          is_available: true,
        },
      ]);
    }

    console.log('✅ Created modifiers for items\n');

    // 6. Seed Sample Orders
    console.log('📦 Seeding sample orders...');
    const customer1 = insertedUsers.find((u) => u.email === 'customer1@example.com');
    const customer2 = insertedUsers.find((u) => u.email === 'customer2@example.com');
    const table1 = insertedTables[0];
    const table2 = insertedTables[1];

    if (customer1 && customer2 && table1 && table2) {
      // Order 1 - Completed
      const order1 = await db
        .insert(orders)
        .values({
          user_id: customer1.id,
          table_id: table1.id,
          status: 'completed',
          total_amount: '42.97',
          special_instructions: 'No onions please',
        })
        .returning();

      const salmonItem = items.find((i) => i.name === 'Grilled Salmon');
      const cokeItem = items.find((i) => i.name === 'Coca Cola');

      if (salmonItem && cokeItem) {
        await db.insert(orderItems).values([
          {
            order_id: order1[0].id,
            menu_item_id: salmonItem.id,
            quantity: 1,
            unit_price: '24.99',
            total_price: '24.99',
          },
          {
            order_id: order1[0].id,
            menu_item_id: cokeItem.id,
            quantity: 2,
            unit_price: '2.99',
            total_price: '5.98',
          },
        ]);
      }

      // Order 2 - In progress
      const order2 = await db
        .insert(orders)
        .values({
          user_id: customer2.id,
          table_id: table2.id,
          status: 'preparing',
          total_amount: '36.98',
          special_instructions: 'Extra crispy fries',
        })
        .returning();

      const burgerItem2 = items.find((i) => i.name === 'Beef Burger');
      const wingsItem = items.find((i) => i.name === 'Chicken Wings');

      if (burgerItem2 && wingsItem) {
        await db.insert(orderItems).values([
          {
            order_id: order2[0].id,
            menu_item_id: burgerItem2.id,
            quantity: 2,
            unit_price: '16.99',
            total_price: '33.98',
          },
          {
            order_id: order2[0].id,
            menu_item_id: wingsItem.id,
            quantity: 1,
            unit_price: '12.99',
            total_price: '12.99',
          },
        ]);
      }

      console.log('✅ Created sample orders\n');
    }

    // 7. Seed Reviews
    console.log('⭐ Seeding menu item reviews...');
    if (customer1 && customer2) {
      const salmonItem = items.find((i) => i.name === 'Grilled Salmon');
      const burgerItem2 = items.find((i) => i.name === 'Beef Burger');
      const lavaItem = items.find((i) => i.name === 'Chocolate Lava Cake');

      const reviewsToInsert = [];
      if (salmonItem) {
        reviewsToInsert.push({
          menu_item_id: salmonItem.id,
          user_id: customer1.id,
          rating: 5,
          comment: 'Amazing salmon! Cooked to perfection with delicious lemon herb sauce.',
        });
      }
      if (burgerItem2) {
        reviewsToInsert.push({
          menu_item_id: burgerItem2.id,
          user_id: customer2.id,
          rating: 4,
          comment: 'Great burger, very juicy. Would love more cheese!',
        });
      }
      if (lavaItem) {
        reviewsToInsert.push({
          menu_item_id: lavaItem.id,
          user_id: customer1.id,
          rating: 5,
          comment: 'Best dessert ever! The molten chocolate center is heaven.',
        });
      }

      if (reviewsToInsert.length > 0) {
        await db.insert(menuItemReviews).values(reviewsToInsert);
        console.log(`✅ Created ${reviewsToInsert.length} reviews\n`);
      }
    }

    // 8. Seed System Settings
    console.log('⚙️ Seeding system settings...');
    await db.insert(systemSettings).values([
      {
        key: 'restaurant_name',
        value: 'Smart Restaurant',
        description: 'Restaurant display name',
        category: 'branding',
        is_public: true,
      },
      {
        key: 'restaurant_address',
        value: '123 Main Street, City, Country',
        description: 'Restaurant address',
        category: 'branding',
        is_public: true,
      },
      {
        key: 'restaurant_phone',
        value: '+1 234 567 8900',
        description: 'Restaurant contact phone',
        category: 'branding',
        is_public: true,
      },
      {
        key: 'restaurant_email',
        value: 'info@smartrestaurant.com',
        description: 'Restaurant contact email',
        category: 'branding',
        is_public: true,
      },
      {
        key: 'currency',
        value: 'USD',
        description: 'Currency code',
        category: 'general',
        is_public: true,
      },
      {
        key: 'tax_rate',
        value: '0.08',
        description: 'Tax rate (e.g., 0.08 for 8%)',
        category: 'general',
        is_public: false,
      },
      {
        key: 'service_charge',
        value: '0.10',
        description: 'Service charge rate (e.g., 0.10 for 10%)',
        category: 'general',
        is_public: false,
      },
      {
        key: 'order_timeout_minutes',
        value: '45',
        description: 'Auto-cancel pending orders after N minutes',
        category: 'workflow',
        is_public: false,
      },
      {
        key: 'enable_online_payments',
        value: 'true',
        description: 'Enable Stripe payment integration',
        category: 'advanced',
        is_public: false,
      },
      {
        key: 'enable_reviews',
        value: 'true',
        description: 'Allow customers to leave reviews',
        category: 'general',
        is_public: false,
      },
    ]);
    console.log('✅ Created system settings\n');

    console.log('🎉 Database seeding completed successfully!\n');
    console.log('📝 Summary:');
    console.log(`   - ${insertedUsers.length} users created`);
    console.log(`   - ${insertedTables.length} tables created`);
    console.log(`   - ${categories.length} menu categories created`);
    console.log(`   - ${items.length} menu items created`);
    console.log(`   - Modifiers added for burgers, coffee, and steaks`);
    console.log(`   - Sample orders and reviews created`);
    console.log(`   - System settings configured\n`);
    console.log('🔐 Default login credentials:');
    console.log('   Admin: admin@restaurant.com / Password123!');
    console.log('   Waiter: waiter1@restaurant.com / Password123!');
    console.log('   Kitchen: kitchen1@restaurant.com / Password123!');
    console.log('   Customer: customer1@example.com / Password123!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Run the seeder
seedDatabase()
  .then(() => {
    console.log('\n✅ Seed script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Seed script failed:', error);
    process.exit(1);
  });
