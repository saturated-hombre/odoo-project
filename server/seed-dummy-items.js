// seed-dummy-items.js
const mongoose = require('mongoose');
const Item = require('./models/Item');
const User = require('./models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rewear';

const categories = ['Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Shoes', 'Accessories'];
const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One Size'];
const conditions = ['New', 'Like New', 'Good', 'Fair', 'Poor'];
const brands = ['Zara', 'H&M', 'Uniqlo', 'Nike', 'Adidas', 'Levi’s', 'Other'];
const colors = ['Black', 'White', 'Grey', 'Blue', 'Red', 'Green', 'Yellow'];

const placeholderImages = [
  '/images/placeholder1.jpg',
  '/images/placeholder2.jpg',
  '/images/placeholder3.jpg',
  '/images/placeholder4.jpg',
  '/images/placeholder5.jpg',
];

async function seedItems() {
  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  const user = await User.findOne();
  if (!user) {
    console.log('No user found. Please register a user first.');
    process.exit(1);
  }
  const items = [];
  for (let i = 1; i <= 10; i++) {
    items.push({
      title: `Demo Item ${i}`,
      description: `This is a demo description for item ${i}. Stylish, comfortable, and perfect for your wardrobe.`,
      category: categories[Math.floor(Math.random() * categories.length)],
      size: sizes[Math.floor(Math.random() * sizes.length)],
      condition: conditions[Math.floor(Math.random() * conditions.length)],
      tags: ['demo', 'sample', 'fashion'],
      images: [placeholderImages[Math.floor(Math.random() * placeholderImages.length)]],
      pointsValue: Math.floor(Math.random() * 50) + 10,
      uploaderId: user._id,
      uploaderName: user.name,
      isAvailable: true,
      isApproved: true,
      brand: brands[Math.floor(Math.random() * brands.length)],
      color: colors[Math.floor(Math.random() * colors.length)],
      material: 'Cotton',
    });
  }
  await Item.insertMany(items);
  console.log('Dummy items seeded!');
  mongoose.connection.close();
}

seedItems(); 