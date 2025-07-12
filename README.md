# ReWear - Sustainable Clothing Exchange Platform

ReWear is a modern, sustainable clothing exchange platform that allows users to swap clothing items through direct exchanges or a points-based system. The platform promotes sustainable fashion and reduces textile waste.

## 🌟 Features

### Core Features
- **User Authentication**: Secure registration and login with JWT tokens
- **Item Management**: Upload, edit, and delete clothing items with image support
- **Swap System**: Direct item swaps and points-based exchanges
- **Search & Filter**: Advanced search with category, size, condition, and points filters
- **User Dashboard**: Profile management, swap history, and activity tracking
- **Admin Panel**: User management, content moderation, and platform statistics

### Technical Features
- **Responsive Design**: Mobile-first approach with modern UI/UX
- **Real-time Updates**: Dynamic content loading and notifications
- **Image Upload**: Multi-image support with validation
- **Security**: Input validation, XSS protection, and rate limiting
- **Performance**: Optimized database queries and caching

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd basic_layout
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install
   
   # Install server dependencies
   cd server
   npm install
   cd ..
   ```

3. **Environment Setup**
   Create a `.env` file in the `server` directory:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/rewear
   JWT_SECRET=your-super-secret-jwt-key
   FRONTEND_URL=http://localhost:3000
   ```

4. **Database Setup**
   - Start MongoDB service
   - The application will automatically create the database and collections

5. **Start the application**
   ```bash
   # Start the server
   npm start
   
   # Or for development with auto-reload
   npm run dev
   ```

6. **Access the application**
   - Frontend: http://localhost:5000
   - API: http://localhost:5000/api

## 📁 Project Structure

```
basic_layout/
├── frontend/                 # Frontend files
│   ├── css/
│   │   └── style.css        # Main stylesheet
│   ├── js/
│   │   ├── auth.js          # Authentication utilities
│   │   └── main.js          # Main JavaScript functions
│   ├── images/              # Static images
│   ├── index.html           # Landing page
│   ├── login.html           # Login page
│   ├── register.html        # Registration page
│   ├── dashboard.html       # User dashboard
│   ├── browse.html          # Item browsing page
│   └── item-detail.html     # Item details page
├── server/                  # Backend files
│   ├── models/              # Database models
│   │   ├── User.js          # User model
│   │   ├── Item.js          # Item model
│   │   └── Swap.js          # Swap model
│   ├── routes/              # API routes
│   │   ├── auth.js          # Authentication routes
│   │   ├── items.js         # Item management routes
│   │   ├── swaps.js         # Swap management routes
│   │   └── admin.js         # Admin routes
│   ├── middleware/          # Middleware functions
│   │   └── auth.js          # Authentication middleware
│   ├── public/              # Public files
│   │   └── uploads/         # Uploaded images
│   └── server.js            # Main server file
├── package.json             # Root package.json
└── README.md               # This file
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 5000 |
| `MONGODB_URI` | MongoDB connection string | mongodb://localhost:27017/rewear |
| `JWT_SECRET` | JWT signing secret | your-secret-key |
| `FRONTEND_URL` | Frontend URL for CORS | http://localhost:3000 |

### Database Models

#### User Model
```javascript
{
  _id: ObjectId,
  name: String,
  email: String,
  password: String (hashed),
  points: Number (default: 100),
  location: String,
  profilePicture: String,
  joinDate: Date,
  itemsListed: Number,
  swapsCompleted: Number,
  rating: Number,
  isAdmin: Boolean
}
```

#### Item Model
```javascript
{
  _id: ObjectId,
  title: String,
  description: String,
  category: String,
  size: String,
  condition: String,
  tags: [String],
  images: [String],
  pointsValue: Number,
  uploaderId: ObjectId,
  uploaderName: String,
  isAvailable: Boolean,
  dateAdded: Date,
  isApproved: Boolean
}
```

#### Swap Model
```javascript
{
  _id: ObjectId,
  requesterId: ObjectId,
  ownerId: ObjectId,
  itemId: ObjectId,
  status: String,
  swapType: String,
  pointsOffered: Number,
  message: String,
  dateCreated: Date,
  dateCompleted: Date
}
```

## 🎨 Design System

### Color Palette
- **Primary**: #2E7D32 (Green for sustainability)
- **Secondary**: #FFC107 (Amber for accent)
- **Background**: #F5F5F5 (Light gray)
- **Text**: #333333 (Dark gray)
- **Cards**: #FFFFFF (White)

### Typography
- **Headers**: 'Roboto', sans-serif
- **Body**: 'Open Sans', sans-serif

### Components
- Rounded corners (8px border-radius)
- Subtle shadows for depth
- Hover effects on interactive elements
- Responsive grid layouts

## 📱 Responsive Design

The platform is built with a mobile-first approach and includes breakpoints for:
- Mobile: 320px - 768px
- Tablet: 768px - 1024px
- Desktop: 1024px+

## 🔒 Security Features

- **Authentication**: JWT-based authentication with bcrypt password hashing
- **Input Validation**: Server-side validation using express-validator
- **XSS Protection**: Helmet.js for security headers
- **Rate Limiting**: Express rate limiting to prevent abuse
- **File Upload Security**: Multer with file type and size validation
- **CORS**: Configured CORS for secure cross-origin requests

## 🚀 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### Items
- `GET /api/items` - Get items with filters
- `GET /api/items/:id` - Get single item
- `POST /api/items` - Create new item
- `PUT /api/items/:id` - Update item
- `DELETE /api/items/:id` - Delete item
- `POST /api/items/:id/like` - Toggle item like

### Swaps
- `POST /api/swaps` - Create swap request
- `GET /api/swaps` - Get user's swaps
- `GET /api/swaps/:id` - Get single swap
- `PUT /api/swaps/:id/accept` - Accept swap
- `PUT /api/swaps/:id/reject` - Reject swap
- `POST /api/swaps/:id/rate` - Rate completed swap

### Admin
- `GET /api/admin/stats` - Get platform statistics
- `GET /api/admin/users` - Get all users
- `PUT /api/admin/users/:id` - Update user
- `GET /api/admin/items/pending` - Get pending items
- `PUT /api/admin/items/:id/approve` - Approve/reject item

## 🧪 Testing

To run tests (when implemented):
```bash
npm test
```

## 📦 Deployment

### Production Build
```bash
# Install dependencies
npm install

# Set production environment variables
NODE_ENV=production

# Start the server
npm start
```

### Docker Deployment
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

## 🔮 Future Features

- Real-time chat between users
- Email notifications
- Social media integration
- Mobile app (PWA)
- Advanced analytics
- Payment integration
- Shipping integration
- Wishlist functionality

## 🙏 Acknowledgments

- W3Schools for design inspiration
- Font Awesome for icons
- Google Fonts for typography
- MongoDB for database
- Express.js for backend framework

---

**Made with ❤️ for a sustainable future** 