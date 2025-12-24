import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { menuCategories, menuItems } from '../src/db/schema';

async function seedMenu() {
  const db = drizzle(process.env.DATABASE_URL);

  console.log('Seeding menu data...');

  // Insert categories
  const categories = await db.insert(menuCategories).values([
    { name: 'Appetizers', description: 'Start your meal with these delicious appetizers', display_order: 1 },
    { name: 'Main Courses', description: 'Hearty main dishes', display_order: 2 },
    { name: 'Desserts', description: 'Sweet treats to end your meal', display_order: 3 },
    { name: 'Beverages', description: 'Refreshing drinks', display_order: 4 },
  ]).returning();

  console.log('Inserted categories:', categories);

  // Insert items
  const items = await db.insert(menuItems).values([
    {
      category_id: categories[0].id,
      name: 'Caesar Salad',
      description: 'Crisp romaine lettuce with Caesar dressing',
      price: '8.99',
      is_available: true,
      display_order: 1,
    },
    {
      category_id: categories[0].id,
      name: 'Chicken Wings',
      description: 'Spicy buffalo wings with blue cheese dip',
      price: '12.99',
      is_available: true,
      display_order: 2,
    },
    {
      category_id: categories[1].id,
      name: 'Grilled Salmon',
      description: 'Fresh salmon with lemon herb sauce',
      price: '24.99',
      is_available: true,
      display_order: 1,
    },
    {
      category_id: categories[1].id,
      name: 'Beef Burger',
      description: 'Juicy beef patty with all the fixings',
      price: '16.99',
      is_available: true,
      display_order: 2,
    },
    {
      category_id: categories[2].id,
      name: 'Chocolate Cake',
      description: 'Rich chocolate cake with vanilla ice cream',
      price: '7.99',
      is_available: true,
      display_order: 1,
    },
    {
      category_id: categories[3].id,
      name: 'Coca Cola',
      description: 'Classic cola drink',
      price: '2.99',
      is_available: true,
      display_order: 1,
    },
  ]).returning();

  console.log('Inserted items:', items);
  console.log('Seeding completed!');
}

seedMenu().catch(console.error);