const express = require('express');
const User = require('../models/User');
const Item = require('../models/Item');
const Swap = require('../models/Swap');
const { protect, admin } = require('../middleware/auth');

const router = express.Router();

// Apply admin middleware to all routes
router.use(protect, admin);

// @desc    Get admin dashboard statistics
// @route   GET /api/admin/stats
// @access  Private/Admin
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalItems = await Item.countDocuments();
    const totalSwaps = await Swap.countDocuments();
    const pendingItems = await Item.countDocuments({ isApproved: false });
    const pendingSwaps = await Swap.countDocuments({ status: 'pending' });

    // Get recent activity
    const recentUsers = await User.find().sort({ createdAt: -1 }).limit(5);
    const recentItems = await Item.find().sort({ createdAt: -1 }).limit(5);
    const recentSwaps = await Swap.find().sort({ createdAt: -1 }).limit(5);

    // Category distribution
    const categoryStats = await Item.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      stats: {
        totalUsers,
        totalItems,
        totalSwaps,
        pendingItems,
        pendingSwaps
      },
      recentActivity: {
        users: recentUsers,
        items: recentItems,
        swaps: recentSwaps
      },
      categoryStats
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get all users with pagination
// @route   GET /api/admin/users
// @access  Private/Admin
router.get('/users', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments();

    res.json({
      users,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Update user (ban/unban, make admin)
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
router.put('/users/:id', async (req, res) => {
  try {
    const { isActive, isAdmin } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (typeof isActive === 'boolean') {
      user.isActive = isActive;
    }

    if (typeof isAdmin === 'boolean') {
      user.isAdmin = isAdmin;
    }

    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isActive: user.isActive,
      isAdmin: user.isAdmin,
      joinDate: user.joinDate
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get pending items for approval
// @route   GET /api/admin/items/pending
// @access  Private/Admin
router.get('/items/pending', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const items = await Item.find({ isApproved: false })
      .populate('uploaderId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Item.countDocuments({ isApproved: false });

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
    console.error('Get pending items error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Approve/reject item
// @route   PUT /api/admin/items/:id/approve
// @access  Private/Admin
router.put('/items/:id/approve', async (req, res) => {
  try {
    const { isApproved, reason } = req.body;

    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    item.isApproved = isApproved;
    await item.save();

    res.json({
      _id: item._id,
      title: item.title,
      isApproved: item.isApproved,
      uploaderId: item.uploaderId
    });
  } catch (error) {
    console.error('Approve item error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get all swaps with filters
// @route   GET /api/admin/swaps
// @access  Private/Admin
router.get('/swaps', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { status, swapType } = req.query;

    let query = {};
    if (status) query.status = status;
    if (swapType) query.swapType = swapType;

    const swaps = await Swap.find(query)
      .populate('requesterId', 'name email')
      .populate('ownerId', 'name email')
      .populate('itemId', 'title')
      .populate('offeredItemId', 'title')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Swap.countDocuments(query);

    res.json({
      swaps,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get swaps error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Delete item (admin override)
// @route   DELETE /api/admin/items/:id
// @access  Private/Admin
router.delete('/items/:id', async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    await Item.findByIdAndDelete(req.params.id);

    // Update user's itemsListed count
    const user = await User.findById(item.uploaderId);
    if (user) {
      user.itemsListed = Math.max(0, user.itemsListed - 1);
      await user.save();
    }

    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Delete item error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get user details with their items and swaps
// @route   GET /api/admin/users/:id
// @access  Private/Admin
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const items = await Item.find({ uploaderId: req.params.id });
    const swaps = await Swap.find({
      $or: [
        { requesterId: req.params.id },
        { ownerId: req.params.id }
      ]
    }).populate('itemId', 'title').populate('offeredItemId', 'title');

    res.json({
      user,
      items,
      swaps
    });
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 