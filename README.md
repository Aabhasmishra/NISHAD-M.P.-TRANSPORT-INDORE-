# NISHAD M.P. TRANSPORT INDORE

## Transport Management System

### Project Structure

```
📦 NISHAD-M.P.-TRANSPORT-INDORE-
├── 📁 Frontend/          # React.js Application
│   ├── 📁 src/
│   │   ├── 📁 Components/
│   │   │   ├── InvoiceGenerator/     # Invoice generation component
│   │   │   ├── TransactionHistory/   # Transaction management
│   │   │   └── PopupAlert/           # Alert system
│   │   ├── 📁 Images/                # Application images
│   │   └── App.jsx                   # Main application component
│   ├── package.json
│   └── vite.config.js
│
└── 📁 Backend/           # Node.js Server
    ├── 📄 mainServer.js              # Main server file
    ├── 📄 *DB.js                     # Database modules
    ├── 📄 *Routes.js                 # API routes
    ├── 📁 uploads/                   # File upload directory
    └── .env.example                  # Environment variables template
```

### Features

- 🚛 Transport Management
- 📊 Invoice Generation
- 💰 Payment Tracking
- 📈 Transaction History
- 🗃️ Customer Management

### Tech Stack

**Frontend:**
- React.js
- Vite
- CSS3

**Backend:**
- Node.js
- Express.js
- Database (Custom)

### Setup Instructions

1. **Backend Setup:**
   ```bash
   cd Backend
   npm install
   # Create .env file with your configuration
   node mainServer.js
   ```

2. **Frontend Setup:**
   ```bash
   cd Frontend
   npm install
   npm run dev
   ```

### API Endpoints

- Customer Management
- Transport Management  
- Payment Processing
- Invoice Generation
- Status Tracking

---
*Developed by Aabhas Mishra*
