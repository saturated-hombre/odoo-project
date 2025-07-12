const mongoose = require('mongoose');

const swapSchema = new mongoose.Schema({
  requesterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'completed', 'cancelled'],
    default: 'pending'
  },
  swapType: {
    type: String,
    enum: ['direct', 'points'],
    required: true
  },
  pointsOffered: {
    type: Number,
    min: [0, 'Points offered cannot be negative'],
    default: 0
  },
  message: {
    type: String,
    trim: true,
    maxlength: [500, 'Message cannot be more than 500 characters']
  },
  dateCreated: {
    type: Date,
    default: Date.now
  },
  dateCompleted: {
    type: Date
  },
  // For direct swaps - the item being offered in exchange
  offeredItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item'
  },
  // Rating and review after completion
  rating: {
    type: Number,
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5']
  },
  review: {
    type: String,
    trim: true,
    maxlength: [300, 'Review cannot be more than 300 characters']
  },
  // Tracking information
  isRated: {
    type: Boolean,
    default: false
  },
  // For points transfers
  pointsTransferred: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for efficient queries
swapSchema.index({ requesterId: 1, status: 1 });
swapSchema.index({ ownerId: 1, status: 1 });
swapSchema.index({ itemId: 1, status: 1 });

// Virtual for checking if swap is active
swapSchema.virtual('isActive').get(function() {
  return ['pending', 'accepted'].includes(this.status);
});

// Ensure virtual fields are serialized
swapSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Swap', swapSchema); 