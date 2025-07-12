const express = require('express');
const multer = require('multer');
const path = require('path');
const { body, validationResult } = require('express-validator');
const Item = require('../models/Item');
const { protect, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|webp/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// @desc    Get all items with search and filters
// @route   GET /api/items
// @access  Public
router.get('/', optionalAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    // Build query
    let query = { isAvailable: true, isApproved: true };

    // Search functionality
    if (req.query.search) {
      query.$text = { $search: req.query.search };
    }

    // Category filter
    if (req.query.category) {
      query.category = req.query.category;
    }

    // Size filter
    if (req.query.size) {
      query.size = req.query.size;
    }

    // Condition filter
    if (req.query.condition) {
      query.condition = req.query.condition;
    }

    // Points range filter
    if (req.query.minPoints || req.query.maxPoints) {
      query.pointsValue = {};
      if (req.query.minPoints) query.pointsValue.$gte = parseInt(req.query.minPoints);
      if (req.query.maxPoints) query.pointsValue.$lte = parseInt(req.query.maxPoints);
    }

    // Sort options
    let sort = {};
    if (req.query.sort) {
      switch (req.query.sort) {
        case 'newest':
          sort = { dateAdded: -1 };
          break;
        case 'oldest':
          sort = { dateAdded: 1 };
          break;
        case 'points-low':
          sort = { pointsValue: 1 };
          break;
        case 'points-high':
          sort = { pointsValue: -1 };
          break;
        case 'popular':
          sort = { views: -1 };
          break;
        default:
          sort = { dateAdded: -1 };
      }
    } else {
      sort = { dateAdded: -1 };
    }

    const items = await Item.find(query)
      .populate('uploaderId', 'name rating')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const total = await Item.countDocuments(query);

    res.json({
      items,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get items error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get single item
// @route   GET /api/items/:id
// @access  Public
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id)
      .populate('uploaderId', 'name rating location joinDate');

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Increment views if user is authenticated
    if (req.user) {
      item.views += 1;
      await item.save();
    }

    res.json(item);
  } catch (error) {
    console.error('Get item error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Create new item
// @route   POST /api/items
// @access  Private
router.post('/', protect, upload.array('images', 5), [
  body('title').trim().isLength({ min: 3, max: 100 }).withMessage('Title must be between 3 and 100 characters'),
  body('description').trim().isLength({ min: 10, max: 1000 }).withMessage('Description must be between 10 and 1000 characters'),
  body('category').isIn(['Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Shoes', 'Accessories', 'Other']).withMessage('Invalid category'),
  body('size').isIn(['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One Size', 'Other']).withMessage('Invalid size'),
  body('condition').isIn(['New', 'Like New', 'Good', 'Fair', 'Poor']).withMessage('Invalid condition'),
  body('pointsValue').isInt({ min: 1, max: 1000 }).withMessage('Points value must be between 1 and 1000'),
  body('brand').optional().trim().isLength({ max: 50 }).withMessage('Brand cannot exceed 50 characters'),
  body('color').optional().trim().isLength({ max: 30 }).withMessage('Color cannot exceed 30 characters'),
  body('material').optional().trim().isLength({ max: 50 }).withMessage('Material cannot exceed 50 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'At least one image is required' });
    }

    const imageUrls = req.files.map(file => `/uploads/${file.filename}`);

    const item = await Item.create({
      ...req.body,
      images: imageUrls,
      uploaderId: req.user._id,
      uploaderName: req.user.name,
      isApproved: req.user.isAdmin // Auto-approve admin items
    });

    // Update user's itemsListed count
    req.user.itemsListed += 1;
    await req.user.save();

    res.status(201).json(item);
  } catch (error) {
    console.error('Create item error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Update item
// @route   PUT /api/items/:id
// @access  Private
router.put('/:id', protect, upload.array('images', 5), [
  body('title').optional().trim().isLength({ min: 3, max: 100 }).withMessage('Title must be between 3 and 100 characters'),
  body('description').optional().trim().isLength({ min: 10, max: 1000 }).withMessage('Description must be between 10 and 1000 characters'),
  body('category').optional().isIn(['Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Shoes', 'Accessories', 'Other']).withMessage('Invalid category'),
  body('size').optional().isIn(['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One Size', 'Other']).withMessage('Invalid size'),
  body('condition').optional().isIn(['New', 'Like New', 'Good', 'Fair', 'Poor']).withMessage('Invalid condition'),
  body('pointsValue').optional().isInt({ min: 1, max: 1000 }).withMessage('Points value must be between 1 and 1000')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Check if user owns the item or is admin
    if (item.uploaderId.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Handle new images if uploaded
    if (req.files && req.files.length > 0) {
      const newImageUrls = req.files.map(file => `/uploads/${file.filename}`);
      req.body.images = newImageUrls;
    }

    const updatedItem = await Item.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json(updatedItem);
  } catch (error) {
    console.error('Update item error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Delete item
// @route   DELETE /api/items/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Check if user owns the item or is admin
    if (item.uploaderId.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await Item.findByIdAndDelete(req.params.id);

    // Update user's itemsListed count
    req.user.itemsListed = Math.max(0, req.user.itemsListed - 1);
    await req.user.save();

    res.json({ message: 'Item removed' });
  } catch (error) {
    console.error('Delete item error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Toggle item like
// @route   POST /api/items/:id/like
// @access  Private
router.post('/:id/like', protect, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    const likeIndex = item.likes.indexOf(req.user._id);
    
    if (likeIndex > -1) {
      // Unlike
      item.likes.splice(likeIndex, 1);
    } else {
      // Like
      item.likes.push(req.user._id);
    }

    await item.save();
    res.json({ likes: item.likes.length, isLiked: likeIndex === -1 });
  } catch (error) {
    console.error('Toggle like error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 