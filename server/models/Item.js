const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [1000, 'Description cannot be more than 1000 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Shoes', 'Accessories', 'Other']
  },
  size: {
    type: String,
    required: [true, 'Size is required'],
    enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One Size', 'Other']
  },
  condition: {
    type: String,
    required: [true, 'Condition is required'],
    enum: ['New', 'Like New', 'Good', 'Fair', 'Poor']
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [20, 'Tag cannot be more than 20 characters']
  }],
  images: [{
    type: String,
    required: [true, 'At least one image is required']
  }],
  pointsValue: {
    type: Number,
    required: [true, 'Points value is required'],
    min: [1, 'Points value must be at least 1'],
    max: [1000, 'Points value cannot exceed 1000']
  },
  uploaderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  uploaderName: {
    type: String,
    required: true
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  dateAdded: {
    type: Date,
    default: Date.now
  },
  swapRequests: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Swap'
  }],
  isApproved: {
    type: Boolean,
    default: false
  },
  views: {
    type: Number,
    default: 0
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  brand: {
    type: String,
    trim: true,
    maxlength: [50, 'Brand cannot be more than 50 characters']
  },
  color: {
    type: String,
    trim: true,
    maxlength: [30, 'Color cannot be more than 30 characters']
  },
  material: {
    type: String,
    trim: true,
    maxlength: [50, 'Material cannot be more than 50 characters']
  }
}, {
  timestamps: true
});

// Index for search functionality
itemSchema.index({ title: 'text', description: 'text', tags: 'text' });

// Virtual for getting the number of likes
itemSchema.virtual('likeCount').get(function() {
  return this.likes.length;
});

// Ensure virtual fields are serialized
itemSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Item', itemSchema); 