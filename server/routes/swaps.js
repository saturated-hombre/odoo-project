const express = require('express');
const { body, validationResult } = require('express-validator');
const Swap = require('../models/Swap');
const Item = require('../models/Item');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @desc    Create swap request
// @route   POST /api/swaps
// @access  Private
router.post('/', protect, [
  body('itemId').isMongoId().withMessage('Valid item ID is required'),
  body('swapType').isIn(['direct', 'points']).withMessage('Swap type must be direct or points'),
  body('pointsOffered').optional().isInt({ min: 0 }).withMessage('Points offered must be a positive number'),
  body('message').optional().trim().isLength({ max: 500 }).withMessage('Message cannot exceed 500 characters'),
  body('offeredItemId').optional().isMongoId().withMessage('Valid offered item ID is required for direct swaps')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { itemId, swapType, pointsOffered, message, offeredItemId } = req.body;

    // Check if item exists and is available
    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    if (!item.isAvailable) {
      return res.status(400).json({ message: 'Item is not available for swap' });
    }

    if (item.uploaderId.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot request swap for your own item' });
    }

    // Check if user already has a pending swap for this item
    const existingSwap = await Swap.findOne({
      itemId,
      requesterId: req.user._id,
      status: { $in: ['pending', 'accepted'] }
    });

    if (existingSwap) {
      return res.status(400).json({ message: 'You already have a pending swap request for this item' });
    }

    // Validate points-based swap
    if (swapType === 'points') {
      if (!pointsOffered || pointsOffered <= 0) {
        return res.status(400).json({ message: 'Points offered is required for points-based swaps' });
      }

      if (req.user.points < pointsOffered) {
        return res.status(400).json({ message: 'Insufficient points' });
      }
    }

    // Validate direct swap
    if (swapType === 'direct') {
      if (!offeredItemId) {
        return res.status(400).json({ message: 'Offered item ID is required for direct swaps' });
      }

      const offeredItem = await Item.findById(offeredItemId);
      if (!offeredItem) {
        return res.status(404).json({ message: 'Offered item not found' });
      }

      if (offeredItem.uploaderId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'You can only offer your own items' });
      }

      if (!offeredItem.isAvailable) {
        return res.status(400).json({ message: 'Offered item is not available' });
      }
    }

    const swap = await Swap.create({
      requesterId: req.user._id,
      ownerId: item.uploaderId,
      itemId,
      swapType,
      pointsOffered: pointsOffered || 0,
      message,
      offeredItemId
    });

    // Add swap request to item
    item.swapRequests.push(swap._id);
    await item.save();

    const populatedSwap = await Swap.findById(swap._id)
      .populate('requesterId', 'name profilePicture')
      .populate('ownerId', 'name profilePicture')
      .populate('itemId', 'title images')
      .populate('offeredItemId', 'title images');

    res.status(201).json(populatedSwap);
  } catch (error) {
    console.error('Create swap error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get user's swap requests (incoming and outgoing)
// @route   GET /api/swaps
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { type = 'all', status } = req.query;
    let query = {};

    if (type === 'incoming') {
      query.ownerId = req.user._id;
    } else if (type === 'outgoing') {
      query.requesterId = req.user._id;
    } else {
      query.$or = [
        { ownerId: req.user._id },
        { requesterId: req.user._id }
      ];
    }

    if (status) {
      query.status = status;
    }

    const swaps = await Swap.find(query)
      .populate('requesterId', 'name profilePicture')
      .populate('ownerId', 'name profilePicture')
      .populate('itemId', 'title images pointsValue')
      .populate('offeredItemId', 'title images pointsValue')
      .sort({ dateCreated: -1 });

    res.json(swaps);
  } catch (error) {
    console.error('Get swaps error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get single swap
// @route   GET /api/swaps/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const swap = await Swap.findById(req.params.id)
      .populate('requesterId', 'name profilePicture rating')
      .populate('ownerId', 'name profilePicture rating')
      .populate('itemId', 'title images pointsValue description')
      .populate('offeredItemId', 'title images pointsValue description');

    if (!swap) {
      return res.status(404).json({ message: 'Swap not found' });
    }

    // Check if user is involved in this swap
    if (swap.requesterId._id.toString() !== req.user._id.toString() && 
        swap.ownerId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json(swap);
  } catch (error) {
    console.error('Get swap error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Accept swap request
// @route   PUT /api/swaps/:id/accept
// @access  Private
router.put('/:id/accept', protect, async (req, res) => {
  try {
    const swap = await Swap.findById(req.params.id);

    if (!swap) {
      return res.status(404).json({ message: 'Swap not found' });
    }

    if (swap.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (swap.status !== 'pending') {
      return res.status(400).json({ message: 'Swap request is not pending' });
    }

    // Handle points-based swap
    if (swap.swapType === 'points') {
      const requester = await User.findById(swap.requesterId);
      const owner = await User.findById(swap.ownerId);

      if (requester.points < swap.pointsOffered) {
        return res.status(400).json({ message: 'Requester has insufficient points' });
      }

      // Transfer points
      requester.points -= swap.pointsOffered;
      owner.points += swap.pointsOffered;
      requester.swapsCompleted += 1;
      owner.swapsCompleted += 1;

      await requester.save();
      await owner.save();
      swap.pointsTransferred = true;
    }

    // Handle direct swap
    if (swap.swapType === 'direct' && swap.offeredItemId) {
      const offeredItem = await Item.findById(swap.offeredItemId);
      if (offeredItem) {
        offeredItem.isAvailable = false;
        await offeredItem.save();
      }
    }

    // Mark original item as unavailable
    const item = await Item.findById(swap.itemId);
    if (item) {
      item.isAvailable = false;
      await item.save();
    }

    swap.status = 'accepted';
    swap.dateCompleted = new Date();
    await swap.save();

    const populatedSwap = await Swap.findById(swap._id)
      .populate('requesterId', 'name profilePicture')
      .populate('ownerId', 'name profilePicture')
      .populate('itemId', 'title images')
      .populate('offeredItemId', 'title images');

    res.json(populatedSwap);
  } catch (error) {
    console.error('Accept swap error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Reject swap request
// @route   PUT /api/swaps/:id/reject
// @access  Private
router.put('/:id/reject', protect, async (req, res) => {
  try {
    const swap = await Swap.findById(req.params.id);

    if (!swap) {
      return res.status(404).json({ message: 'Swap not found' });
    }

    if (swap.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (swap.status !== 'pending') {
      return res.status(400).json({ message: 'Swap request is not pending' });
    }

    swap.status = 'rejected';
    await swap.save();

    // Remove swap request from item
    const item = await Item.findById(swap.itemId);
    if (item) {
      item.swapRequests = item.swapRequests.filter(id => id.toString() !== swap._id.toString());
      await item.save();
    }

    const populatedSwap = await Swap.findById(swap._id)
      .populate('requesterId', 'name profilePicture')
      .populate('ownerId', 'name profilePicture')
      .populate('itemId', 'title images')
      .populate('offeredItemId', 'title images');

    res.json(populatedSwap);
  } catch (error) {
    console.error('Reject swap error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Cancel swap request
// @route   PUT /api/swaps/:id/cancel
// @access  Private
router.put('/:id/cancel', protect, async (req, res) => {
  try {
    const swap = await Swap.findById(req.params.id);

    if (!swap) {
      return res.status(404).json({ message: 'Swap not found' });
    }

    if (swap.requesterId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (swap.status !== 'pending') {
      return res.status(400).json({ message: 'Swap request cannot be cancelled' });
    }

    swap.status = 'cancelled';
    await swap.save();

    // Remove swap request from item
    const item = await Item.findById(swap.itemId);
    if (item) {
      item.swapRequests = item.swapRequests.filter(id => id.toString() !== swap._id.toString());
      await item.save();
    }

    const populatedSwap = await Swap.findById(swap._id)
      .populate('requesterId', 'name profilePicture')
      .populate('ownerId', 'name profilePicture')
      .populate('itemId', 'title images')
      .populate('offeredItemId', 'title images');

    res.json(populatedSwap);
  } catch (error) {
    console.error('Cancel swap error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Rate completed swap
// @route   POST /api/swaps/:id/rate
// @access  Private
router.post('/:id/rate', protect, [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('review').optional().trim().isLength({ max: 300 }).withMessage('Review cannot exceed 300 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const swap = await Swap.findById(req.params.id);

    if (!swap) {
      return res.status(404).json({ message: 'Swap not found' });
    }

    if (swap.status !== 'accepted') {
      return res.status(400).json({ message: 'Can only rate completed swaps' });
    }

    if (swap.isRated) {
      return res.status(400).json({ message: 'Swap has already been rated' });
    }

    // Check if user is involved in this swap
    if (swap.requesterId.toString() !== req.user._id.toString() && 
        swap.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { rating, review } = req.body;

    // Determine which user to rate (the other person in the swap)
    const userToRate = swap.requesterId.toString() === req.user._id.toString() 
      ? swap.ownerId 
      : swap.requesterId;

    // Update user's rating
    const user = await User.findById(userToRate);
    if (user) {
      const totalRating = user.rating * user.swapsCompleted + rating;
      user.swapsCompleted += 1;
      user.rating = totalRating / user.swapsCompleted;
      await user.save();
    }

    swap.rating = rating;
    swap.review = review;
    swap.isRated = true;
    await swap.save();

    res.json(swap);
  } catch (error) {
    console.error('Rate swap error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 